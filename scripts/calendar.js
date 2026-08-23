// 月間カレンダーの表示、シフト登録、勤務時間警告を管理する。
(() => {
  "use strict";

  const MAX_SHIFTS_PER_DAY = 5;
  const MINUTES_PER_DAY = 24 * 60;
  const NIGHT_START_MINUTE = 22 * 60;
  const NIGHT_END_MINUTE = 5 * 60;
  const NIGHT_PREMIUM_RATE = 0.25;
  const language = window.ShiftLanguage;
  const storage = window.ShiftStorage;
  const workLimit = window.ShiftWorkLimit;

  const monthHeading = document.getElementById("calendar-month-heading");
  const monthlyEstimatedPay = document.getElementById("monthly-estimated-pay");
  const monthlyLegalWarning = document.getElementById("monthly-legal-warning");
  const monthlyLegalWarningMessage = document.getElementById(
    "monthly-legal-warning-message",
  );
  const calendarGrid = document.getElementById("calendar-grid");
  const previousMonthButton = document.getElementById("previous-month");
  const nextMonthButton = document.getElementById("next-month");
  const todayButton = document.getElementById("today");
  const shiftModal = document.getElementById("shift-modal");
  const shiftModalBackdrop = document.getElementById("shift-modal-backdrop");
  const closeShiftModalButton = document.getElementById("close-shift-modal");
  const selectedDateHeading = document.getElementById("selected-date-heading");
  const dailyEstimatedPay = document.getElementById("daily-estimated-pay");
  const selectedPeriodRange = document.getElementById("selected-period-range");
  const selectedPeriodWorked = document.getElementById("selected-period-worked");
  const selectedPeriodRemaining = document.getElementById(
    "selected-period-remaining",
  );
  const shiftCount = document.getElementById("shift-count");
  const shiftForm = document.getElementById("shift-form");
  const shiftFormHeading = document.getElementById("shift-form-heading");
  const shiftFields = document.getElementById("shift-fields");
  const shiftSubmitButton = document.getElementById("shift-submit-button");
  const cancelEditButton = document.getElementById("cancel-edit");
  const jobNameInput = document.getElementById("job-name");
  const startTimeInput = shiftForm.elements.namedItem("startTime");
  const endTimeInput = shiftForm.elements.namedItem("endTime");
  const breakStartInput = document.getElementById("break-start-time");
  const breakEndInput = document.getElementById("break-end-time");
  const hourlyWageInput = shiftForm.elements.namedItem("hourlyWage");
  const shiftValidatedInputs = [
    startTimeInput,
    endTimeInput,
    breakStartInput,
    breakEndInput,
    hourlyWageInput,
  ];
  const formMessage = document.getElementById("form-message");
  const shiftList = document.getElementById("shift-list");
  const dailyLimitWarning = document.getElementById("daily-limit-warning");
  const dailyLimitWarningHeading = document.getElementById(
    "daily-limit-warning-heading",
  );
  const dailyLimitWarningPeriod = document.getElementById(
    "daily-limit-warning-period",
  );
  const dailyLimitWarningTotal = document.getElementById(
    "daily-limit-warning-total",
  );
  const dailyLimitWarningLimit = document.getElementById(
    "daily-limit-warning-limit",
  );
  const dailyLimitWarningExcess = document.getElementById(
    "daily-limit-warning-excess",
  );
  const weeklyWarning = document.getElementById("weekly-warning");
  const weeklyWarningHeading = document.getElementById("weekly-warning-heading");
  const weeklyWarningPeriod = document.getElementById("weekly-warning-period");
  const weeklyWarningTotal = document.getElementById("weekly-warning-total");
  const weeklyWarningLimit = document.getElementById("weekly-warning-limit");
  const weeklyWarningExcess = document.getElementById("weekly-warning-excess");
  const dailyOverlapWarning = document.getElementById(
    "daily-overlap-warning",
  );
  const shiftManagementTab = document.getElementById("shift-management-tab");
  const longBreakManagementTab = document.getElementById(
    "long-break-management-tab",
  );
  const shiftManagementPanel = document.getElementById("shift-management-panel");
  const longBreakManagementPanel = document.getElementById(
    "long-break-management-panel",
  );
  const addLongBreakButton = document.getElementById("add-long-break");
  const longBreakList = document.getElementById("long-break-list");
  const longBreakModal = document.getElementById("long-break-modal");
  const longBreakModalBackdrop = document.getElementById(
    "long-break-modal-backdrop",
  );
  const closeLongBreakModalButton = document.getElementById(
    "close-long-break-modal",
  );
  const longBreakForm = document.getElementById("long-break-form");
  const longBreakFormHeading = document.getElementById(
    "long-break-form-heading",
  );
  const longBreakStartDateInput = document.getElementById(
    "long-break-start-date",
  );
  const longBreakEndDateInput = document.getElementById("long-break-end-date");
  const longBreakValidatedInputs = [
    longBreakStartDateInput,
    longBreakEndDateInput,
  ];
  const longBreakFormMessage = document.getElementById(
    "long-break-form-message",
  );
  const saveLongBreakButton = document.getElementById("save-long-break");
  const cancelLongBreakButton = document.getElementById("cancel-long-break");
  const storageRecoveryModal = document.getElementById("storage-recovery-modal");
  const storageRecoveryHeading = document.getElementById(
    "storage-recovery-heading",
  );
  const storageRecoveryError = document.getElementById("storage-recovery-error");
  const resetStorageButton = document.getElementById("reset-storage");
  const reloadStorageButton = document.getElementById("reload-storage");

  const today = new Date();
  const shiftsByDate = new Map();
  const longBreaks = [];
  let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let selectedDate = null;
  let editingShiftId = null;
  let editingLongBreakId = null;

  function translate(key, values = {}) {
    return language.translate(key, values);
  }

  function getCurrentLocale() {
    return language.getCurrentLanguage().locale;
  }

  function updateShiftFieldValidity(input) {
    if (input.type === "time" && input.validity.badInput) {
      input.setCustomValidity(translate("validation.timeInvalid"));
      return;
    }

    if (input === hourlyWageInput && input.validity.badInput) {
      input.setCustomValidity(translate("validation.numberInvalid"));
      return;
    }

    if (input === hourlyWageInput && input.validity.rangeUnderflow) {
      input.setCustomValidity(translate("validation.wageMinimum"));
      return;
    }

    if (input.validity.valueMissing) {
      input.setCustomValidity(translate("validation.required"));
    }
  }

  function applyShiftFieldValidityMessages() {
    shiftValidatedInputs.forEach(updateShiftFieldValidity);
  }

  function clearShiftFieldValidityMessages() {
    shiftValidatedInputs.forEach((input) => input.setCustomValidity(""));
  }

  function updateLongBreakFieldValidity(input) {
    if (input.type === "date" && input.validity.badInput) {
      input.setCustomValidity(translate("validation.dateInvalid"));
      return;
    }

    if (input.validity.valueMissing) {
      input.setCustomValidity(translate("validation.required"));
    }
  }

  function applyLongBreakFieldValidityMessages() {
    longBreakValidatedInputs.forEach(updateLongBreakFieldValidity);
  }

  function clearLongBreakFieldValidityMessages() {
    longBreakValidatedInputs.forEach((input) => input.setCustomValidity(""));
  }

  function isSameDate(left, right) {
    return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    );
  }

  function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatSelectedDate(date) {
    return new Intl.DateTimeFormat(getCurrentLocale(), {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    }).format(date);
  }

  function formatPeriodDate(date) {
    return new Intl.DateTimeFormat(getCurrentLocale(), {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  }

  function formatMonthHeading(date) {
    return new Intl.DateTimeFormat(getCurrentLocale(), {
      year: "numeric",
      month: "long",
    }).format(date);
  }

  function formatMinutes(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
      return translate("time.minutes", { minutes: remainingMinutes });
    }
    if (remainingMinutes === 0) {
      return translate("time.hours", { hours });
    }
    return translate("time.hoursMinutes", {
      hours,
      minutes: remainingMinutes,
    });
  }

  function formatMinutesAsClock(minutes) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
    const remainingMinutes = String(minutes % 60).padStart(2, "0");
    return `${hours}:${remainingMinutes}`;
  }

  function formatYen(amount) {
    return translate("currency.yen", {
      amount: amount.toLocaleString(getCurrentLocale()),
    });
  }

  function formatCalculationYen(amount) {
    return translate("currency.yen", {
      amount: amount.toLocaleString(getCurrentLocale(), {
        minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
        maximumFractionDigits: 2,
      }),
    });
  }

  function parseTime(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  function parseDateKey(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  function formatDateKey(dateKey) {
    return formatPeriodDate(parseDateKey(dateKey));
  }

  function getLongBreakForDate(date) {
    const dateKey = toDateKey(date);
    return (
      longBreaks.find(
        (longBreak) =>
          longBreak.startDate <= dateKey && dateKey <= longBreak.endDate,
      ) ?? null
    );
  }

  function calculateShiftTime(
    startTime,
    endTime,
    breakStartTime,
    breakEndTime,
  ) {
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    const isOvernight = endMinutes <= startMinutes;
    const shiftEndMinute = endMinutes + (isOvernight ? 24 * 60 : 0);
    const elapsedMinutes = shiftEndMinute - startMinutes;
    const hasBreakStart = breakStartTime !== "";
    const hasBreakEnd = breakEndTime !== "";

    if (hasBreakStart !== hasBreakEnd) {
      return {
        errorMessage: translate("shift.validation.breakPair"),
        errorInput: hasBreakStart ? breakEndInput : breakStartInput,
      };
    }

    if (!hasBreakStart) {
      return {
        elapsedMinutes,
        actualMinutes: elapsedMinutes,
        isOvernight,
        breakMinutes: 0,
        breakStartMinute: null,
        breakEndMinute: null,
      };
    }

    let breakStartMinute = parseTime(breakStartTime);
    let breakEndMinute = parseTime(breakEndTime);

    if (isOvernight && breakStartMinute < startMinutes) {
      breakStartMinute += 24 * 60;
    }

    if (isOvernight && breakEndMinute < startMinutes) {
      breakEndMinute += 24 * 60;
    }

    if (breakEndMinute <= breakStartMinute) {
      breakEndMinute += 24 * 60;
    }

    if (
      breakStartMinute < startMinutes ||
      breakEndMinute > shiftEndMinute
    ) {
      return {
        errorMessage: translate("shift.validation.breakRange"),
        errorInput: breakStartInput,
      };
    }

    const breakMinutes = breakEndMinute - breakStartMinute;

    return {
      elapsedMinutes,
      actualMinutes: elapsedMinutes - breakMinutes,
      isOvernight,
      breakMinutes,
      breakStartMinute,
      breakEndMinute,
    };
  }

  function isValidStoredDate(value) {
    return (
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      toDateKey(parseDateKey(value)) === value
    );
  }

  function isValidStoredTime(value, allowEmpty = false) {
    if (allowEmpty && value === "") return true;
    if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) {
      return false;
    }

    const [hours, minutes] = value.split(":").map(Number);
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
  }

  function createStoredShift(dateKey, shift) {
    const record = {
      date: dateKey,
      jobName: shift.jobName,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakStartTime: shift.breakStartTime,
      breakEndTime: shift.breakEndTime,
      hourlyWage: shift.hourlyWage,
      memo: shift.memo,
    };

    if (shift.id !== undefined) record.id = shift.id;
    return record;
  }

  function restoreStoredShift(record) {
    const hasValidValues =
      record !== null &&
      typeof record === "object" &&
      Number.isSafeInteger(record.id) &&
      record.id > 0 &&
      isValidStoredDate(record.date) &&
      typeof record.jobName === "string" &&
      isValidStoredTime(record.startTime) &&
      isValidStoredTime(record.endTime) &&
      isValidStoredTime(record.breakStartTime, true) &&
      isValidStoredTime(record.breakEndTime, true) &&
      Number.isSafeInteger(record.hourlyWage) &&
      record.hourlyWage >= 0 &&
      typeof record.memo === "string";

    if (!hasValidValues) throw new Error("Stored shift data is invalid.");

    const calculatedTime = calculateShiftTime(
      record.startTime,
      record.endTime,
      record.breakStartTime,
      record.breakEndTime,
    );

    if (calculatedTime.errorMessage) {
      throw new Error("Stored shift time is invalid.");
    }

    return {
      date: record.date,
      shift: {
        id: record.id,
        jobName: record.jobName,
        startTime: record.startTime,
        endTime: record.endTime,
        breakStartTime: record.breakStartTime,
        breakEndTime: record.breakEndTime,
        breakMinutes: calculatedTime.breakMinutes,
        breakStartMinute: calculatedTime.breakStartMinute,
        breakEndMinute: calculatedTime.breakEndMinute,
        hourlyWage: record.hourlyWage,
        memo: record.memo,
        actualMinutes: calculatedTime.actualMinutes,
        isOvernight: calculatedTime.isOvernight,
        createdOrder: record.id,
      },
    };
  }

  function createStoredLongBreak(longBreak) {
    const record = {
      name: longBreak.name,
      startDate: longBreak.startDate,
      endDate: longBreak.endDate,
      memo: longBreak.memo,
    };

    if (longBreak.id !== undefined) record.id = longBreak.id;
    return record;
  }

  function restoreStoredLongBreak(record) {
    const hasValidValues =
      record !== null &&
      typeof record === "object" &&
      Number.isSafeInteger(record.id) &&
      record.id > 0 &&
      typeof record.name === "string" &&
      isValidStoredDate(record.startDate) &&
      isValidStoredDate(record.endDate) &&
      record.startDate <= record.endDate &&
      typeof record.memo === "string";

    if (!hasValidValues) throw new Error("Stored long-break data is invalid.");

    return {
      id: record.id,
      name: record.name,
      startDate: record.startDate,
      endDate: record.endDate,
      memo: record.memo,
      createdOrder: record.id,
    };
  }

  function getIntervalOverlap(startA, endA, startB, endB) {
    return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
  }

  function getNightMinutesWithinInterval(startMinute, endMinute) {
    if (endMinute <= startMinute) return 0;

    const firstDayIndex = Math.floor(startMinute / MINUTES_PER_DAY) - 1;
    const lastDayIndex = Math.floor((endMinute - 1) / MINUTES_PER_DAY) + 1;
    let nightMinutes = 0;

    for (let dayIndex = firstDayIndex; dayIndex <= lastDayIndex; dayIndex += 1) {
      const dayStartMinute = dayIndex * MINUTES_PER_DAY;
      nightMinutes += getIntervalOverlap(
        startMinute,
        endMinute,
        dayStartMinute,
        dayStartMinute + NIGHT_END_MINUTE,
      );
      nightMinutes += getIntervalOverlap(
        startMinute,
        endMinute,
        dayStartMinute + NIGHT_START_MINUTE,
        dayStartMinute + MINUTES_PER_DAY,
      );
    }

    return nightMinutes;
  }

  function calculateShiftPay(shift) {
    const shiftStartMinute = parseTime(shift.startTime);
    const shiftEndMinute =
      parseTime(shift.endTime) + (shift.isOvernight ? MINUTES_PER_DAY : 0);
    const breakNightMinutes =
      shift.breakStartMinute === null
        ? 0
        : getNightMinutesWithinInterval(
            shift.breakStartMinute,
            shift.breakEndMinute,
          );
    const nightMinutes = Math.max(
      0,
      getNightMinutesWithinInterval(shiftStartMinute, shiftEndMinute) -
        breakNightMinutes,
    );
    const basicWage = (shift.actualMinutes * shift.hourlyWage) / 60;
    const nightPremium =
      (nightMinutes * shift.hourlyWage * NIGHT_PREMIUM_RATE) / 60;

    return {
      basicWage,
      nightMinutes,
      nightPremium,
      estimatedPay: Math.round(basicWage + nightPremium),
    };
  }

  function calculateShiftsEstimatedPay(shifts) {
    return shifts.reduce(
      (total, shift) => total + calculateShiftPay(shift).estimatedPay,
      0,
    );
  }

  function getDailyEstimatedPay(date) {
    return calculateShiftsEstimatedPay(getShifts(toDateKey(date)));
  }

  function getMonthlyEstimatedPay(year, month) {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
    let total = 0;

    shiftsByDate.forEach((shifts, dateKey) => {
      if (dateKey.startsWith(monthPrefix)) {
        total += calculateShiftsEstimatedPay(shifts);
      }
    });

    return total;
  }

  function updateMonthlyEstimatedPay() {
    monthlyEstimatedPay.textContent = formatYen(
      getMonthlyEstimatedPay(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth(),
      ),
    );
  }

  function compareShifts(left, right) {
    return (
      left.startTime.localeCompare(right.startTime) ||
      left.endTime.localeCompare(right.endTime) ||
      left.createdOrder - right.createdOrder
    );
  }

  function getDateStartMinute(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);
    return (
      (Date.UTC(year, month - 1, day) / (24 * 60 * 60 * 1000)) *
      MINUTES_PER_DAY
    );
  }

  function getShiftInterval(dateKey, shift) {
    const dateStartMinute = getDateStartMinute(dateKey);
    const shiftStartMinute = parseTime(shift.startTime);
    const shiftEndMinute = parseTime(shift.endTime);
    const startMinute = dateStartMinute + shiftStartMinute;
    const endMinute =
      dateStartMinute +
      shiftEndMinute +
      (shiftEndMinute <= shiftStartMinute ? MINUTES_PER_DAY : 0);

    return { startMinute, endMinute };
  }

  function doShiftIntervalsOverlap(leftInterval, rightInterval) {
    return (
      leftInterval.startMinute < rightInterval.endMinute &&
      rightInterval.startMinute < leftInterval.endMinute
    );
  }

  function getShiftEntries() {
    const entries = [];

    shiftsByDate.forEach((shifts, dateKey) => {
      shifts.forEach((shift) => entries.push({ dateKey, shift }));
    });

    return entries;
  }

  function getOverlappingShiftEntries(
    candidateDateKey,
    candidateShift,
    excludedShiftId,
  ) {
    const candidateInterval = getShiftInterval(
      candidateDateKey,
      candidateShift,
    );

    return getShiftEntries().filter(({ dateKey, shift }) => {
      if (shift.id === excludedShiftId) return false;
      return doShiftIntervalsOverlap(
        candidateInterval,
        getShiftInterval(dateKey, shift),
      );
    });
  }

  function getOverlapDateKeys() {
    const entries = getShiftEntries();
    const overlapDateKeys = new Set();

    for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < entries.length;
        rightIndex += 1
      ) {
        const leftEntry = entries[leftIndex];
        const rightEntry = entries[rightIndex];
        const hasOverlap = doShiftIntervalsOverlap(
          getShiftInterval(leftEntry.dateKey, leftEntry.shift),
          getShiftInterval(rightEntry.dateKey, rightEntry.shift),
        );

        if (hasOverlap) {
          overlapDateKeys.add(leftEntry.dateKey);
          overlapDateKeys.add(rightEntry.dateKey);
        }
      }
    }

    return overlapDateKeys;
  }

  function formatShiftTimeRange(shift) {
    return `${shift.startTime}${translate("common.rangeSeparator")}${shift.isOvernight ? translate("shift.nextDay") : ""}${shift.endTime}`;
  }

  function getShiftDisplayName(shift) {
    return shift.jobName === "" ? translate("shift.unnamed") : shift.jobName;
  }

  function getLongBreakDisplayName(longBreak) {
    return longBreak.name.trim() === ""
      ? translate("longBreak.unnamed")
      : longBreak.name;
  }

  function confirmOverlappingShift(overlappingEntries) {
    if (overlappingEntries.length === 0) return true;

    const overlapDetails = overlappingEntries
      .map(
        ({ dateKey, shift }) =>
          translate("overlap.detail", {
            date: formatDateKey(dateKey),
            name: getShiftDisplayName(shift),
            time: formatShiftTimeRange(shift),
          }),
      )
      .join("\n");

    return window.confirm(translate("overlap.confirm", { details: overlapDetails }));
  }

  function getShifts(dateKey) {
    return shiftsByDate.get(dateKey) ?? [];
  }

  function getDailyActualMinutes(date) {
    return getShifts(toDateKey(date)).reduce(
      (total, shift) => total + shift.actualMinutes,
      0,
    );
  }

  function getWorkLimitSummaries(date) {
    return workLimit.getWorkLimitSummaries(
      toDateKey(date),
      shiftsByDate,
      longBreaks,
    );
  }

  function getWorkWarningDates(year, month) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const warningDates = [];

    for (let day = 1; day <= lastDay; day += 1) {
      const date = new Date(year, month, day);
      const summaries = getWorkLimitSummaries(date);
      if (summaries.daily?.hasWarning || summaries.weekly.hasWarning) {
        warningDates.push(date);
      }
    }

    return warningDates;
  }

  function updateMonthlyLegalWarning(year, month) {
    const warningDates = getWorkWarningDates(year, month);

    if (warningDates.length === 0) {
      monthlyLegalWarningMessage.textContent = "";
      monthlyLegalWarning.hidden = true;
      return;
    }

    const dateList = warningDates
      .map((date) =>
        translate("monthly.warning.shortDate", {
          month: date.getMonth() + 1,
          day: date.getDate(),
        }),
      )
      .join(translate("common.listSeparator"));
    monthlyLegalWarningMessage.textContent = translate(
      "monthly.warning.message",
      { dates: dateList },
    );
    monthlyLegalWarning.hidden = false;
  }

  function createCalendarDay(date, currentMonth, overlapDateKeys) {
    const dateKey = toDateKey(date);
    const dayOfWeek = date.getDay();
    const isCurrentMonth = date.getMonth() === currentMonth;
    const isToday = isSameDate(date, today);
    const isSelected = selectedDate !== null && isSameDate(date, selectedDate);
    const registeredShiftCount = getShifts(dateKey).length;
    const dailyActualMinutes = getDailyActualMinutes(date);
    const longBreak = getLongBreakForDate(date);
    const workLimitSummaries = getWorkLimitSummaries(date);
    const hasDailyLimitWarning =
      workLimitSummaries.daily?.hasWarning ?? false;
    const hasWeeklyLimitWarning = workLimitSummaries.weekly.hasWarning;
    const hasWorkLimitWarning =
      hasDailyLimitWarning || hasWeeklyLimitWarning;
    const hasOverlapWarning = overlapDateKeys.has(dateKey);
    const showOverlapWarning = hasOverlapWarning && !hasWorkLimitWarning;
    const cell = document.createElement("div");
    const button = document.createElement("button");
    const classNames = ["calendar-cell"];

    if (!isCurrentMonth) classNames.push("outside-month");
    if (isToday) classNames.push("today");
    if (isSelected) classNames.push("selected");
    if (hasDailyLimitWarning) {
      classNames.push("daily-limit-warning");
    } else if (hasWeeklyLimitWarning) {
      classNames.push(
        workLimitSummaries.weekly.type === "weekly-long-break"
          ? "weekly-40-limit-warning"
          : "weekly-28-limit-warning",
      );
    } else if (showOverlapWarning) {
      classNames.push("shift-overlap-warning");
    }
    if (longBreak) classNames.push("long-break-day");
    if (dayOfWeek === 0) classNames.push("sunday");
    if (dayOfWeek === 6) classNames.push("saturday");

    cell.className = classNames.join(" ");
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-selected", String(isSelected));

    button.className = "calendar-day";
    button.type = "button";
    button.dataset.calendarDay = "true";
    button.dataset.date = dateKey;
    const ariaParts = [
      formatPeriodDate(date),
      translate("calendar.ariaShiftCount", { count: registeredShiftCount }),
    ];
    if (dailyActualMinutes > 0) {
      ariaParts.push(
        translate("calendar.ariaActual", {
          minutes: formatMinutes(dailyActualMinutes),
        }),
      );
    }
    if (longBreak) {
      ariaParts.push(
        translate("calendar.ariaLongBreak", {
          name: getLongBreakDisplayName(longBreak),
        }),
      );
    }
    if (hasDailyLimitWarning) {
      ariaParts.push(
        translate("calendar.ariaDailyLimitWarning", {
          total: formatMinutes(workLimitSummaries.daily.totalMinutes),
          limit: formatMinutes(workLimitSummaries.daily.limitMinutes),
        }),
      );
    }
    if (hasWeeklyLimitWarning) {
      ariaParts.push(
        translate(
          workLimitSummaries.weekly.type === "weekly-long-break"
            ? "calendar.ariaWeekly40Warning"
            : "calendar.ariaWeekly28Warning",
          {
            total: formatMinutes(workLimitSummaries.weekly.totalMinutes),
            limit: formatMinutes(workLimitSummaries.weekly.limitMinutes),
          },
        ),
      );
    }
    if (hasOverlapWarning) {
      ariaParts.push(translate("calendar.ariaOverlapWarning"));
    }
    if (isToday) ariaParts.push(translate("calendar.ariaToday"));
    button.setAttribute(
      "aria-label",
      ariaParts.join(translate("common.listSeparator")),
    );
    button.addEventListener("click", () => selectDate(date));

    const dateElement = document.createElement("time");
    dateElement.dateTime = dateKey;
    dateElement.textContent = String(date.getDate());
    button.appendChild(dateElement);

    if (dailyActualMinutes > 0) {
      const workTime = document.createElement("span");
      workTime.className = "calendar-work-time";
      workTime.textContent = formatMinutesAsClock(dailyActualMinutes);
      button.appendChild(workTime);
    }

    if (hasDailyLimitWarning || hasWeeklyLimitWarning) {
      const warningIcon = document.createElement("span");
      warningIcon.className = "work-limit-warning-icon";
      warningIcon.textContent = hasDailyLimitWarning
        ? "8"
        : workLimitSummaries.weekly.type === "weekly-long-break"
          ? "40"
          : "28";
      warningIcon.setAttribute("aria-hidden", "true");
      button.appendChild(warningIcon);
    } else if (showOverlapWarning) {
      const warningIcon = document.createElement("span");
      warningIcon.className = "overlap-warning-icon";
      warningIcon.textContent = "!";
      warningIcon.setAttribute("aria-hidden", "true");
      button.appendChild(warningIcon);
    }

    if (longBreak) {
      const longBreakBand = document.createElement("span");
      const startsVisibleSegment =
        dateKey === longBreak.startDate || dayOfWeek === 0;
      const endsVisibleSegment = dateKey === longBreak.endDate || dayOfWeek === 6;
      longBreakBand.className = `long-break-band${startsVisibleSegment ? " range-start" : ""}${endsVisibleSegment ? " range-end" : ""}`;
      longBreakBand.setAttribute("aria-hidden", "true");
      button.appendChild(longBreakBand);
    }

    if (isToday) {
      const todayLabel = document.createElement("span");
      todayLabel.className = "today-label";
      todayLabel.textContent = translate("calendar.today");
      button.appendChild(todayLabel);
    }

    cell.appendChild(button);
    return cell;
  }

  function renderCalendar() {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDayOffset = new Date(year, month, 1).getDay();
    const fragment = document.createDocumentFragment();
    const overlapDateKeys = getOverlapDateKeys();

    monthHeading.textContent = formatMonthHeading(visibleMonth);
    updateMonthlyEstimatedPay();
    updateMonthlyLegalWarning(year, month);

    for (let index = 0; index < 42; index += 1) {
      const date = new Date(year, month, index - firstDayOffset + 1);
      fragment.appendChild(
        createCalendarDay(date, month, overlapDateKeys),
      );
    }

    calendarGrid.replaceChildren(fragment);
  }

  function createPayBreakdownRow(labelText, valueText, className = "") {
    const row = document.createElement("div");
    const label = document.createElement("dt");
    const value = document.createElement("dd");

    if (className !== "") row.className = className;
    label.textContent = labelText;
    value.textContent = valueText;
    row.append(label, value);
    return row;
  }

  function createShiftItem(shift) {
    const item = document.createElement("article");
    const header = document.createElement("div");
    const jobName = document.createElement("h4");
    const time = document.createElement("p");
    const details = document.createElement("dl");
    const pay = calculateShiftPay(shift);
    const displayName = getShiftDisplayName(shift);

    item.className = `shift-item${editingShiftId === shift.id ? " editing" : ""}`;
    item.dataset.shiftId = String(shift.id);
    header.className = "shift-item-header";
    jobName.textContent = displayName;
    time.textContent = formatShiftTimeRange(shift);
    header.append(jobName, time);

    details.className = "shift-details";

    const actualDetail = document.createElement("div");
    const actualLabel = document.createElement("dt");
    const actualValue = document.createElement("dd");
    actualLabel.textContent = translate("shift.item.actual");
    actualValue.textContent = formatMinutes(shift.actualMinutes);
    actualDetail.append(actualLabel, actualValue);

    const breakDetail = document.createElement("div");
    const breakLabel = document.createElement("dt");
    const breakValue = document.createElement("dd");
    breakLabel.textContent = translate("shift.item.break");
    breakValue.textContent = translate("time.minutes", {
      minutes: shift.breakMinutes,
    });
    breakDetail.append(breakLabel, breakValue);

    const wageDetail = document.createElement("div");
    const wageLabel = document.createElement("dt");
    const wageValue = document.createElement("dd");
    wageLabel.textContent = translate("shift.item.hourlyWage");
    wageValue.textContent = formatYen(shift.hourlyWage);
    wageDetail.append(wageLabel, wageValue);

    const payDetail = document.createElement("div");
    const payLabel = document.createElement("dt");
    const payValue = document.createElement("dd");
    payDetail.className = "shift-estimated-pay";
    payLabel.textContent = translate("shift.item.estimatedPay");
    payValue.textContent = formatYen(pay.estimatedPay);
    payDetail.append(payLabel, payValue);

    details.append(actualDetail, breakDetail, wageDetail, payDetail);
    item.append(header, details);

    const actions = document.createElement("div");
    const payBreakdownButton = document.createElement("button");
    const editButton = document.createElement("button");
    const deleteButton = document.createElement("button");
    const payBreakdown = document.createElement("section");
    const payBreakdownHeading = document.createElement("h5");
    const payBreakdownDetails = document.createElement("dl");
    const payCalculationNote = document.createElement("p");
    const payBreakdownId = `shift-pay-breakdown-${shift.id}`;

    actions.className = "shift-item-actions";
    payBreakdownButton.className = "pay-breakdown-button";
    payBreakdownButton.type = "button";
    payBreakdownButton.textContent = translate("pay.breakdown");
    payBreakdownButton.setAttribute("aria-expanded", "false");
    payBreakdownButton.setAttribute("aria-controls", payBreakdownId);
    payBreakdownButton.setAttribute(
      "aria-label",
      translate("pay.breakdownShowAria", { name: displayName }),
    );
    editButton.className = "edit-shift-button";
    editButton.type = "button";
    editButton.textContent = translate("common.edit");
    editButton.setAttribute(
      "aria-label",
      translate("shift.editAria", { name: displayName }),
    );
    editButton.addEventListener("click", () => startEditingShift(shift.id));

    deleteButton.className = "delete-shift-button";
    deleteButton.type = "button";
    deleteButton.textContent = translate("common.delete");
    deleteButton.setAttribute(
      "aria-label",
      translate("shift.deleteAria", { name: displayName }),
    );
    deleteButton.addEventListener("click", () => deleteShift(shift.id));

    payBreakdown.id = payBreakdownId;
    payBreakdown.className = "pay-breakdown";
    payBreakdown.hidden = true;
    payBreakdownHeading.textContent = translate("pay.breakdown");
    payBreakdownDetails.append(
      createPayBreakdownRow(
        translate("pay.basicBeforeRounding"),
        formatCalculationYen(pay.basicWage),
      ),
      createPayBreakdownRow(
        translate("pay.nightMinutes"),
        formatMinutes(pay.nightMinutes),
      ),
      createPayBreakdownRow(
        translate("pay.nightPremiumBeforeRounding"),
        formatCalculationYen(pay.nightPremium),
      ),
      createPayBreakdownRow(
        translate("pay.shiftTotal"),
        formatYen(pay.estimatedPay),
        "pay-breakdown-total",
      ),
    );
    payCalculationNote.className = "pay-calculation-note";
    payCalculationNote.textContent = translate("pay.exclusionNote");
    payBreakdown.append(
      payBreakdownHeading,
      payBreakdownDetails,
      payCalculationNote,
    );

    payBreakdownButton.addEventListener("click", () => {
      const willOpen = payBreakdown.hidden;
      payBreakdown.hidden = !willOpen;
      payBreakdownButton.setAttribute("aria-expanded", String(willOpen));
      payBreakdownButton.textContent = willOpen
        ? translate("pay.breakdownClose")
        : translate("pay.breakdown");
      payBreakdownButton.setAttribute(
        "aria-label",
        translate(
          willOpen ? "pay.breakdownCloseAria" : "pay.breakdownShowAria",
          { name: displayName },
        ),
      );
    });

    actions.append(payBreakdownButton, editButton, deleteButton);
    item.append(actions, payBreakdown);

    return item;
  }

  function renderShiftList(shifts) {
    const fragment = document.createDocumentFragment();

    if (shifts.length === 0) {
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "empty-shift-message";
      emptyMessage.textContent = translate("shift.empty");
      fragment.appendChild(emptyMessage);
    } else {
      shifts.forEach((shift) => fragment.appendChild(createShiftItem(shift)));
    }

    shiftList.replaceChildren(fragment);
  }

  function setFormMessage(message, type = "") {
    formMessage.textContent = message;
    formMessage.className = `form-message${type ? ` ${type}` : ""}`;
    formMessage.hidden = message === "";
  }

  function updateWorkLimitWarning(
    container,
    heading,
    period,
    total,
    limit,
    excess,
    summary,
    headingKey,
  ) {
    if (summary === null || !summary.hasWarning) {
      container.hidden = true;
      return;
    }

    heading.textContent = translate(headingKey);
    period.textContent = `${formatDateKey(summary.periodStart)}${translate("common.rangeSeparator")}${formatDateKey(summary.periodEnd)}`;
    total.textContent = formatMinutes(summary.totalMinutes);
    limit.textContent = formatMinutes(summary.limitMinutes);
    excess.textContent = formatMinutes(summary.excessMinutes);
    container.hidden = false;
  }

  function updateSelectedPeriodSummary(summary) {
    selectedPeriodRange.textContent = `${formatDateKey(summary.periodStart)}${translate("common.rangeSeparator")}${formatDateKey(summary.periodEnd)}`;
    selectedPeriodWorked.textContent = formatMinutes(summary.totalMinutes);
    selectedPeriodRemaining.textContent = formatMinutes(
      Math.max(0, summary.limitMinutes - summary.totalMinutes),
    );
  }

  function updateDailyOverlapWarning(date) {
    dailyOverlapWarning.hidden = !getOverlapDateKeys().has(toDateKey(date));
  }

  function resetFormMode() {
    editingShiftId = null;
    shiftForm.reset();
    clearShiftFieldValidityMessages();
    shiftFormHeading.textContent = translate("shift.form.addTitle");
    shiftSubmitButton.textContent = translate("shift.form.addTitle");
    cancelEditButton.hidden = true;
  }

  function startEditingShift(shiftId) {
    if (selectedDate === null) return;

    const shifts = getShifts(toDateKey(selectedDate));
    const shift = shifts.find((item) => item.id === shiftId);

    if (!shift) return;

    editingShiftId = shiftId;
    shiftFormHeading.textContent = translate("shift.form.editTitle");
    shiftSubmitButton.textContent = translate("shift.form.saveChanges");
    cancelEditButton.hidden = false;
    shiftFields.disabled = false;
    shiftForm.elements.namedItem("jobName").value = shift.jobName;
    shiftForm.elements.namedItem("startTime").value = shift.startTime;
    shiftForm.elements.namedItem("endTime").value = shift.endTime;
    shiftForm.elements.namedItem("breakStartTime").value = shift.breakStartTime;
    shiftForm.elements.namedItem("breakEndTime").value = shift.breakEndTime;
    shiftForm.elements.namedItem("hourlyWage").value =
      shift.hourlyWage === 0 ? "" : String(shift.hourlyWage);
    setFormMessage("");
    renderShiftList(shifts);
    shiftForm.scrollIntoView({ block: "start" });
    jobNameInput.focus();
  }

  async function deleteShift(shiftId) {
    if (selectedDate === null) return;

    const dateKey = toDateKey(selectedDate);
    const shifts = getShifts(dateKey);
    const shift = shifts.find((item) => item.id === shiftId);

    if (
      !shift ||
      !window.confirm(
        translate("shift.deleteConfirm", { name: getShiftDisplayName(shift) }),
      )
    ) {
      return;
    }

    try {
      await storage.deleteShift(shiftId);
    } catch (error) {
      setFormMessage(translate("storage.deleteFailed"), "error");
      return;
    }

    const remainingShifts = shifts.filter((item) => item.id !== shiftId);

    if (remainingShifts.length === 0) {
      shiftsByDate.delete(dateKey);
    } else {
      shiftsByDate.set(dateKey, remainingShifts);
    }

    if (editingShiftId === shiftId) resetFormMode();

    renderCalendar();
    updateDayPanel();
    setFormMessage(translate("shift.deleted"), "success");
  }

  function closeShiftModal(restoreFocus = true) {
    const selectedDateKey = selectedDate === null ? null : toDateKey(selectedDate);

    selectedDate = null;
    resetFormMode();
    shiftModal.hidden = true;
    renderCalendar();

    if (restoreFocus && selectedDateKey !== null) {
      const dateButton = calendarGrid.querySelector(
        `[data-date="${selectedDateKey}"]`,
      );
      dateButton?.focus({ preventScroll: true });
    }
  }

  function updateDayPanel() {
    if (selectedDate === null) {
      shiftModal.hidden = true;
      return;
    }

    const shifts = getShifts(toDateKey(selectedDate));
    const hasReachedLimit = shifts.length >= MAX_SHIFTS_PER_DAY;
    const workLimitSummaries = getWorkLimitSummaries(selectedDate);
    let isEditingExistingShift =
      editingShiftId !== null && shifts.some((shift) => shift.id === editingShiftId);

    if (editingShiftId !== null && !isEditingExistingShift) {
      resetFormMode();
      isEditingExistingShift = false;
    }

    selectedDateHeading.textContent = formatSelectedDate(selectedDate);
    dailyEstimatedPay.textContent = formatYen(
      getDailyEstimatedPay(selectedDate),
    );
    shiftCount.textContent = translate("shift.countWithLimit", {
      count: shifts.length,
      limit: MAX_SHIFTS_PER_DAY,
    });
    shiftFields.disabled = hasReachedLimit && !isEditingExistingShift;
    renderShiftList(shifts);
    updateSelectedPeriodSummary(workLimitSummaries.weekly);
    updateWorkLimitWarning(
      dailyLimitWarning,
      dailyLimitWarningHeading,
      dailyLimitWarningPeriod,
      dailyLimitWarningTotal,
      dailyLimitWarningLimit,
      dailyLimitWarningExcess,
      workLimitSummaries.daily,
      "warning.longBreakHeading",
    );
    updateWorkLimitWarning(
      weeklyWarning,
      weeklyWarningHeading,
      weeklyWarningPeriod,
      weeklyWarningTotal,
      weeklyWarningLimit,
      weeklyWarningExcess,
      workLimitSummaries.weekly,
      workLimitSummaries.weekly.type === "weekly-long-break"
        ? "warning.longBreakWeeklyHeading"
        : "warning.normalHeading",
    );
    updateDailyOverlapWarning(selectedDate);

    if (isEditingExistingShift) {
      setFormMessage("");
    } else if (hasReachedLimit) {
      setFormMessage(
        translate("shift.limit", { limit: MAX_SHIFTS_PER_DAY }),
        "error",
      );
    } else {
      setFormMessage("");
    }

    shiftModal.hidden = false;
  }

  function selectDate(date) {
    selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    visibleMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    resetFormMode();
    renderCalendar();
    updateDayPanel();
    selectedDateHeading.focus({ preventScroll: true });
  }

  function moveMonth(offset) {
    visibleMonth = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() + offset,
      1,
    );
    closeShiftModal(false);
  }

  function switchManagementView(view) {
    const showShiftManagement = view === "shift";

    shiftManagementTab.classList.toggle("active", showShiftManagement);
    longBreakManagementTab.classList.toggle("active", !showShiftManagement);
    shiftManagementTab.setAttribute(
      "aria-selected",
      String(showShiftManagement),
    );
    longBreakManagementTab.setAttribute(
      "aria-selected",
      String(!showShiftManagement),
    );
    shiftManagementPanel.hidden = !showShiftManagement;
    longBreakManagementPanel.hidden = showShiftManagement;

    if (showShiftManagement) {
      renderCalendar();
    } else {
      if (!shiftModal.hidden) closeShiftModal(false);
      renderLongBreakList();
    }
  }

  function setLongBreakFormMessage(message) {
    longBreakFormMessage.textContent = message;
    longBreakFormMessage.hidden = message === "";
  }

  function createLongBreakItem(longBreak) {
    const item = document.createElement("article");
    const header = document.createElement("div");
    const text = document.createElement("div");
    const name = document.createElement("h2");
    const period = document.createElement("p");
    const actions = document.createElement("div");
    const editButton = document.createElement("button");
    const deleteButton = document.createElement("button");

    const displayName = getLongBreakDisplayName(longBreak);

    item.className = "long-break-item";
    item.dataset.longBreakId = String(longBreak.id);
    header.className = "long-break-item-header";
    name.textContent = displayName;
    period.className = "long-break-period";
    period.textContent = `${formatDateKey(longBreak.startDate)}${translate("common.rangeSeparator")}${formatDateKey(longBreak.endDate)}`;
    text.append(name, period);

    actions.className = "long-break-item-actions";
    editButton.className = "edit-long-break-button";
    editButton.type = "button";
    editButton.textContent = translate("common.edit");
    editButton.setAttribute(
      "aria-label",
      translate("longBreak.editAria", { name: displayName }),
    );
    editButton.addEventListener("click", () => openLongBreakModal(longBreak.id));

    deleteButton.className = "delete-long-break-button";
    deleteButton.type = "button";
    deleteButton.textContent = translate("common.delete");
    deleteButton.setAttribute(
      "aria-label",
      translate("longBreak.deleteAria", { name: displayName }),
    );
    deleteButton.addEventListener("click", () => deleteLongBreak(longBreak.id));
    actions.append(editButton, deleteButton);
    header.append(text, actions);
    item.appendChild(header);

    return item;
  }

  function renderLongBreakList() {
    const fragment = document.createDocumentFragment();
    const sortedLongBreaks = [...longBreaks].sort(
      (left, right) =>
        right.startDate.localeCompare(left.startDate) ||
        right.createdOrder - left.createdOrder,
    );

    if (sortedLongBreaks.length === 0) {
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "empty-long-break-message";
      emptyMessage.textContent = translate("longBreak.empty");
      fragment.appendChild(emptyMessage);
    } else {
      sortedLongBreaks.forEach((longBreak) =>
        fragment.appendChild(createLongBreakItem(longBreak)),
      );
    }

    longBreakList.replaceChildren(fragment);
  }

  function openLongBreakModal(longBreakId = null) {
    const longBreak =
      longBreakId === null
        ? null
        : longBreaks.find((item) => item.id === longBreakId) ?? null;

    editingLongBreakId = longBreak?.id ?? null;
    longBreakForm.reset();
    clearLongBreakFieldValidityMessages();
    setLongBreakFormMessage("");
    longBreakFormHeading.textContent = longBreak
      ? translate("longBreak.modalEdit")
      : translate("longBreak.modalAdd");
    saveLongBreakButton.textContent = longBreak
      ? translate("longBreak.saveChanges")
      : translate("longBreak.register");

    if (longBreak) {
      longBreakForm.elements.namedItem("name").value = longBreak.name;
      longBreakForm.elements.namedItem("startDate").value = longBreak.startDate;
      longBreakForm.elements.namedItem("endDate").value = longBreak.endDate;
    }

    longBreakModal.hidden = false;
    longBreakFormHeading.focus({ preventScroll: true });
  }

  function closeLongBreakModal(restoreFocus = true) {
    const previousEditingId = editingLongBreakId;
    editingLongBreakId = null;
    longBreakForm.reset();
    clearLongBreakFieldValidityMessages();
    setLongBreakFormMessage("");
    longBreakModal.hidden = true;

    if (!restoreFocus) return;

    if (previousEditingId !== null) {
      longBreakList
        .querySelector(`[data-long-break-id="${previousEditingId}"] .edit-long-break-button`)
        ?.focus();
    } else {
      addLongBreakButton.focus();
    }
  }

  async function deleteLongBreak(longBreakId) {
    const index = longBreaks.findIndex((longBreak) => longBreak.id === longBreakId);
    const longBreak = longBreaks[index];

    if (
      !longBreak ||
      !window.confirm(
        translate("longBreak.deleteConfirm", {
          name: getLongBreakDisplayName(longBreak),
        }),
      )
    ) {
      return;
    }

    try {
      await storage.deleteLongBreak(longBreakId);
    } catch (error) {
      window.alert(translate("storage.deleteFailed"));
      return;
    }

    longBreaks.splice(index, 1);
    renderLongBreakList();
    renderCalendar();
    if (selectedDate !== null) updateDayPanel();
  }

  longBreakForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    applyLongBreakFieldValidityMessages();
    setLongBreakFormMessage("");

    if (!longBreakForm.reportValidity()) return;

    const formData = new FormData(longBreakForm);
    const name = String(formData.get("name")).trim();
    const startDate = String(formData.get("startDate"));
    const endDate = String(formData.get("endDate"));

    if (startDate > endDate) {
      setLongBreakFormMessage(
        translate("longBreak.validation.dateOrder"),
      );
      longBreakEndDateInput.focus();
      return;
    }

    const overlappingLongBreak = longBreaks.find(
      (longBreak) =>
        longBreak.id !== editingLongBreakId &&
        startDate <= longBreak.endDate &&
        endDate >= longBreak.startDate,
    );

    if (overlappingLongBreak) {
      setLongBreakFormMessage(
        translate("longBreak.validation.overlap", {
          name: getLongBreakDisplayName(overlappingLongBreak),
        }),
      );
      longBreakStartDateInput.focus();
      return;
    }

    const values = {
      name,
      startDate,
      endDate,
      memo: "",
    };

    const editedLongBreakIndex =
      editingLongBreakId === null
        ? -1
        : longBreaks.findIndex(
            (longBreak) => longBreak.id === editingLongBreakId,
          );

    if (editingLongBreakId !== null && editedLongBreakIndex === -1) return;

    saveLongBreakButton.disabled = true;

    try {
      if (editingLongBreakId === null) {
        const id = await storage.addLongBreak(createStoredLongBreak(values));
        longBreaks.push({ id, ...values, createdOrder: id });
      } else {
        const updatedLongBreak = {
          ...longBreaks[editedLongBreakIndex],
          ...values,
        };
        await storage.updateLongBreak(
          createStoredLongBreak(updatedLongBreak),
        );
        longBreaks[editedLongBreakIndex] = updatedLongBreak;
      }
    } catch (error) {
      saveLongBreakButton.disabled = false;
      setLongBreakFormMessage(translate("storage.saveFailed"));
      return;
    }

    saveLongBreakButton.disabled = false;
    renderLongBreakList();
    renderCalendar();
    if (selectedDate !== null) updateDayPanel();
    closeLongBreakModal(false);
  });

  shiftForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    applyShiftFieldValidityMessages();

    if (selectedDate === null || !shiftForm.reportValidity()) return;

    const dateKey = toDateKey(selectedDate);
    const shifts = getShifts(dateKey);

    if (editingShiftId === null && shifts.length >= MAX_SHIFTS_PER_DAY) {
      shiftFields.disabled = true;
      setFormMessage(
        translate("shift.limit", { limit: MAX_SHIFTS_PER_DAY }),
        "error",
      );
      return;
    }

    const formData = new FormData(shiftForm);
    const jobName = String(formData.get("jobName")).trim();

    const startTime = String(formData.get("startTime"));
    const endTime = String(formData.get("endTime"));
    const breakStartTime = String(formData.get("breakStartTime"));
    const breakEndTime = String(formData.get("breakEndTime"));
    const hourlyWageText = String(formData.get("hourlyWage")).trim();
    const calculatedTime = calculateShiftTime(
      startTime,
      endTime,
      breakStartTime,
      breakEndTime,
    );

    if (calculatedTime.errorMessage) {
      calculatedTime.errorInput.setCustomValidity(calculatedTime.errorMessage);
      calculatedTime.errorInput.reportValidity();
      return;
    }

    const wasEditing = editingShiftId !== null;
    const shiftValues = {
      jobName,
      startTime,
      endTime,
      breakStartTime,
      breakEndTime,
      breakMinutes: calculatedTime.breakMinutes,
      breakStartMinute: calculatedTime.breakStartMinute,
      breakEndMinute: calculatedTime.breakEndMinute,
      hourlyWage: hourlyWageText === "" ? 0 : Number(hourlyWageText),
      memo: "",
      actualMinutes: calculatedTime.actualMinutes,
      isOvernight: calculatedTime.isOvernight,
    };

    const overlappingEntries = getOverlappingShiftEntries(
      dateKey,
      shiftValues,
      editingShiftId,
    );

    if (!confirmOverlappingShift(overlappingEntries)) return;

    const editedShiftIndex = wasEditing
      ? shifts.findIndex((shift) => shift.id === editingShiftId)
      : -1;

    if (wasEditing && editedShiftIndex === -1) {
      resetFormMode();
      updateDayPanel();
      return;
    }

    shiftSubmitButton.disabled = true;

    try {
      if (wasEditing) {
        const updatedShift = {
          ...shifts[editedShiftIndex],
          ...shiftValues,
        };
        await storage.updateShift(createStoredShift(dateKey, updatedShift));
        shifts[editedShiftIndex] = updatedShift;
      } else {
        const id = await storage.addShift(
          createStoredShift(dateKey, shiftValues),
        );
        shifts.push({ id, ...shiftValues, createdOrder: id });
      }
    } catch (error) {
      shiftSubmitButton.disabled = false;
      setFormMessage(translate("storage.saveFailed"), "error");
      return;
    }

    shiftSubmitButton.disabled = false;
    shifts.sort(compareShifts);
    shiftsByDate.set(dateKey, shifts);
    closeShiftModal();
  });

  function showStorageRecovery() {
    document
      .querySelectorAll("button, input, textarea, select")
      .forEach((element) => {
        if (!storageRecoveryModal.contains(element)) element.disabled = true;
      });
    storageRecoveryError.hidden = true;
    storageRecoveryModal.hidden = false;
    storageRecoveryHeading.focus({ preventScroll: true });
  }

  async function initializeStoredData() {
    try {
      await language.ready;
      const storedData = await storage.loadCalendarData();
      const restoredShiftsByDate = new Map();
      const restoredLongBreaks = storedData.longBreaks.map(
        restoreStoredLongBreak,
      );

      storedData.shifts.forEach((record) => {
        const { date, shift } = restoreStoredShift(record);
        const shifts = restoredShiftsByDate.get(date) ?? [];
        shifts.push(shift);
        restoredShiftsByDate.set(date, shifts);
      });

      restoredShiftsByDate.forEach((shifts) => shifts.sort(compareShifts));
      shiftsByDate.clear();
      restoredShiftsByDate.forEach((shifts, date) => {
        shiftsByDate.set(date, shifts);
      });
      longBreaks.splice(0, longBreaks.length, ...restoredLongBreaks);
      renderCalendar();
      renderLongBreakList();
    } catch (error) {
      showStorageRecovery();
    }
  }

  shiftValidatedInputs.forEach((input) => {
    input.addEventListener("invalid", () => updateShiftFieldValidity(input));

    ["input", "change"].forEach((eventName) => {
      input.addEventListener(eventName, () => input.setCustomValidity(""));
    });
  });

  [breakStartInput, breakEndInput].forEach((input) => {
    input.addEventListener("input", () => {
      breakStartInput.setCustomValidity("");
      breakEndInput.setCustomValidity("");
    });
  });

  cancelEditButton.addEventListener("click", () => {
    closeShiftModal();
  });

  shiftManagementTab.addEventListener("click", () =>
    switchManagementView("shift"),
  );
  longBreakManagementTab.addEventListener("click", () =>
    switchManagementView("long-break"),
  );
  addLongBreakButton.addEventListener("click", () => openLongBreakModal());
  closeLongBreakModalButton.addEventListener("click", () =>
    closeLongBreakModal(),
  );
  cancelLongBreakButton.addEventListener("click", () => closeLongBreakModal());
  longBreakModalBackdrop.addEventListener("click", () =>
    closeLongBreakModal(),
  );
  longBreakValidatedInputs.forEach((input) => {
    input.addEventListener("invalid", () => updateLongBreakFieldValidity(input));

    ["input", "change"].forEach((eventName) => {
      input.addEventListener(eventName, () => {
        input.setCustomValidity("");
        setLongBreakFormMessage("");
      });
    });
  });

  previousMonthButton.addEventListener("click", () => moveMonth(-1));
  nextMonthButton.addEventListener("click", () => moveMonth(1));
  closeShiftModalButton.addEventListener("click", () => closeShiftModal());
  shiftModalBackdrop.addEventListener("click", () => closeShiftModal());
  todayButton.addEventListener("click", () => {
    const now = new Date();
    visibleMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    closeShiftModal(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !longBreakModal.hidden) {
      closeLongBreakModal();
    }
  });

  resetStorageButton.addEventListener("click", async () => {
    resetStorageButton.disabled = true;
    reloadStorageButton.disabled = true;
    storageRecoveryError.hidden = true;

    try {
      await storage.resetDatabase();
      window.location.reload();
    } catch (error) {
      storageRecoveryError.textContent = translate("storage.recovery.resetFailed");
      storageRecoveryError.hidden = false;
      resetStorageButton.disabled = false;
      reloadStorageButton.disabled = false;
    }
  });

  reloadStorageButton.addEventListener("click", () => window.location.reload());

  document.addEventListener("shiftlanguagechange", () => {
    clearShiftFieldValidityMessages();
    clearLongBreakFieldValidityMessages();
    renderCalendar();
    renderLongBreakList();

    if (selectedDate !== null) updateDayPanel();

    shiftFormHeading.textContent =
      editingShiftId === null
        ? translate("shift.form.addTitle")
        : translate("shift.form.editTitle");
    shiftSubmitButton.textContent =
      editingShiftId === null
        ? translate("shift.form.addTitle")
        : translate("shift.form.saveChanges");
    longBreakFormHeading.textContent =
      editingLongBreakId === null
        ? translate("longBreak.modalAdd")
        : translate("longBreak.modalEdit");
    saveLongBreakButton.textContent =
      editingLongBreakId === null
        ? translate("longBreak.register")
        : translate("longBreak.saveChanges");
    setFormMessage("");
    setLongBreakFormMessage("");
  });

  initializeStoredData();
})();
