"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const serviceWorkerSource = fs.readFileSync(
  path.join(projectRoot, "service-worker.js"),
  "utf8",
);
const pwaSource = fs.readFileSync(
  path.join(projectRoot, "scripts", "pwa.js"),
  "utf8",
);

async function testServiceWorker() {
  const listeners = new Map();
  const deletedCaches = [];
  const cachedUrls = [];
  let clientsClaimed = false;
  let fetchedRequest = null;
  let fetchImplementation = async (request) => {
    fetchedRequest = request;
    return new Response("online");
  };

  function requestUrl(value) {
    if (value instanceof Request) return value.url;
    if (value instanceof URL) return value.href;
    return String(value);
  }

  const cache = {
    addAll: async (urls) => {
      cachedUrls.push(...urls);
    },
    match: async (request) => {
      const url = requestUrl(request);
      if (url.endsWith("/pages/online-only.html")) {
        return new Response("online-only");
      }
      if (url === "https://example.test/ShiftCheckTool/") {
        return new Response("cached-app");
      }
      return undefined;
    },
  };
  const cacheStorage = {
    open: async () => cache,
    match: async (request) => cache.match(request),
    keys: async () => [
      "workright-app-v8",
      "workright-app-v9",
      "unrelated-cache",
    ],
    delete: async (cacheName) => {
      deletedCaches.push(cacheName);
      return true;
    },
  };
  const selfMock = {
    registration: {
      scope: "https://example.test/ShiftCheckTool/",
    },
    location: {
      origin: "https://example.test",
    },
    clients: {
      claim: async () => {
        clientsClaimed = true;
      },
    },
    addEventListener: (type, listener) => {
      listeners.set(type, listener);
    },
  };

  vm.runInNewContext(serviceWorkerSource, {
    self: selfMock,
    caches: cacheStorage,
    fetch: (...args) => fetchImplementation(...args),
    Request,
    Response,
    URL,
  });

  let installPromise;
  listeners.get("install")({
    waitUntil: (promise) => {
      installPromise = promise;
    },
  });
  await installPromise;
  assert.ok(cachedUrls.includes("./"));
  assert.ok(!cachedUrls.includes("./index.html"));
  assert.ok(cachedUrls.includes("./pages/online-only.html"));
  assert.ok(!cachedUrls.includes("./pages/school-guide.html"));
  assert.ok(!cachedUrls.includes("./pages/legal-references.html"));

  let activatePromise;
  listeners.get("activate")({
    waitUntil: (promise) => {
      activatePromise = promise;
    },
  });
  await activatePromise;
  assert.deepEqual(deletedCaches, ["workright-app-v8"]);
  assert.equal(clientsClaimed, true);

  function dispatchFetch(request) {
    let responsePromise;
    listeners.get("fetch")({
      request,
      respondWith: (promise) => {
        responsePromise = Promise.resolve(promise);
      },
    });
    return responsePromise;
  }

  fetchImplementation = async () => {
    throw new Error("The network must not be used for cached app files.");
  };
  const cachedResponse = await dispatchFetch(
    new Request("https://example.test/ShiftCheckTool/"),
  );
  assert.equal(await cachedResponse.text(), "cached-app");

  fetchImplementation = async (request) => {
    fetchedRequest = request;
    return new Response("school-guide");
  };
  const onlineResponse = await dispatchFetch(
    new Request(
      "https://example.test/ShiftCheckTool/pages/school-guide.html",
    ),
  );
  assert.equal(await onlineResponse.text(), "school-guide");
  assert.equal(fetchedRequest.cache, "no-store");

  fetchImplementation = async () => {
    throw new Error("offline");
  };
  const offlineResponse = await dispatchFetch(
    new Request(
      "https://example.test/ShiftCheckTool/pages/legal-references.html",
    ),
  );
  assert.equal(await offlineResponse.text(), "online-only");

  const crossOriginResponse = dispatchFetch(
    new Request("https://www.example.com/reference"),
  );
  assert.equal(crossOriginResponse, undefined);
}

function testRegistration() {
  let loadHandler = null;
  let registration = null;
  const context = {
    navigator: {
      serviceWorker: {
        register: (url, options) => {
          registration = { url, options };
          return Promise.resolve();
        },
      },
    },
    window: {
      addEventListener: (type, listener) => {
        if (type === "load") loadHandler = listener;
      },
    },
    console,
  };

  vm.runInNewContext(pwaSource, context);
  assert.equal(typeof loadHandler, "function");
  loadHandler();
  assert.equal(registration.url, "./service-worker.js");
  assert.equal(registration.options.scope, "./");
  assert.equal(registration.options.updateViaCache, "none");
}

testServiceWorker()
  .then(() => {
    testRegistration();
    console.log("PWA runtime tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
