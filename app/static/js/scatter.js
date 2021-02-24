var xScale, yScale, radius;
var continent = ["Asia", "Europe", "North America", "South America", "Africa", "Oceania", "Antarctica"];
var color = ["#F08391", "#FCEC71", "#AEED6C", "#AEED6C", "#80DBEB", "#F08391", "#000"];
var hullOffset = 10, label_spread_x = true;
var hull_labels, hull_label_links, pre_group;
var savedCaptions, savedLabels;

class ScatterPlot {

  constructor(div_id, w, h) {
    this.margin = {top: 5+desc_h, right: 5, bottom: 20, left:25};
    this.width = w - this.margin.left - this.margin.right;
    this.height = h - this.margin.top - this.margin.bottom;
    this.div_id = div_id;
    this.bubble = {};
    savedCaptions = {};
    savedLabels = {};
  }

  initChart(data2d, data_options, population, continent, group) {
    if (group.length == 0)
      group = undefined;

    this.svg = d3.select("#"+this.div_id)
      .append('svg')
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.height + this.margin.top + this.margin.bottom)
    .append('g')
      .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

    this.countries = data2d.country;
    this.continentMap = continent.continent;
    // console.log(data2d[year+"_x"], data2d[year+"_y"])
    // console.log(population[year]);

    this.years = timeseries;
    this.data = {}
    this.xrange = [10000000, 0];
    this.yrange = [10000000, 0];
    this.srange = [10000000, 0];
    for (var i in this.years) {
      var year = this.years[i];
      var pre_year = this.years[i > 0? i-1:0];
      this.data[year] = [];
      for (var index in this.countries) {
        // console.log(index, this.countries[index], this.continentMap[index])
        var d = {
          "id": index,
          "name": this.countries[index],
          "x": data2d[year+"_x"][index],
          "y": data2d[year+"_y"][index],
          "population": population[year][index]/40000,
          "pre_x": data2d[pre_year+"_x"][index],
          "pre_y": data2d[pre_year+"_y"][index],
          "pre_population": population[pre_year][index]/40000,
          "group": (group? group[this.countries[index]]["group"] : -1)
        }
        if (data_options["xScale"]["id"] == "log") {
          d.x = Math.max(1, d.x);
          d.pre_x = Math.max(1, d.pre_x);
        }
        if (data_options["yScale"]["id"] == "log") {
          d.y = Math.max(1, d.y);
          d.pre_y = Math.max(1, d.pre_y);
        }
        this.xrange[0] = Math.min(this.xrange[0], d.x);
        this.xrange[1] = Math.max(this.xrange[1], d.x);
        this.yrange[0] = Math.min(this.yrange[0], d.y);
        this.yrange[1] = Math.max(this.yrange[1], d.y);
        this.srange[0] = Math.min(this.srange[0], d.population);
        this.srange[1] = Math.max(this.srange[1], d.population);
        this.data[year].push(d)
      }
    }

    var x_tickvalues, y_tickvalues;
    // if (data_options["x"]["id"] == "income") {this.xrange[0] = Math.max(250, this.xrange[0]);}
    // if (data_options["y"]["id"] == "income") {this.yrange[0] = Math.max(250, this.yrange[0]);}

    if (data_options["xScale"]["id"] == "log") {
      x_tickvalues = getTickValues(this.xrange, true);
      xScale = d3.scaleLog().range([0, this.width]).domain(this.xrange);
    } else {
      x_tickvalues = getTickValues(this.xrange, false);
      xScale = d3.scaleLinear().range([0, this.width]).domain(this.xrange).nice();
    }
    if (data_options["yScale"]["id"] == "log") {
      y_tickvalues = getTickValues(this.yrange, true);
      yScale = d3.scaleLog().range([this.height, 0]).domain(this.yrange);
    } else {
      y_tickvalues = getTickValues(this.yrange, false);
      yScale = d3.scaleLinear().range([this.height, 0]).domain(this.yrange).nice();
    }
    radius = d3.scaleSqrt().range([2,15]).domain(this.srange).nice();

