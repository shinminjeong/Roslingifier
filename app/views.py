from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.template import Context
from django.template.context_processors import csrf
from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_exempt, csrf_protect
from django.conf import settings

import os, sys, csv, json
import pandas as pd
import numpy as np
from datetime import datetime
from .utils import *
from .caption import *


file_map = {
    "income": "app/static/data/income_per_person_gdppercapita_ppp_inflation_adjusted.csv",
    "lifespan": "app/static/data/life_expectancy_years.csv",
    "fertility": "app/static/data/children_per_woman_total_fertility.csv",
    "mortality": "app/static/data/child_mortality_0_5_year_olds_dying_percentage.csv",
    "population": "app/static/data/population_total.csv",
    # "continent": "app/static/data/country_continent.csv",
    "continent": "app/static/data/additional_data.csv"
}

options = {
    "x": {"id": "income", "name": "Income"},
    "y": {"id": "lifespan", "name": "Life Expectancy"},
    "s": {"id": "population", "name": "Population"},
    "c": {"id": "continent", "name": "Continent"},
    "xScale": {"id": "log", "name": "Log"},
    "yScale": {"id": "lin", "name": "Lin"},
}

c_group = {"Asia":1, "Europe":2, "North America":3, "South America":3, "Africa":4, "Oceania":1, "Antarctica":-1}
c_group_inv = {0: "The world", 1: "Asia", 2: "Europe", 3: "America", 4: "Africa"}
K = len(c_group_inv)

values = None
kgroups = None
countries = None
timeseries = []
numTicks = 0
lang = "en"
def main(request):
    global values, kgroups, options, timeseries, numTicks, countries, lang
    lang = request.GET.get("lang") if "lang" in request.GET else "en"

    for k, v in options.items():
        id = v["id"]
        if k in request.GET:
            id = request.GET.get(k)
            options[k] = {"id": id, "name": name_map[id]}
        if id in label_map:
            options[k]["label"] = label_map[id]

    print(options)
    selectedAxis = []

    pd_x = pd.read_csv(file_map[options["x"]["id"]])
    pd_y = pd.read_csv(file_map[options["y"]["id"]])
    timeseries = [x for x,y in zip(pd_x.columns.tolist()[1:], pd_y.columns.tolist()[1:]) if x==y]
    # timeseries = [x for x,y in zip(pd_x.columns.tolist()[1:], pd_y.columns.tolist()[1:]) if x==y and int(x) >= 1960]

    numTicks = len(timeseries)
    df_x = pd_x[['country']+timeseries].dropna()
    df_y = pd_y[['country']+timeseries].dropna()
    map = pd.merge(df_x, df_y, on='country', how='inner')
    countries = map['country'].tolist()

    df_s = pd.read_csv(file_map[options["s"]["id"]])[['country']+timeseries]
    df_s = df_s.loc[df_s['country'].isin(countries)].reset_index()
    df_c = pd.read_csv(file_map[options["c"]["id"]])
    df_c = df_c.loc[df_c['country'].isin(countries)].reset_index()

    selectedAxis = ["X", "Y", "S"]
    kgroups = {k:{"index": i, "group": c_group[df_c.iloc[i]["continent"]], "sub": df_c.iloc[i]["sub_region"]} for i, k in enumerate(countries)}
    values = map.drop(columns='country').fillna(-1)
    values[["{}_s".format(y) for y in timeseries]] = df_s[timeseries].astype("float")

    # calculate average variance
    avg_v = {}
    groups = list(c_group_inv.keys())
    for group_index in groups:
        if group_index == 0:
            X = values.to_numpy()
        else:
            cset = [v["index"] for k, v in kgroups.items() if v["group"] == group_index] # X value
            X = values.iloc[cset, :].to_numpy()
        D, minD, maxD = avg_value(X, numTicks)
        # D, minD, maxD = avg_variance(X, numTicks)
        avg_v[group_index] = {}
        for i, a in enumerate(selectedAxis):
            f = i*numTicks
            t = (i+1)*numTicks
            avg_v[group_index][a] = [{"time":y, "value":v, "min": m1, "max": m2, "diff": m2-m1} for y, v, m1, m2 in zip(timeseries, D.tolist()[f:t], minD.tolist()[f:t], maxD.tolist()[f:t])]

    focus_range = get_focus_range(timeseries, groups, selectedAxis, avg_v);
    G, minmax = minmax_for_group(timeseries, K, kgroups, selectedAxis, values)
    clusterinfo = {
        "K": K,
        "groups": range(0, K),
        "minmax": minmax
    }
    initseq, trend = generateInitSeq(options, c_group_inv, avg_v[0], lang)
    focus_range.extend(initseq)
    # print(kgroups)
    return render(request, "group.html", {
        "timeseries": timeseries,
        "data": map.to_json(),
        "gname": c_group_inv,
        "options": options,
        "population": df_s.to_json(),
        "continent": df_c.to_json(),
        "selectedAxis": selectedAxis,
        "clusterinfo": clusterinfo,
        "kgroup": kgroups,
        "avg_velocity": avg_v,
        "focus_range": focus_range,
        "otrend": trend,
    })

