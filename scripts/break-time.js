// シフト内の可変休憩と実勤務時間を計算する。
(() => {
  "use strict";

  const MINUTES_PER_DAY = 24 * 60;
  const MAX_BREAKS = 5;

  function parseTime(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  function getIntervalOverlap(
    leftStartMinute,
    leftEndMinute,
    rightStartMinute,
    rightEndMinute,
  ) {
    return Math.max(
      0,
      Math.min(leftEndMinute, rightEndMinute) -
        Math.max(leftStartMinute, rightStartMinute),
    );
  }

  function calculateBreakInterval(
    breakTime,
    breakIndex,
    shiftStartMinute,
    shiftEndMinute,
    isOvernight,
  ) {
    const hasStart = breakTime.startTime !== "";
    const hasEnd = breakTime.endTime !== "";

    if (hasStart !== hasEnd) {
      return {
        error: {
          code: "pair",
          breakIndex,
          field: hasStart ? "end" : "start",
        },
      };
    }

    if (!hasStart) return { interval: null };

    let startMinute = parseTime(breakTime.startTime);
    let endMinute = parseTime(breakTime.endTime);

    if (isOvernight && startMinute < shiftStartMinute) {
      startMinute += MINUTES_PER_DAY;
    }

    if (isOvernight && endMinute < shiftStartMinute) {
      endMinute += MINUTES_PER_DAY;
    }

    if (endMinute <= startMinute) endMinute += MINUTES_PER_DAY;

    if (startMinute < shiftStartMinute || endMinute > shiftEndMinute) {
      return {
        error: {
          code: "range",
          breakIndex,
          field: "start",
        },
      };
    }

    return {
      interval: {
        startTime: breakTime.startTime,
        endTime: breakTime.endTime,
        startMinute,
        endMinute,
        minutes: endMinute - startMinute,
        sourceIndex: breakIndex,
      },
    };
  }

  function calculateShiftTime(startTime, endTime, breakTimes) {
    if (!Array.isArray(breakTimes) || breakTimes.length > MAX_BREAKS) {
      return { error: { code: "limit", breakIndex: 0, field: "start" } };
    }

    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    const isOvernight = endMinutes <= startMinutes;
    const shiftEndMinute =
      endMinutes + (isOvernight ? MINUTES_PER_DAY : 0);
    const elapsedMinutes = shiftEndMinute - startMinutes;
    const breakIntervals = [];

    for (let index = 0; index < breakTimes.length; index += 1) {
      const result = calculateBreakInterval(
        breakTimes[index],
        index,
        startMinutes,
        shiftEndMinute,
        isOvernight,
      );

      if (result.error) return result;
      if (result.interval !== null) breakIntervals.push(result.interval);
    }

    for (
      let rightIndex = 1;
      rightIndex < breakIntervals.length;
      rightIndex += 1
    ) {
      for (let leftIndex = 0; leftIndex < rightIndex; leftIndex += 1) {
        if (
          getIntervalOverlap(
            breakIntervals[leftIndex].startMinute,
            breakIntervals[leftIndex].endMinute,
            breakIntervals[rightIndex].startMinute,
            breakIntervals[rightIndex].endMinute,
          ) > 0
        ) {
          return {
            error: {
              code: "overlap",
              breakIndex: breakIntervals[rightIndex].sourceIndex,
              field: "start",
            },
          };
        }
      }
    }

    const breaks = breakIntervals.map(({ sourceIndex, ...interval }) => interval);
    const breakMinutes = breaks.reduce(
      (total, breakTime) => total + breakTime.minutes,
      0,
    );

    return {
      elapsedMinutes,
      actualMinutes: elapsedMinutes - breakMinutes,
      isOvernight,
      breakMinutes,
      breaks,
    };
  }

  function sortBreaksByStartTime(breaks) {
    return [...breaks].sort((left, right) =>
      left.startTime < right.startTime
        ? -1
        : left.startTime > right.startTime
          ? 1
          : 0,
    );
  }

  window.ShiftBreakTime = Object.freeze({
    MAX_BREAKS,
    calculateShiftTime,
    sortBreaksByStartTime,
  });
})();