    this.xaxis_grid = this.svg.append('g')
      .attr('transform', 'translate(0,' + this.height + ')')
      .attr('class', 'x axis')
      .call(d3.axisBottom(xScale)
        .tickFormat(d3.format(".2s"))
        .tickValues(x_tickvalues)
      );
    this.svg.append('g')
      .attr("class", "grid")
      .call(d3.axisBottom(xScale)
        .tickSize(this.height)
        .tickFormat("")
        .tickValues(x_tickvalues)
      );

    this.yaxis_grid = this.svg.append('g')
      .attr('transform', 'translate(0,0)')
      .attr('class', 'y axis')
      .call(d3.axisLeft(yScale)
        .tickFormat(d3.format(".2s"))
        .tickValues(y_tickvalues)
      );
    this.svg.append('g')
      .attr("class", "grid")
      .call(d3.axisLeft(yScale)
        .tickSize(-this.width)
        .tickFormat("")
        .tickValues(y_tickvalues)
      );

    this.xaxis = this.svg.append('g')
      .append("text")
        .attr("class", "chart-desc")
        .attr("x", this.width-20)
        .attr("y", this.height-10)
        .attr("text-anchor", "end")
        .text(data_options["x"]["name"]);

    this.yaxis = this.svg.append('g')
      .append("text")
        .attr("class", "chart-desc")
        .attr("x", -20)
        .attr("y", 26)
        .attr("text-anchor", "end")
        .attr('transform', 'rotate(-90)')
        .text(data_options["y"]["name"]);

    //size axis
    this.slegend = this.svg.append('g');
    this.slegend.append("text")
      .attr('x', this.width-100)
      .attr('y', -21)
      .attr("text-anchor", "end")
      .attr('font-size', '14px')
      .text(data_options["s"]["name"])
    var slegend = [500, 10000, 30000], spadding = [80, 50, 15];
    for (var i = 0; i < 3; i++) {
      this.slegend.append("circle")
        .attr('cx', this.width-spadding[i])
        .attr('cy', -25)
        .attr('r', radius(slegend[i]))
        .style('stroke', 'black')
        .style('stroke-width', 0.5)
        .style('fill', 'white');
      this.slegend.append("text")
        .attr('x', this.width-spadding[i])
        .attr('y', -10)
        .attr("text-anchor", "middle")
        .attr('font-size', '0.6em')
        .text(kFormatter(slegend[i]*1000))
    }

    this.saxis = this.svg.append('g').attr("class", "chart-desc");
    this.saxis.append("text")
        .attr("x", this.width/2)
        .attr("y", this.height/4+10)
        .attr("text-anchor", "middle")
        .text("size = "+data_options["s"]["name"]);
    this.saxis.append("circle")
        .attr('cx', this.width/2)
        .attr('cy', this.height/4+40)
        .attr('r', 15)
        .style('stroke', 'black')
        .style('stroke-width', 0.5)
        .style('fill', gcolor(1));

    this.bottomleft = this.svg.append('g').attr("class", "chart-desc");
    this.bottomright = this.svg.append('g').attr("class", "chart-desc");
    this.upperleft = this.svg.append('g').attr("class", "chart-desc");
    this.upperright = this.svg.append('g').attr("class", "chart-desc");
    var ll_labels = [data_options["x"]["label"]["low"], "and", data_options["y"]["label"]["low"]],
        hl_labels = [data_options["x"]["label"]["high"], "and", data_options["y"]["label"]["low"]],
        lh_labels = [data_options["x"]["label"]["low"], "and", data_options["y"]["label"]["high"]],
        hh_labels = [data_options["x"]["label"]["high"], "and", data_options["y"]["label"]["high"]];
    for (var l = 0; l < 3; l++) {
      this.bottomleft
        .append("text")
          .attr("x", 80)
          .attr("y", this.height-100+l*25)
          .attr("text-anchor", "start")
          .text(ll_labels[l]);
      this.bottomright
        .append("text")
          .attr("x", this.width-80)
          .attr("y", this.height-100+l*25)
          .attr("text-anchor", "end")
          .text(hl_labels[l]);
      this.upperright
        .append("text")
          .attr("x", this.width-80)
          .attr("y", 40+l*25)
          .attr("text-anchor", "end")
          .text(hh_labels[l]);
      this.upperleft
        .append("text")
          .attr("x", 80)
          .attr("y", 40+l*25)
          .attr("text-anchor", "start")
          .text(lh_labels[l]);
    }


