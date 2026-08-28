(() => {
  "use strict";

  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js", {
        scope: "./",
        updateViaCache: "none",
      })
      .catch((error) => {
        console.error("Service Worker registration failed.", error);
      });
  });
})();
