// 開始日基準の7日間制限と、長期休み1日制限を計算する。
(() => {
  "use strict";

  const NORMAL_WEEKLY_LIMIT_MINUTES = 28 * 60;
  const LONG_BREAK_WEEKLY_LIMIT_MINUTES = 40 * 60;
  const LONG_BREAK_DAILY_LIMIT_MINUTES = 8 * 60;

  function parseDateKeyAsUtc(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  function toDateKeyFromUtc(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function addDaysToDateKey(dateKey, days) {
    const date = parseDateKeyAsUtc(dateKey);
    date.setUTCDate(date.getUTCDate() + days);
    return toDateKeyFromUtc(date);
  }

  function getLongBreakForDate(dateKey, longBreaks) {
    return (
      longBreaks.find(
        (longBreak) =>
          longBreak.startDate <= dateKey && dateKey <= longBreak.endDate,
      ) ?? null
    );
  }

  function getLatestLongBreakEndingBefore(dateKey, longBreaks) {
    return (
      longBreaks
        .filter((longBreak) => longBreak.endDate < dateKey)
        .sort((left, right) => right.endDate.localeCompare(left.endDate))[0] ??
      null
    );
  }

  function getWeeklyPeriod(dateKey, longBreaks) {
    const naturalPeriodStart = addDaysToDateKey(dateKey, -6);
    const longBreak = getLongBreakForDate(dateKey, longBreaks);

    if (longBreak !== null) {
      return {
        type: "weekly-long-break",
        periodStart:
          longBreak.startDate > naturalPeriodStart
            ? longBreak.startDate
            : naturalPeriodStart,
        limitMinutes: LONG_BREAK_WEEKLY_LIMIT_MINUTES,
      };
    }

    const latestLongBreak = getLatestLongBreakEndingBefore(dateKey, longBreaks);
    const normalPeriodRestart =
      latestLongBreak === null
        ? null
        : addDaysToDateKey(latestLongBreak.endDate, 1);

    return {
      type: "weekly-normal",
      periodStart:
        normalPeriodRestart !== null &&
        normalPeriodRestart > naturalPeriodStart
          ? normalPeriodRestart
          : naturalPeriodStart,
      limitMinutes: NORMAL_WEEKLY_LIMIT_MINUTES,
    };
  }

  function getStartDateMinutes(dateKey, shiftsByDate) {
    return (shiftsByDate.get(dateKey) ?? []).reduce(
      (total, shift) => total + shift.actualMinutes,
      0,
    );
  }

  function getWeeklySummary(dateKey, shiftsByDate, longBreaks) {
    const period = getWeeklyPeriod(dateKey, longBreaks);
    let totalMinutes = 0;

    for (
      let targetDateKey = period.periodStart;
      targetDateKey <= dateKey;
      targetDateKey = addDaysToDateKey(targetDateKey, 1)
    ) {
      totalMinutes += getStartDateMinutes(targetDateKey, shiftsByDate);
    }

    return {
      type: period.type,
      periodStart: period.periodStart,
      periodEnd: dateKey,
      limitMinutes: period.limitMinutes,
      totalMinutes,
      excessMinutes: Math.max(0, totalMinutes - period.limitMinutes),
      hasWarning: totalMinutes > period.limitMinutes,
    };
  }

  function getDailySummary(dateKey, shiftsByDate, longBreaks) {
    const longBreak = getLongBreakForDate(dateKey, longBreaks);
    if (longBreak === null) return null;

    const totalMinutes = getStartDateMinutes(dateKey, shiftsByDate);

    return {
      type: "daily-long-break",
      longBreak,
      periodStart: dateKey,
      periodEnd: dateKey,
      limitMinutes: LONG_BREAK_DAILY_LIMIT_MINUTES,
      totalMinutes,
      excessMinutes: Math.max(
        0,
        totalMinutes - LONG_BREAK_DAILY_LIMIT_MINUTES,
      ),
      hasWarning: totalMinutes > LONG_BREAK_DAILY_LIMIT_MINUTES,
    };
  }

  function getWorkLimitSummaries(dateKey, shiftsByDate, longBreaks) {
    return {
      daily: getDailySummary(dateKey, shiftsByDate, longBreaks),
      weekly: getWeeklySummary(dateKey, shiftsByDate, longBreaks),
    };
  }

  window.ShiftWorkLimit = Object.freeze({
    getWorkLimitSummaries,
    getWeeklySummary,
    getDailySummary,
  });
})();
