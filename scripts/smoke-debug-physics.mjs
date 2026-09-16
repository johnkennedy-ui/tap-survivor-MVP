import assert from "node:assert/strict";

import { createGameHarness } from "./smoke-game-harness.mjs";

const inactive = createGameHarness({ search: "" });
assert.equal(Object.hasOwn(inactive.context, "TapSurvivorDebugRuntime"), false);
assert.equal(
  Object.hasOwn(
    createGameHarness({ search: "?debugRuntime=10" }).context,
    "TapSurvivorDebugRuntime"
  ),
  false
);

const harness = createGameHarness({ search: "?debugRuntime=1" });
const api = harness.context.TapSurvivorDebugRuntime;
assert.ok(api);
const catalog = api.catalog().result;
assert.ok(catalog.physics.scenarios.length >= 21);
assert.deepEqual(api.invoke("physics.scenario", { id: "missing" }).error.code, "UNKNOWN_ID");
const mutationControl = api.invoke("physics.scenario", {
  id: "actor-player-enemy-crossing",
}).result;
assert.deepEqual(
  api.invoke("physics.scenario", { id: "actor-player-enemy-crossing", ignored: true }).error.code,
  "MALFORMED_ARGS"
);
assert.deepEqual(
  api.invoke("snapshot", {}).result,
  mutationControl,
  "invalid fixture input is nonmutating"
);
assert.deepEqual(api.invoke("frame.step", { frames: 0 }).error.code, "MALFORMED_ARGS");

for (const id of catalog.physics.scenarios) {
  const setup = api.invoke("physics.scenario", { id });
  assert.equal(setup.ok, true, id);
  assert.equal(setup.result.paused, true, `${id} freezes its run`);
  assert.ok(setup.result.enemies.length >= 1, `${id} has real fixture actors`);
  const before = api.invoke("snapshot", {});
  assert.equal(before.ok, true);
  assert.equal(Object.isFrozen(before.result), true);
  assert.equal(Object.isFrozen(before.result.world), true);
  assert.equal(Object.isFrozen(before.result.bounds), true);
  assert.equal(Object.isFrozen(before.result.scenario), true);
  assert.equal(Object.isFrozen(before.result.scenario.parameters), true);
  assert.equal(Object.isFrozen(before.result.enemies), true);
  assert.equal(Object.isFrozen(before.result.player), true);
  assert.equal(before.result.player.valid, true);
  const stepped = api.invoke("frame.step", {
    frames: id === "mine-triggered" ? 21 : 2,
    dt: id === "mine-triggered" ? 0.1 : 1 / 60,
  });
  assert.equal(stepped.ok, true, `${id} step`);
  assert.equal(stepped.result.paused, true, `${id} restores freeze`);
  assert.ok(Array.isArray(stepped.result.enemies));
}
const transition = (id, frames = 2, dt = 1 / 60) => {
  const before = api.invoke("physics.scenario", { id }).result;
  const after = api.invoke("frame.step", { frames, dt }).result;
  return { before, after };
};
const distance = (first, second) => Math.hypot(first.x - second.x, first.y - second.y);
const separation = (first, second) => first.radius + second.radius;
const maxOverlap = (actors) =>
  actors.reduce(
    (maximum, first, index) =>
      Math.max(
        maximum,
        ...actors
          .slice(index + 1)
          .map((second) => Math.max(0, separation(first, second) - distance(first, second)))
      ),
    0
  );
