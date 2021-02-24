import os, sys
from collections import Counter

name_map = {
    "income": "Income",
    "fertility": "Babies per woman",
    "lifespan": "Life Expectancy",
    "mortality": "Child Mortality",
    "population": "Population",
    "continent": "Continent",
    "confirmed": "Confirmed",
    "death": "Deaths",
    "numdays": "Num days since 100th case",
    "size": "Size",
    "log": "Log",
    "lin": "Lin",
}
label_map = {
    "income": {"desc": "wealth", "low": "poor", "high": "rich"},
    "fertility": {"desc": "family size", "low": "few", "high": "many"},
    "mortality": {"desc": "child health", "low": "healthy", "high": "sick"},
    "lifespan": {"desc": "health", "low": "sick", "high": "healthy"},
    "population": {"desc": "population", "low": "few", "high": "many"},
    "none": {"desc": "", "high": ""},
}
label_map_ko = {
    "income": {"desc": "소득 수준", "low": "가난함", "high": "부유함"},
    "fertility": {"desc": "가족의 크기", "low": "가족 구성원이 적음", "high": "가족 구성원이 많음"},
    "mortality": {"desc": "아동 사망률", "low": "낮은 아동 사망률", "high": "높은 아동 사망률"},
    "lifespan": {"desc": "평균 수명", "low": "짧은 평균 수명", "high": "긴 평균 수명"},
    "population": {"desc": "인구", "low": "적은 인구 수", "high": "많은 인구 수"},
    "none": {"desc": "", "high": ""},
}
unit_map = {
    "income": "dollars",
    "fertility": "baby",
    "lifespan": "years",
    "population": "",
}
desc = {
    "downup": "went down then up",
    "updown": "went up then down",
    "increased": "increased",
    "decreased": "decreased",
    "mostspread": "the difference between the items was at its widest",
    "nochange": "is mostly constant",
    "usr": "something happened"
}
desc_ko = {
    "downup": "감소 후 다시 증가하였습니다",
    "updown": "증가 후 다시 감소하였습니다",
    "increased": "증가하였습니다",
    "decreased": "감소하였습니다",
    "mostspread": "아이템 사이의 차이가 가장 크게 벌어졌습니다",
    "nochange": "변화가 거의 없었습니다",
    "usr": "어떠한 이벤트가 발생하였습니다"
}
group_ko = {
    "The world": "전세계",
    "Asia": "아시아",
    "Europe": "유럽",
    "America": "아메리카",
    "Africa": "아프리카"
}



def summarizeGroup(info, countries):
    # print("--- summarizeGroup", countries)
    if len(countries) == 1:
        return countries[0]

    desc = []
    sub_regions = [info[c]["sub"] for c in countries]
    region_counter = Counter(sub_regions)
    for c in region_counter.most_common(3):
        if (c[1]/len(sub_regions) > 0.05):
            desc.append(format(c[0]))
            # desc += "{}({}%); ".format(c[0], int(100*c[1]/len(sub_regions)))
    # print(desc)
    return ";".join(desc)

def cap_in(y_s, y_e, groups, g, axes, pattern, allgroup, lang):
    if lang == "ko":
        return "{}년에, {}에서는 {}.".format(y_s, group_ko[groups[g]], desc_ko[pattern])
    else:
        return "In {}, {} in {}.".format(y_s, desc[pattern], groups[g])

def cap_between(y_s, y_e, groups, g, axes, pattern, allgroup, lang):
    cap = ""
    for axis in axes:
        if lang == "ko":
            cap += "{}년부터 {}년까지 {}의 {}은 {}.".format(y_s, y_e, group_ko[groups[g]],  axis["name"], desc_ko[pattern])
        else:
            cap += "{} in {} {} between {} and {}.".format(axis["name"], groups[g], desc[pattern], y_s, y_e)
    return cap

def cap_summary(y_s, y_e, groups, g, axes, pattern, allgroup, lang):
    continents = [group_ko[c] for i, c in groups.items() if i > 0]
    cap = "From {} to {}, ".format(y_s, y_e)
    for axis, p in zip(axes, pattern):
        cap += "{} of {} {}.".format(axis["name"], " and ".join(continents), p)
    return cap

caption_generator = {
    "spr": cap_in,
    "var": cap_between,
    "noc": cap_between,
    "usr": cap_between,
    "sum": cap_summary
}

def cap_axis(a, options, lang="en"):
    key = a.lower()
    if lang == "ko":
        return "{}, {}을(를) 의미합니다.".format(options[key]["name"], label_map_ko[options[key]["id"]]["desc"], )
    else:
        return "An axis for {}, {}.".format(label_map[options[key]["id"]]["desc"], options[key]["name"])