    this.trace_path_g = this.svg.append('g');
    this.hull_g = this.svg.append('g');

    this.bubble_trace_g = this.svg.append('g');
    this.bubble_shadow_g = this.svg.append('g');
    this.bubble_g = this.svg.append('g');
    this.bubble_g_h = this.svg.append('g');
    this.bubble_label_g = this.svg.append('g');
    this.hull_label_g = this.svg.append('g');
  }

  highlightXaxis(delay) {
    this.xaxis.transition()
      .duration(delay)
      .style("visibility", "visible")
      .style("opacity", 1);
  }

  highlightYaxis(delay) {
    this.yaxis.transition()
      .duration(delay)
      .style("visibility", "visible")
      .style("opacity", 1);
  }

  highlightSaxis(delay) {
    this.saxis.transition()
      .duration(delay)
      .style("visibility", "visible")
      .style("opacity", 1);
  }

  highlightDirect(delay) {
    this.bottomleft.transition()
      .duration(delay)
      .style("visibility", "visible")
      .style("opacity", 1);
    this.upperright.transition()
      .duration(delay)
      .style("visibility", "visible")
      .style("opacity", 1);
  }

  highlightInverse(delay) {
    this.upperleft.transition()
      .duration(delay)
      .style("visibility", "visible")
      .style("opacity", 1);
    this.bottomright.transition()
      .duration(delay)
      .style("visibility", "visible")
      .style("opacity", 1);
  }

  hideDesc(delay) {
    this.bottomleft.style("visibility", "hidden")
    this.bottomright.style("visibility", "hidden")
    this.upperleft.style("visibility", "hidden")
    this.upperright.style("visibility", "hidden")
    this.xaxis.transition()
      .duration(delay)
      .style("visibility", "hidden")
      .style("opacity", 0);
    this.yaxis.transition()
      .duration(delay)
      .style("visibility", "hidden")
      .style("opacity", 0);
    this.saxis.transition()
      .duration(delay)
      .style("visibility", "hidden")
      .style("opacity", 0);
  }

  showGroup(year, g) {
    console.log("showGroup", year, g);
    var data = this.data[year];
    var bubble = this.bubble_g.append('g').selectAll('.bubble')
        .data(data)
      .enter().append('circle')
        .attr('id', function(d){return d.id;})
        .attr('class', function(d){ return 'bubble g'+d.group; })
        .attr('cx', function(d){return xScale(d.x);})
        .attr('cy', function(d){ return yScale(d.y); })
        .attr('r', function(d){ return radius(d.pre_population)*1.3+1; })
        .style('stroke', 'black')
        .style('stroke-width', 0.2)
        .style('fill', function(d){
          if (d.group == -1) return color[continent.indexOf(this.continentMap[d.id])];
          else return gcolor(d.group);
        })
        .style('display', function(d) {
          if (g == d.group) return 'block';
          else return 'none';
        })
  }

  updateChart(year, swtvalues) {
    // console.log("updateChart", year);
    this.clear();
    var data = this.data[year];
    if (data == undefined)
      data = this.data[timeseries[timeseries.length-1]];

    var bubble = this.bubble_g.selectAll('.bubble').data(data);
    bubble.enter().append('circle')
      .merge(bubble)
        .attr('id', function(d){return d.id;})
        .attr('class', function(d){ return 'bubble g'+d.group; })
        .attr('cx', function(d){ return xScale(d.pre_x);})
        .attr('cy', function(d){ return yScale(d.pre_y); })
        .attr('r', function(d){ return radius(d.population)*1.3+1; })
        .style('opacity', 1)
        .style('stroke', function(d) {
          if (savedLabels[curFrame] && savedLabels[curFrame].has(d.id)) return '#007bff80';
          else return 'black';
        })
        .style('stroke-width', function(d) {
          if (savedLabels[curFrame] && savedLabels[curFrame].has(d.id)) return 2;
          else return 0.2;
        })
        .style('fill', function(d){
          // console.log(d.group);
          if (d.group == -1) return color[continent.indexOf(this.continentMap[d.id])];
          else return gcolor(d.group);
        })
        .style('visibility', function(d) {
          // console.log(d.group, swtvalues["groups"]);
          if (swtvalues["groups"][d.group]) return 'visible';
          else return 'hidden';
        })
        .on("mouseover", mouseOverBubbles)
        .on("click", clickBubbles)
        .on("mouseout", mouseOutBubbles)
      .transition()
        .duration(timeunit)
        .attr("cx", function(d){return xScale(d.x);})
        .attr("cy", function(d){ return yScale(d.y); })
        .attr('r', function(d){ return radius(d.population)*1.3+1;; })

    var bubble_label = this.bubble_label_g.selectAll('.bubble-label').data(data);
    bubble_label.enter().append('text')
      .merge(bubble_label)
        .attr('id', function(d){return d.id;})
        .attr('class', function(d){ return 'bubble-label g'+d.group; })
        .attr('x', function(d){return xScale(d.pre_x)+6;})
        .attr('y', function(d){ return yScale(d.pre_y)+4; })
        .text(function(d){ return d.name; })
        .attr('paint-order', 'stroke')
        .style('visibility', function(d) {
          var selected = $("text#"+d.id+".bubble-label")[0];
          if (savedLabels[curFrame] && savedLabels[curFrame].has(d.id)) return "visible";
          else return "hidden";
        })
        .on("mouseover", mouseOverBubbles)
        .on("click", clickBubbles)
        .on("mouseout", mouseOutBubbles)
      .transition()
        .duration(timeunit)
        .attr("x", function(d){return xScale(d.x)+6;})
        .attr("y", function(d){ return yScale(d.y)+4; })

    pre_group = undefined;
  }

  clearFocus() {
    this.bubble_shadow_g.selectAll("*").remove();
    this.bubble_trace_g.selectAll("*").remove();
  }

  clear() {
    this.bubble_g.selectAll("*").remove();
    this.bubble_g_h.selectAll("*").remove();
    this.bubble_label_g.selectAll("*").remove();
    this.bubble_shadow_g.selectAll("*").remove();
    this.bubble_trace_g.selectAll("*").remove();
    this.hull_g.selectAll("path.hull").remove();
    this.hull_label_g.selectAll("text.hull-label").remove();
    this.hull_label_g.selectAll('line.hull-label-link').remove();
  }

  cache (swtvalues, frame_id) {
    return JSON.stringify(swtvalues) + frame_id;
  }

  updateFocus(time, swtvalues, innergrp, delay, frame_id) {
    // console.log("updateFocus", swtvalues, innergrp, time, pre_group == this.cache(swtvalues, frame_id))
    this.bubble_g.selectAll("*").remove();
    this.bubble_g_h.selectAll("*").remove();
    // this.trace_path_g.selectAll("circle.tbubble").remove();

    var data = this.data[time];
    var flag_world = swtvalues["groups"][0];
    for (var d in data) {
      var group = flag_world?0:data[d].group;
      if (swtvalues["groups"][group] && group in innergrp[time]["group"]) {
        data[d].ingroup = innergrp[time]["group"][group][data[d].id];
        data[d].ingdesc = innergrp[time]["desc"][group][data[d].ingroup];
      } else {
        data[d].ingroup = -1;
      }
    }

    var dataCvxHulls = convexHulls(data, getInnerGroup, hullOffset, true);

    var bubble_trace = this.bubble_trace_g.append("g").selectAll('.bubble_trace').data(data);
    bubble_trace.enter().append("line")
      .merge(bubble_trace)
        .attr("x1", d => xScale(d.pre_x))
        .attr("y1", d => yScale(d.pre_y))
        .attr("x2", d => xScale(d.pre_x))
        .attr("y2", d => yScale(d.pre_y))
        .attr("stroke", d => gcolor(d.group))
        .attr("stroke-width", d => radius(d.pre_population)*2.6+2)
        .style('opacity', 0.2)
        .style('visibility', function(d) {
          if (swtvalues["groups"][d.group]) return 'visible';
          else return 'hidden';
        })
      .transition()
        .duration(delay)
        .attr("x2", d => xScale(d.x))
        .attr("y2", d => yScale(d.y))

    var bubble_shadow = this.bubble_shadow_g.append("g").selectAll('.bubble_shadow').data(data);
    bubble_trace.enter().append('circle')
      .merge(bubble_trace)
        .attr('class', function(d){ return 'bubble_shadow g'+d.group; })
        .attr('cx', function(d){return xScale(d.pre_x);})
        .attr('cy', function(d){ return yScale(d.pre_y); })
        .attr('r', function(d){ return radius(d.pre_population)*1.3+1; })
        // .style('stroke', 'black')
        // .style('stroke-width', 0.5)
        .style('opacity', 0.2)
        .style('fill', d => gcolor(d.group))
        .style('visibility', function(d) {
          if (swtvalues["groups"][d.group]) return 'visible';
          else return 'hidden';
        })

    var moving_bubble = this.bubble_g.selectAll('.bubble').data(data);
    moving_bubble.enter().append('circle')
      .merge(moving_bubble)
        .attr('id', function(d) {
          if (swtvalues["groups"][d.group]) return "";
          else return d.id;
        })
        .attr('class', function(d){ return 'bubble g'+d.group; })
        .attr('cx', function(d){return xScale(d.pre_x);})
        .attr('cy', function(d){ return yScale(d.pre_y); })
        .attr('r', function(d){ return radius(d.pre_population)*1.3+1; })
        .style('stroke', 'black')
        .style('stroke-width', 0)
        .style('fill', "#ddd")
        .style('opacity', 0.5)
        .style('display', function(d) {
          if (swtvalues["groups"][d.group]) return 'none';
          else return 'block';
        })
      .transition()
        .duration(delay)
        .attr("cx", function(d){return xScale(d.x);})
        .attr("cy", function(d){ return yScale(d.y); })
        .attr('r', function(d){ return radius(d.population)*1.3+1; })

    var moving_bubble_h = this.bubble_g_h.selectAll('.bubble').data(data);
    moving_bubble_h.enter().append('circle')
      .merge(moving_bubble_h)
        .attr('id', function(d) {
          if (swtvalues["groups"][d.group]) return d.id;
          else return "";
        })
        .attr('class', function(d){ return 'bubble g'+d.group; })
        .attr('cx', function(d){ return xScale(d.pre_x);})
        .attr('cy', function(d){ return yScale(d.pre_y); })
        .attr('r', function(d){ return radius(d.pre_population)*1.3+1; })
        .style('stroke', function(d) {
          if (savedLabels[curFrame] && savedLabels[curFrame].has(d.id)) return '#007bff80';
          else return 'black'
        })
        .style('stroke-width', function(d) {
          if (savedLabels[curFrame] && savedLabels[curFrame].has(d.id)) return 2;
          else return 0.2;
        })
        .style('fill', d => gcolor(d.group))
        .style('opacity', 1)
        .style('display', function(d) {
          if (swtvalues["groups"][d.group]) return 'block';
          else return 'none';
        })
        .on("mouseover", mouseOverBubbles)
        .on("click", clickBubbles)
        .on("mouseout", mouseOutBubbles)
      .transition()
        .duration(delay)
        .attr("cx", function(d){return xScale(d.x);})
        .attr("cy", function(d){ return yScale(d.y); })
        .attr('r', function(d){ return radius(d.population)*1.3+1; })


    var bubble_lable = this.bubble_label_g.selectAll('.bubble-label').data(data);
    bubble_lable.enter().append('text')
      .merge(bubble_lable)
        .attr('id', function(d){return d.id;})
        .attr('class', function(d){ return 'bubble-label g'+d.group; })
        .attr('x', function(d){return xScale(d.pre_x)+6;})
        .attr('y', function(d){ return yScale(d.pre_y)+4; })
        .text(function(d){ return d.name; })
        .attr('paint-order', 'stroke')
        .style('visibility', function(d) {
          var selected = $("text#"+d.id+".bubble-label")[0];
          if (savedLabels[curFrame] && savedLabels[curFrame].has(d.id)) return "visible";
          else return "hidden";
        })
        .on("mouseover", mouseOverBubbles)
        .on("click", clickBubbles)
        .on("mouseout", mouseOutBubbles)
      .transition()
        .duration(delay)
        .attr("x", function(d){return xScale(d.x)+6;})
        .attr("y", function(d){ return yScale(d.y)+4; })

    this.hull_g.selectAll("path.hull").remove();
    this.hull_g.selectAll("path.hull")
        .data(dataCvxHulls)
      .enter().append("path")
        .attr("class", "hull")
        .attr("id", d => d.id)
        .attr("d", drawPreCluster)
        .attr('data-p-path', d => d.phulls)
        .attr('data-path', d => d.hulls)
        .style("opacity", 0.4)
        .style("stroke", "#333")
        .style("stroke-width", 0.2)
        .style("fill", function(d) { return "#bbb"; })
        .style('visibility', function(d) {
          if (d.group >= 0 && d.items < 1000) return 'visible';
          else return 'hidden';
        })
      .transition()
        .duration(delay)
        .attr("d", drawCluster);

    // update hull labels for a new group
    if (pre_group != this.cache(swtvalues, frame_id)) {
      this.hull_label_g.selectAll("text.hull-label").remove();
      hull_labels = this.hull_label_g.selectAll('.hull-label')
          .data(dataCvxHulls)
        .enter().append('text')
          .attr('id', d => d.id)
          .attr('class', function(d){ return 'hull-label wrap g'+d.group; })
          .attr("x", function (d) {
            if (savedCaptions[d.id] == undefined) return Math.min(w-50, Math.max(80, d.avg_x));
            else return savedCaptions[d.id].x;
          })
          .attr("y", function (d) {
            if (savedCaptions[d.id] == undefined) return Math.max(30, Math.min(h-150, d.avg_y));
            else return savedCaptions[d.id].y;
          })
          .attr('paint-order', 'stroke')
          .style('visibility', function(d) {
            if (d.group >= 0) return 'visible';
            else return 'hidden'; })
        .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended));

      hull_labels.selectAll("text.hull-label")
        .data(d => d.desc.split(";"))
        .enter().append("tspan")
          .attr("class", "text")
          .text(d => d)
          .attr("dx", function(d) {
            if (d != undefined) return -5.8*d.length;
          })
          .attr("dy", 12);

    }

    this.hull_label_g.selectAll('line.hull-label-link').remove();
    hull_labels.each(function() {
      var text_bbox = this.getBBox();
      var text_p = [text_bbox.x+text_bbox.width/2, text_bbox.y, text_bbox.x+text_bbox.width/2, text_bbox.y+text_bbox.height]
      var matching_hull = d3.select("path#"+this.id+".hull").node();
      var p_points = shortestPath(text_p, matching_hull.getAttribute("data-p-path").split(","))
      var points = shortestPath(text_p, matching_hull.getAttribute("data-path").split(","))
      d3.select(this.parentNode).append('line')
        .attr("id", this.id)
        .attr("class", function(d){ return 'hull-label-link g'+this.group; })
        .attr("x1", p_points[0])
        .attr("y1", p_points[1])
        .attr("x2", p_points[2])
        .attr("y2", p_points[3])
      .transition()
        .duration(delay)
        .attr("x1", points[0])
        .attr("y1", points[1])
        .attr("x2", points[2])
        .attr("y2", points[3])
    })

    pre_group = this.cache(swtvalues, frame_id);
  }
}

