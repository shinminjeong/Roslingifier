const zeroPad = (num, places) => String(num).padStart(places, '0');
var timeScale, timeScale_width, xAxis_1, xAxis_2, xAxis_3, xAxis_year, xAxis_year_h;
var timeSlices, timeLabels, timeCaptions, frameText, chartExpand;
var selected_tframe, selected_label;
var dragbarright, dragbarw = 6;

class TimeLine {

  constructor(div_id, w) {
    this.margin = {top: 25, right: 60, bottom: 25, left:leftTimelineMargin};
    this.width = timeScale_width = w - this.margin.left - this.margin.right;
    this.div_id_frames = div_id + "-background";
    this.div_id = div_id;

    this.slice_h = 40;
    this.caption_h = 20;
    this.year_h = 20;
    this.nfloorlabels = 0;

    timeSlices = [];
    timeLabels = [];
    timeCaptions = [];
    frameText = [];
    chartExpand = false;
    this.h_years = [];

    this.s_height = this.slice_h+this.caption_h+this.year_h+this.margin.top+this.margin.bottom;
    this.l_height = this.caption_h+this.slice_h*legendCount+this.year_h+this.margin.top+this.margin.bottom;
    this.height = this.s_height;
  }

  initChart() {
    console.log("Timeline -- initchart");
    this.labelpanel = document.getElementById(this.div_id + "-label");
    this.legendpanel = document.getElementById(this.div_id + "-legend");
    this.controlpanel = document.getElementById(this.div_id + "-control");
    this.captionpanel = document.getElementById(this.div_id);

    const extent = [[0,0], [timeScale_width, 0]];
    this.zoom = d3.zoom()
      .scaleExtent([1, 8])
      .translateExtent(extent)
      .extent(extent)
      .on("zoom", zoomed);
    this.svg = d3.select("#"+this.div_id_frames)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('transform', 'translate(' + this.margin.left + ',0)')
      .call(this.zoom);

    var defs = this.svg.append("defs");
    defs.append("pattern")
      .attr("id", "icon_delete_w")
      .attr("width", 15)
      .attr("height", 15)
      .append("image")
      .attr("width", 15)
      .attr("height", 15)
      .attr("x", 0)
      .attr("y", 0)
      .attr("xlink:href", "/static/images/icon_delete_w.png");

    defs.append("pattern")
      .attr("id", "icon_delete_h")
      .attr("width", 15)
      .attr("height", 15)
      .append("image")
      .attr("width", 15)
      .attr("height", 15)
      .attr("x", 0)
      .attr("y", 0)
      .attr("xlink:href", "/static/images/icon_delete_h.png");

    this.chart_g = this.svg.append('g')
      .attr("id", "chart_g")
    this.background_label = this.svg.append("rect")
      .attr("x", 0)
      .attr("y", this.margin.top)
      .attr("width", this.width)
      .attr("height", 0)
      .style("fill", "#e3e3e3");
    this.background = this.chart_g.append("rect")
      .attr("x", 0)
      .attr("y", this.margin.top)
      .attr("width", this.width)
      .attr("height", this.height-this.margin.top-this.margin.bottom)
      .style("fill", "#e3e3e3");

    this.grid = this.svg.append("g");
    this.x_1 = this.grid.append("g");
    this.x_2 = this.grid.append("g");
    this.x_3 = this.grid.append("g");
    this.x_year = this.chart_g.append("g");
    this.x_year_h = this.chart_g.append("g");
    this.framegrid = this.chart_g.append("g").attr("class", "grid");

    this.dragbars = this.svg.append("g");
    dragbarright = this.dragbars.append("rect")
      .attr("class", "dragbar")
      .attr("id", "dragright")
      .attr("height", this.slice_h)
      .attr("width", dragbarw)
      .attr("display", "none")
      .on("contextmenu", function() { d3.event.preventDefault(); })
      .call(d3.drag()
        .on("drag", rdragResize)
        .on("start", rdragResizeStart)
        .on("end", rdragResizeEnd)
      );

    this.setControlPanel();
  }

