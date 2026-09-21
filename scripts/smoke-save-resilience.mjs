import {
  composeRuntime,
  composeSaveSubsystem,
  createBrowserPlatform,
} from "../src/app/compose-runtime.js";
import { createStorageProvider } from "../src/modules/storage-adapter.js";

const saveKey = "tap-survivor-mvp-save-v2";
const legacySaveKey = "tap-survivor-mvp-save-v1";
const backupKey = `${saveKey}-corrupt-backup`;
const saveOptions = {
  saveKey,
  legacySaveKey,
  starterQuestIds: ["starter"],
  questDefs: { starter: {} },
  weaponUnlocks: [],
  upgradeDefs: [],
  shopItemDefs: [],
  questOpenIds: () => [],
};

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

function createMemoryAdapter(values = new Map(), options = {}) {
  return {
    getSaveRaw() {
      if (options.readThrows) throw new Error("read denied");
      const raw = values.get(saveKey) ?? values.get(legacySaveKey) ?? null;
      return options.asyncRead ? Promise.resolve(raw) : raw;
    },
    removeSaveRaw() {
      values.delete(saveKey);
      values.delete(legacySaveKey);
      return true;
    },
    setCorruptBackupRaw(value) {
      values.set(backupKey, value);
      return true;
    },
    setSaveRaw(value) {
      if (options.writeThrows) throw new Error("quota exceeded");
      values.set(saveKey, value);
      return true;
    },
  };
}

function createSave(raw, options) {
  const values = new Map();
  if (raw !== undefined && raw !== null) values.set(saveKey, raw);
  const adapter = createMemoryAdapter(values, options);
  return {
    adapter,
    save: composeSaveSubsystem({ ...saveOptions, storageAdapter: adapter }),
    values,
  };
}

const validCurrent = JSON.stringify({ saveVersion: 4, coins: 9, activeQuests: ["starter"] });
const hostileCorpus = [
  "",
  "{",
  '{"coins":',
  "null",
  "true",
  "42",
  '"not-an-object"',
  "[]",
  '{"saveVersion":4}',
  '{"saveVersion":4,"extra":{"nested":[null,{"x":true}]}}',
  '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}',
  '{"coins":"Infinity","activeQuests":{},"questProgress":[],"unlockedWeapons":"x"}',
  '{"payload":"<script>globalThis.executed=true</script>","saveVersion":4}',
];

// Fixed-seed structural mutations: bounded, reproducible, and independent of
// timers, Math.random, or real user storage.
let seed = 0x5a17c0de;
const strangeValues = [
  null,
  false,
  7,
  -1,
  "",
  "<img src=x onerror=globalThis.executed=true>",
  [],
  {},
  [null, {}, "__proto__"],
];
const fields = [
  "coins",
  "activeQuests",
  "questProgress",
  "unlockedWeapons",
  "equippedRelics",
  "shopPurchases",
  "seenBanners",
];
for (let index = 0; index < 96; index += 1) {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  const value = {
    saveVersion: 4,
    [fields[index % fields.length]]: strangeValues[seed % strangeValues.length],
  };
  const raw = JSON.stringify(value);
  hostileCorpus.push(index % 4 === 0 ? raw.slice(0, -1) : raw);
}

for (const raw of hostileCorpus) {
  const { save } = createSave(raw);
  try {
    const loaded = await save.loadSave();
    check(
      `resilience corpus survives ${JSON.stringify(raw).slice(0, 30)}`,
      loaded.saveVersion === 4
    );
  } catch {
    check(`resilience corpus survives ${JSON.stringify(raw).slice(0, 30)}`, false);
  }
}
check(
  "resilience corpus never executes persisted text or pollutes Object.prototype",
  globalThis.polluted === undefined &&
    globalThis.executed === undefined &&
    Object.prototype.polluted === undefined
);

const current = createSave(validCurrent);
check("resilience valid current save loads", (await current.save.loadSave()).coins === 9);
const empty = createSave("");
check(
  "resilience empty save defaults",
  (await empty.save.loadSave()).activeQuests.includes("starter")
);
const legacy = createSave(undefined);
legacy.values.set(legacySaveKey, JSON.stringify({ coins: 3 }));
check("resilience legacy save loads", (await legacy.save.loadSave()).coins === 3);
const corrupt = createSave("{");
const corruptLoaded = await corrupt.save.loadSave();
check(
  "resilience corrupt primary backs up and defaults",
  corruptLoaded.coins === 0 && corrupt.values.get(backupKey) === "{"
);
const readFailure = createSave(undefined, { readThrows: true });
check(
  "resilience read failure defaults",
  (await readFailure.save.loadSave()).coins === 0 &&
    readFailure.save.getLastLoadWarning() === "storage-read-failed"
);
const writeFailure = createSave(validCurrent, { writeThrows: true });
try {
  await writeFailure.save.persist(await writeFailure.save.loadSave());
  check("resilience write and quota failures are observable", false);
} catch {
  check("resilience write and quota failures are observable", true);
}
const reset = createSave(validCurrent);
reset.values.set(legacySaveKey, validCurrent);
await reset.save.removeSave();
check(
  "resilience reset removes current and legacy keys",
  !reset.values.has(saveKey) && !reset.values.has(legacySaveKey)
);
const roundTrip = createSave(validCurrent);
const before = await roundTrip.save.loadSave();
await roundTrip.save.persist(before);
const after = await roundTrip.save.loadSave();
check(
  "resilience load-save-load preserves normalized invariants",
  after.saveVersion === 4 && after.coins === before.coins && after.activeQuests.includes("starter")
);

