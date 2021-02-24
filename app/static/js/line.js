var line_xscale;
var overlap_offset = 0;
var line_indicators = [];
class LineChart {

  constructor(div_id, w, h, axis_h) {
    this.margin = {top: 5, right: 0, bottom: 20, left:left_offset};
    this.width = w - this.margin.left - this.margin.right;
    this.height = h - this.margin.top - this.margin.bottom;
    this.div_id = div_id;
    this.axis_h = axis_h;
    // console.log("lineChart", this.div_id, this.width, this.height);
  }

  drawChart(data, data_options) {
    // console.log(data);
    var minYear = timeseries[0];

    var svg = d3.select("#"+this.div_id)
      .append('svg')
      .attr('width', this.width+this.margin.left+this.margin.right)
      .attr('height', this.height+this.margin.top+this.margin.bottom)
    .append('g')
      .attr('transform', 'translate('+this.margin.left+',0)');

    line_xscale = d3.scaleLinear()
      .domain(d3.extent(data["X"], function(d) { return d.time; }))
      .range([ 0, this.width ]);

    svg.append("g")
      .attr("transform", "translate(0,"+ this.height+")")
      .attr('class', 'line-x-axis')
      .call(d3.axisBottom(line_xscale)
        .tickFormat(d3.format("d"))
      );
    svg.append('g')
      .attr("class", "grid")
      .call(d3.axisBottom(line_xscale)
        .tickSize(this.height)
        .tickFormat("")
      );
    // common y axis for display
    var y = d3.scaleLinear()
      .domain([0, 1])
      .range([this.height, 0]);
    // svg.append("g")
    //   .attr("class", "grid")
    //   .call(d3.axisLeft(y)
    //     .tickFormat("")
    //     .tickValues([0, 0.25, 0.5, 0.75, 1])
    //   );

    var area_svg = svg.append('g');
    var path_svg = svg.append('g');

    var axisColors = ["#888", "#888", "#888"];
    var y_scale = {};
    var names = this.div_id.split("_");

    for (var i = 0; i < 3; i++) {
      var axis = selectedAxis[i];
      // console.log([d3.min(data[axis], function(d) { return d.min; }), d3.max(data[axis], function(d) { return d.max; })]);
      y_scale[axis] = d3.scaleLinear()
        .domain([d3.min(data[axis], function(d) { return d.min; }), d3.max(data[axis], function(d) { return d.max; })])
        .range([ (i+1)*(this.height)/3.0+overlap_offset, i*(this.height)/3.0-overlap_offset ]);
        // .range([ this.height, 0 ]);

      var axis_name = data_options[axis.toLowerCase()]["id"];
      var name_len = 15+axis_name.length*3;
      // var name_len = 45;
      // console.log("name_len", name_len)
      var y_min = data[axis][0].value;
      // var y_pos = Math.min(y(0.02), y_scale[axis](y_min)-22*(1-i));
      var y_pos = (i+0.5)*this.height/3.0
      path_svg.append("line")
        .attr("x1", line_xscale(minYear)-12)
        .attr("y1", y_pos)
        .attr("x2", line_xscale(minYear))
        .attr("y2", y_scale[axis](y_min))
        .attr("class", this.div_id)
        .attr("axis", axis)
        .attr("stroke", axisColors[i])
        .attr("stroke-width", 1.5)
      path_svg.append("rect")
        .attr("x", function() {
          return line_xscale(minYear)-10-name_len-5;
        })
        .attr("y", y_pos-10)
        .attr("width", name_len+5)
        .attr("height", 18)
        .attr("rx", 5)
        .attr("ry", 5)
        .attr("class", this.div_id)
        .attr("axis", axis)
        .style("fill", "#ddd")
        .attr("stroke", axisColors[i])
        .attr("stroke-width", 1)
        // .attr("filter", "url(#drop-shadow)")
        .on("mouseover", mouseOverPaths)
        .on("mouseout", mouseOutPaths)
      path_svg.append("text")
        .attr("x", line_xscale(minYear)-12)
        .attr("y", y_pos+2)
        .text(data_options[axis.toLowerCase()]["id"])
        .attr("class", this.div_id)
        .attr("axis", axis)
        .attr("fill", "#000")
        .attr("font-family", "Helvetica Neue")
        .attr("font-size", 10)
        .attr("textLength", name_len)
        .attr("lengthAdjust", "spacing")
        .attr("text-anchor", "end")
        .attr("cursor", "pointer")
        .on("mouseover", mouseOverPaths)
        .on("mouseout", mouseOutPaths)

      area_svg.append("path")
        .datum(data[axis])
        .attr("class", this.div_id)
        .attr("type", "area")
        .attr("axis", axis)
        .attr("fill", gcolor(parseInt(names[1])))
        .attr("opacity", 0.6)
        .attr("stroke", "none")
        .attr("d", d3.area()
          .x(function(d) { return line_xscale(d.time) })
          .y0(function(d) { return y_scale[axis](d.min) })
          .y1(function(d) { return y_scale[axis](d.max) })
        )
        .on("mouseover", mouseOverPaths)
        .on("mouseout", mouseOutPaths)

      path_svg.append("path")
        .datum(data[axis])
        .attr("class", this.div_id)
        .attr("type", "path")
        .attr("axis", axis)
        .attr("fill", "transparent")
        .attr("stroke", axisColors[i])
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
          .x(function(d) { return line_xscale(d.time) })
          .y(function(d) { return y_scale[axis](d.value) })
        )
        .on("mouseover", mouseOverPaths)
        .on("mouseout", mouseOutPaths)

    }