  setControlPanel() {
    this.legendpanel.style.width = this.margin.left;
    this.legendpanel.style.height = this.height;
    this.controlpanel.style.marginLeft = this.width+this.margin.left+20;
    this.controlpanel.style.width = this.margin.right;
    this.controlpanel.style.height = this.height;

    var resetBtn = document.createElement("button");
    resetBtn.className = "control-buttom control-buttom-reset";
    resetBtn.innerText = "Reset zoom";
    resetBtn.addEventListener("click", function() {
      console.log("reset button clicked!");
      refresh(true);
    });

    var expandBtn = document.createElement("button");
    expandBtn.className = "control-buttom control-buttom-expand";
    expandBtn.innerHTML = "<i class='fa fa-chevron-down'></i>";
    expandBtn.addEventListener("click", function(e) {
      chartExpand = !chartExpand;
      var target = e.target;
      if (e.target.tagName == "I") target = e.target.parentNode;
      // console.log("expand button clicked!", chartExpand, target);
      if (chartExpand) target.innerHTML = "<i class='fa fa-chevron-up'></i>";
      else target.innerHTML = "<i class='fa fa-chevron-down'></i>";
      toggleMenuOff();
      expandChart(chartExpand);
    });

    this.controlpanel.appendChild(resetBtn);
    this.controlpanel.appendChild(expandBtn);
  }

  drawFrameGrid() {
    var framelines = [];
    if (chartExpand) {
      this.height = this.l_height;
      for (var i = 0; i <= legendCount; i++) framelines.push(this.caption_h+i*this.slice_h);
      this.svg.attr('height', this.height);
      this.background.attr("height", this.height-this.getLabelHeight()-this.margin.top-this.margin.bottom);
    } else {
      this.height = this.s_height;
      framelines = [this.caption_h, this.caption_h+this.slice_h];
      this.svg.attr('height', this.height);
      this.background.attr("height", this.height-this.getLabelHeight()-this.margin.top-this.margin.bottom);
    }
    this.legendpanel.style.height = this.height;
    this.controlpanel.style.height = this.height;

    this.framegrid.selectAll("*").remove();
    this.framegrid
      .selectAll("line")
      .data(framelines)
    .enter().append("line")
      .attr("x1", 0)
      .attr("y1", d => d+this.margin.top)
      .attr("x2", this.width)
      .attr("y2", d => d+this.margin.top)
      .attr("stroke", "black")
      .attr("stroke-width", 1);
  }

  resizeChart(timeframesmap, forder, fmap) {
    var timeframes = Object.keys(timeframesmap);
    // console.log("resizeChart", timeframes.length);
    this.updateXaxis(timeframes, false);
    for (var f in forder) {
      var outerbound = forder[f].outerbound;
      if (outerbound.reason == undefined) {// blank interval
        // console.log("blank", [outerbound.start_time, outerbound.end_time], [outerbound.head, outerbound.tail]);
        timeline.addBlankCaption([outerbound.start_time, outerbound.end_time], [outerbound.head, outerbound.tail]);
      } else {
        this.addOuterBound([outerbound.head, outerbound.tail], outerbound)
        var oframes = Object.keys(outerbound.reason);
        if (outerbound.start_time != "Init")
          oframes = [outerbound.prologue, ...Object.keys(outerbound.reason), outerbound.epilogue];
        for (var i = 0; i < oframes.length; i++) {
          var r = oframes[i];
          if (fmap[r] == undefined) continue;
          // console.log("fmap", r, fmap[r]);
          this.addFrame([fmap[r].head, fmap[r].tail], [fmap[r].start_time, fmap[r].end_time], fmap[r].group, fmap[r].name, fmap[r].reason, fmap[r].pattern, fmap[r].runningtime)
        }
        getCaption(outerbound);
      }
    }
    this.drawYearTicks();
    this.rescaleLabels();
  }

