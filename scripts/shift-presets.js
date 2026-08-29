// テンプレートと登録履歴の保存内容・上限を管理する。
(() => {
  "use strict";

  const MAX_TEMPLATES = 5;
  const MAX_HISTORY = 30;
  const MINUTES_PER_DAY = 24 * 60;

  function parseTime(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  function sortBreaksFromShiftStart(breaks, shiftStartTime) {
    const shiftStartMinute = parseTime(shiftStartTime);

    return [...breaks].sort((left, right) => {
      const leftMinute = parseTime(left.startTime);
      const rightMinute = parseTime(right.startTime);
      const leftOffset =
        leftMinute -
        shiftStartMinute +
        (leftMinute < shiftStartMinute ? MINUTES_PER_DAY : 0);
      const rightOffset =
        rightMinute -
        shiftStartMinute +
        (rightMinute < shiftStartMinute ? MINUTES_PER_DAY : 0);
      return leftOffset - rightOffset;
    });
  }

  function createShiftContent(shift) {
    return {
      jobName: String(shift.jobName ?? "").trim(),
      startTime: String(shift.startTime ?? ""),
      endTime: String(shift.endTime ?? ""),
      breaks: Array.isArray(shift.breaks)
        ? sortBreaksFromShiftStart(
            shift.breaks.map(({ startTime, endTime }) => ({
              startTime: String(startTime ?? ""),
              endTime: String(endTime ?? ""),
            })),
            String(shift.startTime ?? ""),
          )
        : [],
      hourlyWage: Number.isSafeInteger(shift.hourlyWage)
        ? shift.hourlyWage
        : 0,
    };
  }

  function createContentKey(shift) {
    return JSON.stringify(createShiftContent(shift));
  }

  function prepareHistoryUpdate(history, shift) {
    const content = createShiftContent(shift);
    const contentKey = createContentKey(content);
    const existing = history.find((item) => item.contentKey === contentKey);
    const retained = history.filter((item) => item.contentKey !== contentKey);
    const idsToDelete = existing === undefined ? [] : [existing.id];

    while (retained.length >= MAX_HISTORY) {
      const oldest = retained.pop();
      if (oldest !== undefined) idsToDelete.push(oldest.id);
    }

    return {
      record: { ...content, contentKey },
      idsToDelete,
    };
  }

  window.ShiftPresets = Object.freeze({
    MAX_TEMPLATES,
    MAX_HISTORY,
    createShiftContent,
    createContentKey,
    prepareHistoryUpdate,
  });
})();
