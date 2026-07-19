(function () {
  document.documentElement.classList.add("auth-loading");

  if (document.getElementById("auth-boot-style")) {
    return;
  }

  var style = document.createElement("style");
  style.id = "auth-boot-style";
  style.textContent = [
    "html.auth-loading body > :not(.auth-gate),",
    "html.auth-required body > :not(.auth-gate) {",
    "  visibility: hidden !important;",
    "}",
    "html.auth-loading body,",
    "html.auth-required body {",
    "  background: #f6f8fb !important;",
    "}",
    ".auth-gate {",
    "  visibility: visible !important;",
    "}"
  ].join("\n");
  document.head.appendChild(style);
})();