  rescaleLabels() {
    // resize labels
    savedLabels = [];
    timeLabels.forEach(function(d) {
      var cur_time_slice = $("textarea#"+d.getAttribute("id")+".time-caption");
      var f_start = parseFloat(cur_time_slice.attr("data-s-time"));
      var f_end = parseFloat(cur_time_slice.attr("data-e-time"));
      var s = timeScale(f_start),
          e = timeScale(f_end);
      d.style.left = leftTimelineMargin+s;
      d.style.width = e-s;
      d.setAttribute("data-s-time", f_start)
      d.setAttribute("data-e-time", f_end)
      d.setAttribute("data-o-width", e-s);

      var item_id = d.getAttribute("data-item-id");
      saveNewLabel(item_id, f_start, f_end);
    })
  }

  updateChart(timeframesmap, forder, fmap, resetZoom=false) {
    this.drawFrameGrid();

    var timeframes = Object.keys(timeframesmap);
    this.updateXaxis(timeframes, resetZoom);
    for (var f in forder) {
      var outerbound = forder[f].outerbound;
      // console.log("outerbound", f, outerbound);
      if (outerbound.reason == undefined) {// blank interval
        timeline.addBlankCaption([outerbound.start_time, outerbound.end_time], [outerbound.head, outerbound.tail]);
      } else {
        this.addOuterBound([outerbound.head, outerbound.tail], outerbound)

        var oframes = Object.keys(outerbound.reason);
        if (outerbound.start_time != "Init")
          oframes = [outerbound.prologue, ...Object.keys(outerbound.reason), outerbound.epilogue];
        for (var i = 0; i < oframes.length; i++) {
          var r = oframes[i];
          if (fmap[r] == undefined) continue;
          // console.log("fmap", r, fmap[r]);
          this.addFrame([fmap[r].head, fmap[r].tail], [fmap[r].start_time, fmap[r].end_time], fmap[r].group, fmap[r].name, fmap[r].reason, fmap[r].pattern, fmap[r].runningtime)

          if (fmap[r].group == "p" || fmap[r].group == "e") continue;
          addEventinLinechart([fmap[r].start_time, fmap[r].end_time], fmap[r].group, fmap[r].axis, fmap[r].reason, fmap[r].pattern);
        }
        getCaption(outerbound);
      }
    }
    this.drawYearTicks();
    this.rescaleLabels();
  }

  calculateTickValues(timeframes) {
    this.tickEveryMinute = [];
    this.tickEvery20Secs = [];
    this.tickEverySecond = [];
    for (var y = 0; y < timeframes.length; y++) {
      if ((y * timeunit)%(60*1000) == 0) this.tickEveryMinute.push(timeframes[y]);
      if ((y * timeunit)%(20*1000) == 0) this.tickEvery20Secs.push(timeframes[y]);
      if ((y * timeunit)%(1000) == 0) this.tickEverySecond.push(timeframes[y]);
    }
  }

  updateXaxis(timeframes, resetZoom=false) {
    var zoomTransform = d3.zoomTransform(this.svg.node());
    // console.log("updateXaxis", resetZoom, timeframes.length, 0, this.width, zoomTransform)
    if (resetZoom) {
      zoomTransform = d3.zoomIdentity;
      this.svg.call(this.zoom.transform, d3.zoomIdentity);
    }

    this.calculateTickValues(timeframes);
    timeScale = d3.scaleBand()
      .domain(timeframes)
      .range([ zoomTransform.x, zoomTransform.x+zoomTransform.k*this.width ])
      .paddingInner(0)
      .paddingOuter(0);

    this.x_1.selectAll("*").remove();
    this.x_2.selectAll("*").remove();
    this.x_3.selectAll("*").remove();

    xAxis_1 = d3.axisBottom(timeScale)
      .tickSize(this.margin.top)
      .tickValues(this.tickEveryMinute)
      .tickFormat("");
    xAxis_2 = d3.axisBottom(timeScale)
      .tickSize(15)
      .tickFormat(function(d) {
        var totalsec = d*timeunit/1000;
        var min = parseInt(totalsec/60), sec = totalsec%60;
        return zeroPad(min, 2)+":"+zeroPad(sec, 2)+":00";
      })
      .tickValues(this.tickEvery20Secs);
    xAxis_3 = d3.axisBottom(timeScale)
      .tickFormat("")
      .tickValues(this.tickEverySecond);

    this.x_1.attr('class', 'timeline-x-axis timeline-x-axis-min').call(xAxis_1);
    this.x_2.attr("class", "timeline-x-axis timeline-x-axis-20sec").call(xAxis_2);
    this.x_3.attr("class", "timeline-x-axis timeline-x-axis-grid").call(xAxis_3);
    this.x_2.selectAll('.timeline-x-axis-20sec text')
        .attr('transform', 'translate(21,-5)');

    this.clearAllFrames();
  }

