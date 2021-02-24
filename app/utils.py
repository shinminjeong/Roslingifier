import os, sys
import numpy as np
from sklearn import cluster, covariance, manifold
from sklearn.cluster import KMeans, AffinityPropagation, MeanShift
from scipy.spatial.distance import euclidean
from sklearn.preprocessing import normalize

def get_dict_from_request(reason):
    pardict = {}
    for k, v in reason.items():
        n = [n.replace("]", "") for n in k.split("[")]
        if n[0] != "reason": continue
        if n[1] in pardict:
            pardict[n[1]][n[2]] = v
        else:
            pardict[n[1]] = {n[2]:v}
    return pardict

def change_pattern(yrange, V):
    values = {v["time"]: v["value"] for v in V}
    leftmost = values[yrange[0]]
    rightmost = values[yrange[-1]]
    minvalue = min([values[y] for y in yrange])
    maxvalue = max([values[y] for y in yrange])
    # print("change_pattern", leftmost, rightmost, minvalue, maxvalue)
    if leftmost == minvalue and rightmost == maxvalue: ## increase
        return "increased"
    if leftmost == maxvalue and rightmost == minvalue: ## decrease
        return "decreased"
    if minvalue < min(leftmost, rightmost): ## go down then up
        return "downup"
    if maxvalue > max(leftmost, rightmost): ## go up then down
        return "updown"

def get_evt_rapid_change(timeseries, groups, axes, V):
    range_max = {g:{} for g in groups}
    output = []
    cont_threshold = 5
    for g in groups:
        spreadv = {v["time"]:0 for v in V[g][axes[0]]}
        for a in axes:
            # print(a, [(v["year"], v["value"]) for v in V[g][a]])
            #### (1) when there is a sharp change in value
            yrange = []
            minv = min([v["min"] for v in V[g][a]])
            maxv = max([v["max"] for v in V[g][a]])
            threshold_max = (maxv-minv)*0.03
            range_max[g][a] = {v["time"]:abs(w["value"]-v["value"]) for w, v in zip(V[g][a],V[g][a][1:]) if abs(w["value"]-v["value"]) > threshold_max}
            for y, thd in range_max[g][a].items():
                if len(yrange) > 0 and timeseries.index(y) - timeseries.index(yrange[-1]) >= cont_threshold:
                    output.append({
                        "reason": "var",
                        "pattern": change_pattern(yrange, V[g][a]),
                        "g": g,
                        "a": [a],
                        "years": yrange
                    })
                    yrange = [timeseries[timeseries.index(y)-1], y]
                else:
                    pre = timeseries[timeseries.index(y)-1]
                    yrange.append(y) if pre in yrange else yrange.extend([pre, y])
            if len(yrange) > 0:
                output.append({
                    "reason": "var",
                    "pattern": change_pattern(yrange, V[g][a]),
                    "g": g,
                    "a": [a],
                    "years": yrange
                })
    return output

def get_evt_no_change(timeseries, groups, axes, V):
    output = []
    range_min = {g:{} for g in groups}
    cont_threshold = 19
    for g in groups:
        for a in axes:
            # print(a, [(v["year"], v["value"]) for v in V[g][a]])
            #### (2) when there is almost no change in value
            yrange = []
            minv = min([v["min"] for v in V[g][a]])
            maxv = max([v["max"] for v in V[g][a]])
            threshold_min = (maxv-minv)*0.0001
            range_min[g][a] = {v["time"]:abs(w["value"]-v["value"]) for w, v in zip(V[g][a],V[g][a][1:]) if abs(w["value"]-v["value"]) < threshold_min}
            for y, thd in range_min[g][a].items():
                pre = timeseries[timeseries.index(y)-1]
                if pre in yrange:
                    yrange.append(y)
                elif len(yrange) == 0 or timeseries.index(y) - timeseries.index(yrange[-1]) <= 1:
                    yrange.extend([pre, y])
                else:
                    if len(yrange) > cont_threshold:
                        output.append({
                            "reason": "noc",
                            "pattern": "nochange",
                            "g": g,
                            "a": [a],
                            "years": yrange
                        })
                    yrange = [pre, y]
    return output