function updateLabelLinks() {
  hull_labels.each(function() {
    var text_bbox = this.getBBox();
    var text_p = [text_bbox.x+text_bbox.width/2, text_bbox.y, text_bbox.x+text_bbox.width/2, text_bbox.y+text_bbox.height]
    var link = d3.select("line#"+this.id);
    var points = shortestPath(text_p, [link.attr("x2"), link.attr("y2")])
    link
      .attr("x1", points[0])
      .attr("y1", points[1])
      .attr("x2", points[2])
      .attr("y2", points[3])
  })
}

function shortestPath(alist, blist) {
  var points = [];
  var min = 10000;
  for (var a=0; a < alist.length; a += 2) {
    for (var b=0; b < blist.length; b += 2) {
      // console.log("shortestPath", alist[a], alist[a+1], blist[b], blist[b+1])
      diff = Math.abs(alist[a]-blist[b])+Math.abs(alist[a+1]-blist[b+1])
      if (diff < min) {
        min = diff;
        points = [alist[a], alist[a+1], blist[b], blist[b+1]];
      }
    }
  }
  return points
}

function dragstarted(d) {
  var point = d3.mouse(this);
  var label = $("text#"+d.id+".hull-label");
  // console.log("dragstarted", label, point)
  label.attr("x", point[0])
  label.attr("y", point[1])
}