  drawYearTicks() {
    var timeframes = Object.values(testtimeframes.getTimeFrames());
    this.tickEveryYear = [];
    this.tickHighlightYears = [];
    for (var b = 1; b < timeframes.length; b++) {
      if (timeframes[b-1] != timeframes[b]) this.tickEveryYear.push(b);
    }
    for (var b = 0; b < this.h_years.length; b++) {
      if (timeframes.indexOf(this.h_years[b]) == -1) continue;
      this.tickHighlightYears.push(timeframes.indexOf(this.h_years[b]));
    }

    this.x_year.selectAll("*").remove();
    xAxis_year = d3.axisTop(timeScale)
      .tickFormat("")
      .tickValues(this.tickEveryYear);
    this.x_year
      .attr("transform", "translate(0," + (this.height-this.getLabelHeight()) + ")")
      .attr("class", "timeline-x-axis timeline-x-axis-year").call(xAxis_year);

    this.x_year_h.selectAll("*").remove();
    xAxis_year_h = d3.axisTop(timeScale)
      .tickSize(this.margin.bottom)
      .tickFormat(function(d) {
        var y = testtimeframes.getTimeFrames()[d];
        return y=="init"?"":y;
      })
      .tickValues(this.tickHighlightYears);

    this.x_year_h
      .attr("transform", "translate(0," + (this.height-this.getLabelHeight()) + ")")
      .attr("class", "timeline-x-axis timeline-x-axis-year-h").call(xAxis_year_h);
    this.x_year_h.selectAll('.timeline-x-axis-year-h text')
      .attr('transform', 'translate(12,+15)');

    this.h_years = [];
  }

  clearAllFrames() {
    for (var i = 0; i < timeSlices.length; i++) {
        var f = timeSlices[i];
        f.remove();
    }
    for (var i = 0; i < timeCaptions.length; i++) {
        var f = timeCaptions[i];
        f.remove();
    }
    // for (var i = 0; i < timeLabels.length; i++) {
    //     var f = timeLabels[i];
    //     f.remove();
    // }
    for (var i = 0; i < frameText.length; i++) {
        var f = frameText[i];
        f.remove();
    }
    // timeLabels = [];
    timeSlices = [];
    timeCaptions = [];
    frameText = [];
  }

