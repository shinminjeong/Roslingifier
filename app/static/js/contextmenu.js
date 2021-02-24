var menu = document.querySelector(".context-menu");
var menuId = 0, menuState = 0;
var activeClassName = "context-menu--active";
function showContextMenu(id) {
  // console.log("showContextMenu", id)
  var e = d3.event;
  e.preventDefault();
  var names = id.split("-");
  if (names[0] == "init" || names[2] == "I" || names[2] == "O") return;

  if (findNextFrame(id, "left") == undefined) {
    document.querySelector(".context-menu__moveleft").classList.add("disable");
  } else {
    document.querySelector(".context-menu__moveleft").classList.remove("disable");
  }
  if (findNextFrame(id, "right") == undefined) {
    document.querySelector(".context-menu__moveright").classList.add("disable");
  } else {
    document.querySelector(".context-menu__moveright").classList.remove("disable");
  }

  toggleLabelMenuOff();
  if ( menuState !== 1 || menuId != id) {
    setMousePosition(e)
    toggleMenuOn();
  } else {
    toggleMenuOff();
  }
  menuId = id;
}
function toggleMenuOn() {
  menuState = 1;
  menu.classList.add(activeClassName);
  menu.style.left = mouse.x;
  menu.style.top = mouse.y;
}
function toggleMenuOff() {
  menuState = 0;
  menu.classList.remove(activeClassName);
}

var context_items = document.querySelectorAll(".context-menu__item");
for (var i = 0; i < context_items.length; i++) {
  context_items[i].addEventListener("click", function(e) {
    var target = e.target;
    if (e.target.tagName == "I") target = e.target.parentNode;
    // console.log("selected_tframe", selected_tframe, target)
    if (target.classList.contains("context-menu__moveleft")) {
      move(selected_tframe, "left");
    } else if (target.classList.contains("context-menu__moveright")) {
      move(selected_tframe, "right");
    } else if (target.classList.contains("context-menu__delete")) {
      removeTimeSlice(selected_tframe);
    }
    toggleMenuOff();
  })
  context_items[i].addEventListener("mouseover", function(e) {
    var target = e.target;
    if (e.target.tagName == "I") target = e.target.parentNode;
    target.classList.add("context-menu__item_active");
  })
  context_items[i].addEventListener("mouseout", function(e) {
    var target = e.target;
    if (e.target.tagName == "I") target = e.target.parentNode;
    target.classList.remove("context-menu__item_active");
  })
}


function highlightLabel(e, frame_id) {
  selected_tframe = frame_id;
  selected_label = e.target.getAttribute("data-item-id");
  // console.log("highlightLabel", frame_id, selected_label);
  e.target.className = "time-label active";
}
function muteLabel(e, frame_id) {
  // console.log("muteLabel", frame_id, e.target);
  e.target.className = "time-label";
}
function showLabelDelete(e, frame_id) {
  // console.log("showLabelDelete", frame_id, e.target);
  e.preventDefault();
  toggleMenuOff();
  if ( menuState !== 1 || menuId != frame_id) {
    setMousePosition(e)
    toggleLabelMenuOn();
  } else {
    toggleLabelMenuOff();
  }
  menuId = frame_id;
}
var labelMenu = document.querySelector(".context-menu-label");
function toggleLabelMenuOn() {
  menuState = 1;
  labelMenu.classList.add("context-menu--active");
  labelMenu.style.left = mouse.x;
  labelMenu.style.top = mouse.y;
}
function toggleLabelMenuOff() {
  menuState = 0;
  labelMenu.classList.remove("context-menu--active");
}

var label_menu_items = document.querySelectorAll(".context-menu-label__item");
for (var i = 0; i < label_menu_items.length; i++) {
  label_menu_items[i].addEventListener("click", function(e) {
    var target = e.target;
    if (e.target.tagName == "I") target = e.target.parentNode;
    // console.log("label_menu_items", target)
    if (target.classList.contains("context-menu-label__delete")) {
      removeLabelFrame(selected_tframe, selected_label);
    }
    toggleLabelMenuOff();
  })
  label_menu_items[i].addEventListener("mouseover", function(e) {
    var target = e.target;
    if (e.target.tagName == "I") target = e.target.parentNode;
    target.classList.add("context-menu__item_active");
  })
  label_menu_items[i].addEventListener("mouseout", function(e) {
    var target = e.target;
    if (e.target.tagName == "I") target = e.target.parentNode;
    target.classList.remove("context-menu__item_active");
  })
}
