"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const presetCss = fs.readFileSync(
  path.join(projectRoot, "styles", "shift-presets.css"),
  "utf8",
);
const calendarScript = fs.readFileSync(
  path.join(projectRoot, "scripts", "calendar.js"),
  "utf8",
);

const shiftFormStart = indexHtml.indexOf('<form id="shift-form"');
const shiftFormEnd = indexHtml.indexOf("</form>", shiftFormStart);
const shiftFormHtml = indexHtml.slice(shiftFormStart, shiftFormEnd);
assert.ok(!shiftFormHtml.includes('id="shift-preset-panel"'));

assert.match(
  indexHtml,
  /<div id="shift-preset-panel" class="shift-preset-modal" hidden>/,
);
assert.match(
  indexHtml,
  /class="shift-preset-dialog"\s+role="dialog"\s+aria-modal="true"/,
);
assert.match(indexHtml, /id="shift-preset-backdrop"/);
assert.match(indexHtml, /id="close-shift-preset"/);
assert.match(
  indexHtml,
  /data-i18n-aria-label="shift\.preset\.closeAria"/,
);
assert.match(indexHtml, />\s*テンプレートと履歴\s*</);
assert.match(indexHtml, />\s*新規テンプレート作成\s*</);
assert.ok(!indexHtml.includes('id="template-name-modal"'));
assert.match(
  indexHtml,
  /<div id="template-editor-modal" class="template-editor-modal" hidden>/,
);
assert.match(
  indexHtml,
  /class="template-editor-dialog"\s+role="dialog"\s+aria-modal="true"/,
);
assert.match(
  indexHtml,
  /id="template-job-name"[\s\S]*?name="jobName"[\s\S]*?required/,
);
assert.match(indexHtml, /id="template-start-time-hour"/);
assert.match(indexHtml, /id="template-end-time-minute"/);
assert.match(indexHtml, /id="template-break-list-fields"/);
assert.match(indexHtml, /id="template-hourly-wage"/);
assert.match(
  indexHtml,
  /data-i18n-aria-label="shift\.preset\.editorCloseAria"/,
);

const ids = Array.from(indexHtml.matchAll(/\bid="([^"]+)"/g), (match) => match[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
assert.deepEqual(duplicateIds, []);

assert.match(
  presetCss,
  /\.shift-preset-dialog\s*\{[\s\S]*?width: min\(100%, 430px\);[\s\S]*?height: calc\(100vh - 40px\);[\s\S]*?max-height: calc\(100vh - 40px\);/,
);
assert.match(
  presetCss,
  /\.shift-preset-modal\s*\{[\s\S]*?z-index: 110;/,
);
assert.match(
  presetCss,
  /\.shift-preset-dialog-content\s*\{[\s\S]*?background: #f8fbfa;/,
);
assert.match(
  presetCss,
  /\.template-editor-modal\s*\{[\s\S]*?z-index: 120;/,
);
assert.match(
  presetCss,
  /\.template-editor-dialog\s*\{[\s\S]*?width: min\(100%, 430px\);[\s\S]*?background: #f2ecff;/,
);
assert.match(
  presetCss,
  /\.template-editor-dialog-content\s*\{[\s\S]*?background: #f2ecff;/,
);

assert.match(calendarScript, /function openShiftPresetPanel\(\)/);
assert.match(
  calendarScript,
  /shiftPresetBackdrop\.addEventListener\("click",[\s\S]*?closeShiftPresetPanel\(true\)/,
);
assert.match(
  calendarScript,
  /closeShiftPresetButton\.addEventListener\("click",[\s\S]*?closeShiftPresetPanel\(true\)/,
);
assert.match(
  calendarScript,
  /if \(event\.key === "Escape" && !shiftPresetPanel\.hidden\)/,
);
assert.match(
  calendarScript,
  /function fillShiftForm\(shift\)[\s\S]*?jobNameInput\.value = shift\.jobName;/,
);
assert.match(
  calendarScript,
  /name: content\.jobName/,
);
assert.match(
  calendarScript,
  /fillShiftForm\(content\);\s+closeTemplateEditor\(false\);\s+closeShiftPresetPanel\(\);/,
);
assert.match(
  calendarScript,
  /editButton\.addEventListener\("click", \(\) => \{\s+openTemplateEditor\(item\);/,
);

for (const languageCode of ["ja", "en", "bn", "ko", "my", "ne", "si", "vi"]) {
  const translationSource = fs.readFileSync(
    path.join(projectRoot, "lang", languageCode + ".js"),
    "utf8",
  );
  assert.match(translationSource, /"shift\.preset\.closeAria":\s*"[^"]+"/);
  assert.match(
    translationSource,
    /"shift\.preset\.editorCloseAria":\s*"[^"]+"/,
  );
}

console.log("shift preset modal tests passed");