  addFrame(frange, yrange, gindex, name, reason, pattern, delay) {
    var f_start = frange[0],
        f_end = frange[frange.length-1];
    var y_start = yrange[0],
        y_end = yrange[yrange.length-1];
    var s = timeScale(f_start),
        e = timeScale(f_end);
    // console.log("addFrame", gindex, f_start, f_end, y_start, y_end, s, e, delay);

    var top = this.margin.top+this.caption_h,
        left = s+timeScale.bandwidth()/2;

    var frame_id = [y_start, y_end, gindex].join("-");
    var gid = gindex;
    if (gindex == "p" || gindex == "e")
      gid = 0;

    var tframe = this.chart_g.append("rect")
      .attr("class", "time-slice")
      .attr("id", frame_id)
      .attr("x", left)
      .attr("y", chartExpand?top+this.slice_h*gid:top)
      .attr("edit", "off")
      .attr("width", e-s)
      .attr("height", this.slice_h)
      .attr("data-s-time", f_start)
      .attr("data-e-time", f_end)
      .style("fill", gcolor(gid));

    addTFrameListener(tframe, frame_id);
    timeSlices.push(tframe);

    var tframe_text = this.chart_g.append("text")
      .attr("class", "time-slice")
      .attr("id", frame_id)
      .attr("x", left+4)
      .attr("y", chartExpand?32+top+this.slice_h*gid:32+top)
      .attr("data-s-time", f_start)
      .attr("data-e-time", f_end)
      .text(name);
    frameText.push(tframe_text);
    if (y_start != "init") {
      var speedrate = delay/(timeseries.indexOf(y_end)-timeseries.indexOf(y_start)+1);
      var tframe_text_speed = this.chart_g.append("text")
        .attr("class", "time-slice")
        .attr("id", frame_id)
        .attr("x", left+4)
        .attr("y", chartExpand?16+top+this.slice_h*gid:16+top)
        .attr("data-s-time", f_start)
        .attr("data-e-time", f_end)
        .text("x"+parseFloat((1/speedrate).toFixed(2)));
      frameText.push(tframe_text_speed);
      addTFrameListener(tframe_text_speed, frame_id);
    }
    addTFrameListener(tframe_text, frame_id);

    if (pattern != undefined) {
      var tframe_text_3 = this.chart_g.append("image")
        .attr("class", "time-slice")
        .attr("id", frame_id)
        .attr("href", "static/images/icon_"+pattern+".png")
        .attr("x", left+name.length*12)
        .attr("y", chartExpand?24+top+this.slice_h*gid:24+top)
        .attr("width", 10)
        .attr("height", 10)
        .attr("data-n-length", name.length)
        .attr("data-s-time", f_start)
        .attr("data-e-time", f_end)
        .style("cursor", "pointer")
        .text([y_start, y_end].join("-"));
      frameText.push(tframe_text_3);
      addTFrameListener(tframe_text_3, frame_id);
    }
  }

  clearOuterBound() {
    $("div.time-slice-outer").remove();
  }

  addOuterBound(yrange, obound) {
    var y_start = yrange[0],
        y_end = yrange[yrange.length-1];
    var s = timeScale(y_start),
        e = timeScale(y_end);

    // console.log("addOuterBound", y_start, y_end, s, e)
    var frameHeight = chartExpand?this.slice_h*legendCount+this.year_h:this.slice_h+this.year_h;
    var tframe = this.chart_g.append("rect")
      .attr("class", "time-slice-outer")
      .attr("data-s-time", y_start)
      .attr("data-e-time", y_end)
      .attr("x", s+timeScale.bandwidth()/2)
      .attr("y", this.margin.top+this.caption_h)
      .attr("width", e-s)
      .attr("height", frameHeight);

    var name = obound.start_time;
    if (obound.end_time != undefined) name += "-"+obound.end_time;
    var tframe_text = this.chart_g.append("text")
      .attr("class", "time-slice-outer")
      .attr("data-s-time", y_start)
      .attr("data-e-time", y_end)
      .attr("x", s+timeScale.bandwidth()/2)
      .attr("y", frameHeight+this.margin.top+this.caption_h-3)
      .text(name);

    this.h_years.push(obound.start_time);
    // this.h_years.push(obound.end_time);

    timeSlices.push(tframe);
    frameText.push(tframe_text);
  }

