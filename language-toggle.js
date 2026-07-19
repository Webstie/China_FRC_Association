(function () {
  const storageKey = "frc-wiki-language";
  const defaultLanguage = "zh";
  const navLabels = {
    "index.html": ["主页", "Home"],
    "info.html": ["信息", "Info"],
    "shopping.html": ["购物", "Shopping"],
    "code.html": ["代码", "Code"],
    "design.html": ["设计", "Design"],
    "calendar.html": ["日历", "Calendar"],
    "registration.html": ["注册", "Registration"]
  };

  function ensureToggleStyles() {
    if (document.getElementById("language-toggle-runtime-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "language-toggle-runtime-style";
    style.textContent = `
      .language-toggle {
        position: relative;
        display: inline-grid;
        grid-template-columns: repeat(2, minmax(38px, auto));
        align-items: center;
        gap: 2px;
        min-height: 38px;
        border: 1px solid rgba(255, 255, 255, 0.26);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        cursor: pointer;
        font: inherit;
        font-weight: 800;
        padding: 3px;
        overflow: hidden;
        transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
      }

      .language-toggle:hover {
        background: rgba(255, 255, 255, 0.16);
        border-color: rgba(255, 255, 255, 0.42);
        box-shadow: 0 0 0 3px rgba(0, 102, 179, 0.22);
      }

      .language-toggle:focus-visible {
        outline: 2px solid white;
        outline-offset: 2px;
      }

      .language-option {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 38px;
        height: 30px;
        padding: 0 9px;
        border-radius: 999px;
        color: rgba(255, 255, 255, 0.74);
        line-height: 1;
      }

      .language-option.is-active {
        background: #ffffff;
        color: #0066B3;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
      }
    `;
    document.head.appendChild(style);
  }

  function getSavedLanguage() {
    try {
      return localStorage.getItem(storageKey) === "en" ? "en" : defaultLanguage;
    } catch (error) {
      return defaultLanguage;
    }
  }

  function saveLanguage(language) {
    try {
      localStorage.setItem(storageKey, language);
    } catch (error) {
      return;
    }
  }

  function hasCjk(text) {
    return /[\u3400-\u9fff]/.test(text || "");
  }

  function hasLatin(text) {
    return /[A-Za-z]/.test(text || "");
  }

  function normalize(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function splitMixedLanguageText(text) {
    const value = normalize(text);
    if (!hasCjk(value) || !hasLatin(value)) {
      return null;
    }

    const firstCjk = value.search(/[\u3400-\u9fff]/);
    const firstLatin = value.search(/[A-Za-z]/);
    if (firstCjk < 0 || firstLatin < 0) {
      return null;
    }

    if (firstLatin < firstCjk) {
      const en = value.slice(0, firstCjk).replace(/[·\-–—:：/|]+$/g, "").trim();
      const zh = value.slice(firstCjk).replace(/^[·\-–—:：/|]+/g, "").trim();
      return zh && en ? { zh, en } : null;
    }

    const latinMatch = value.match(/[A-Za-z][A-Za-z0-9\s&+/.():'’,-]*(?:[!?→]|$)/);
    if (!latinMatch || latinMatch.index == null) {
      return null;
    }

    const en = latinMatch[0].trim();
    const zh = (value.slice(0, latinMatch.index) + value.slice(latinMatch.index + latinMatch[0].length))
      .replace(/[·\-–—:：/|]+$/g, "")
      .trim();
    return zh && en ? { zh, en } : null;
  }

  function canRewriteMixedElement(element) {
    if (element.dataset.en || element.dataset.zh || element.dataset.i18nAuto || element.closest("script, style, pre, code, svg")) {
      return false;
    }

    if (element.children.length > 0) {
      return false;
    }

    return /^(H1|H2|H3|H4|H5|H6|P|SPAN|STRONG|EM|TH|TD|A|BUTTON|LABEL|SMALL|LI|DIV)$/.test(element.tagName);
  }

  function setupMixedTextElements() {
    document.querySelectorAll("body *").forEach((element) => {
      if (!canRewriteMixedElement(element)) {
        return;
      }

      const split = splitMixedLanguageText(element.textContent);
      if (!split) {
        return;
      }

      element.dataset.zh = split.zh;
      element.dataset.en = split.en;
    });
  }

  function setupNavLabels() {
    document.querySelectorAll(".nav-links a[href]").forEach((link) => {
      const href = link.getAttribute("href");
      const labels = navLabels[href];
      if (!labels) {
        return;
      }
      link.dataset.zh = labels[0];
      link.dataset.en = labels[1];
    });
  }

  function setupToggleButtons() {
    document.querySelectorAll("[data-language-toggle]").forEach((button) => {
      button.classList.add("language-toggle");
      button.innerHTML = '<span class="language-option" data-lang-option="zh">中文</span><span class="language-option" data-lang-option="en">EN</span>';
    });
  }

  function setupLanguagePairs() {
    document.querySelectorAll(".chinese, .chinese-title, .chinese-name").forEach((element) => {
      const text = normalize(element.textContent);
      const elementLanguage = hasLatin(text) && !hasCjk(text) ? "en" : "zh";
      const previousLanguage = elementLanguage === "zh" ? "en" : "zh";
      element.dataset.i18nAuto = elementLanguage;

      const previous = element.previousElementSibling;
      if (previous && !previous.dataset.i18nAuto && !previous.dataset.en && !previous.dataset.zh) {
        const previousText = normalize(previous.textContent);
        if (
          (previousLanguage === "en" && hasLatin(previousText)) ||
          (previousLanguage === "zh" && hasCjk(previousText))
        ) {
          previous.dataset.i18nAuto = previousLanguage;
        }
      }
    });

    document.querySelectorAll(".en").forEach((element) => {
      if (!element.dataset.en && !element.dataset.zh && !element.dataset.i18nAuto) {
        element.dataset.i18nAuto = "en";
      }
    });

    document.querySelectorAll("main p, main li").forEach((element) => {
      if (element.dataset.en || element.dataset.zh || element.dataset.i18nAuto) {
        return;
      }

      const previous = element.previousElementSibling;
      if (!previous || previous.tagName !== element.tagName || previous.dataset.i18nAuto) {
        return;
      }

      const currentText = normalize(element.textContent);
      const previousText = normalize(previous.textContent);
      if (hasCjk(currentText) && hasLatin(previousText) && currentText.length > 12 && previousText.length > 12) {
        previous.dataset.i18nAuto = "en";
        element.dataset.i18nAuto = "zh";
      } else if (hasLatin(currentText) && hasCjk(previousText) && currentText.length > 12 && previousText.length > 12) {
        previous.dataset.i18nAuto = "zh";
        element.dataset.i18nAuto = "en";
      }
    });
  }

  function preparePage() {
    setupNavLabels();
    setupToggleButtons();
    setupMixedTextElements();
    setupLanguagePairs();
  }

  function applyLanguage(language) {
    document.documentElement.lang = language === "en" ? "en" : "zh-CN";

    document.querySelectorAll("[data-en]").forEach((element) => {
      if (element.matches("[data-language-toggle]")) {
        return;
      }

      // Capture the Chinese side as markup, not plain text: a lot of copy carries
      // inline <code>, <strong> and links. Storing textContent here used to flatten
      // them away permanently on the first toggle.
      if (!element.dataset.zh) {
        element.dataset.zh = element.innerHTML.trim();
      }

      if (language === "en") {
        // data-en is authored as plain text by convention.
        element.textContent = element.dataset.en;
      } else {
        element.innerHTML = element.dataset.zh;
      }
    });

    document.querySelectorAll("[data-i18n-auto]").forEach((element) => {
      element.hidden = element.dataset.i18nAuto !== language;
    });

    if (document.body.dataset.titleEn) {
      document.title = language === "en" ? document.body.dataset.titleEn : document.body.dataset.titleZh;
    } else if (document.documentElement.dataset.titleEn) {
      document.title = language === "en" ? document.documentElement.dataset.titleEn : document.documentElement.dataset.titleZh;
    }

    document.querySelectorAll("[data-language-toggle]").forEach((button) => {
      button.setAttribute("aria-pressed", language === "en" ? "true" : "false");
      button.setAttribute("aria-label", language === "en" ? "切换到中文" : "Switch to English");
      button.querySelectorAll("[data-lang-option]").forEach((option) => {
        option.classList.toggle("is-active", option.dataset.langOption === language);
      });
    });
  }

  function setupToggle() {
    const buttons = document.querySelectorAll("[data-language-toggle]");

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const nextLanguage = document.documentElement.lang === "en" ? "zh" : "en";
        saveLanguage(nextLanguage);
        applyLanguage(nextLanguage);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    ensureToggleStyles();
    const titleSuffix = " - FRC Wiki CN";
    const titleBase = document.title.replace(/ [—-] FRC Wiki CN$/, "");
    const titleSplit = splitMixedLanguageText(titleBase);
    if (titleSplit) {
      document.documentElement.dataset.titleZh = `${titleSplit.zh}${titleSuffix}`;
      document.documentElement.dataset.titleEn = `${titleSplit.en}${titleSuffix}`;
    }
    preparePage();
    setupToggle();
    applyLanguage(getSavedLanguage());
  });
})();
