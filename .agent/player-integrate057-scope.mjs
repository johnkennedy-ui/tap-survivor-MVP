import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { content } from "../src/content.generated.mjs";

const base = "c95e0088fef896b2977ee2abdc35a0a91bdca5b4";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trimEnd();
const oldText = (path) => git("show", `${base}:${path}`);
const currentText = (path) => readFileSync(path, "utf8").trimEnd();
const hash = (value) => createHash("sha256").update(value).digest("hex");
const files = [
  ...new Set([
    ...git("diff", "--name-only", base, "--").split("\n"),
    ...git("ls-files", "--others", "--exclude-standard").split("\n"),
  ]),
]
  .filter(Boolean)
  .sort();
const allowed = new Set([
  ".agent/player-integrate057-scope.mjs",
  ".agent/evidence/20260907T211305Z_player-integrate057/result.md",
  "assets/generated/tower/directional-v2/player-move-8way-v2.png",
  "assets/generated/tower/directional-v2/README-player-move.md",
  "content/registry/assets.json",
  "content/tap-survivor-content.json",
  "src/content.generated.mjs",
  "src/game-dependencies.js",
  "src/run-state.js",
  "src/run-update.js",
  "src/modules/run-state.js",
  "src/modules/run-update.js",
  "src/modules/module-game-lifecycle.js",
  "package.json",
  "scripts/smoke-eight-way-rendering.mjs",
  "scripts/smoke-player-eight-way.mjs",
  "scripts/fixtures/player-eight-way.json",
  "scripts/fixtures/player-move.sha256",
  "docs/qa/player-eight-way-final.md",
]);
for (const path of files) assert.ok(allowed.has(path), `out-of-scope change: ${path}`);
for (const path of ["content/registry/assets.json", "content/tap-survivor-content.json"]) {
  const before = JSON.parse(oldText(path));
  const after = JSON.parse(currentText(path));
  delete before.assets.sprites.spriteSheets.directional_player;
  delete after.assets.sprites.spriteSheets.directional_player;
  assert.deepEqual(after, before, `${path}: all nonplayer content must match base`);
}
assert.deepEqual(content, JSON.parse(currentText("content/tap-survivor-content.json")));
const additions = {
  "src/modules/run-state.js":
    "      facingX: 0,\n      facingY: 1,\n      moving: false,\n      animTime: 0,\n",
  "src/modules/run-update.js":
    "    // Presentation only: idle rests on frame zero without changing the last heading.\n    player.animTime = player.moving ? (player.animTime || 0) + dt : 0;\n",
  "src/modules/module-game-lifecycle.js":
    "  // Match the run updater's presentation clock when that provider is absent.\n  player.animTime = player.moving ? (player.animTime || 0) + delta : 0;\n",
};
for (const [path, addition] of Object.entries(additions)) {
  assert.equal(
    currentText(path).replace(addition, ""),
    oldText(path),
    `${path}: presentation-only exact source delta`
  );
}
const testPath = "scripts/smoke-eight-way-rendering.mjs";
const stripMappingCheck = (text) =>
  text.replace(
    /function verifyRegistryMappings\(\) \{[\s\S]*?(?=function verifyNativeEnemyRendering)/,
    ""
  );
assert.equal(
  stripMappingCheck(currentText(testPath)),
  stripMappingCheck(oldText(testPath)),
  "all maintained coverage outside registry mappings is byte-identical"
);
const beforePackage = JSON.parse(oldText("package.json"));
const afterPackage = JSON.parse(currentText("package.json"));
assert.equal(
  afterPackage.scripts.test,
  `${beforePackage.scripts.test} && npm run smoke:player-eight-way`
);
assert.equal(
  afterPackage.scripts["smoke:player-eight-way"],
  "node scripts/smoke-player-eight-way.mjs"
);
afterPackage.scripts.test = beforePackage.scripts.test;
delete afterPackage.scripts["smoke:player-eight-way"];
assert.deepEqual(afterPackage, beforePackage);
const assetPath = "assets/generated/tower/directional-v2/player-move-8way-v2.png";
assert.equal(
  hash(readFileSync(assetPath)),
  "d25a8e5f1ee5f38cdf61fa15d5390e772ca575e8444304c68513a55f1da7f26e"
);
assert.equal(
  hash(readFileSync("package-lock.json")),
  hash(execFileSync("git", ["show", `${base}:package-lock.json`]))
);
console.log(
  JSON.stringify(
    {
      base,
      branch: git("branch", "--show-current"),
      files,
      file_sha256: Object.fromEntries(files.map((path) => [path, hash(readFileSync(path))])),
      previous_evidence_sha256: hash(
        readFileSync(".agent/evidence/20260907T202229Z_player-integrate056-scope-blocker/result.md")
      ),
      assertions: [
        "exact allowed scope",
        "all nonplayer registry/assembled content unchanged",
        "generated ESM equals mirror",
        "only 8 lines of player presentation runtime additions",
        "maintained nonregistry tests byte-identical",
        "npm test retained and extended only",
        "exact PASS055 PNG",
        "lockfile unchanged",
      ],
    },
    null,
    2
  )
);
