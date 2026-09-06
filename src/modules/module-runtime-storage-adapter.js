export const MODULE_RUNTIME_STORAGE_ADAPTER_SLOTS = Object.freeze(["storageAdapter"]);

export const MODULE_RUNTIME_STORAGE_ADAPTER_PROOF_SLOTS = Object.freeze([
  "getSaveRaw",
  "removeSaveRaw",
  "setCorruptBackupRaw",
  "setSaveRaw",
]);

export const MODULE_RUNTIME_STORAGE_ADAPTER_LOW_LEVEL_SLOTS = Object.freeze([
  "corruptBackupKey",
  "legacySaveKey",
  "onError",
  "saveKey",
  "storage",
]);

export function createModuleRuntimeStorageAdapter(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const storage = requireObject(resolvedOptions.storage, "options.storage");
  const getItem = requireStorageFunction(storage.getItem, "options.storage.getItem").bind(storage);
  const removeItem = requireStorageFunction(storage.removeItem, "options.storage.removeItem").bind(storage);
  const setItem = requireStorageFunction(storage.setItem, "options.storage.setItem").bind(storage);
  const saveKey = requireString(resolvedOptions.saveKey, "options.saveKey");
  const legacySaveKey = requireString(resolvedOptions.legacySaveKey, "options.legacySaveKey");
  const corruptBackupKey = resolvedOptions.corruptBackupKey || `${saveKey}-corrupt-backup`;
  const onError = resolvedOptions.onError;

  return {
    storageAdapter: {
      getSaveRaw: () =>
        withStorageFallback({ fallback: null, onError, operation: "getSaveRaw" }, () => {
          const currentSave = getItem(saveKey);
          return currentSave || getItem(legacySaveKey);
        }),
      removeSaveRaw: () =>
        withStorageFallback({ fallback: false, onError, operation: "removeSaveRaw" }, () => {
          removeItem(saveKey);
          removeItem(legacySaveKey);
          return true;
        }),
      setCorruptBackupRaw: (value) =>
        withStorageFallback({ fallback: false, onError, operation: "setCorruptBackupRaw" }, () => {
          setItem(corruptBackupKey, String(value));
          return true;
        }),
      setSaveRaw: (value) =>
        withStorageFallback({ fallback: false, onError, operation: "setSaveRaw" }, () => {
          setItem(saveKey, String(value));
          return true;
        }),
    },
  };
}

function withStorageFallback({ fallback, onError, operation }, callback) {
  try {
    return callback();
  } catch (error) {
    if (typeof onError === "function") {
      onError({ error, operation });
    }
    return fallback;
  }
}

function requireStorageFunction(value, name) {
  if (typeof value !== "function") {
    throw new Error(`Missing Tap Survivor module runtime storage adapter: ${name}`);
  }
  return value;
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module runtime storage adapter options: ${name}`);
  }
  return value;
}

function requireString(value, name) {
  if (!value) {
    throw new Error(`Missing Tap Survivor module runtime storage adapter option: ${name}`);
  }
  return value;
}