  createCaptionFrame(gid, f_start, f_end, caption) {
    var s = timeScale(f_start),
        e = timeScale(f_end);
    // console.log("createCaptionFrame", gid, f_start, f_end, e-s)
    var tframe = $("textarea#"+gid+".time-caption")[0];
    if (tframe == undefined) {
      tframe = document.createElement("textarea");
      tframe.className = "time-caption"
      tframe.id = gid;
    }
    tframe.id = gid;
    tframe.style.top = 0;
    tframe.style.left = this.margin.left+s;
    tframe.style.width = e-s;
    tframe.style.height = this.caption_h;
    tframe.value = caption;

    tframe.setAttribute("num-labels", $("div#"+gid+".time-label").length)
    tframe.setAttribute("data-s-time", f_start);
    tframe.setAttribute("data-e-time", f_end);
    tframe.setAttribute("data-o-width", e-s);
    tframe.setAttribute("data-o-height", this.caption_h);
    tframe.addEventListener("click", function(e) {
      e.target.style.overflowX = "visible";
      e.target.style.whiteSpace = "normal";
      e.target.style.width = Math.max(150, e.target.getAttribute("data-o-width"));
      e.target.style.height = "auto";
      e.target.style.zIndex = 10;
      e.target.style.backgroundColor = "#007bff";
    });
    tframe.addEventListener("mouseout", function(e) {
      e.target.style.overflowX = "hidden";
      e.target.style.whiteSpace = "nowrap";
      e.target.style.width = e.target.getAttribute("data-o-width");
      e.target.style.height = e.target.getAttribute("data-o-height");
      e.target.style.zIndex = 3;
      e.target.style.backgroundColor = "#002654";
    });
    tframe.addEventListener("change", function(e) {
      // console.log("caption changed", e.target, e.target.value);
      updateCaption(e.target.id, e.target.value);
    })

    timeCaptions.push(tframe);
    this.captionpanel.appendChild(tframe);
  }

  updateCaption(frame_id, new_caption) {
    var tframe = $("textarea#"+frame_id+".time-caption");
    tframe[0].value = new_caption;
  }

  addBlankCaption(years, frames) {
    var gid = [years[0], years[1], "b"].join("-");
    var caption;
    if (testtimeframes.getCaption(gid) == undefined) {
      caption = ""
      // caption = "From "+years[0]+" to "+years[1]+", here is the general trends.";
    } else {
      caption = testtimeframes.getCaption(gid);
    }
    this.createCaptionFrame(gid, frames[0], frames[1], caption);
    updateCaption(gid, caption);
  }

  addCaption(gid, caption) {
    var corrFrame = $("rect#"+gid+".time-slice")[0];
    // console.log("addCaption", gid, caption, corrFrame)
    if (corrFrame == undefined)
      return;

    var f_start = corrFrame.getAttribute("data-s-time"),
        f_end = corrFrame.getAttribute("data-e-time");
    this.createCaptionFrame(gid, f_start, f_end, caption);
  }

  getLabelHeight() {
    var maxHeight = 0;
    $.each($("textarea.time-caption"), function(k, v) {
      if (v.getAttribute("num-labels")) maxHeight = Math.max(maxHeight, v.getAttribute("num-labels"))
    });
    this.nfloorlabels = maxHeight;
    return this.nfloorlabels*this.caption_h;
  }

  updateLabelHeight() {
    // console.log("updateLabelHeight")
    this.captionpanel.style.marginTop = this.getLabelHeight();

    this.s_height = this.getLabelHeight()+this.slice_h+this.caption_h+this.year_h+this.margin.top+this.margin.bottom;
    this.l_height = this.getLabelHeight()+this.caption_h+this.slice_h*legendCount+this.year_h+this.margin.top+this.margin.bottom;
    if (chartExpand) this.height = this.l_height;
    else this.height = this.s_height;

    this.legendpanel.style.height = this.height;
    this.controlpanel.style.height = this.height;
    document.getElementsByClassName("timeline-background")[0].style.height = this.height;
    document.getElementsByClassName("timeline-slider-extend")[0].style.height = this.height;

    this.svg.attr("height", this.height);
    this.background_label.attr("height", this.getLabelHeight());
    this.chart_g.attr('transform', 'translate(0,'+this.getLabelHeight()+')');
  }

