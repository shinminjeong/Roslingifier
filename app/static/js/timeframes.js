class TimeFrames {
  constructor(timeseries, gname) {
    this.timeseries = timeseries;
    this.gname = gname;
    this.playtime = 0; // times timeunit is the playtime
    this.framearr = []; // order of outerbound
    this.rorder = {}; // order of reasons
    this.framemap = {}; // info of inner frames for each outerbound
    this.yearmap = {};
    this.innergrp = {};
    for (var t = 0; t < timeseries.length; t++) {
      var y = this.timeseries[t];
      this.yearmap[y] = {
        "group":[],
        "delay":1,
        "reason":{}
      };
    }
    this.default_slowdown = {
      "noc": 2,
      "var": 15,
      "spr": 20,
      "usr": 10,
      "sum": 2,
    };
    this.captions = {};
  }

  loadData(data) {
    this.timeseries = data.timeseries;
    this.gname = data.gname;
    this.playtime = data.playtime;
    this.framearr = data.framearr;
    this.rorder = data.rorder;
    this.framemap = data.framemap;
    this.yearmap = data.yearmap;
    this.captions = data.captions;
    this.innergrp = data.innergrp;
    this.outerbound = data.outerbound;
    this.timeFrames = data.timeFrames;
    this.timeFrameInfo = data.timeFrameInfo;
  }

  calculateOuterbound() {
    this.outerbound = {};
    var head_y = -1, tail_y = -1;
    var groups = [], reasons = {};
    for (var y in this.yearmap) {
      if (this.yearmap[y]["group"].length > 0) {
        // console.log("-", y, head_y, tail_y)
        groups = groups.concat(this.yearmap[y]["group"]);

        for (var r in this.yearmap[y]["reason"]) {
          var rr = this.yearmap[y]["reason"][r];
          var id = [rr["yrange"][0],rr["yrange"][rr["yrange"].length-1],rr["group"]].join("-");
          reasons[id] = rr;
        }
        if (head_y != -1) {
          tail_y = y;
        } else {
          head_y = tail_y = y;
        }
      } else {
        if (head_y != -1) {
          // console.log("add", head_y, tail_y)
          var end_t = this.timeseries[this.timeseries.indexOf(tail_y)];
          var bound = {
            "start_time": head_y,
            "end_time": end_t,
            "groups": Array.from(new Set(groups)).sort(),
            "reason": reasons,
            "order": Object.keys(reasons)
          }
          bound["prologue"] = this.createPrologue(bound);
          bound["epilogue"] = this.createEpilogue(bound);
          for (r in reasons) {
            this.framemap[r]["outerbound"] = head_y;
          }
          this.outerbound[head_y] = bound;
        }
        head_y = tail_y = -1;
        groups = [];
        reasons = {};
      }
    }
  }

  createPrologue(bound) {
    var id = [bound.start_time, bound.end_time, "p"].join("-");
    var s_t = this.timeseries.indexOf(bound.start_time),
        e_t = this.timeseries.indexOf(bound.end_time);
    this.framemap[id] = {
      "start_time": bound.start_time,
      "end_time": bound.end_time,
      "head": 0,
      "tail": 0,
      "runningtime": (e_t-s_t+1)*this.default_slowdown["sum"],
      "group": "p",
      "axis": ["X", "Y", "S"],
      "name": "I",
      "reason": "pro",
    }
    return id;
  }

  createEpilogue(bound) {
    var id = [bound.start_time, bound.end_time, "e"].join("-");
    var s_t = this.timeseries.indexOf(bound.start_time),
        e_t = this.timeseries.indexOf(bound.end_time);
    this.framemap[id] = {
      "start_time": bound.start_time,
      "end_time": bound.end_time,
      "head": 0,
      "tail": 0,
      "runningtime": (e_t-s_t+1)*this.default_slowdown["sum"],
      "group": "e",
      "axis": ["X", "Y", "S"],
      "name": "O",
      "reason": "pro",
    }
    return id;
  }

  getFrameOrder() {
    // console.log("getFrameOrder")
    var order = [];
    var idx = 0;
    var runningtime = 0;
    for (var i=0; i<this.framearr.length; i++) {
      var r = this.framearr[i];
      var outerbound = r[0]=="init"?this.framemap["init"]:this.outerbound[r[0]];
      if (outerbound == undefined) {
        var s_t = this.timeseries.indexOf(r[0]),
            e_t = this.timeseries.indexOf(r[1]);
        // console.log(r, s_t, e_t, this.timeseries.length, runningtime, this.getTimeFrameLength())
        outerbound = {
          "start_time": r[0],
          "end_time": r[1],
          "head": runningtime,
          "tail": runningtime+(e_t-s_t+1)
        }
        runningtime += (e_t-s_t+1);
        // continue;
      } else {
        if (r[0]=="init") {
          outerbound.head = runningtime;
        } else if (this.framemap[outerbound.prologue] != undefined){
          var prol = this.framemap[outerbound.prologue];
          outerbound.head = prol.head = runningtime;
          // prol.runningtime = this.default_slowdown["sum"]*(1+this.timeseries.indexOf(prol.end_time)-this.timeseries.indexOf(prol.start_time));
          runningtime += prol.runningtime;
          prol.tail = runningtime;
        }

        for (var j=0; j < outerbound.order.length; j++) {
          var b = outerbound.order[j];
          this.framemap[b].head = runningtime;
          this.framemap[b].tail = runningtime + this.framemap[b].runningtime;
          runningtime += this.framemap[b].runningtime;
        }
        if (r[0]=="init") {
          outerbound.tail = runningtime;
        } else if (this.framemap[outerbound.epilogue] != undefined){
          var epil = this.framemap[outerbound.epilogue];
          epil.head = runningtime;
          // epil.runningtime = this.default_slowdown["sum"]*(1+this.timeseries.indexOf(epil.end_time)-this.timeseries.indexOf(epil.start_time));
          runningtime += epil.runningtime;
          outerbound.tail = epil.tail = runningtime;
        }
      }

      order.push({
        "order": idx++,
        "id": r[0],
        "outerbound": outerbound
      });
    }
    return order;
  }

  saveInnerGroupInfo(head, tail, groupinfo) {
    for (var y = head; y <= tail; y++) {
      this.innergrp[y] = groupinfo;
    }
  }

  saveCaption(gid, text){
    this.captions[gid] = text;
  }

  getCaption(gid) {
    return this.captions[gid];
  }

  getFrameMap() {
    return this.framemap;
  }

  getTimeFrameLength() {
    return Object.keys(this.timeFrames).length;
  }

  getTimeFrames() {
    return this.timeFrames;
  }

  getFrameContent(i) {
    return this.timeFrameInfo[i];
  }

  editFrameWidth(id, orig_w, new_w) {
    var frame_info = this.framemap[id];
    var new_runningtime = parseInt(frame_info.runningtime * new_w / orig_w);
    // console.log("editFrameWidth", frame_info, frame_info.runningtime, new_runningtime)

    frame_info.runningtime = new_runningtime;
    frame_info.tail = frame_info.head + new_runningtime;

    this.calculateTimeFrames();
  }

  calculateTimeFrames() {
    this.timeFrames = {};
    this.timeFrameInfo = {};
    var last_idx = 0, i = 0;
    this.framearr = [["init", "init"]];
    for (var r in this.framemap["init"].reason) {
      for (var j=0; j<this.framemap["init"].reason[r].runningtime; j++) {
        this.timeFrames[i] = "init";
        this.timeFrameInfo[i] = r;
        i++;
      }
    }
    for (var o in this.outerbound){
      var outerb = this.outerbound[o];

      // add blank frame
      var cur_s = this.timeseries.indexOf(outerb.start_time);
      if (cur_s-last_idx > 1) {
        // console.log("b~~~",i, this.timeseries[last_idx+1], this.timeseries[cur_s-1], last_idx+1, cur_s-1)
        this.framearr.push([this.timeseries[last_idx+1], this.timeseries[cur_s-1]]);
        i = this.getTimeFrameLength();
        for (var j=last_idx+1; j<=cur_s-1; j++) {
          this.timeFrames[i] = this.timeseries[j];
          this.timeFrameInfo[i] = [this.timeseries[last_idx+1], this.timeseries[cur_s-1], "b"].join("-");
          i++;
        }
      }

      this.framearr.push([outerb.start_time, outerb.end_time]);
      var arr = [outerb.prologue, ...outerb.order, outerb.epilogue];
      for (var a in arr) {
        var r = arr[a];
        // console.log(r, this.framemap[r])
        if (this.framemap[r] == undefined) continue;
        var s_idx = this.timeseries.indexOf(this.framemap[r].start_time),
            e_idx = this.timeseries.indexOf(this.framemap[r].end_time),
            runtime_unit = Math.round(this.framemap[r].runningtime/(e_idx-s_idx+1));
        i = this.getTimeFrameLength();
        // console.log("o~~~", i, r, this.framemap[r].start_time, this.framemap[r].end_time, s_idx, e_idx, runtime_unit)
        for (var j=s_idx; j<=e_idx; j++) {
          for (var u=0; u<runtime_unit; u++) {
            this.timeFrames[i] = this.timeseries[j];
            this.timeFrameInfo[i] = r;
            i++;
          }
        }
      }
      last_idx = this.timeseries.indexOf(outerb.end_time);
    }
    // add last blank frame
    this.framearr.push([this.timeseries[last_idx+1], this.timeseries[this.timeseries.length-1]]);
    i = this.getTimeFrameLength();
    // console.log("b~~~",i, this.timeseries[last_idx+1], this.timeseries[this.timeseries.length-1], last_idx, this.timeseries.length-1)
    for (var j=last_idx+1; j<=this.timeseries.length-1; j++) {
      this.timeFrames[i] = this.timeseries[j];
      this.timeFrameInfo[i] = [this.timeseries[last_idx+1], this.timeseries[this.timeseries.length-1], "b"].join("-");
      i++;
    }
    this.timeFrames[i] = "finish";
  }

  updateCaption(id, value) {
    var ids = id.split("-");
    // console.log("updateCaption", ids, parseInt(id[2]))
    for (var y = this.timeseries.indexOf(ids[0]); y <= this.timeseries.indexOf(ids[1]); y++) {
      var year = this.timeseries[y];
      caption[year][ids[2]] = value;
    }
  }

  addInitSeq(group, axis, reason, caption) {
    var initdelay = {"X": 10, "Y": 10, "S": 20, "G": 10, "Trend": 20};
    if (this.framemap["init"] == undefined) {
      this.framemap["init"] = {
        "head": 0,
        "tail": 0,
        "start_time": "Init",
        "caption": "Init",
        "reason": {},
        "order": [],
        "runningtime": 0,
      }
    }
    var id = ["init", axis[0], group].join("-");
    var frame = {
      "head": 0,
      "tail": 0,
      "start_time": "init",
      "end_time": axis[0],
      "caption": caption,
      "name": axis[0],
      "group": group,
      "runningtime": initdelay[axis[0]],
    }
    this.framemap[id] = frame;
    this.framemap.init.runningtime += initdelay[axis[0]];
    this.framemap.init.reason[id] = frame;
    this.framemap.init.order.push(id);
  }

  addFrames(data_focus_range) {
    for (var i in data_focus_range) {
      var d = data_focus_range[i];
      this.addFrame(d.years, d.g, d.a, d.reason, d.pattern);
    }
  }

  addFrame(range, group, axis, reason, pattern) {
    if (range.length == 1 && range[0] == "init") {
      return this.addInitSeq(group, axis, reason, pattern);
    }

    var s_time = ""+range[0], e_time = ""+range[range.length-1];
    var id = [s_time, e_time, group].join("-");
    var names = [];
    for (var i in axis) {
      names.push(data_options[axis[i].toLowerCase()]["id"])
    }
    // console.log("addFrame", range, s_time, e_time, id, names, group, reason);
    var s_year = this.timeseries.indexOf(s_time),
        e_year = this.timeseries.indexOf(e_time);

    for (var i = s_year; i <= e_year; i++) {
      var t = this.timeseries[i];
      this.yearmap[t]["group"].push(+group)
      if (reason != "sum") this.yearmap[t]["delay"] = this.default_slowdown[reason];
      this.yearmap[t]["reason"][id] = {
        "yrange": range,
        "group": group,
        "axis": axis,
        "reason": reason,
        "pattern": pattern,
      }
    }
    this.framemap[id] = {
      "start_time": s_time,
      "end_time": e_time,
      "group": group,
      "head": 0,
      "tail": 0,
      "axis": axis,
      // "name": names,
      "name": axis,
      "reason": reason,
      "pattern": pattern,
      "inner": [],
      "runningtime": (e_year-s_year+1)*this.default_slowdown[reason],
    }

    this.calculateOuterbound();
  }

  removeFrame(id) {
    var ids = id.split("-");
    var s_time = this.timeseries.indexOf(ids[0]),
        e_time = this.timeseries.indexOf(ids[1]);
    for (var i = s_time; i <= e_time; i++) {
      var y = this.timeseries[i];
      // remove group number from yearmap
      var idx = this.yearmap[y]["group"].indexOf(parseInt(ids[2]));
      if (idx == -1) continue;
      this.yearmap[y]["group"].splice(idx, 1);
      delete this.yearmap[y]["reason"][id];
      if (this.yearmap[y]["group"].length == 0) {
        this.yearmap[y]["delay"] = 1;
        this.yearmap[y]["reason"] = {};
      }
    }
    // console.log("removeFrame -- delete frame", id)
    delete this.framemap[id];
    this.calculateOuterbound();
  }

}
