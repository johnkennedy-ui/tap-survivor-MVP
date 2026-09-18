import {
  composeRuntime,
  composeSaveSubsystem,
  createBrowserPlatform,
} from "../src/app/compose-runtime.js";

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
      return values.get(saveKey) ?? values.get(legacySaveKey) ?? null;
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
check("resilience corpus never executes persisted text", globalThis.polluted === undefined);

const current = createSave(validCurrent);
check("resilience valid current save loads", (await current.save.loadSave()).coins === 9);
const empty = createSave(null);
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

const documentRef = { body: { dataset: {} }, addEventListener() {}, visibilityState: "visible" };
const globalRef = {
  addEventListener() {},
  document: documentRef,
  requestAnimationFrame() {
    return 1;
  },
};
const platform = createBrowserPlatform({ globalRef, documentRef });
const bootSave = createSave('{"payload":"<script>throw new Error()</script>"}').save;
const noop = () => {};
const runtime = composeRuntime({
  platform,
  dependencies: {
    canvas: {},
    ui: { speedButtons: [], levelUp: { classList: { add: noop } } },
    getGame: () => null,
    setGame: noop,
    getSave: () => bootSave.defaultSave(),
    setSave: noop,
    saveSystem: bootSave,
    shellUi: { bind: noop, closeRunMenu: noop, showTitleScreen: noop },
    shopSystem: { closeShop: noop },
    runUi: { updateRunHud: noop, hideEndScreen: noop },
    debugSystem: { bind: noop },
    spriteSystem: { loadSprites: noop },
    bannerSystem: { hideMovementGateBanner: noop },
    bindMovementInput: noop,
    persist: noop,
    renderMeta: noop,
    loop: noop,
  },
});
runtime.initializeRuntime();
check(
  "resilience injected platform bootstrap survives hostile save without execution",
  globalThis.executed === undefined
);