  addLabel(click_point, cur_event_id, id, name) {
    dragbarright.attr("display", "none");
    var cur_time_slice = $("textarea#"+cur_event_id+".time-caption");
    var f_start = parseFloat(cur_time_slice.attr("data-s-time"));
    var f_end = parseFloat(cur_time_slice.attr("data-e-time"));
    var s = timeScale(f_start),
        e = timeScale(f_end);
    var num_labels = 1;
    if (cur_time_slice.attr("num-labels") == undefined) {
      cur_time_slice.attr("num-labels", 1);
    } else {
      num_labels = 1+parseInt(cur_time_slice.attr("num-labels"));
      cur_time_slice.attr("num-labels", num_labels);
    }
    // console.log("@@@ addLabel", cur_event_id, id)
    var label = document.createElement("div");
    label.className = "time-label"
    label.id = cur_event_id;
    label.style.top = -this.caption_h*(num_labels-1);
    label.style.left = this.margin.left+s;
    label.style.width = e-s;
    label.style.height = this.caption_h;
    label.innerHTML = name;
    label.setAttribute("data-item-id", id)
    label.setAttribute("data-s-time", f_start)
    label.setAttribute("data-e-time", f_end)
    label.setAttribute("data-o-width", e-s);
    label.setAttribute("data-o-height", this.caption_h);

    timeLabels.push(label);
    addLabelListener(label, cur_event_id);
    this.labelpanel.appendChild(label);

    this.updateLabelHeight();
    return [f_start, f_end];
  }
}

function timeScaleInvert(value) {
  var domain = timeScale.domain();
  var paddingOuter = timeScale(domain[0]);
  var eachBand = timeScale.step();

  var index = Math.floor(((value - paddingOuter) / eachBand));
  return domain[Math.max(0,Math.min(index, domain.length-1))];
}

function zoomed() {
  dragbarright.attr("display", "none");
  timeScale.range([0, timeScale_width].map(d => d3.event.transform.applyX(d)));
  timeSlices.forEach(function(d) {
    d.attr("x", timeScale(d.attr("data-s-time")))
    d.attr("width", timeScale(d.attr("data-e-time"))-timeScale(d.attr("data-s-time")))
  })
  frameText.forEach(function(d) {
    if (d.attr("data-n-length") != undefined) {
      d.attr("x", 12*d.attr("data-n-length")+timeScale(d.attr("data-s-time")))
    } else {
      d.attr("x", 4+timeScale(d.attr("data-s-time")))
    }
  })
  timeCaptions.forEach(function(d) {
    var e = timeScale(d.getAttribute("data-e-time")),
        s = timeScale(d.getAttribute("data-s-time"));
    d.style.left = leftTimelineMargin+s;
    d.style.width = e-s;
    d.setAttribute("data-o-width", e-s);
  })
  timeLabels.forEach(function(d) {
    var e = timeScale(d.getAttribute("data-e-time")),
        s = timeScale(d.getAttribute("data-s-time"));
    d.style.left = leftTimelineMargin+s;
    d.style.width = e-s;
    d.setAttribute("data-o-width", e-s);
  })
  toggleMenuOff();
  d3.selectAll(".timeline-x-axis-min").call(xAxis_1);
  d3.selectAll(".timeline-x-axis-20sec").call(xAxis_2);
  d3.selectAll(".timeline-x-axis-grid").call(xAxis_3);
  d3.selectAll(".timeline-x-axis-year").call(xAxis_year);
  d3.selectAll(".timeline-x-axis-year-h").call(xAxis_year_h);

  // update slider year
  var el = $("input[type='range']");
  curFrame = parseInt(el.val());
  updateSlider();
}

function removeTimeSlice(id) {
  // console.log("removebutton clicked", id)
  var timeframe_text = $("text#"+id+".time-slice");
  var axes = timeframe_text.text().split("x")[0];
  // console.log(axes)
  dragbarright.attr("display", "none");
  timeframe_text.remove();
  $("rect#"+id+".time-slice").remove();
  $("textarea#"+id+".time-caption").remove();
  $("div#"+id+".time-label").remove();
  removeFrame(id, axes);
}

function addTFrameListener(frame, frame_id) {
  frame.on("mouseover", function(e) { highlightTFrame(frame_id); });
  frame.on("mouseout", function(e) { muteTFrame(frame_id); });
  frame.on("contextmenu", function(d, i) {
    showContextMenu(frame_id)
  });
}

