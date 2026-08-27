(() => {
  "use strict";

  const menuButton = document.getElementById("menu-button");
  const menuModal = document.getElementById("navigation-menu-modal");
  const menuHeading = document.getElementById("navigation-menu-heading");
  const menuBackdrop = document.getElementById("navigation-menu-backdrop");
  const closeMenuButton = document.getElementById("close-navigation-menu");
  const shiftManagementTab = document.getElementById("shift-management-tab");
  const longBreakManagementTab = document.getElementById(
    "long-break-management-tab",
  );
  const languageButton = document.getElementById("language-button");

  function openNavigationMenu() {
    menuModal.hidden = false;
    menuButton.setAttribute("aria-expanded", "true");
    menuHeading.focus({ preventScroll: true });
  }

  function closeNavigationMenu(restoreFocus = true) {
    menuModal.hidden = true;
    menuButton.setAttribute("aria-expanded", "false");
    if (restoreFocus) menuButton.focus({ preventScroll: true });
  }

  menuButton.addEventListener("click", openNavigationMenu);
  menuBackdrop.addEventListener("click", () => closeNavigationMenu());
  closeMenuButton.addEventListener("click", () => closeNavigationMenu());
  shiftManagementTab.addEventListener("click", () => closeNavigationMenu());
  longBreakManagementTab.addEventListener("click", () =>
    closeNavigationMenu(),
  );
  languageButton.addEventListener("click", () =>
    closeNavigationMenu(false),
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menuModal.hidden) {
      closeNavigationMenu();
    }
  });
})();