const noop = () => {};
const quotaError = Object.assign(new Error("Synthetic quota limit"), {
  name: "QuotaExceededError",
});
const quotaBackend = {
  getItem: () => validCurrent,
  setItem: () => {
    throw quotaError;
  },
  removeItem: noop,
};
const quotaAdapter = createStorageProvider({
  platformCapabilities: { getLocalStorage: () => quotaBackend },
}).createStorageAdapter({ saveKey, legacySaveKey });
const quotaSave = composeSaveSubsystem({ ...saveOptions, storageAdapter: quotaAdapter });
check(
  "resilience real storage adapter contains quota failure without throwing",
  (await quotaSave.persist(await quotaSave.loadSave())) === false &&
    quotaAdapter.getLastStorageError()?.operation === "localStorage-set"
);

const rejectedPreferences = {
  get: async () => {
    throw new Error("Synthetic Preferences rejection");
  },
  set: async () => {
    throw new Error("Synthetic Preferences rejection");
  },
  remove: async () => {
    throw new Error("Synthetic Preferences rejection");
  },
};
const fallbackValues = new Map([[saveKey, validCurrent]]);
const fallbackBackend = {
  getItem: (key) => fallbackValues.get(key) ?? null,
  setItem: (key, value) => fallbackValues.set(key, value),
  removeItem: (key) => fallbackValues.delete(key),
};
const fallbackAdapter = createStorageProvider({
  platformCapabilities: {
    getLocalStorage: () => fallbackBackend,
    getPreferences: () => rejectedPreferences,
  },
}).createStorageAdapter({ saveKey, legacySaveKey });
const fallbackSave = composeSaveSubsystem({ ...saveOptions, storageAdapter: fallbackAdapter });
check(
  "resilience rejected Preferences read and write fall back",
  (await fallbackSave.loadSave()).coins === 9 &&
    (await fallbackSave.persist(await fallbackSave.loadSave()))
);

async function assertBootstrap(raw, asyncRead) {
  const documentRef = { body: { dataset: {} }, addEventListener() {}, visibilityState: "visible" };
  let loadedSave;
  let frames = 0;
  let renders = 0;
  let resolveFrame;
  const firstFrame = new Promise((resolve) => {
    resolveFrame = resolve;
  });
  const globalRef = {
    addEventListener() {},
    document: documentRef,
    requestAnimationFrame() {
      frames += 1;
      resolveFrame();
      return 1;
    },
  };
  const platform = createBrowserPlatform({ globalRef, documentRef });
  const bootSave = createSave(raw, { asyncRead }).save;
  const runtime = composeRuntime({
    platform,
    dependencies: {
      canvas: {},
      ui: { speedButtons: [], levelUp: { classList: { add: noop } } },
      getGame: () => null,
      setGame: noop,
      getSave: () => loadedSave,
      setSave: (save) => {
        loadedSave = save;
      },
      saveSystem: bootSave,
      shellUi: { bind: noop, closeRunMenu: noop, showTitleScreen: noop },
      shopSystem: { closeShop: noop },
      runUi: { updateRunHud: noop, hideEndScreen: noop },
      debugSystem: { bind: noop },
      spriteSystem: { loadSprites: noop },
      bannerSystem: { hideMovementGateBanner: noop },
      bindMovementInput: noop,
      persist: noop,
      renderMeta: () => {
        renders += 1;
      },
      loop: noop,
    },
  });
  runtime.initializeRuntime();
  let deadline;
  try {
    await Promise.race([
      firstFrame,
      new Promise((_, reject) => {
        deadline = setTimeout(() => reject(new Error("Bootstrap did not reach first frame")), 1000);
      }),
    ]);
    check(
      `resilience ${asyncRead ? "async" : "sync"} bootstrap completes after load`,
      loadedSave?.saveVersion === 4 &&
        frames === 1 &&
        renders === 1 &&
        globalThis.executed === undefined &&
        Object.prototype.polluted === undefined
    );
  } finally {
    clearTimeout(deadline);
  }
}

for (const raw of hostileCorpus) {
  await assertBootstrap(raw, false);
  await assertBootstrap(raw, true);
}
check(
  "resilience deterministic corpus covers sync and async bootstrap",
  hostileCorpus.length === 109
);