@csrf_exempt
def get_caption(request):
    global values, kgroups, options, timeseries, numTicks, countries, lang
    outerbound = request.POST
    print()
    head_y = outerbound.get("start_time")
    tail_y = outerbound.get("end_time")
    groups = {int(c):c_group_inv[int(c)] for c in outerbound.getlist("groups[]")}
    reasons = get_dict_from_request(dict(outerbound))
    print("**** get_caption", head_y, tail_y, groups, reasons)

    if (head_y == "Init"):
        return JsonResponse({
            "head": head_y,
            "tail": tail_y,
            "innergrp": {},
            "caption": {k:v["caption"][0] for k,v in reasons.items()}
        })

    printgrp = {}
    groupdesc = {}
    caption = {}

    o_prologue = outerbound.get("prologue")
    o_epilogue = outerbound.get("epilogue")

    for id, v in reasons.items():
        # row: selected countries
        g = int(v["group"][0])
        print(id, g)
        cset = [v["index"] for k, v in kgroups.items() if g == 0 or v["group"] == g] # countries in selected continent

        # column: selected years of selected axis
        selectedCol = []
        axes = ["X", "Y", "S"]
        selectedAxis = list(v["axis"])
        yrange = v["yrange"]
        ys = timeseries.index(yrange[0])
        ye = timeseries.index(yrange[-1])
        for r in range(0, len(axes)): # selected years
            if axes[r] in selectedAxis:
                selectedCol.extend(list(range(ys+numTicks*r, (ye+1)+numTicks*r)))
        # print("---- group {} ---- {} ----".format(g, selectedAxis), selectedCol)
        # print(values.iloc[cset, selectedCol])
        ## cluster vector
        X = values.iloc[cset, selectedCol].to_numpy()
        # X = normalizeVector(X, tail_y-head_y)
        cluster, num_cluster, trans = cluster_MeanShift(X)

        printgrp[g] = {k:int(cluster[i]) for i, k in enumerate(cset)}
        groupdesc[g] = {c: [] for c in range(num_cluster)}
        for i, k in enumerate(cset):
            groupdesc[g][cluster[i]].append(k)
        for c, clist in groupdesc[g].items():
            groupdesc[g][c] = summarizeGroup(kgroups, [countries[vv] for vv in clist])

        axisNames = [options[a.lower()] for a in selectedAxis]
        caption[id] = generateCaption(groups, g, axisNames, v["reason"][0], v["pattern"][0], yrange[0], yrange[-1], allgroup=reasons, lang=lang)
    # print(printgrp)
    # print(head_y, tail_y, "-----------------------------")
    # print(groupdesc)

    caption[o_prologue] = generatePrologue(groups, options, reasons, head_y, tail_y, lang=lang)
    caption[o_epilogue] = ""

    return JsonResponse({
        "head": head_y,
        "tail": tail_y,
        "innergrp": {
            "group": printgrp,
            "desc": groupdesc
        },
        "caption": caption
    })
