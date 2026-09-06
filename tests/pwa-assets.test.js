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

function readFrozenArray(constantName) {
  const pattern = new RegExp(
    "const " +
      constantName +
      " = Object\\.freeze\\(\\[([\\s\\S]*?)\\]\\);",
  );
  const match = serviceWorkerSource.match(pattern);
  assert.ok(match, constantName + " must be declared as a frozen array.");
  return vm.runInNewContext("[" + match[1] + "]");
}

const appShellUrls = readFrozenArray("APP_SHELL_URLS");
const onlineOnlyPaths = readFrozenArray("ONLINE_ONLY_PATHS");

assert.ok(appShellUrls.includes("./"));
assert.ok(!appShellUrls.includes("./index.html"));

for (const relativeUrl of appShellUrls) {
  if (relativeUrl === "./") continue;
  const filePath = path.join(projectRoot, relativeUrl.replace(/^\.\//, ""));
  assert.ok(fs.existsSync(filePath), "Cached file is missing: " + relativeUrl);
}

assert.ok(appShellUrls.includes("./pages/online-only.html"));
assert.ok(!appShellUrls.includes("./pages/school-guide.html"));
assert.ok(!appShellUrls.includes("./pages/legal-references.html"));
assert.deepEqual(Array.from(onlineOnlyPaths), [
  "./pages/school-guide.html",
  "./pages/legal-references.html",
]);
assert.match(serviceWorkerSource, /cache: "no-store"/);

const manifest = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "manifest.webmanifest"), "utf8"),
);
assert.equal(manifest.start_url, "./");
assert.equal(manifest.scope, "./");
assert.equal(manifest.display, "standalone");
assert.ok(
  manifest.icons.some(
    (icon) => icon.sizes === "192x192" && icon.purpose === "any",
  ),
);
assert.ok(
  manifest.icons.some(
    (icon) => icon.sizes === "512x512" && icon.purpose === "any",
  ),
);
assert.ok(
  manifest.icons.some(
    (icon) => icon.sizes === "512x512" && icon.purpose === "maskable",
  ),
);

const indexHtml = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
assert.match(
  indexHtml,
  /<link rel="manifest" href="\.\/manifest\.webmanifest">/,
);
assert.match(
  indexHtml,
  /<meta name="apple-mobile-web-app-capable" content="yes">/,
);
assert.match(
  indexHtml,
  /<script src="\.\/scripts\/pwa\.js" defer><\/script>/,
);

console.log("PWA asset tests passed");