def get_evt_most_spread(timeseries, groups, axes, V):
    output = []
    for g in groups:
        spreadv = {v["time"]:0 for v in V[g][axes[0]]}
        for a in axes:
            maxv = max([v["max"] for v in V[g][a]])
            for v in V[g][a]:
                if a != "S":
                    spreadv[v["time"]] += v["diff"]/maxv
        if g == 0:
            mostspread = sorted(spreadv.items(), key=lambda x:x[1], reverse=True)[0]
            next = timeseries[timeseries.index(mostspread[0])+1]
            output.append({
                "reason": "spr",
                "pattern": "mostspread",
                "g": g,
                "a": ["X", "Y"],
                "years": [mostspread[0], next]
            })
    return output

def get_focus_range(timeseries, groups, axes, V):
    output = []
    output.extend(get_evt_rapid_change(timeseries, groups, axes, V))
    output.extend(get_evt_no_change(timeseries, groups, axes, V))
    output.extend(get_evt_most_spread(timeseries, groups, axes, V))
    # print(output)
    return output

def avg_value(X, len):
    n, m = X.shape
    X = normalizeVector(X, len)
    avg_d = np.average(X, axis=0)
    min_d = np.amin(X, axis=0)
    max_d = np.amax(X, axis=0)
    return avg_d, min_d, max_d

def avg_variance(X, len):
    n, m = X.shape
    X = normalizeVector(X, len)
    X1 = np.roll(X, 1)
    X1[:, 0] = 0
    diff = X-X1
    avg_d = np.average(diff, axis=0)
    min_d = np.amin(diff, axis=0)
    max_d = np.amax(diff, axis=0)
    for i in range(0, m, len):
        avg_d[i] = min_d[i] = max_d[i] = 0
    return avg_d, min_d, max_d

def normalizeVector(X, len):
    n, m = X.shape
    # Normalize values by axis
    for r in range(0, m, len):
        X[:, r:r+len] = normalize(X[:, r:r+len])
    return X

def cluster_Kmeans(X, num):
    kmeans = KMeans(n_clusters=num, random_state=0)
    trans = kmeans.fit_transform(X)
    labels = kmeans.labels_
    centers = kmeans.cluster_centers_
    return labels, num, trans

def cluster_AP(X):
    af = AffinityPropagation(damping=0.9).fit(X)
    cluster_centers_indices = af.cluster_centers_indices_
    labels = af.labels_
    afmatrix = -af.affinity_matrix_
    centers = af.cluster_centers_
    n_clusters = len(cluster_centers_indices)
    print("AP] Estimated number of clusters: %d" % (n_clusters))
    return labels, n_clusters, afmatrix


def cluster_MeanShift(X):
    clustering = MeanShift(bin_seeding=True).fit(X)
    labels = clustering.labels_
    cluster_centers = clustering.cluster_centers_
    labels_unique = np.unique(labels)
    n_clusters = len(labels_unique)
    print("MeanShift] Estimated number of clusters: %d" % (n_clusters))
    return labels, n_clusters, cluster_centers


def minmax_for_group(years, K, kgroups, selectedAxis, values):
    print(selectedAxis)
    minmax = {g:{y:{a:{"min": 0, "max": 0} for a in selectedAxis} for y in years} for g in range(0, K)}
    G = {g:[] for g in range(0, K)}
    for cname, cv in kgroups.items():
        G[cv["group"]].append(cv["index"])
        G[0].append(cv["index"]) # for group 0
    for y in years:
        for cgroup, cindex in G.items():
            for a in selectedAxis:
                minmax[cgroup][y][a]["min"] = min(values.loc[cindex][y+"_{}".format(a.lower())])
                minmax[cgroup][y][a]["max"] = max(values.loc[cindex][y+"_{}".format(a.lower())])
    # print(minmax)
    return G, minmax


def minmax_for_group_slice(years, K, kgroups, selectedAxis, values):
    print(selectedAxis)
    minmax = {y:{g:{a:{"min": 0, "max": 0} for a in selectedAxis} for g in range(0, K[y])} for y in years}
    G = {y:{g:[] for g in range(0, K[y])} for y in years}
    for y, value in kgroups.items():
        for cname, cv in value.items():
            G[y][cv["group"]].append(cv["index"])

    print(G.keys())
    print(minmax.keys())
    for y in years:
        for cgroup, cindex in G[y].items():
            for a in selectedAxis:
                minmax[y][cgroup][a]["min"] = min(values.loc[cindex][y+"_{}".format(a.lower())])
                minmax[y][cgroup][a]["max"] = max(values.loc[cindex][y+"_{}".format(a.lower())])
    return G, minmax
