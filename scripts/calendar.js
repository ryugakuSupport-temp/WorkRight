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
  const breakTime = window.ShiftBreakTime;
  const presets = window.ShiftPresets;

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
  const shiftPresetButton = document.getElementById("shift-preset-button");
  const shiftPresetPanel = document.getElementById("shift-preset-panel");
  const createShiftTemplateButton = document.getElementById(
    "create-shift-template",
  );
  const cancelTemplateEditButton = document.getElementById(
    "cancel-template-edit",
  );
  const shiftTemplateLimit = document.getElementById("shift-template-limit");
  const shiftTemplateList = document.getElementById("shift-template-list");
  const shiftHistoryList = document.getElementById("shift-history-list");
  const templateNameModal = document.getElementById("template-name-modal");
  const templateNameBackdrop = document.getElementById(
    "template-name-backdrop",
  );
  const templateNameForm = document.getElementById("template-name-form");
  const templateNameHeading = document.getElementById(
    "template-name-heading",
  );
  const templateNameInput = document.getElementById("template-name");
  const saveShiftTemplateButton = document.getElementById(
    "save-shift-template",
  );
  const cancelTemplateNameButton = document.getElementById(
    "cancel-template-name",
  );
  const baseTimeInputGroups = Object.freeze({
    startTime: Object.freeze({
      hour: document.getElementById("start-time-hour"),
      minute: document.getElementById("start-time-minute"),
      required: true,
    }),
    endTime: Object.freeze({
      hour: document.getElementById("end-time-hour"),
      minute: document.getElementById("end-time-minute"),
      required: true,
    }),
  });
  const breakListFields = document.getElementById("break-list-fields");
  const addBreakButton = document.getElementById("add-break");
  const hourlyWageInput = shiftForm.elements.namedItem("hourlyWage");
  const breakNumerals = Object.freeze(["①", "②", "③", "④", "⑤"]);
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
  const shiftTemplates = [];
  const shiftHistory = [];
  let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let selectedDate = null;
  let editingShiftId = null;
  let editingLongBreakId = null;
  let editingTemplateId = null;
  let pendingTemplateContent = null;

  function translate(key, values = {}) {
    return language.translate(key, values);
  }

  function getCurrentLocale() {
    return language.getCurrentLanguage().locale;
  }

  function getBreakRows() {
    return Array.from(
      breakListFields.querySelectorAll(".break-time-row"),
    );
  }

  function getBreakTimeGroups(row) {
    return {
      start: {
        hour: row.querySelector('[data-break-field="start"][data-time-segment="hour"]'),
        minute: row.querySelector(
          '[data-break-field="start"][data-time-segment="minute"]',
        ),
        required: false,
      },
      end: {
        hour: row.querySelector('[data-break-field="end"][data-time-segment="hour"]'),
        minute: row.querySelector(
          '[data-break-field="end"][data-time-segment="minute"]',
        ),
        required: false,
      },
    };
  }

  function getAllTimeInputGroups() {
    return [
      ...Object.values(baseTimeInputGroups),
      ...getBreakRows().flatMap((row) =>
        Object.values(getBreakTimeGroups(row)),
      ),
    ];
  }

  function getAllTimeSegmentInputs() {
    return getAllTimeInputGroups().flatMap((group) => [
      group.hour,
      group.minute,
    ]);
  }

  function getShiftValidatedInputs() {
    return [...getAllTimeSegmentInputs(), hourlyWageInput];
  }

  function getTimeInputGroupForSegment(input) {
    return (
      getAllTimeInputGroups().find(
        (group) => group.hour === input || group.minute === input,
      ) ?? null
    );
  }

  function isValidTimeSegment(input) {
    if (!/^\d{2}$/.test(input.value)) return false;
    const value = Number(input.value);
    return input.dataset.timeSegment === "hour"
      ? value >= 0 && value <= 23
      : value >= 0 && value <= 59;
  }

  function updateTimeGroupValidity(group) {
    const hasValue = group.hour.value !== "" || group.minute.value !== "";
    if (!group.required && !hasValue) return;

    [group.hour, group.minute].forEach((input) => {
      if (input.value === "") {
        input.setCustomValidity(translate("validation.required"));
      } else if (!isValidTimeSegment(input)) {
        input.setCustomValidity(translate("validation.timeInvalid"));
      }
    });
  }

  function updateShiftFieldValidity(input) {
    const timeGroup = getTimeInputGroupForSegment(input);
    if (timeGroup !== null) {
      updateTimeGroupValidity(timeGroup);
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
    clearShiftFieldValidityMessages();
    getAllTimeInputGroups().forEach(updateTimeGroupValidity);
    updateShiftFieldValidity(hourlyWageInput);
  }

  function clearShiftFieldValidityMessages() {
    getShiftValidatedInputs().forEach((input) => input.setCustomValidity(""));
  }

  function getTimeGroupValue(group) {
    if (group.hour.value === "" && group.minute.value === "") return "";
    return group.hour.value + ":" + group.minute.value;
  }

  function setTimeGroupValue(group, time) {
    const [hour = "", minute = ""] = time === "" ? [] : time.split(":");
    group.hour.value = hour;
    group.minute.value = minute;
  }

  function getBaseTimeInputValue(groupName) {
    return getTimeGroupValue(baseTimeInputGroups[groupName]);
  }

  function setBaseTimeInputValue(groupName, time) {
    setTimeGroupValue(baseTimeInputGroups[groupName], time);
  }

  function getBreakTimeValues() {
    return getBreakRows().map((row) => {
      const groups = getBreakTimeGroups(row);
      return {
        startTime: getTimeGroupValue(groups.start),
        endTime: getTimeGroupValue(groups.end),
      };
    });
  }

  function createBreakTimeInput(segment, fieldName) {
    const input = document.createElement("input");
    input.className = "time-segment-input";
    input.dataset.timeSegment = segment;
    input.dataset.breakField = fieldName;
    input.type = "text";
    input.inputMode = "numeric";
    input.maxLength = 2;
    input.pattern = "[0-9]{2}";
    input.placeholder = "00";
    input.autocomplete = "off";
    input.setAttribute(
      "aria-label",
      translate(segment === "hour" ? "time.hour" : "time.minute"),
    );
    return input;
  }

  function createBreakTimeField(fieldName, rowNumber) {
    const field = document.createElement("div");
    const label = document.createElement("span");
    const inputGroup = document.createElement("div");
    const hourInput = createBreakTimeInput("hour", fieldName);
    const separator = document.createElement("span");
    const minuteInput = createBreakTimeInput("minute", fieldName);
    const labelId = `break-${rowNumber}-${fieldName}-time-label`;

    field.className = "form-field";
    label.id = labelId;
    label.className = `break-${fieldName}-label`;
    inputGroup.className = "segmented-time-input";
    inputGroup.setAttribute("role", "group");
    inputGroup.setAttribute("aria-labelledby", labelId);
    separator.className = "time-separator";
    separator.setAttribute("aria-hidden", "true");
    separator.textContent = ":";
    inputGroup.append(hourInput, separator, minuteInput);
    field.append(label, inputGroup);
    return field;
  }

  function updateBreakRowLabels(row, index) {
    const numeral = breakNumerals[index];
    row.querySelector(".break-time-row-title").textContent = translate(
      "shift.form.breakNumber",
      { number: numeral },
    );
    row.querySelector(".break-start-label").textContent = translate(
      "shift.form.breakStartShort",
    );
    row.querySelector(".break-end-label").textContent = translate(
      "shift.form.breakEndShort",
    );
    row.querySelectorAll('[data-time-segment="hour"]').forEach((input) => {
      input.setAttribute("aria-label", translate("time.hour"));
    });
    row.querySelectorAll('[data-time-segment="minute"]').forEach((input) => {
      input.setAttribute("aria-label", translate("time.minute"));
    });

    const removeButton = row.querySelector(".remove-break-button");
    if (removeButton !== null) {
      removeButton.setAttribute(
        "aria-label",
        translate("shift.form.removeBreak", { number: numeral }),
      );
    }
  }

  function updateAllBreakRowLabels() {
    getBreakRows().forEach(updateBreakRowLabels);
  }

  function createBreakRow(breakValue, index) {
    const row = document.createElement("div");
    const header = document.createElement("header");
    const title = document.createElement("strong");
    const timeFields = document.createElement("div");
    const rowNumber = index + 1;

    row.className = "break-time-row";
    row.dataset.breakIndex = String(index);
    header.className = "break-time-row-header";
    title.className = "break-time-row-title";
    timeFields.className = "break-time-inputs";
    timeFields.append(
      createBreakTimeField("start", rowNumber),
      createBreakTimeField("end", rowNumber),
    );
    header.appendChild(title);

    if (index > 0) {
      const removeButton = document.createElement("button");
      removeButton.className = "remove-break-button";
      removeButton.type = "button";
      removeButton.textContent = "−";
      header.appendChild(removeButton);
    }

    row.append(header, timeFields);
    updateBreakRowLabels(row, index);
    const groups = getBreakTimeGroups(row);
    setTimeGroupValue(groups.start, breakValue.startTime);
    setTimeGroupValue(groups.end, breakValue.endTime);
    return row;
  }

  function updateBreakControls() {
    addBreakButton.hidden =
      getBreakRows().length >= breakTime.MAX_BREAKS;
  }

  function renderBreakFields(breakValues = [], focusLast = false) {
    const values =
      breakValues.length === 0
        ? [{ startTime: "", endTime: "" }]
        : breakValues.slice(0, breakTime.MAX_BREAKS);
    const fragment = document.createDocumentFragment();

    values.forEach((breakValue, index) => {
      fragment.appendChild(createBreakRow(breakValue, index));
    });

    breakListFields.replaceChildren(fragment);
    updateBreakControls();

    if (focusLast) {
      const rows = getBreakRows();
      const lastRow = rows[rows.length - 1];
      getBreakTimeGroups(lastRow).start.hour.focus();
    }
  }

  function addBreakField() {
    const values = getBreakTimeValues();
    if (values.length >= breakTime.MAX_BREAKS) return;

    values.push({ startTime: "", endTime: "" });
    renderBreakFields(values, true);
  }

  function removeBreakField(index) {
    const values = getBreakTimeValues();
    if (index <= 0 || index >= values.length) return;

    values.splice(index, 1);
    renderBreakFields(values);
    const nextRow = getBreakRows()[Math.min(index, values.length - 1)];
    nextRow?.querySelector(".remove-break-button")?.focus();
    if (nextRow === undefined || index >= values.length) addBreakButton.focus();
  }

  function getBreakErrorInput(error) {
    const row = getBreakRows()[error.breakIndex] ?? getBreakRows()[0];
    if (!row) return null;
    return getBreakTimeGroups(row)[error.field].hour;
  }

  function getBreakErrorTranslationKey(errorCode) {
    const keys = {
      pair: "shift.validation.breakPair",
      range: "shift.validation.breakRange",
      overlap: "shift.validation.breakOverlap",
      limit: "shift.validation.breakLimit",
    };
    return keys[errorCode];
  }

  function normalizeTimeSegmentInput(input) {
    input.value = input.value.replace(/\D/g, "").slice(0, 2);
    const maxFirstDigit =
      input.dataset.timeSegment === "hour" ? 2 : 5;

    if (input.value !== "" && Number(input.value[0]) > maxFirstDigit) {
      input.value = `0${input.value[0]}`;
    }

    input.setCustomValidity("");

    if (input.value.length !== 2) return;

    const timeSegmentInputs = getAllTimeSegmentInputs();
    const currentIndex = timeSegmentInputs.indexOf(input);
    const nextInput =
      timeSegmentInputs[currentIndex + 1] ?? hourlyWageInput;
    nextInput.focus();
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
    const storedBreaks = shift.breaks.map(({ startTime, endTime }) => ({
      startTime,
      endTime,
    }));
    const firstBreak = storedBreaks[0] ?? { startTime: "", endTime: "" };
    const secondBreak = storedBreaks[1] ?? { startTime: "", endTime: "" };
    const record = {
      date: dateKey,
      jobName: shift.jobName,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breaks: storedBreaks,
      breakStartTime: firstBreak.startTime,
      breakEndTime: firstBreak.endTime,
      break2StartTime: secondBreak.startTime,
      break2EndTime: secondBreak.endTime,
      hourlyWage: shift.hourlyWage,
      memo: shift.memo,
    };

    if (shift.id !== undefined) record.id = shift.id;
    return record;
  }

  function getStoredBreakTimes(record) {
    if (record?.breaks !== undefined) {
      if (
        !Array.isArray(record.breaks) ||
        record.breaks.length > breakTime.MAX_BREAKS
      ) {
        return null;
      }

      const storedBreaks = record.breaks.map((item) => ({
        startTime: item?.startTime,
        endTime: item?.endTime,
      }));
      const hasValidBreaks = storedBreaks.every(
        (item) =>
          isValidStoredTime(item.startTime) &&
          isValidStoredTime(item.endTime),
      );
      return hasValidBreaks ? storedBreaks : null;
    }

    const legacyBreaks = [
      {
        startTime: record?.breakStartTime ?? "",
        endTime: record?.breakEndTime ?? "",
      },
      {
        startTime: record?.break2StartTime ?? "",
        endTime: record?.break2EndTime ?? "",
      },
    ];

    if (
      !legacyBreaks.every(
        (item) =>
          isValidStoredTime(item.startTime, true) &&
          isValidStoredTime(item.endTime, true),
      )
    ) {
      return null;
    }

    return legacyBreaks.filter(
      (item) => item.startTime !== "" || item.endTime !== "",
    );
  }

  function restoreStoredShift(record) {
    const storedBreaks = getStoredBreakTimes(record);
    const hasValidValues =
      record !== null &&
      typeof record === "object" &&
      Number.isSafeInteger(record.id) &&
      record.id > 0 &&
      isValidStoredDate(record.date) &&
      typeof record.jobName === "string" &&
      isValidStoredTime(record.startTime) &&
      isValidStoredTime(record.endTime) &&
      storedBreaks !== null &&
      Number.isSafeInteger(record.hourlyWage) &&
      record.hourlyWage >= 0 &&
      typeof record.memo === "string";

    if (!hasValidValues) throw new Error("Stored shift data is invalid.");

    const calculatedTime = breakTime.calculateShiftTime(
      record.startTime,
      record.endTime,
      storedBreaks,
    );

    if (calculatedTime.error) {
      throw new Error("Stored shift time is invalid.");
    }

    return {
      date: record.date,
      shift: {
        id: record.id,
        jobName: record.jobName,
        startTime: record.startTime,
        endTime: record.endTime,
        breaks: calculatedTime.breaks,
        breakMinutes: calculatedTime.breakMinutes,
        hourlyWage: record.hourlyWage,
        memo: record.memo,
        actualMinutes: calculatedTime.actualMinutes,
        isOvernight: calculatedTime.isOvernight,
        createdOrder: record.id,
      },
    };
  }

  function createStoredShiftPreset(shift, additionalValues = {}) {
    const record = {
      ...additionalValues,
      ...presets.createShiftContent(shift),
    };

    if (shift.id !== undefined) record.id = shift.id;
    return record;
  }

  function restoreStoredShiftPreset(record, type) {
    const storedBreaks = getStoredBreakTimes(record);
    const hasValidBaseValues =
      record !== null &&
      typeof record === "object" &&
      Number.isSafeInteger(record.id) &&
      record.id > 0 &&
      typeof record.jobName === "string" &&
      isValidStoredTime(record.startTime) &&
      isValidStoredTime(record.endTime) &&
      storedBreaks !== null &&
      Number.isSafeInteger(record.hourlyWage) &&
      record.hourlyWage >= 0;
    const hasValidTypeValues =
      type === "template"
        ? typeof record.name === "string" && record.name.trim() !== ""
        : typeof record.contentKey === "string";

    if (!hasValidBaseValues || !hasValidTypeValues) {
      throw new Error("Stored shift preset data is invalid.");
    }

    const calculatedTime = breakTime.calculateShiftTime(
      record.startTime,
      record.endTime,
      storedBreaks,
    );

    if (calculatedTime.error) {
      throw new Error("Stored shift preset time is invalid.");
    }

    const restored = {
      id: record.id,
      jobName: record.jobName,
      startTime: record.startTime,
      endTime: record.endTime,
      breaks: calculatedTime.breaks,
      breakMinutes: calculatedTime.breakMinutes,
      hourlyWage: record.hourlyWage,
      actualMinutes: calculatedTime.actualMinutes,
      isOvernight: calculatedTime.isOvernight,
    };

    if (type === "template") {
      restored.name = record.name.trim();
    } else {
      restored.contentKey = record.contentKey;
      if (presets.createContentKey(restored) !== record.contentKey) {
        throw new Error("Stored shift history key is invalid.");
      }
    }

    return restored;
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
    const breakNightMinutes = shift.breaks.reduce(
      (total, breakValue) =>
        total +
        getNightMinutesWithinInterval(
          breakValue.startMinute,
          breakValue.endMinute,
        ),
      0,
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
    editButton.textContent = "✏️ " + translate("common.edit");
    editButton.setAttribute(
      "aria-label",
      translate("shift.editAria", { name: displayName }),
    );
    editButton.addEventListener("click", () => startEditingShift(shift.id));

    deleteButton.className = "delete-shift-button";
    deleteButton.type = "button";
    deleteButton.textContent = "🗑️ " + translate("common.delete");
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

  function closeShiftPresetPanel() {
    shiftPresetPanel.hidden = true;
    shiftPresetButton.setAttribute("aria-expanded", "false");
  }

  function isShiftFormEmpty() {
    return (
      jobNameInput.value.trim() === "" &&
      getBaseTimeInputValue("startTime") === "" &&
      getBaseTimeInputValue("endTime") === "" &&
      getBreakTimeValues().every(
        (breakValue) =>
          breakValue.startTime === "" && breakValue.endTime === "",
      ) &&
      String(hourlyWageInput.value).trim() === ""
    );
  }

  function readShiftFormValues() {
    applyShiftFieldValidityMessages();
    if (!shiftForm.reportValidity()) return null;

    const formData = new FormData(shiftForm);
    const startTime = getBaseTimeInputValue("startTime");
    const endTime = getBaseTimeInputValue("endTime");
    const calculatedTime = breakTime.calculateShiftTime(
      startTime,
      endTime,
      getBreakTimeValues(),
    );

    if (calculatedTime.error) {
      const errorInput = getBreakErrorInput(calculatedTime.error);
      const errorMessage = translate(
        getBreakErrorTranslationKey(calculatedTime.error.code),
        { limit: breakTime.MAX_BREAKS },
      );

      if (errorInput === null) {
        setFormMessage(errorMessage, "error");
      } else {
        errorInput.setCustomValidity(errorMessage);
        errorInput.reportValidity();
      }
      return null;
    }

    const hourlyWageText = String(formData.get("hourlyWage")).trim();
    return {
      jobName: String(formData.get("jobName")).trim(),
      startTime,
      endTime,
      breaks: calculatedTime.breaks,
      breakMinutes: calculatedTime.breakMinutes,
      hourlyWage: hourlyWageText === "" ? 0 : Number(hourlyWageText),
      memo: "",
      actualMinutes: calculatedTime.actualMinutes,
      isOvernight: calculatedTime.isOvernight,
    };
  }

  function clearTemplateEditMode() {
    editingTemplateId = null;
    createShiftTemplateButton.textContent = translate(
      "shift.preset.createFromCurrent",
    );
    cancelTemplateEditButton.hidden = true;
  }

  function updateTemplateControls() {
    const isEditingTemplate = editingTemplateId !== null;
    createShiftTemplateButton.disabled =
      !isEditingTemplate && shiftTemplates.length >= presets.MAX_TEMPLATES;
    createShiftTemplateButton.textContent = translate(
      isEditingTemplate
        ? "shift.preset.updateFromCurrent"
        : "shift.preset.createFromCurrent",
    );
    cancelTemplateEditButton.hidden = !isEditingTemplate;
    shiftTemplateLimit.textContent = translate("shift.preset.templateLimit", {
      count: shiftTemplates.length,
      limit: presets.MAX_TEMPLATES,
    });
  }

  function getPresetSummary(shift, includeJobName) {
    const details = [
      formatShiftTimeRange(shift),
      translate("shift.preset.breakSummary", {
        time: formatMinutes(shift.breakMinutes),
      }),
      translate("shift.preset.wageSummary", {
        amount: formatYen(shift.hourlyWage),
      }),
    ];
    if (includeJobName) details.unshift(getShiftDisplayName(shift));
    return details.join(translate("common.listSeparator"));
  }

  function applyPresetToForm(shift) {
    if (
      !isShiftFormEmpty() &&
      !window.confirm(translate("shift.preset.overwriteConfirm"))
    ) {
      return false;
    }

    jobNameInput.value = shift.jobName;
    setBaseTimeInputValue("startTime", shift.startTime);
    setBaseTimeInputValue("endTime", shift.endTime);
    renderBreakFields(
      breakTime.sortBreaksByShiftStart(shift.breaks, shift.startTime),
    );
    hourlyWageInput.value =
      shift.hourlyWage === 0 ? "" : String(shift.hourlyWage);
    clearShiftFieldValidityMessages();
    setFormMessage("");
    closeShiftPresetPanel();
    jobNameInput.focus();
    return true;
  }

  function createPresetItem(item, type) {
    const container = document.createElement("article");
    const selectButton = document.createElement("button");
    const name = document.createElement("strong");
    const summary = document.createElement("span");
    const actions = document.createElement("div");
    const displayName =
      type === "template" ? item.name : getShiftDisplayName(item);

    container.className = "shift-preset-item";
    selectButton.className = "shift-preset-select";
    selectButton.type = "button";
    selectButton.setAttribute(
      "aria-label",
      translate("shift.preset.applyAria", { name: displayName }),
    );
    name.className = "shift-preset-name";
    name.textContent = displayName;
    summary.className = "shift-preset-summary";
    summary.textContent = getPresetSummary(item, type === "template");
    selectButton.append(name, summary);
    selectButton.addEventListener("click", () => {
      if (applyPresetToForm(item)) {
        clearTemplateEditMode();
        renderShiftPresetPanel();
      }
    });

    actions.className = "shift-preset-actions";
    if (type === "template") {
      const editButton = document.createElement("button");
      editButton.className = "shift-preset-action";
      editButton.type = "button";
      editButton.textContent = "✏️";
      editButton.setAttribute(
        "aria-label",
        translate("shift.preset.editAria", { name: displayName }),
      );
      editButton.addEventListener("click", () => {
        if (!applyPresetToForm(item)) return;
        editingTemplateId = item.id;
        updateTemplateControls();
        setFormMessage(translate("shift.preset.editInstructions"));
      });

      const deleteButton = document.createElement("button");
      deleteButton.className = "shift-preset-action delete";
      deleteButton.type = "button";
      deleteButton.textContent = "🗑️";
      deleteButton.setAttribute(
        "aria-label",
        translate("shift.preset.deleteTemplateAria", { name: displayName }),
      );
      deleteButton.addEventListener("click", () => deleteShiftTemplate(item));
      actions.append(editButton, deleteButton);
    } else {
      const deleteButton = document.createElement("button");
      deleteButton.className = "shift-preset-action delete";
      deleteButton.type = "button";
      deleteButton.textContent = "🗑️";
      deleteButton.setAttribute(
        "aria-label",
        translate("shift.preset.deleteHistoryAria", { name: displayName }),
      );
      deleteButton.addEventListener("click", () => deleteShiftHistory(item));
      actions.appendChild(deleteButton);
    }

    container.append(selectButton, actions);
    return container;
  }

  function renderPresetList(container, items, type, emptyKey) {
    const fragment = document.createDocumentFragment();

    if (items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "shift-preset-empty";
      empty.textContent = translate(emptyKey);
      fragment.appendChild(empty);
    } else {
      items.forEach((item) =>
        fragment.appendChild(createPresetItem(item, type)),
      );
    }

    container.replaceChildren(fragment);
  }

  function renderShiftPresetPanel() {
    updateTemplateControls();
    renderPresetList(
      shiftTemplateList,
      shiftTemplates,
      "template",
      "shift.preset.noTemplates",
    );
    renderPresetList(
      shiftHistoryList,
      shiftHistory,
      "history",
      "shift.preset.noHistory",
    );
  }

  function openTemplateNameModal(content) {
    const template = shiftTemplates.find(
      (item) => item.id === editingTemplateId,
    );
    pendingTemplateContent = content;
    templateNameInput.value = template?.name ?? "";
    templateNameInput.setCustomValidity("");
    templateNameHeading.textContent = translate(
      template === undefined
        ? "shift.preset.nameCreateTitle"
        : "shift.preset.nameEditTitle",
    );
    saveShiftTemplateButton.textContent = translate(
      template === undefined
        ? "shift.preset.saveTemplate"
        : "shift.preset.saveTemplateChanges",
    );
    templateNameModal.hidden = false;
    templateNameHeading.focus({ preventScroll: true });
    templateNameInput.focus();
  }

  function closeTemplateNameModal() {
    pendingTemplateContent = null;
    templateNameForm.reset();
    templateNameInput.setCustomValidity("");
    templateNameModal.hidden = true;
    createShiftTemplateButton.focus();
  }

  async function deleteShiftTemplate(item) {
    if (
      !window.confirm(
        translate("shift.preset.deleteTemplateConfirm", { name: item.name }),
      )
    ) {
      return;
    }

    try {
      await storage.deleteShiftTemplate(item.id);
    } catch (error) {
      setFormMessage(translate("storage.deleteFailed"), "error");
      return;
    }

    const index = shiftTemplates.findIndex((template) => template.id === item.id);
    if (index !== -1) shiftTemplates.splice(index, 1);
    if (editingTemplateId === item.id) clearTemplateEditMode();
    renderShiftPresetPanel();
  }

  async function deleteShiftHistory(item) {
    if (
      !window.confirm(
        translate("shift.preset.deleteHistoryConfirm", {
          name: getShiftDisplayName(item),
        }),
      )
    ) {
      return;
    }

    try {
      await storage.deleteShiftHistory(item.id);
    } catch (error) {
      setFormMessage(translate("storage.deleteFailed"), "error");
      return;
    }

    const index = shiftHistory.findIndex((history) => history.id === item.id);
    if (index !== -1) shiftHistory.splice(index, 1);
    renderShiftPresetPanel();
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
    clearTemplateEditMode();
    closeShiftPresetPanel();
    shiftPresetButton.hidden = false;
    shiftForm.reset();
    renderBreakFields();
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
    clearTemplateEditMode();
    closeShiftPresetPanel();
    shiftPresetButton.hidden = true;
    shiftFormHeading.textContent = translate("shift.form.editTitle");
    shiftSubmitButton.textContent = translate("shift.form.saveChanges");
    cancelEditButton.hidden = false;
    shiftFields.disabled = false;
    shiftForm.elements.namedItem("jobName").value = shift.jobName;
    setBaseTimeInputValue("startTime", shift.startTime);
    setBaseTimeInputValue("endTime", shift.endTime);
    renderBreakFields(
      breakTime.sortBreaksByShiftStart(shift.breaks, shift.startTime),
    );
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
    editButton.textContent = "✏️ " + translate("common.edit");
    editButton.setAttribute(
      "aria-label",
      translate("longBreak.editAria", { name: displayName }),
    );
    editButton.addEventListener("click", () => openLongBreakModal(longBreak.id));

    deleteButton.className = "delete-long-break-button";
    deleteButton.type = "button";
    deleteButton.textContent = "🗑️ " + translate("common.delete");
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

    if (selectedDate === null) return;

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

    const shiftValues = readShiftFormValues();
    if (shiftValues === null) return;
    const wasEditing = editingShiftId !== null;

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
        const historyUpdate = presets.prepareHistoryUpdate(
          shiftHistory,
          shiftValues,
        );
        const savedIds = await storage.addShiftWithHistory(
          createStoredShift(dateKey, shiftValues),
          historyUpdate.record,
          historyUpdate.idsToDelete,
        );
        const deletedHistoryIds = new Set(historyUpdate.idsToDelete);
        const retainedHistory = shiftHistory.filter(
          (item) => !deletedHistoryIds.has(item.id),
        );
        const restoredHistory = restoreStoredShiftPreset(
          { id: savedIds.historyId, ...historyUpdate.record },
          "history",
        );
        shiftHistory.splice(0, shiftHistory.length, restoredHistory, ...retainedHistory);
        shifts.push({
          id: savedIds.shiftId,
          ...shiftValues,
          createdOrder: savedIds.shiftId,
        });
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
      const restoredTemplates = storedData.shiftTemplates.map((record) =>
        restoreStoredShiftPreset(record, "template"),
      );
      const restoredHistory = storedData.shiftHistory.map((record) =>
        restoreStoredShiftPreset(record, "history"),
      );

      if (
        restoredTemplates.length > presets.MAX_TEMPLATES ||
        restoredHistory.length > presets.MAX_HISTORY
      ) {
        throw new Error("Stored shift preset count exceeds its limit.");
      }

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
      shiftTemplates.splice(
        0,
        shiftTemplates.length,
        ...restoredTemplates.sort((left, right) => right.id - left.id),
      );
      shiftHistory.splice(
        0,
        shiftHistory.length,
        ...restoredHistory.sort((left, right) => right.id - left.id),
      );
      renderCalendar();
      renderLongBreakList();
      renderShiftPresetPanel();
    } catch (error) {
      showStorageRecovery();
    }
  }

  renderBreakFields();

  shiftForm.addEventListener(
    "invalid",
    (event) => {
      if (event.target instanceof HTMLInputElement) {
        updateShiftFieldValidity(event.target);
      }
    },
    true,
  );

  shiftForm.addEventListener("input", (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;

    const input = event.target;
    if (input.classList.contains("time-segment-input")) {
      normalizeTimeSegmentInput(input);

      if (input.closest(".break-time-row") !== null) {
        breakListFields
          .querySelectorAll(".time-segment-input")
          .forEach((breakInput) => breakInput.setCustomValidity(""));
      }
      return;
    }

    if (input === hourlyWageInput) input.setCustomValidity("");
  });

  shiftForm.addEventListener("change", (event) => {
    if (event.target instanceof HTMLInputElement) {
      event.target.setCustomValidity("");
    }
  });

  shiftForm.addEventListener("keydown", (event) => {
    const input = event.target;
    if (
      !(input instanceof HTMLInputElement) ||
      !input.classList.contains("time-segment-input") ||
      event.key !== "Backspace" ||
      input.value !== ""
    ) {
      return;
    }

    const timeSegmentInputs = getAllTimeSegmentInputs();
    const currentIndex = timeSegmentInputs.indexOf(input);
    timeSegmentInputs[currentIndex - 1]?.focus();
  });

  shiftPresetButton.addEventListener("click", () => {
    if (editingShiftId !== null) return;
    const willOpen = shiftPresetPanel.hidden;
    shiftPresetPanel.hidden = !willOpen;
    shiftPresetButton.setAttribute("aria-expanded", String(willOpen));
    if (willOpen) renderShiftPresetPanel();
  });

  createShiftTemplateButton.addEventListener("click", () => {
    if (
      editingTemplateId === null &&
      shiftTemplates.length >= presets.MAX_TEMPLATES
    ) {
      return;
    }

    const content = readShiftFormValues();
    if (content !== null) openTemplateNameModal(content);
  });

  cancelTemplateEditButton.addEventListener("click", () => {
    clearTemplateEditMode();
    setFormMessage("");
    renderShiftPresetPanel();
  });

  templateNameInput.addEventListener("input", () => {
    templateNameInput.setCustomValidity("");
  });

  templateNameForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (pendingTemplateContent === null) return;

    const name = templateNameInput.value.trim();
    templateNameInput.setCustomValidity(
      name === "" ? translate("validation.required") : "",
    );
    if (!templateNameForm.reportValidity()) return;

    const content = pendingTemplateContent;
    const existingIndex = shiftTemplates.findIndex(
      (item) => item.id === editingTemplateId,
    );
    if (editingTemplateId !== null && existingIndex === -1) {
      closeTemplateNameModal();
      clearTemplateEditMode();
      renderShiftPresetPanel();
      return;
    }

    saveShiftTemplateButton.disabled = true;
    try {
      if (editingTemplateId === null) {
        const record = createStoredShiftPreset(content, { name });
        const id = await storage.addShiftTemplate(record);
        shiftTemplates.unshift(
          restoreStoredShiftPreset({ id, ...record }, "template"),
        );
      } else {
        const record = createStoredShiftPreset(
          { id: editingTemplateId, ...content },
          { name },
        );
        await storage.updateShiftTemplate(record);
        shiftTemplates[existingIndex] = restoreStoredShiftPreset(
          record,
          "template",
        );
      }
    } catch (error) {
      saveShiftTemplateButton.disabled = false;
      window.alert(translate("storage.saveFailed"));
      return;
    }

    saveShiftTemplateButton.disabled = false;
    closeTemplateNameModal();
    clearTemplateEditMode();
    setFormMessage("");
    renderShiftPresetPanel();
  });

  templateNameBackdrop.addEventListener("click", closeTemplateNameModal);
  cancelTemplateNameButton.addEventListener("click", closeTemplateNameModal);

  addBreakButton.addEventListener("click", addBreakField);
  breakListFields.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const removeButton = event.target.closest(".remove-break-button");
    if (removeButton === null) return;

    const row = removeButton.closest(".break-time-row");
    removeBreakField(Number(row.dataset.breakIndex));
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
    if (event.key === "Escape" && !templateNameModal.hidden) {
      closeTemplateNameModal();
      return;
    }

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
    updateAllBreakRowLabels();
    clearLongBreakFieldValidityMessages();
    renderCalendar();
    renderLongBreakList();
    renderShiftPresetPanel();

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
    if (!templateNameModal.hidden) {
      templateNameHeading.textContent = translate(
        editingTemplateId === null
          ? "shift.preset.nameCreateTitle"
          : "shift.preset.nameEditTitle",
      );
      saveShiftTemplateButton.textContent = translate(
        editingTemplateId === null
          ? "shift.preset.saveTemplate"
          : "shift.preset.saveTemplateChanges",
      );
    }
    setFormMessage("");
    setLongBreakFormMessage("");
  });

  initializeStoredData();
})();