for (const id of ["actor-crowd-feasible", "actor-crowd-overfull"]) {
  const { before, after } = transition(id);
  assert.ok(
    after.enemies.every((enemy) => enemy.valid),
    `${id} remains finite`
  );
  assert.ok(
    after.enemies.some((enemy) => {
      const prior = before.enemies.find((candidate) => candidate.id === enemy.id);
      return prior && (enemy.x !== prior.x || enemy.y !== prior.y);
    }),
    `${id} reaches the collision resolver`
  );
}
{
  const { before, after } = transition("actor-player-enemy-crossing", 1, 0.1);
  const enemyBefore = before.enemies[0];
  const enemyAfter = after.enemies[0];
  assert.ok(
    distance(before.player, enemyBefore) > separation(before.player, enemyBefore),
    "player/enemy starts separated"
  );
  assert.ok(
    before.player.x < enemyBefore.x && after.player.x < enemyAfter.x,
    "player/enemy contact does not reverse sides"
  );
  assert.ok(
    distance(after.player, enemyAfter) >= separation(after.player, enemyAfter) - 0.001,
    "player/enemy moving contact resolves"
  );
}
{
  const { before, after } = transition("actor-enemy-enemy-crossing", 1, 0.1);
  assert.ok(
    distance(before.enemies[0], before.enemies[1]) >
      separation(before.enemies[0], before.enemies[1]),
    "enemies start separated"
  );
  assert.ok(before.enemies[0].x < before.enemies[1].x, "enemies approach from distinct sides");
  assert.ok(after.enemies[0].x < after.enemies[1].x, "enemy/enemy crossing remains non-tunneling");
  assert.ok(
    distance(after.enemies[0], after.enemies[1]) >=
      separation(after.enemies[0], after.enemies[1]) - 0.001,
    "enemy/enemy sweep resolves"
  );
}
{
  const { before, after } = transition("actor-highspeed", 1, 0.1);
  const enemyBefore = before.enemies[0];
  const enemyAfter = after.enemies[0];
  assert.ok(
    distance(before.player, enemyBefore) > separation(before.player, enemyBefore),
    "highspeed actors start separated"
  );
  assert.ok(
    before.player.x + before.scenario.parameters.attemptedTravel >
      enemyBefore.x + separation(before.player, enemyBefore),
    "highspeed fixture attempts to pass completely through the enemy"
  );
  assert.ok(after.player.x < enemyAfter.x, "highspeed sweep preserves approached sides");
  assert.ok(
    distance(after.player, enemyAfter) >= separation(after.player, enemyAfter) - 0.001,
    "highspeed sweep resolves without tunneling"
  );
}
{
  const { before, after } = transition("actor-crowd-overfull", 2, 0.1);
  const parameters = before.scenario.parameters;
  assert.equal(before.world.width, 64, "overfull crowd uses its observed small arena");
  assert.ok(
    parameters.minimumDiscArea > parameters.arenaArea,
    "overfull crowd is quantitatively impossible even before packing loss"
  );
  assert.ok(
    [after.player, ...after.enemies].every((actor) => actor.valid),
    "impossible crowd remains finite"
  );
  assert.ok(
    maxOverlap([after.player, ...after.enemies]) > 0,
    "impossible crowd honestly retains overlap"
  );
}
for (const id of ["actor-wall-left", "actor-wall-right", "actor-wall-top", "actor-wall-bottom"]) {
  const { after } = transition(id);
  assert.ok(
    after.player.x >= after.player.radius && after.player.y >= after.player.radius,
    `${id} clamps the player in bounds`
  );
}
{
  const { before, after } = transition("projectile-explosive-hit");
  assert.ok(
    after.enemies.some((enemy, index) => enemy.hp < before.enemies[index].hp),
    "projectile damages through its real upgrade path"
  );
  assert.ok(
    after.areas.some((area) => area.visualOnly),
    "projectile produces real explosion visual"
  );
}
{
  const { before, after } = transition("target-area-triggered");
  assert.ok(
    distance(before.player, before.enemies[0]) <=
      before.scenario.parameters.radius + before.player.radius,
    "target area includes its player fixture"
  );
  assert.ok(
    distance(before.enemies[0], before.enemies[1]) <=
      before.scenario.parameters.radius + before.enemies[1].radius,
    "target area includes its near enemy fixture"
  );
  assert.ok(
    distance(before.enemies[0], before.enemies[2]) >
      before.scenario.parameters.radius + before.enemies[2].radius,
    "target area excludes its far enemy fixture"
  );
  assert.ok(
    after.enemies[0].hp < before.enemies[0].hp && after.enemies[1].hp < before.enemies[1].hp,
    "target area damages in-range enemies through its weapon owner"
  );
  assert.equal(
    after.enemies[2].hp,
    before.enemies[2].hp,
    "target area preserves the out-of-range enemy"
  );
}
{
  const { before, after } = transition("control-lingering-area");
  assert.ok(
    after.enemies.some((enemy, index) => enemy.hp < before.enemies[index].hp),
    "lingering area is a nonexplosive control"
  );
}
{
  const before = api.invoke("physics.scenario", { id: "mine-triggered" }).result;
  assert.equal(before.areas.length, 1, "mine fixture is owner-fired exactly once before stepping");
  const arming = api.invoke("frame.step", { frames: 19, dt: 0.1 }).result;
  assert.equal(arming.areas.length, 1, "mine remains a single area while arming");
  assert.ok(
    arming.areas[0].armDelay > 0 && !arming.areas[0].exploded,
    "mine has not exploded before its arm delay"
  );
  const explosion = api.invoke("frame.step", { frames: 1, dt: 0.1 }).result;
  assert.equal(explosion.areas.length, 1, "mine explosion stays a single lifetime object");
  assert.ok(explosion.areas[0].exploded, "mine exposes its once-only transition");
  assert.ok(
    explosion.enemies[0].hp < before.enemies[0].hp,
    "mine damages its in-range enemy after arming"
  );
  assert.equal(
    explosion.enemies[1].hp,
    before.enemies[1].hp,
    "mine preserves its out-of-range enemy"
  );
  const expired = api.invoke("frame.step", { frames: 4, dt: 0.1 }).result;
  assert.equal(expired.areas.length, 0, "single mine expires without a cooldown refire");
}
{
  const before = api.invoke("physics.scenario", { id: "climb-wall-knockback" }).result;
  assert.equal(before.world.modeId, "climb", "Climb fixture preserves the reset world descriptor");
  assert.equal(
    before.walls.length,
    12,
    "Climb fixture exposes cached renderer-visible maze geometry"
  );
  const parameters = before.scenario.parameters;
  assert.ok(Object.isFrozen(parameters.blastCenter), "blast center is immutable scenario metadata");
  assert.equal(before.bossAttacks.length, 1, "knockback uses one existing boss blast owner");
  assert.equal(before.player.hp, 100, "blast player begins with survivable observed HP");
  assert.equal(before.enemies[0].hp, 100, "blast near witness begins with survivable observed HP");
  assert.ok(
    distance(before.player, before.enemies[0]) >=
      separation(before.player, before.enemies[0]) + 4.9,
    "blast witnesses begin separated"
  );
  const prearmed = api.invoke("frame.step", parameters.prearmed).result;
  assert.equal(prearmed.bossAttacks.length, 1, "blast remains present before its impact windup");
  assert.equal(
    prearmed.bossAttacks[0].hit,
    false,
    "blast is prearmed rather than synthetic knockback"
  );
  assert.equal(prearmed.player.hp, before.player.hp, "prearmed blast has no early player damage");
  assert.equal(
    prearmed.enemies[0].hp,
    before.enemies[0].hp,
    "prearmed blast has no early enemy damage"
  );
  assert.equal(prearmed.player.x, before.player.x, "prearmed separated actors retain position");
  const impact = api.invoke("frame.step", parameters.impact).result;
  assert.equal(impact.bossAttacks[0].hit, true, "blast reaches its real impact lifecycle");
  assert.ok(
    impact.player.hp < before.player.hp && impact.enemies[0].hp < before.enemies[0].hp,
    "owner blast damages player and nearby enemy"
  );
  assert.ok(
    impact.player.x > before.player.x || impact.player.y !== before.player.y,
    "player receives real blast displacement"
  );
  assert.ok(
    impact.enemies[0].x > before.enemies[0].x || impact.enemies[0].y !== before.enemies[0].y,
    "enemy receives real blast displacement"
  );
  const wall = before.walls[0];
  assert.ok(
    impact.player.x <= wall.x - impact.player.radius + 0.001,
    "blast displacement is limited at the wall face"
  );
  assert.ok(
    impact.player.x >= wall.x - impact.player.radius - parameters.wallClearance - 0.01,
    "blast reaches the near wall face"
  );
  assert.equal(impact.enemies[1].hp, before.enemies[1].hp, "far blast witness remains undamaged");
  const expired = api.invoke("frame.step", parameters.expired).result;
  assert.equal(expired.bossAttacks.length, 0, "blast expires through its existing owner lifecycle");
  assert.equal(expired.player.hp, impact.player.hp, "expired blast cannot repeat player damage");
  assert.equal(
    expired.enemies[0].hp,
    impact.enemies[0].hp,
    "expired blast cannot repeat enemy damage"
  );
}
{
  const before = api.invoke("physics.scenario", { id: "climb-wall-touch-immunity" }).result;
  const parameters = before.scenario.parameters;
  assert.equal(
    parameters.rapidTouchCooldown,
    0,
    "fixture deliberately removes enemy touch cooldown for immunity stress"
  );
  assert.ok(
    distance(before.player, before.enemies[0]) >=
      separation(before.player, before.enemies[0]) + 0.99,
    "chaser starts separated"
  );
  const first = api.invoke("frame.step", parameters.firstHit).result;
  assert.ok(first.player.hp < before.player.hp, "real chaser contact causes first damage");
  assert.ok(
    first.playerTimers.hitInvincibilityTimer > 0.48,
    "first contact starts the half-second timer"
  );
  const immune = api.invoke("frame.step", parameters.immuneWindow).result;
  assert.equal(
    immune.player.hp,
    first.player.hp,
    "continued contact cannot damage during the sub-0.5s window"
  );
  const second = api.invoke("frame.step", parameters.postExpiry).result;
  assert.ok(
    second.player.hp < immune.player.hp,
    "continued real contact damages again after expiry"
  );
}
for (const id of [
  "boss-radial-blast",
  "protection-mitigation",
  "protection-teleport",
  "control-boss-slash",
]) {
  const { before, after } = transition(id);
  assert.ok(after.player.hp < before.player.hp, `${id} reaches the player damage owner`);
}
{
  // Force the heart-drop stream that previously masked damage on frame two.
  // Also retain a saved dodge relic: the fixture's neutral protection profile
  // must reach the real damage owner and preserve exactly the mitigated loss.
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    const savedDodgeHarness = createGameHarness({
      search: "?debugRuntime=1",
      initialSave: {
        towerFloor: 20,
        coins: 0,
        shopPurchases: {},
        unlockedWeapons: ["spark_bolt"],
        unlockedRelics: ["wall_bounce_focus_relic"],
        equippedRelics: ["wall_bounce_focus_relic"],
      },
    });
    const savedDodgeApi = savedDodgeHarness.context.TapSurvivorDebugRuntime;
    const before = savedDodgeApi.invoke("physics.scenario", { id: "protection-mitigation" }).result;
    const after = savedDodgeApi.invoke("frame.step", { frames: 2, dt: 1 / 60 }).result;
    assert.equal(
      before.player.hp - after.player.hp,
      10,
      "mitigation fixture overrides saved dodge under the controlled dodge stream"
    );
  } finally {
    Math.random = originalRandom;
  }
}
{
  const { before, after } = transition("protection-invulnerability");
  assert.equal(after.player.hp, before.player.hp, "invulnerability prevents real damage");
}
{
  const { before, after } = transition("protection-dodge");
  assert.equal(after.player.hp, before.player.hp, "dodge uses the real damage owner");
  assert.ok(after.playerTimers.blink > 0, "dodge exposes blink state");
}
{
  const { before, after } = transition("relic-kill-explosion");
  assert.ok(
    after.enemies.some(
      (enemy) => enemy.hp < before.enemies.find((prior) => prior.id === enemy.id).hp
    ),
    "relic kill blast damages a second actor"
  );
}
{
  const { after } = transition("protection-death");
  assert.equal(after.running, false, "terminal player death is observable");
}
console.log("PASS debug physics harness smoke");