    var canvas = {};
    for (var a = 0; a < 3; a++) {
      var line_id = this.div_id+"_"+selectedAxis[a];
      canvas[selectedAxis[a]] = document.getElementById(line_id);
      line_indicators[line_id] = document.createElement("div");
      line_indicators[line_id].className = "line-indicator";
      canvas[selectedAxis[a]].appendChild(line_indicators[line_id]);

      canvas[selectedAxis[a]].onmousemove = function(e) {
        if (line_indicators[e.target.id] != undefined) {
          setMousePosition(e);
          var m_pos = mouse.x-e.target.getBoundingClientRect().x;
          var c_year = Math.floor(line_xscale.invert(m_pos));
          line_indicators[e.target.id].style.left = m_pos;
          line_indicators[e.target.id].style.display = "inline-block";
          line_indicators[e.target.id].innerText = c_year;
        }
        draw_rect_move(e, this);
      };
      canvas[selectedAxis[a]].onmouseover = function(e) {
        this.style.backgroundColor = "rgba(128, 128, 128, 0.2)";
      }
      canvas[selectedAxis[a]].onmouseleave = function(e) {
        this.style.backgroundColor = "transparent";
        line_indicators[e.target.id].style.display = "none";
        remove_rect_focus();
      }
      canvas[selectedAxis[a]].onclick = function(e) { draw_rect_click (e, this); };
    }

  }
}

var element = null;
var mouse = {
  x: 0,
  y: 0,
  startX: 0,
  startY: 0
};

function select_rect_line(id, axes) {
  var a = axes.split(",");
  for (var i = 0; i < a.length; i++) {
    var selectedEvent = document.getElementById(id+"-"+a[i]);
    if (selectedEvent) selectedEvent.className = 'select_rectangle select_rectangle_highlight';
  }
}
function select_rect_trace(id) {
  var selectedEvent = document.getElementById(id+"-trace");
  if (selectedEvent) selectedEvent.className = 'select_trace select_trace_highlight';
}

function deselect_rect_line(id, axes) {
  var a = axes.split(",");
  for (var i = 0; i < a.length; i++) {
    var selectedEvent = document.getElementById(id+"-"+a[i]);
    if (selectedEvent) selectedEvent.className = 'select_rectangle';
  }
}
function deselect_rect_trace(id) {
  var selectedEvent = document.getElementById(id+"-trace");
  if (selectedEvent) selectedEvent.className = 'select_trace';
}

function remove_rect_line(id, axes) {
  var a = axes.split(",");
  for (var i = 0; i < a.length; i++) {
    var selectedEvent = document.getElementById(id+"-"+a[i]);
    selectedEvent.remove();
  }
}
function remove_rect_trace(id) {
  var selectedEvent = document.getElementById(id+"-trace");
  selectedEvent.remove();
}


function remove_rect_focus() {
  if (element !== null) {
    element.remove();
    element = null;
  }
}