function dragged(d) {
  var point = d3.mouse(this);
  var label = $("text#"+d.id+".hull-label");
  // console.log("dragged", label, point)
  label.attr("x", point[0])
  label.attr("y", point[1])
  updateLabelLinks();
}

function dragended(d) {
  var point = d3.mouse(this);
  console.log("dragended", d.id, point)
  savedCaptions[d.id] = {
    "x": point[0],
    "y": point[1]
  }
  // console.log(savedCaptions)
}

function getTickValues(r, logflag) {
  var tickvalues = [];
  var scale;
  if (logflag) {
    if (r[1]-r[0] < 10) scale = 1;
    else if (r[1]-r[0] < 100) scale = 5;
    else if (r[1]-r[0] < 10000) scale = 125;
    else scale = 250;
    for (var i = Math.max(scale, parseInt(r[0]/scale)*scale); i < r[1]; i*=2) {
      tickvalues.push(i)
    }
  } else {
    if (r[1]-r[0] < 10) scale = 1;
    else if (r[1]-r[0] < 100) scale = 10;
    else scale = Math.pow(10, parseInt(Math.log10(r[1]))-1);
    for (var i = Math.max(0, parseInt(r[0]/scale)*(scale)); i < r[1]; i+=scale) {
      tickvalues.push(i)
    }
  }
  tickvalues.shift();
  return tickvalues
}

