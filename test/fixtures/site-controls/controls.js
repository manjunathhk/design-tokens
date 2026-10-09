/* global document, localStorage, Element */
/* The D54 site-controls surface as controls.js is planned to ship it (#117). */
(function () {
  var root = document.documentElement;

  function applyTheme(choice) {
    if (choice === "light" || choice === "dark") root.setAttribute("data-theme", choice);
    else root.removeAttribute("data-theme");
  }

  function applyWidth(width) {
    if (width === "full") root.setAttribute("data-mk-width", "full");
    else root.removeAttribute("data-mk-width");
  }

  applyTheme(localStorage.getItem("mk-theme"));
  applyWidth(localStorage.getItem("mk-width"));

  function setTheme(choice) {
    localStorage.setItem("mk-theme", choice);
    applyTheme(choice);
  }

  function toggleWidth() {
    var width = root.getAttribute("data-mk-width") === "full" ? "fit" : "full";
    localStorage.setItem("mk-width", width);
    applyWidth(width);
  }

  document.addEventListener("click", function (event) {
    var target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest('[data-mk-theme-choice="system"]')) setTheme("system");
    else if (target.closest('[data-mk-theme-choice="light"]')) setTheme("light");
    else if (target.closest('[data-mk-theme-choice="dark"]')) setTheme("dark");
    else if (target.closest("[data-mk-width-toggle]")) toggleWidth();
  });
})();
