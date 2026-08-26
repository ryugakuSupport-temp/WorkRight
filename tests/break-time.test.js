"use strict";

const assert = require("node:assert/strict");

global.window = {};
require("../scripts/break-time.js");

const breakTime = global.window.ShiftBreakTime;

{
  const result = breakTime.calculateShiftTime("09:00", "18:00", [
    { startTime: "10:00", endTime: "10:10" },
    { startTime: "11:00", endTime: "11:15" },
    { startTime: "12:00", endTime: "12:30" },
    { startTime: "14:00", endTime: "14:20" },
    { startTime: "16:00", endTime: "16:15" },
  ]);

  assert.equal(result.error, undefined);
  assert.equal(result.breaks.length, 5);
  assert.equal(result.breakMinutes, 90);
  assert.equal(result.actualMinutes, 450);
}

{
  const result = breakTime.calculateShiftTime("09:00", "18:00", [
    { startTime: "", endTime: "" },
    { startTime: "12:00", endTime: "13:00" },
    { startTime: "", endTime: "" },
  ]);

  assert.equal(result.breaks.length, 1);
  assert.equal(result.breakMinutes, 60);
  assert.equal(result.actualMinutes, 480);
}

{
  const result = breakTime.calculateShiftTime("09:00", "18:00", [
    { startTime: "10:00", endTime: "12:00" },
    { startTime: "13:00", endTime: "14:00" },
    { startTime: "11:00", endTime: "11:30" },
  ]);

  assert.deepEqual(result.error, {
    code: "overlap",
    breakIndex: 2,
    field: "start",
  });
}

{
  const result = breakTime.calculateShiftTime("09:00", "18:00", [
    { startTime: "12:00", endTime: "" },
  ]);

  assert.deepEqual(result.error, {
    code: "pair",
    breakIndex: 0,
    field: "end",
  });
}

{
  const result = breakTime.calculateShiftTime("09:00", "18:00", [
    { startTime: "08:30", endTime: "09:30" },
  ]);

  assert.deepEqual(result.error, {
    code: "range",
    breakIndex: 0,
    field: "start",
  });
}

{
  const result = breakTime.calculateShiftTime("22:00", "06:00", [
    { startTime: "23:00", endTime: "23:30" },
    { startTime: "01:00", endTime: "01:15" },
  ]);

  assert.equal(result.breakMinutes, 45);
  assert.equal(result.actualMinutes, 435);
  assert.equal(result.breaks[1].startMinute, 25 * 60);
  assert.equal(result.breaks[1].endMinute, 25 * 60 + 15);
}

{
  const result = breakTime.calculateShiftTime(
    "09:00",
    "18:00",
    Array.from({ length: 6 }, () => ({ startTime: "", endTime: "" })),
  );

  assert.deepEqual(result.error, {
    code: "limit",
    breakIndex: 0,
    field: "start",
  });
}

{
  const breaks = [
    { startTime: "01:00", endTime: "01:15" },
    { startTime: "00:00", endTime: "00:30" },
    { startTime: "03:00", endTime: "03:15" },
  ];
  const sorted = breakTime.sortBreaksByStartTime(breaks);

  assert.deepEqual(
    sorted.map((breakValue) => breakValue.startTime),
    ["00:00", "01:00", "03:00"],
  );
  assert.deepEqual(
    breaks.map((breakValue) => breakValue.startTime),
    ["01:00", "00:00", "03:00"],
  );
}

console.log("break-time tests passed");