function getInnerGroup(n) { return n.ingroup; }
function getGroup(n) { return n.group; }

function convexHulls(nodes, index, offset, pre) {
  // console.log("convexHulls")
  var hulls = {};
  var phulls = {};
  var desc = {};
  var xs = {}, ys = {};
  // create point sets
  for (var k=0; k<nodes.length; ++k) {
    var n = nodes[k];
    var i = index(n);
    if (n.size || i == -1) continue;
    var l = hulls[i] || (hulls[i] = []),
        p = phulls[i] || (phulls[i] = []),
        x_arr = xs[i] || (xs[i] = []),
        y_arr = ys[i] || (ys[i] = []);
    var rOffset = radius(n.population)*1.3+1;
    if (pre) {
      p.push([xScale(n.pre_x)-rOffset-offset, yScale(n.pre_y)-rOffset-offset]);
      p.push([xScale(n.pre_x)-rOffset-offset, yScale(n.pre_y)+rOffset+offset]);
      p.push([xScale(n.pre_x)+rOffset+offset, yScale(n.pre_y)-rOffset-offset]);
      p.push([xScale(n.pre_x)+rOffset+offset, yScale(n.pre_y)+rOffset+offset]);
    }
    l.push([xScale(n.x)-rOffset-offset, yScale(n.y)-rOffset-offset]);
    l.push([xScale(n.x)-rOffset-offset, yScale(n.y)+rOffset+offset]);
    l.push([xScale(n.x)+rOffset+offset, yScale(n.y)-rOffset-offset]);
    l.push([xScale(n.x)+rOffset+offset, yScale(n.y)+rOffset+offset]);
    x_arr.push(xScale(n.pre_x));
    y_arr.push(yScale(n.pre_y));
    desc[i] = n.ingdesc?n.ingdesc:"";
  }
  // console.log(hulls)
  // create convex hulls
  var hullset = [];
  for (i in hulls) {
    var hid = (desc[i].split(" ").join("-")).split(";").join("-")+"-"+hulls[i].length;
    // console.log("hid", hid, hulls[i][0][0], hulls[i][0][1])
    if (pre) {
      hullset.push({
        id: hid,
        group: i,
        desc: desc[i],
        items: hulls[i].length,
        x: hulls[i][0][0],
        y: hulls[i][0][1],
        // avg_x: arrAvg(xs[i]),
        // avg_y: arrAvg(ys[i]),
        avg_x: (Math.max(...xs[i])+Math.min(...xs[i]))/2,
        avg_y: (Math.max(...ys[i])+Math.min(...ys[i]))/2,
        path: d3.polygonHull(hulls[i]),
        pre_x: phulls[i][0][0],
        pre_y: phulls[i][0][1],
        pre_path: d3.polygonHull(phulls[i]),
        hulls: hulls[i],
        phulls: phulls[i],
      });
    } else {
      hullset.push({
        id: hid,
        group: i,
        desc: desc[i],
        items: hulls[i].length,
        x: hulls[i][0][0],
        y: hulls[i][0][1],
        path: d3.polygonHull(hulls[i]),
      });
    }
  }

  return hullset;
}