function draw_rect_input(yrange, div_id, axes, reason) {
  var y_start = parseInt(yrange[0]),
      y_end = parseInt(yrange[yrange.length-1]);
  var ys = line_xscale(y_start),
      ye = line_xscale(y_end-1);
  // console.log("draw_rect_input", yrange, ys, ye, div_id, axes, reason);
  for (var i in axes) {
    var names = div_id.split("_");
    var canvas = document.getElementById(div_id+"_"+axes[i]);
    var rect_id = [y_start, y_end, names[1], axes[i]].join("-");
    if (document.getElementById(rect_id) != undefined) continue;

    var e = document.createElement('div');
    // e.className = 'select_rectangle select_rectangle_'+reason;
    e.className = 'select_rectangle';
    e.id = rect_id;
    e.style.left = ys;
    e.style.top = 0;
    e.style.width = Math.abs(ye - ys);
    e.style.paddingLeft = Math.abs(ye - ys)+3;
    e.style.height = "100%";
    e.innerHTML = reason;
    canvas.appendChild(e)
  }
}
function draw_rect_move(e, canvas) {
  var rect = canvas.getBoundingClientRect();
  if (element !== null) {
    setMousePosition(e);
    element.style.width = Math.abs(mouse.x - mouse.startX);
    element.style.height = "100%";
    element.style.left = (mouse.x - mouse.startX < 0) ? mouse.x - rect.x: mouse.startX - rect.x;
    element.style.top = 0;
  }
}

function draw_rect_click(e, canvas) {
  var rect = canvas.getBoundingClientRect();
  var reason = "usr";
  setMousePosition(e);
  // console.log("draw_rect_click", reason);
  if (element !== null) {
    names = canvas.id.split("_");
    // console.log("draw_rect_click", names);
    left = +element.style.left.split("px")[0];
    width = +element.style.width.split("px")[0];
    element.style.paddingLeft = width+2;
    element.innerHTML = "U";
    startYear = Math.floor(line_xscale.invert(left));
    endYear = Math.floor(line_xscale.invert(left+width));
    years = Array.from(new Array(endYear-startYear+1), (x,i) => i + startYear)
    drawFrame(years, names[1], [names[2]], reason, reason);
    draw_rect_trace(years, names[1], reason);
    canvas.style.cursor = "default";
    // console.log("finsihed.", element);
    element.remove();
    element = null;

  } else {
    mouse.startX = mouse.x;
    mouse.startY = mouse.y;
    element = document.createElement('div');
    element.className = 'select_rectangle select_rectangle_'+reason;
    element.style.left = mouse.x-rect.x + 'px';
    element.style.top = 0;
    element.style.height = "100%";
    // element.style.top = mouse.y - rect.y + 'px';
    startYear = Math.floor(line_xscale.invert(mouse.x-rect.x));
    // console.log("begun.", canvas, element, startYear);
    canvas.appendChild(element)
    // canvas.style.cursor = "crosshair";
  }
}

function setMousePosition(e) {
  var content = document.getElementsByClassName("content");
  var navbar_h = 45-content[0].getBoundingClientRect().top;
  var ev = e || window.event; //Moz || IE
  if (ev.pageX) { //Moz
    mouse.x = ev.pageX + window.pageXOffset;
    mouse.y = ev.pageY + window.pageYOffset-navbar_h;
  } else if (ev.clientX) { //IE
    mouse.x = ev.clientX + document.body.scrollLeft;
    mouse.y = ev.clientY + document.body.scrollTop-navbar_h;
  }
  // console.log("navbar_h", navbar_h)
}

function mouseOverPaths(d) {
  // console.log("mouseOverPaths", this.className.baseVal)
  selected_axis = this.getAttribute("axis")
  var otherpaths = document.querySelectorAll("."+this.className.baseVal);
  for (var i = 0; i < otherpaths.length; i++) {
    if (otherpaths[i].getAttribute("axis") != selected_axis) {
      otherpaths[i].style.visibility = "hidden";
    } else if (otherpaths[i].getAttribute("type") == "area") {
      otherpaths[i].style.opacity = 0.7;
    }
  }
}

function mouseOutPaths(d) {
  // console.log("mouseOutPaths", this.className.baseVal)
  var otherpaths = document.querySelectorAll("."+this.className.baseVal);
  for (var i = 0; i < otherpaths.length; i++) {
    otherpaths[i].style.visibility = "visible";
    if (otherpaths[i].getAttribute("type") == "area") {
      otherpaths[i].style.opacity = 0.4;
    }
  }
}
