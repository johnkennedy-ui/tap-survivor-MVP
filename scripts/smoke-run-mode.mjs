import assert from "node:assert/strict";
import { DEFAULT_RUN_MODE, normalizeRunMode } from "../src/modules/run-mode.js";
import { createGameHarness } from "./smoke-game-harness.mjs";
import { bootProductionModuleEntrypoint } from "../src/app/production-module-entrypoint.js";

assert.equal(DEFAULT_RUN_MODE, "climb");
for (const value of [undefined, null, "", "Farm", "FARM", "unknown", {}, 0, "climb"]) {
  assert.equal(normalizeRunMode(value), "climb");
}
assert.equal(normalizeRunMode("farm"), "farm");
console.log("PASS exact Farm normalization and default Climb");

for (const modeId of ["climb", "farm"]) {
  const h = createGameHarness();
  const button = modeId === "farm" ? "titleStartFarm" : "titleStartGame";
  h.elements.get(button).click();
  const run = h.dependencies.getGame();
  assert.equal(run.modeId, modeId);
  assert.equal(run.running, true);
  assert.equal(run.awaitingFirstMoveInput, true);
  assert.equal(h.elements.get("titleScreen").classList.contains("hidden"), true);
  h.elements.get(button === "titleStartFarm" ? "titleStartGame" : "titleStartFarm").click();
  assert.equal(h.dependencies.getGame(), run);
  const saveBefore = JSON.stringify(h.dependencies.getSave());
  const world = { width: 1920, height: 1080 };
  const reset = h.dependencies.resetGameState({ modeId, world });
  assert.deepEqual(reset.world, world);
  assert.notEqual(reset.world, world);
  world.width = 12;
  assert.equal(reset.world.width, 1920);
  assert.equal(reset.player.x, 960);
  assert.equal(reset.player.y, 540);
  const fallback = h.dependencies.resetGameState({ world: { width: Infinity, height: NaN } });
  assert.equal(fallback.modeId, "climb");
  assert.ok(Number.isFinite(fallback.world.width) && Number.isFinite(fallback.world.height));
  assert.equal(JSON.stringify(h.dependencies.getSave()), saveBefore);
  console.log(`PASS retained ${modeId} title, duplicate guard, runtime-only copied world and reset`);
}

// Reuse platform capabilities, but isolate title listeners from the retained harness.
for (const modeId of ["climb", "farm"]) {
  const h = createGameHarness();
  const buttons = new Map();
  for (const id of ["titleStartGame", "titleStartFarm"]) {
    const listeners = [];
    buttons.set(id, {
      addEventListener(type, fn) { if (type === "click") listeners.push(fn); },
      click() { for (const fn of listeners) fn(); },
    });
  }
  const documentRef = {
    ...h.context.document,
    getElementById(id) { return buttons.get(id) || h.context.document.getElementById(id); },
  };
  const entry = bootProductionModuleEntrypoint({
    globalRef: { ...h.context, document: documentRef },
  });
  buttons.get(modeId === "farm" ? "titleStartFarm" : "titleStartGame").click();
  const run = entry.dependencies.getGame();
  assert.equal(run.modeId, modeId);
  assert.equal(run.awaitingFirstMoveInput, true);
  buttons.get(modeId === "farm" ? "titleStartGame" : "titleStartFarm").click();
  assert.equal(entry.dependencies.getGame(), run);
  entry.persist();
  const saved = JSON.parse(h.context.localStorage.store.get("tap-survivor-mvp-save-v2"));
  for (const key of ["modeId", "world", "camera", "player"]) assert.equal(Object.hasOwn(saved, key), false);
  entry.dispose();
  console.log(`PASS real production ${modeId} title forwarding, duplicate guard and durable save exclusion`);
}
console.log("Run mode smoke passed; larger Climb geometry/camera remains deferred.");
