(() => {
  "use strict";

  const DATABASE_NAME = "shift-check-tool";
  const DATABASE_VERSION = 1;
  const SHIFT_STORE = "shifts";
  const LONG_BREAK_STORE = "longBreaks";
  const SETTINGS_STORE = "settings";
  let databasePromise = null;
  let openDatabaseInstance = null;

  function createStores(database) {
    if (!database.objectStoreNames.contains(SHIFT_STORE)) {
      const shiftStore = database.createObjectStore(SHIFT_STORE, {
        keyPath: "id",
        autoIncrement: true,
      });
      shiftStore.createIndex("date", "date", { unique: false });
    }

    if (!database.objectStoreNames.contains(LONG_BREAK_STORE)) {
      const longBreakStore = database.createObjectStore(LONG_BREAK_STORE, {
        keyPath: "id",
        autoIncrement: true,
      });
      longBreakStore.createIndex("startDate", "startDate", { unique: false });
    }

    if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
      database.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
    }
  }

  function openDatabase() {
    if (databasePromise !== null) return databasePromise;

    databasePromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB is unavailable."));
        return;
      }

      const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.addEventListener("upgradeneeded", () => {
        createStores(request.result);
      });

      request.addEventListener("success", () => {
        openDatabaseInstance = request.result;
        openDatabaseInstance.addEventListener("versionchange", () => {
          openDatabaseInstance?.close();
          openDatabaseInstance = null;
          databasePromise = null;
        });
        resolve(openDatabaseInstance);
      });

      request.addEventListener("error", () => {
        databasePromise = null;
        reject(request.error ?? new Error("Failed to open IndexedDB."));
      });

      request.addEventListener("blocked", () => {
        databasePromise = null;
        reject(new Error("IndexedDB open request was blocked."));
      });
    });

    return databasePromise;
  }

  async function runTransaction(storeNames, mode, operation) {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeNames, mode);
      let result;

      transaction.addEventListener("complete", () => resolve(result));
      transaction.addEventListener("abort", () => {
        reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
      });
      transaction.addEventListener("error", () => {
        reject(transaction.error ?? new Error("IndexedDB transaction failed."));
      });

      try {
        operation(transaction, (value) => {
          result = value;
        });
      } catch (error) {
        transaction.abort();
        reject(error);
      }
    });
  }

  async function loadCalendarData() {
    // ★IndexedDB読み込み失敗テスト（現在はコメントアウト）
    // const testCounterKey = "indexeddb-read-failure-test-count";
    // const failureCount = Number(sessionStorage.getItem(testCounterKey) ?? "0");
    //
    // if (failureCount < 3) {
    //   sessionStorage.setItem(testCounterKey, String(failureCount + 1));
    //   throw new Error("IndexedDB read failure test.");
    // }
    // ★IndexedDB読み込み失敗テストここまで
    return runTransaction(
      [SHIFT_STORE, LONG_BREAK_STORE],
      "readonly",
      (transaction, setResult) => {
        const result = { shifts: [], longBreaks: [] };
        const shiftRequest = transaction.objectStore(SHIFT_STORE).getAll();
        const longBreakRequest = transaction
          .objectStore(LONG_BREAK_STORE)
          .getAll();

        shiftRequest.addEventListener("success", () => {
          result.shifts = shiftRequest.result;
          setResult(result);
        });
        longBreakRequest.addEventListener("success", () => {
          result.longBreaks = longBreakRequest.result;
          setResult(result);
        });
      },
    );
  }

  function addRecord(storeName, record) {
    return runTransaction(storeName, "readwrite", (transaction, setResult) => {
      const request = transaction.objectStore(storeName).add(record);
      request.addEventListener("success", () => setResult(request.result));
    });
  }

  function updateRecord(storeName, record) {
    return runTransaction(storeName, "readwrite", (transaction) => {
      transaction.objectStore(storeName).put(record);
    });
  }

  function deleteRecord(storeName, id) {
    return runTransaction(storeName, "readwrite", (transaction) => {
      transaction.objectStore(storeName).delete(id);
    });
  }

  async function getSetting(key) {
    return runTransaction(SETTINGS_STORE, "readonly", (transaction, setResult) => {
      const request = transaction.objectStore(SETTINGS_STORE).get(key);
      request.addEventListener("success", () => {
        setResult(request.result?.value ?? null);
      });
    });
  }

  function setSetting(key, value) {
    return runTransaction(SETTINGS_STORE, "readwrite", (transaction) => {
      transaction.objectStore(SETTINGS_STORE).put({ key, value });
    });
  }

  function resetDatabase() {
    openDatabaseInstance?.close();
    openDatabaseInstance = null;
    databasePromise = null;

    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB is unavailable."));
        return;
      }

      const request = window.indexedDB.deleteDatabase(DATABASE_NAME);
      request.addEventListener("success", () => resolve());
      request.addEventListener("error", () => {
        reject(request.error ?? new Error("Failed to reset IndexedDB."));
      });
      request.addEventListener("blocked", () => {
        reject(new Error("IndexedDB reset request was blocked."));
      });
    });
  }

  window.ShiftStorage = Object.freeze({
    loadCalendarData,
    addShift: (record) => addRecord(SHIFT_STORE, record),
    updateShift: (record) => updateRecord(SHIFT_STORE, record),
    deleteShift: (id) => deleteRecord(SHIFT_STORE, id),
    addLongBreak: (record) => addRecord(LONG_BREAK_STORE, record),
    updateLongBreak: (record) => updateRecord(LONG_BREAK_STORE, record),
    deleteLongBreak: (id) => deleteRecord(LONG_BREAK_STORE, id),
    getSetting,
    setSetting,
    resetDatabase,
  });
})();