def cap_trend(options, x_move, y_move, lang="en"):
    x_key = options["x"]["id"]
    y_key = options["y"]["id"]
    if x_move == y_move:
        if lang == "ko":
            return "왼쪽 아래쪽은 {}과(와) {}을(를) 의미하고, 오른쪽 위는 {}과(와) {}을(를) 의미합니다.".format(
                label_map_ko[x_key]["low"], label_map_ko[y_key]["low"],
                label_map_ko[x_key]["high"], label_map_ko[y_key]["high"])
        else:
            return "Bottom left is {} and {}, upper right is {} and {}.".format(
                label_map[x_key]["low"], label_map[y_key]["low"],
                label_map[x_key]["high"], label_map[y_key]["high"])
    else:
        if lang == "ko":
            return "왼쪽 위는 {}과(와) {}을(를) 의미하고, 오른쪽 아래는 {}과(와) {}을(를) 의미합니다.".format(
                label_map_ko[x_key]["low"], label_map_ko[y_key]["high"],
                label_map_ko[x_key]["high"], label_map_ko[y_key]["low"])
        else:
            return "Upper left is {} and {}, bottom right is {} and {}.".format(
                label_map[x_key]["low"], label_map[y_key]["high"],
                label_map[x_key]["high"], label_map[y_key]["low"])

def cap_size(a, options, lang="en"):
    key = a.lower()
    if lang == "ko":
        return "버블의 크기는 {}의 크기를 의미합니다.".format(label_map_ko[options[key]["id"]]["desc"])
    else:
        return "The size of the bubbles shows the size of the {}.".format(options[key]["name"].lower())

def generateInitSeq(options, groups, values, lang="en"):
    # print("generateInitSeq", groups, options, lang)
    output = []

    # X and Y axes
    for a in ["Y", "X"]:
        output.append({ "reason": "init", "pattern": cap_axis(a, options, lang), "g": 0, "a": [a], "years": ["init"] })
    # Overall trend
    x_move = (values["X"][-1]["value"]-values["X"][0]["value"])>0 # positive when going up otherwise negative
    y_move = (values["Y"][-1]["value"]-values["Y"][0]["value"])>0 # positive when going up otherwise negative
    output.append({ "reason": "init", "pattern": cap_trend(options, x_move, y_move, lang), "g": 0, "a": ["Trend"], "years": ["init"] })
    # Introduce groups
    for k, v in groups.items():
        if k == 0: continue
        if lang == "ko":
            output.append({ "reason": "init", "pattern": group_ko[v], "g": k, "a": ["G"], "years": ["init"] })
        else:
            output.append({ "reason": "init", "pattern": v, "g": k, "a": ["G"], "years": ["init"] })
    # Size
    output.append({ "reason": "init", "pattern": cap_size("S", options, lang), "g": 0, "a": ["S"], "years": ["init"] })

    return output, x_move == y_move


def generateCaption(groups, g, axes, reason, pattern, head_y, tail_y, allgroup, lang="en"):
    # print("generateCaption", groups, g, axes, reason, pattern)
    caption = caption_generator[reason](head_y, tail_y, groups, g, axes, pattern, allgroup, lang)
    return caption

def aggrNames(groups, nlist, lang):
    if 0 in groups and groups[0] in nlist:
        return group_ko[groups[0]] if lang == "ko" else groups[0]
    if len(nlist) == 1:
        return group_ko[nlist[0]] if lang == "ko" else nlist[0]
    if lang == "ko":
        nlist_ko = [group_ko[g] for g in nlist]
        return ", ".join(nlist_ko[:-1])+" 와 "+nlist_ko[-1]
    return ", ".join(nlist[:-1])+" and "+nlist[-1]

def aggrAxes(axes, options, lang):
    if len(axes) == 1:
        return options[axes[0].lower()]["name"]
    if lang == "ko":
        return "과(와) ".join([options[a.lower()]["name"] for a in axes])
    else:
        return " and ".join([options[a.lower()]["name"] for a in axes])

def generatePrologue(groups, options, reasons, head_y, tail_y, lang="en"):
    # print("generatePrologue", groups, reasons, head_y, tail_y)
    reason_group = {}
    for r, v in reasons.items():
        pattern = v["pattern"][0]
        if pattern not in reason_group:
            reason_group[pattern] = []
        reason_group[pattern].append(r)

    if lang == "ko":
        caption = "{}년부터 {}년까지, ".format(head_y, tail_y)
        for r, ids in reason_group.items():
            gnames = [groups[int(g.split("-")[-1])] for g in ids]
            axis = set([reasons[id]["axis"][0] for id in ids])
            if r == "mostspread":
                caption += "{} {}. ".format(aggrNames(groups, gnames, lang), desc_ko[r])
            else:
                caption += "{}의 {}이(가) {}. ".format(aggrNames(groups, gnames, lang), aggrAxes(list(axis), options, lang), desc_ko[r])
    else:
        caption = "From {} to {}, ".format(head_y, tail_y)
        for r, ids in reason_group.items():
            gnames = [groups[int(g.split("-")[-1])] for g in ids]
            axis = set([reasons[id]["axis"][0] for id in ids])
            if r == "mostspread":
                caption += "{} in {}. ".format(desc[r], aggrNames(groups, gnames, lang), )
            else:
                caption += "{} in {} {}. ".format(aggrAxes(list(axis), options, lang), aggrNames(groups, gnames, lang), desc[r])
    # print(caption)
    # print()
    return caption