function drawCluster(d) {
  if (isNaN(d.path[0][0])) return "";
  var curve = d3.line().curve(d3.curveCardinalClosed.tension(0.8));
  return curve(d.path);
}
function drawPreCluster(d) {
  if (isNaN(d.pre_path[0][0])) return "";
  var curve = d3.line().curve(d3.curveCardinalClosed.tension(0.8));
  return curve(d.pre_path);
}

function mouseOverBubbles(d) {
  d3.select(this).style("cursor", "pointer");
  if (d.group == -1) {
    $("text#"+d.id+".bubble-label")[0].style.visibility="visible";
  } else {
    // console.log("mouseOverBubbles", d.id, d.group)
    dimAllBubbles(0.5);
    // dimAllCvxHulls(0.01);
    var circles = $("circle.bubble.g"+d.group);
    for (var l in circles) {
      if (circles[l].style) circles[l].style.opacity = 1;
    }
    // if ($("path#"+d.group+".hull")[0]) $("path#"+d.group+".hull")[0].style.opacity=0.2;
    if ($("text#"+d.id+".bubble-label")[0]) $("text#"+d.id+".bubble-label")[0].style.visibility="visible";
  }
}

function mouseOutBubbles(d) {
  d3.select(this).style("cursor", "");
  if (d.group == -1) {
    $("text#"+d.id+".bubble-label")[0].style.visibility="hidden";
  } else {
    dimAllBubbles(1);
    // dimAllCvxHulls(0.2);
    var labels = $("text.bubble-label.g"+d.group);
    for (var l=0; l < labels.length; l++) {
      if (labels[l].getAttribute("data-clicked") == "true") continue;
      if (labels[l].style) labels[l].style.visibility = "hidden"
    }
  }
}

