(function () {
  const storageKey = "frc-wiki-language";
  const defaultLanguage = "zh";

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

  function applyLanguage(language) {
    document.documentElement.lang = language === "en" ? "en" : "zh-CN";

    document.querySelectorAll("[data-en]").forEach((element) => {
      if (!element.dataset.zh) {
        element.dataset.zh = element.textContent.trim();
      }

      element.textContent = language === "en" ? element.dataset.en : element.dataset.zh;
    });

    if (document.body.dataset.titleEn) {
      document.title = language === "en" ? document.body.dataset.titleEn : document.body.dataset.titleZh;
    }

    document.querySelectorAll("[data-language-toggle]").forEach((button) => {
      button.setAttribute("aria-pressed", language === "en" ? "true" : "false");
      button.setAttribute("aria-label", language === "en" ? "切换到中文" : "Switch to English");
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
    setupToggle();
    applyLanguage(getSavedLanguage());
  });
})();
