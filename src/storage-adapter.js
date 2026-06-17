(() => {
  function createStorageAdapter({
    saveKey,
    legacySaveKey,
    corruptBackupKey = `${saveKey}-corrupt-backup`,
  }) {
    let backendName = "unavailable";
    let lastStorageError = null;

    function rememberError(operation, error) {
      lastStorageError = {
        operation,
        message: error?.message || String(error),
      };
      if (typeof console?.warn === "function") {
        console.warn(
          `Save storage ${operation} failed; falling back where possible.`,
          error,
        );
      }
    }

    function preferencesPlugin() {
      return globalThis.Capacitor?.Plugins?.Preferences || null;
    }

    function browserStorage() {
      return globalThis.localStorage || null;
    }

    async function getFromPreferences(plugin, key) {
      const result = await plugin.get({ key });
      return result?.value ?? null;
    }

    function getSaveRawFromLocalStorage() {
      const storage = browserStorage();

      if (!storage?.getItem) {
        backendName = "unavailable";
        return null;
      }

      try {
        backendName = "localStorage";
        return (
          storage.getItem(saveKey) ||
          storage.getItem(legacySaveKey)
        );
      } catch (error) {
        rememberError("localStorage-get", error);
        backendName = "unavailable";
        return null;
      }
    }

    function setSaveRawToLocalStorage(value) {
      const storage = browserStorage();

      if (!storage?.setItem) {
        backendName = "unavailable";
        return false;
      }

      try {
        backendName = "localStorage";
        storage.setItem(saveKey, value);
        return true;
      } catch (error) {
        rememberError("localStorage-set", error);
        backendName = "unavailable";
        return false;
      }
    }

    function removeSaveRawFromLocalStorage(removed = false) {
      const storage = browserStorage();

      if (!storage?.removeItem) {
        return removed;
      }

      try {
        if (!removed) {
          backendName = "localStorage";
        }

        storage.removeItem(saveKey);
        storage.removeItem(legacySaveKey);

        return true;
      } catch (error) {
        rememberError("localStorage-remove", error);

        if (!removed) {
          backendName = "unavailable";
        }

        return removed;
      }
    }

    function getSaveRaw() {
      const preferences = preferencesPlugin();
      if (preferences?.get) {
        return Promise.resolve()
          .then(async () => {
            backendName = "capacitor-preferences";
            const currentSave = await getFromPreferences(preferences, saveKey);
            const legacySave = currentSave
              ? currentSave
              : await getFromPreferences(preferences, legacySaveKey);

            return legacySave;
          })
          .catch((error) => {
            rememberError("preferences-get", error);
            return getSaveRawFromLocalStorage();
          });
      }

      return getSaveRawFromLocalStorage();
    }

    function setSaveRaw(value) {
      const preferences = preferencesPlugin();
      if (preferences?.set) {
        return Promise.resolve()
          .then(async () => {
            backendName = "capacitor-preferences";
            await preferences.set({ key: saveKey, value });
            return true;
          })
          .catch((error) => {
            rememberError("preferences-set", error);
            return setSaveRawToLocalStorage(value);
          });
      }

      return setSaveRawToLocalStorage(value);
    }

    function setCorruptBackupRaw(value) {
      const preferences = preferencesPlugin();
      if (preferences?.set) {
        return Promise.resolve()
          .then(async () => {
            backendName = "capacitor-preferences";
            await preferences.set({ key: corruptBackupKey, value });
            return true;
          })
          .catch((error) => {
            rememberError("preferences-backup-set", error);
            return setRawToLocalStorageKey(corruptBackupKey, value);
          });
      }

      return setRawToLocalStorageKey(corruptBackupKey, value);
    }

    function setRawToLocalStorageKey(key, value) {
      const storage = browserStorage();

      if (!storage?.setItem) {
        backendName = "unavailable";
        return false;
      }

      try {
        backendName = "localStorage";
        storage.setItem(key, value);
        return true;
      } catch (error) {
        rememberError("localStorage-backup-set", error);
        backendName = "unavailable";
        return false;
      }
    }

    function removeSaveRaw() {
      const preferences = preferencesPlugin();
      if (preferences?.remove) {
        return Promise.resolve()
          .then(async () => {
            backendName = "capacitor-preferences";
            await preferences.remove({ key: saveKey });
            await preferences.remove({ key: legacySaveKey });
            removeSaveRawFromLocalStorage(true);
            return true;
          })
          .catch((error) => {
            rememberError("preferences-remove", error);
            return removeSaveRawFromLocalStorage(false);
          });
      }

      return removeSaveRawFromLocalStorage(false);
    }

    function getStorageBackendName() {
      return backendName;
    }

    function getLastStorageError() {
      return lastStorageError;
    }

    return {
      getLastStorageError,
      getSaveRaw,
      getStorageBackendName,
      removeSaveRaw,
      setCorruptBackupRaw,
      setSaveRaw,
    };
  }

  globalThis.TapSurvivorStorage = {
    createStorageAdapter,
  };
})();