function clickBubbles(d){
  d3.select(this).style("cursor", "pointer");
  var selected = $("text#"+d.id+".bubble-label")[0];
  // console.log("clickBubble", d.id)
  if (selected.getAttribute("data-clicked") == "true") {
    //
  } else {
    var frame_count = timeline.addLabel(curFrame, testtimeframes.getFrameContent(curFrame), d.id, selected.innerHTML);
    saveNewLabel(d.id, frame_count[0], frame_count[1]);

    selected.setAttribute("data-clicked", "true");
    selected.style.visibility = "visible";
  }
}

function saveNewLabel(item_id, from, to) {
  for (var i = from; i < to; i++) {
    if (savedLabels[i] == undefined) savedLabels[i] = new Set();
    savedLabels[i].add(item_id);
  }
}
function removeLabel(item_id, from, to) {
  for (var i = from; i < to; i++) {
    if (savedLabels[i].has(item_id))
      savedLabels[i].delete(item_id);
  }
}

function dimAllBubbles(dimlevel) {
  var bubbles = $("circle.bubble");
  for (var l in bubbles) {
    if (savedLabels[curFrame] && savedLabels[curFrame].has(bubbles[l].id)) continue;
    if (bubbles[l].style) bubbles[l].style.opacity = ""+dimlevel;
  }
}
function dimAllCvxHulls(dimlevel) {
  var cvxhulls = $("path.hull");
  for (var l in cvxhulls) {
    if (cvxhulls[l].style) cvxhulls[l].style.opacity = ""+dimlevel;
  }
}

function range(start, end) {
    var foo = [];
    for (var i = start; i < end; i++) {
        foo.push(i);
    }
    return foo;
}
