var t_xScale, t_yScale;
var xrange = [10000000, 0],
    yrange = [10000000, 0];
var tracehull = {};
var traceline = {};
var allyearmeans = {};

class TraceChart {

  constructor(div_form, g_id, height) {
    this.div_id = div_form + g_id;
    this.g_id = g_id;
    this.trace_width = document.getElementById(this.div_id).offsetWidth;
    this.trace_height = height;
  }

  draw(data2d, data_options, population, continent, group) {
    if (group.length == 0)
      group = undefined;

    this.svg = d3.select("#"+this.div_id)
      .append('svg')
      .attr('width', this.trace_width)
      .attr('height', this.trace_height)
    .append('g')
      .attr('transform', 'translate(0,0)');

    this.countries = data2d.country;
    this.continentMap = continent.continent;
    // console.log(data2d[year+"_x"], data2d[year+"_y"])
    // console.log(population[year]);

    var years = timeseries;
    this.data = {}
    for (var i=0; i < years.length; i++) {
      var year = years[i];
      this.data[year] = [];
      for (var index in this.countries) {
        // console.log(index, this.countries[index], this.continentMap[index])
        if (group)
        if (this.g_id == 0 || group[this.countries[index]]["group"] == this.g_id) {
          var d = {
            "id": index,
            "name": this.countries[index],
            "x": data2d[year+"_x"][index],
            "y": data2d[year+"_y"][index],
            "group": (this.g_id>0 ? group[this.countries[index]]["group"] : 0)
          }
          if (data_options["xScale"]["id"] == "log") {
            d.x = Math.max(1, d.x);
          }
          if (data_options["yScale"]["id"] == "log") {
            d.y = Math.max(1, d.y);
          }
          xrange[0] = Math.min(xrange[0], d.x);
          xrange[1] = Math.max(xrange[1], d.x);
          yrange[0] = Math.min(yrange[0], d.y);
          yrange[1] = Math.max(yrange[1], d.y);
          this.data[year].push(d)
        }
      }
    }

    if (data_options["xScale"]["id"] == "log") {
      t_xScale = d3.scaleLog().range([0, this.trace_width]).domain(xrange);
    } else {
      t_xScale = d3.scaleLinear().range([0, this.trace_width]).domain(xrange).nice();
    }
    if (data_options["yScale"]["id"] == "log") {
      t_yScale = d3.scaleLog().range([this.trace_height, 0]).domain(yrange);
    } else {
      t_yScale = d3.scaleLinear().range([this.trace_height, 0]).domain(yrange).nice();
    }

    this.trace_path_g = this.svg.append('g');
    this.trace_g = this.svg.append('g');

    var allyears = [];
    for (var i=0; i < years.length; i++) {
      var data = this.data[years[i]];
      allyears = allyears.concat(traceHulls(data, getGroup, 2))
    }

    tracehull[this.g_id] = this.trace_g.selectAll("path.trace")
        .data(allyears)
      .enter().append("path")
        .attr("class", "trace")
        .attr("d", drawCluster)
        .style("opacity", 0.02)
        .style("fill", function(d) { return gcolor(d.group); });

    allyearmeans[this.g_id] = [];
    for (var i=0; i < years.length; i++) {
      var data = this.data[years[i]];
      allyearmeans[this.g_id] = allyearmeans[this.g_id].concat(traceMean(years[i], data, getGroup))
    }
    // console.log(allyearmeans)

    traceline[this.g_id] = this.trace_path_g.selectAll(".tbubble")
        .data(allyearmeans[this.g_id])
      .enter().append("circle")
        .attr("class", "tbubble")
        .attr("id", d => this.g_id+"_"+d.time)
        .attr("year", d => d.time)
        .attr('cx', d => t_xScale(d.x))
        .attr('cy', d => t_yScale(d.y))
        .attr('r', 1)
        .style("opacity", 1)
        .style("fill", function(d) { return gcolor(d.group); });
  }
}


const arrAvg = arr => arr.reduce((a,b) => a + b, 0) / arr.length;

function draw_rect_trace(yrange, group, reason) {
  if (yrange[0] == "init") return;
  var y_start = ""+yrange[0],
      y_end = ""+yrange[yrange.length-1];
  var rect_id = [y_start, y_end, group, "trace"].join("-");
  if (document.getElementById(rect_id) != undefined)
    return;

  var years = [];
  for (var i=timeseries.indexOf(y_start); i<=timeseries.indexOf(y_end); i++) {
    years.push(timeseries[i]);
  }
  // console.log("draw_rect_trace", yrange, years, group, reason)
  var content = document.getElementsByClassName("content");
  var navbar_h = content[0].getBoundingClientRect().top;
  var canvas = document.getElementById("trace_chart_"+group);
  var rect = canvas.getBoundingClientRect();
  var offset = 5;
  var xs = [], ys = [];
  for (var i=0; i < allyearmeans[group].length; i++) {
    var d = allyearmeans[group][i];
    if (years.indexOf(d.time) != -1) {
      xs.push(t_xScale(d.x)-offset);
      xs.push(t_xScale(d.x)+offset);
      ys.push(t_yScale(d.y)-offset);
      ys.push(t_yScale(d.y)+offset);
    }
  }
  var e = document.createElement('div');
  // e.className = 'select_trace select_trace_'+reason;
  e.className = 'select_trace';
  e.id = rect_id;
  e.style.left = Math.min(...xs)+20;
  e.style.top = Math.min(...ys)+rect.top-navbar_h-15;
  e.style.width = Math.max(...xs)-Math.min(...xs);
  e.style.height = Math.max(...ys)-Math.min(...ys);
  e.style.paddingTop = Math.max(...ys)-Math.min(...ys)-5;
  e.style.paddingLeft = 0;
  e.innerHTML = reason;
  canvas.appendChild(e)
}

function traceMean(time, nodes, index) {
  // console.log("traceMean")
  var xs = {}, ys = {};
  for (var k=0; k<nodes.length; ++k) {
    var n = nodes[k];
    var i = getGroup(n),
        x_arr = xs[i] || (xs[i] = []),
        y_arr = ys[i] || (ys[i] = []);
    if (n.size) continue;
    x_arr.push(n.x);
    y_arr.push(n.y);
  }
  var pathset = [];
  for (i in xs) {
    pathset.push({time: time, group: i, x: arrAvg(xs[i]), y: arrAvg(ys[i])});
  }
  return pathset;
}

function traceHulls(nodes, index, offset) {
  // console.log("convexHulls")
  var hulls = {};

  // create point sets
  for (var k=0; k<nodes.length; ++k) {
    var n = nodes[k];
    if (n.size) continue;
    var i = getGroup(n),
        l = hulls[i] || (hulls[i] = []);
    var rOffset = 0;
    l.push([t_xScale(n.x)-rOffset-offset, t_yScale(n.y)-rOffset-offset]);
    l.push([t_xScale(n.x)-rOffset-offset, t_yScale(n.y)+rOffset+offset]);
    l.push([t_xScale(n.x)+rOffset+offset, t_yScale(n.y)-rOffset-offset]);
    l.push([t_xScale(n.x)+rOffset+offset, t_yScale(n.y)+rOffset+offset]);
  }
  // console.log(hulls)
  // create convex hulls
  var hullset = [];
  for (i in hulls) {
    hullset.push({group: i, path: d3.polygonHull(hulls[i])});
  }

  return hullset;
}
