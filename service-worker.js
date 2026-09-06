"use strict";

const CACHE_PREFIX = "workright-app-";
// キャッシュ対象を変更して公開する場合は、この値を更新する。
const CACHE_VERSION = "v9";
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;
const APP_SHELL_URLS = Object.freeze([
  "./",
  "./manifest.webmanifest",
  "./styles/calendar.css",
  "./styles/long-breaks.css",
  "./styles/pay.css",
  "./styles/warnings.css",
  "./styles/language.css",
  "./styles/storage.css",
  "./styles/information-pages.css",
  "./styles/menu.css",
  "./styles/shift-presets.css",
  "./lang/languages.js",
  "./lang/ja.js",
  "./lang/en.js",
  "./lang/bn.js",
  "./lang/ko.js",
  "./lang/my.js",
  "./lang/ne.js",
  "./lang/si.js",
  "./lang/vi.js",
  "./lang/language.js",
  "./scripts/storage.js",
  "./scripts/work-limit.js",
  "./scripts/break-time.js",
  "./scripts/shift-presets.js",
  "./scripts/calendar.js",
  "./scripts/menu.js",
  "./scripts/pwa.js",
  "./pages/online-only.html",
  "./assets/workright-mark.svg",
  "./assets/icons/workright-apple-touch-icon-v1.png",
  "./assets/icons/workright-favicon-v1-32.png",
  "./assets/icons/workright-icon-v1-192.png",
  "./assets/icons/workright-icon-v1-512.png",
  "./assets/icons/workright-maskable-icon-v1-512.png",
]);
const ONLINE_ONLY_PATHS = Object.freeze([
  "./pages/school-guide.html",
  "./pages/legal-references.html",
]);
const ONLINE_ONLY_FALLBACK_URL = "./pages/online-only.html";

function resolveFromScope(relativeUrl) {
  return new URL(relativeUrl, self.registration.scope);
}

function isOnlineOnlyRequest(url) {
  return ONLINE_ONLY_PATHS.some(
    (relativeUrl) => resolveFromScope(relativeUrl).pathname === url.pathname,
  );
}

async function fetchOnlineOnlyPage(request) {
  try {
    return await fetch(new Request(request, { cache: "no-store" }));
  } catch {
    const fallback = await caches.match(
      resolveFromScope(ONLINE_ONLY_FALLBACK_URL),
    );
    return fallback ?? Response.error();
  }
}

async function fetchCachedAppResource(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request, { ignoreSearch: true });
  if (cachedResponse) return cachedResponse;
  return fetch(request);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_URLS)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME,
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (isOnlineOnlyRequest(requestUrl)) {
    event.respondWith(fetchOnlineOnlyPage(event.request));
    return;
  }

  event.respondWith(fetchCachedAppResource(event.request));
});
