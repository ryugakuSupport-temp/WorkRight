(() => {
  "use strict";

  const catalog = window.ShiftLanguageCatalog;
  const translations = window.ShiftTranslations;
  const storage = window.ShiftStorage;
  let currentLanguageCode = catalog.defaultLanguage;
  let languageButton = null;
  let languageReturnButton = null;
  let languageModal = null;
  let languageModalHeading = null;
  let languageList = null;

  function getLanguage(code = currentLanguageCode) {
    return (
      catalog.languages.find((language) => language.code === code) ??
      catalog.languages.find(
        (language) => language.code === catalog.defaultLanguage,
      )
    );
  }

  function getSortedLanguages() {
    return [...catalog.languages].sort((left, right) => {
      const leftPriority =
        left.sortPriority === null ? Number.MAX_SAFE_INTEGER : left.sortPriority;
      const rightPriority =
        right.sortPriority === null
          ? Number.MAX_SAFE_INTEGER
          : right.sortPriority;

      return (
        leftPriority - rightPriority ||
        left.romanizedName.localeCompare(right.romanizedName, "en")
      );
    });
  }

  function translate(key, values = {}) {
    const defaultDictionary = translations[catalog.defaultLanguage] ?? {};
    const dictionary = translations[currentLanguageCode] ?? defaultDictionary;
    const template = dictionary[key] ?? defaultDictionary[key] ?? key;

    return Object.entries(values).reduce(
      (text, [name, value]) =>
        text.replaceAll(`{${name}}`, String(value)),
      template,
    );
  }

  function applyTranslations(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = translate(element.dataset.i18n);
    });
    root.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      element.setAttribute(
        "aria-label",
        translate(element.dataset.i18nAriaLabel),
      );
    });
    root.querySelectorAll("[data-i18n-content]").forEach((element) => {
      element.setAttribute("content", translate(element.dataset.i18nContent));
    });
  }

  function createLanguageOption(language) {
    const button = document.createElement("button");
    const names = document.createElement("span");
    const nativeName = document.createElement("strong");
    const romanizedName = document.createElement("span");
    const status = document.createElement("span");
    const isCurrent = language.code === currentLanguageCode;

    button.className = `language-option${isCurrent ? " selected" : ""}`;
    button.type = "button";
    button.dataset.languageCode = language.code;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(isCurrent));
    button.lang = language.htmlLang;
    names.className = "language-option-names";
    nativeName.textContent = language.nativeName;
    names.appendChild(nativeName);

    if (language.nativeName !== language.romanizedName) {
      romanizedName.textContent = language.romanizedName;
      names.appendChild(romanizedName);
    }

    status.className = "language-option-status";
    status.textContent = isCurrent ? translate("language.current") : "";
    button.append(names, status);
    button.addEventListener("click", async () => {
      button.disabled = true;

      try {
        await setLanguage(language.code);
        closeLanguageModal(false);
        languageReturnButton.focus();
      } catch (error) {
        window.alert(translate("storage.saveFailed"));
        button.disabled = false;
      }
    });
    return button;
  }

  function renderLanguageList() {
    if (!languageList) return;

    const fragment = document.createDocumentFragment();
    getSortedLanguages().forEach((language) =>
      fragment.appendChild(createLanguageOption(language)),
    );
    languageList.replaceChildren(fragment);
  }

  function applyLanguage(code) {
    const language = catalog.languages.find((item) => item.code === code);
    if (!language) return false;

    currentLanguageCode = language.code;
    document.documentElement.lang = language.htmlLang;
    applyTranslations();
    renderLanguageList();
    document.dispatchEvent(
      new CustomEvent("shiftlanguagechange", {
        detail: Object.freeze({ code: language.code, locale: language.locale }),
      }),
    );
    return true;
  }

  async function setLanguage(code) {
    const language = catalog.languages.find((item) => item.code === code);
    if (!language) return false;

    await storage.setSetting("language", language.code);
    return applyLanguage(language.code);
  }

  async function initializeLanguage() {
    const storedLanguageCode = await storage.getSetting("language");

    if (storedLanguageCode === null) return;
    if (!applyLanguage(storedLanguageCode)) {
      throw new Error("Stored language code is invalid.");
    }
  }

  function openLanguageModal() {
    renderLanguageList();
    languageModal.hidden = false;
    languageModalHeading.focus({ preventScroll: true });
  }

  function closeLanguageModal(restoreFocus = true) {
    languageModal.hidden = true;
    if (restoreFocus) languageReturnButton.focus();
  }

  languageButton = document.getElementById("language-button");
  languageReturnButton = document.getElementById("menu-button");
  languageModal = document.getElementById("language-modal");
  languageModalHeading = document.getElementById("language-modal-heading");
  languageList = document.getElementById("language-list");
  const languageModalBackdrop = document.getElementById(
    "language-modal-backdrop",
  );
  const closeLanguageModalButton = document.getElementById(
    "close-language-modal",
  );

  applyTranslations();
  renderLanguageList();
  const ready = initializeLanguage();
  ready.catch(() => {});
  window.ShiftLanguage = Object.freeze({
    ready,
    translate,
    applyTranslations,
    setLanguage,
    getCurrentLanguage: () => getLanguage(),
    getLanguages: () => Object.freeze(getSortedLanguages()),
  });
  languageButton.addEventListener("click", openLanguageModal);
  languageModalBackdrop.addEventListener("click", () => closeLanguageModal());
  closeLanguageModalButton.addEventListener("click", () =>
    closeLanguageModal(),
  );
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !languageModal.hidden) {
      closeLanguageModal();
    }
  });
})();
