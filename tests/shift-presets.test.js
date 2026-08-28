"use strict";

const assert = require("node:assert/strict");

global.window = {};
require("../scripts/shift-presets.js");

const presets = global.window.ShiftPresets;

function createShift(overrides = {}) {
  return {
    jobName: "Cafe",
    startTime: "09:00",
    endTime: "17:00",
    breaks: [{ startTime: "12:00", endTime: "13:00" }],
    hourlyWage: 1200,
    ...overrides,
  };
}

{
  const content = presets.createShiftContent({
    ...createShift(),
    id: 99,
    date: "2026-08-28",
    actualMinutes: 420,
  });

  assert.deepEqual(content, createShift());
  assert.equal("date" in content, false);
  assert.equal("id" in content, false);
}

{
  const existing = [
    { id: 3, contentKey: presets.createContentKey(createShift()) },
    { id: 2, contentKey: "different" },
  ];
  const update = presets.prepareHistoryUpdate(existing, createShift());

  assert.deepEqual(update.idsToDelete, [3]);
  assert.equal(update.record.contentKey, existing[0].contentKey);
}

{
  const overnightShift = createShift({
    startTime: "22:00",
    endTime: "08:00",
    breaks: [
      { startTime: "00:47", endTime: "01:00" },
      { startTime: "23:00", endTime: "23:10" },
      { startTime: "00:01", endTime: "00:05" },
    ],
  });
  const reorderedShift = {
    ...overnightShift,
    breaks: [
      overnightShift.breaks[1],
      overnightShift.breaks[2],
      overnightShift.breaks[0],
    ],
  };

  assert.equal(
    presets.createContentKey(overnightShift),
    presets.createContentKey(reorderedShift),
  );
}

{
  const history = Array.from({ length: presets.MAX_HISTORY }, (_, index) => ({
    id: presets.MAX_HISTORY - index,
    contentKey: `content-${index}`,
  }));
  const update = presets.prepareHistoryUpdate(
    history,
    createShift({ jobName: "Newest" }),
  );

  assert.deepEqual(update.idsToDelete, [1]);
}

assert.equal(presets.MAX_TEMPLATES, 5);
assert.equal(presets.MAX_HISTORY, 30);

console.log("shift-presets tests passed");