function highlightTFrame(id) {
  selected_tframe = id;
  var target = $("rect#"+id+".time-slice");
  target[0].style.fillOpacity = 1;
  // console.log("highlightTFrame", target[0])
  dragbarright
    .attr("tframe_id", id)
    .attr("display", "block")
    .attr("x", target[0].x.baseVal.value + target[0].width.baseVal.value - (dragbarw/2))
    .attr("y", target[0].y.baseVal.value + timeline.getLabelHeight());

  var timeframe_text = $("text#"+id+".time-slice");
  var axes = timeframe_text.text().split("x")[0];
  select_rect_line(id, axes);
  select_rect_trace(id);
}

function muteTFrame(id) {
  var target = $("rect#"+id+".time-slice");
  if (target[0] == undefined) return;
  target[0].style.fillOpacity = 0.7;

  var timeframe_text = $("text#"+id+".time-slice");
  var axes = timeframe_text.text().split("x")[0];
  deselect_rect_line(id, axes);
  deselect_rect_trace(id);
}

function move(id, direction) {
  var target_frame = findNextFrame(id, direction)
  if (target_frame == undefined) return;
  // console.log(id, target_frame)
  dragbarright.attr("display", "none");
  moveFrameOrder(id, direction);
  refresh();
}

document.addEventListener( "click", function(e) {
  toggleMenuOff();
});

var drag_frame_id = undefined;
function rdragResizeStart(d) {
  // console.log("Start) rdragresize", drag_frame_id)
  drag_frame_id = d3.select(this).attr("tframe_id");
}

function rdragResize(d) {
  // console.log("Drag) rdragresize", drag_frame_id)
  var target = $("rect#"+drag_frame_id+".time-slice");
  var target_caption = $("textarea#"+drag_frame_id+".time-caption");
  var dragx = Math.max(target[0].x.baseVal.value + (dragbarw/2), Math.min(target[0].x.baseVal.value + target[0].width.baseVal.value + d3.event.dx));

  width = dragx - target[0].x.baseVal.value;
  dragbarright.attr("x", function(d) { return dragx - (dragbarw/2) });

  var orig_width = target[0].width.baseVal.value;
  testtimeframes.editFrameWidth(drag_frame_id, orig_width, width);
  // target[0].width.baseVal.value = width;
  // target_caption[0].style.width = width;
  refresh(false);
  highlightTFrame(drag_frame_id);
}

function rdragResizeEnd(d) {
  // console.log("End) rdragresize", drag_frame_id)
  drag_frame_id = undefined;
}

function addLabelListener(frame, frame_id) {
  frame.addEventListener("mouseover", function(e) { highlightLabel(e, frame_id); });
  frame.addEventListener("mouseout", function(e) { muteLabel(e, frame_id); });
  frame.addEventListener("contextmenu", function(e, d) {
    showLabelDelete(e, frame_id)
  });
}

function removeLabelFrame(frame_id, label_id) {
  // console.log("removeLabelFrame", frame_id, label_id);
  var tlabel = $("div#"+frame_id+".time-label[data-item-id="+label_id+"]")[0];
  var f_start = parseInt(tlabel.getAttribute("data-s-time"));
  var f_end = parseInt(tlabel.getAttribute("data-e-time"));
  removeLabel(label_id, f_start, f_end);
  timeLabels.splice(timeLabels.indexOf(tlabel), 1);
  tlabel.remove();

  // remove and re-add other labels
  var otherlabels = $("div#"+frame_id+".time-label");
  var names = [];
  for (var i = 0; i < otherlabels.length; i++) {
    names.push([otherlabels[i].getAttribute("data-item-id"), otherlabels[i].innerText]);
    timeLabels.splice(timeLabels.indexOf(otherlabels[i]), 1);
    otherlabels[i].remove();
  }
  // console.log("otherlabels", names);
  var cur_time_slice = $("textarea#"+frame_id+".time-caption")[0];
  cur_time_slice.setAttribute("num-labels", 0);

  for (var i = 0; i < names.length; i++) {
    timeline.addLabel(curFrame, frame_id, names[i][0], names[i][1]);
  }
  timeline.updateLabelHeight();
}
