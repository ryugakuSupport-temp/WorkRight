"use strict";

const assert = require("node:assert/strict");

global.window = {};
require("../scripts/work-limit.js");

const workLimit = global.window.ShiftWorkLimit;

function createShift({ actualMinutes = 8 * 60 } = {}) {
  return { actualMinutes };
}

function addShift(shiftsByDate, dateKey, shift) {
  const shifts = shiftsByDate.get(dateKey) ?? [];
  shifts.push(shift);
  shiftsByDate.set(dateKey, shifts);
}

{
  const shiftsByDate = new Map();
  for (let day = 1; day <= 7; day += 1) {
    addShift(
      shiftsByDate,
      `2026-08-${String(day).padStart(2, "0")}`,
      createShift({ actualMinutes: 4 * 60 }),
    );
  }

  const exactLimit = workLimit.getWeeklySummary(
    "2026-08-07",
    shiftsByDate,
    [],
  );
  assert.equal(exactLimit.type, "weekly-normal");
  assert.equal(exactLimit.periodStart, "2026-08-01");
  assert.equal(exactLimit.totalMinutes, 28 * 60);
  assert.equal(exactLimit.hasWarning, false);

  shiftsByDate.get("2026-08-07")[0].actualMinutes += 1;
  const overLimit = workLimit.getWeeklySummary(
    "2026-08-07",
    shiftsByDate,
    [],
  );
  assert.equal(overLimit.hasWarning, true);
  assert.equal(overLimit.excessMinutes, 1);
}

{
  const longBreaks = [
    { startDate: "2026-08-10", endDate: "2026-08-20" },
  ];
  const shiftsByDate = new Map();
  addShift(shiftsByDate, "2026-08-09", createShift({ actualMinutes: 20 * 60 }));
  for (let day = 10; day <= 14; day += 1) {
    addShift(
      shiftsByDate,
      `2026-08-${day}`,
      createShift({ actualMinutes: 8 * 60 }),
    );
  }

  const exactLimit = workLimit.getWeeklySummary(
    "2026-08-14",
    shiftsByDate,
    longBreaks,
  );
  assert.equal(exactLimit.type, "weekly-long-break");
  assert.equal(exactLimit.periodStart, "2026-08-10");
  assert.equal(exactLimit.totalMinutes, 40 * 60);
  assert.equal(exactLimit.hasWarning, false);

  shiftsByDate.get("2026-08-14")[0].actualMinutes += 1;
  const overLimit = workLimit.getWeeklySummary(
    "2026-08-14",
    shiftsByDate,
    longBreaks,
  );
  assert.equal(overLimit.hasWarning, true);
  assert.equal(overLimit.excessMinutes, 1);
}

{
  const longBreaks = [
    { startDate: "2026-08-10", endDate: "2026-08-20" },
  ];
  const shiftsByDate = new Map();
  addShift(shiftsByDate, "2026-08-20", createShift({ actualMinutes: 8 * 60 }));
  addShift(shiftsByDate, "2026-08-21", createShift({ actualMinutes: 28 * 60 }));

  const exactLimit = workLimit.getWeeklySummary(
    "2026-08-21",
    shiftsByDate,
    longBreaks,
  );
  assert.equal(exactLimit.type, "weekly-normal");
  assert.equal(exactLimit.periodStart, "2026-08-21");
  assert.equal(exactLimit.totalMinutes, 28 * 60);
  assert.equal(exactLimit.hasWarning, false);

  shiftsByDate.get("2026-08-21")[0].actualMinutes += 1;
  assert.equal(
    workLimit.getWeeklySummary("2026-08-21", shiftsByDate, longBreaks)
      .hasWarning,
    true,
  );
}

{
  const longBreaks = [
    { startDate: "2026-08-10", endDate: "2026-08-20" },
  ];
  const shiftsByDate = new Map();
  addShift(shiftsByDate, "2026-08-12", createShift());

  const exactLimit = workLimit.getDailySummary(
    "2026-08-12",
    shiftsByDate,
    longBreaks,
  );
  assert.equal(exactLimit.totalMinutes, 8 * 60);
  assert.equal(exactLimit.hasWarning, false);

  shiftsByDate.get("2026-08-12")[0].actualMinutes += 1;
  const overLimit = workLimit.getDailySummary(
    "2026-08-12",
    shiftsByDate,
    longBreaks,
  );
  assert.equal(overLimit.hasWarning, true);
  assert.equal(overLimit.excessMinutes, 1);
}

{
  const longBreaks = [
    { startDate: "2026-08-10", endDate: "2026-08-20" },
  ];
  const shiftsByDate = new Map();
  addShift(
    shiftsByDate,
    "2026-08-10",
    createShift({ actualMinutes: 6 * 60 }),
  );
  addShift(shiftsByDate, "2026-08-11", createShift());

  const startDateSummary = workLimit.getDailySummary(
    "2026-08-10",
    shiftsByDate,
    longBreaks,
  );
  assert.equal(startDateSummary.totalMinutes, 6 * 60);
  assert.equal(startDateSummary.hasWarning, false);

  const nextDateSummary = workLimit.getDailySummary(
    "2026-08-11",
    shiftsByDate,
    longBreaks,
  );
  assert.equal(nextDateSummary.totalMinutes, 8 * 60);
  assert.equal(nextDateSummary.hasWarning, false);
}

{
  const longBreaks = [
    { startDate: "2026-08-10", endDate: "2026-08-20" },
  ];
  const shiftsByDate = new Map();
  addShift(
    shiftsByDate,
    "2026-08-09",
    createShift({ actualMinutes: 6 * 60 }),
  );

  const summaries = workLimit.getWorkLimitSummaries(
    "2026-08-10",
    shiftsByDate,
    longBreaks,
  );
  assert.equal(summaries.weekly.totalMinutes, 0);
  assert.equal(summaries.daily.totalMinutes, 0);
}

{
  const longBreaks = [
    { startDate: "2026-08-10", endDate: "2026-08-20" },
  ];
  const shiftsByDate = new Map();
  addShift(
    shiftsByDate,
    "2026-08-20",
    createShift({ actualMinutes: 8 * 60 }),
  );

  const lastLongBreakDay = workLimit.getWorkLimitSummaries(
    "2026-08-20",
    shiftsByDate,
    longBreaks,
  );
  assert.equal(lastLongBreakDay.weekly.totalMinutes, 8 * 60);
  assert.equal(lastLongBreakDay.daily.totalMinutes, 8 * 60);

  const firstNormalDay = workLimit.getWorkLimitSummaries(
    "2026-08-21",
    shiftsByDate,
    longBreaks,
  );
  assert.equal(firstNormalDay.weekly.periodStart, "2026-08-21");
  assert.equal(firstNormalDay.weekly.totalMinutes, 0);
  assert.equal(firstNormalDay.daily, null);
}

console.log("work-limit tests passed");
