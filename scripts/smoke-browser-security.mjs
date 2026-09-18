import { createBrowserSpriteSystem } from "../src/app/browser-sprite-system.js";
import { createAssetResolver } from "../src/modules/assets.js";
import { createRunUi } from "../src/modules/run-ui.js";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

const hostilePaths = [
  "https://example.invalid/sprite.png",
  "//example.invalid/sprite.png",
  "javascript:alert(1)",
  "data:image/png;base64,AAAA",
  "blob:example",
  "assets/../outside.png",
  "assets/%2e%2e/outside.png",
  "assets/%2e%2e%2foutside.png",
  "assets/ui%2f..%2foutside.png",
  "assets/%2Foutside.png",
  String.raw`\\\\example.invalid\\sprite.png`,
  "assets/ui/\u0000icon.png",
];
const pathResolver = createAssetResolver({ assetDefs: {} });
check(
  "local asset paths and query strings remain available",
  pathResolver.spriteSource("assets/ui/icon.png?v=1&variant=basic") ===
    "assets/ui/icon.png?v=1&variant=basic" &&
    pathResolver.spriteSource("fixture.png") === "fixture.png"
);
check(
  "hostile asset paths are rejected",
  hostilePaths.every((path) => pathResolver.spriteSource(path) === "")
);

const resolver = createAssetResolver({
  assetDefs: {
    sprites: {
      runUpgradeIcons: { hostile: "javascript:alert(1)" },
      weapons: { hostile: { iconSrc: "https://example.invalid/icon.png" } },
    },
  },
});
check(
  "asset resolver falls back after hostile content paths",
  resolver.weaponIcon("hostile").startsWith("assets/")
);
check(
  "relic icon rejects hostile save/content path",
  resolver.relicIcon({ iconPath: "data:text/html,x" }).startsWith("assets/")
);

const assignedImageSources = [];
const spriteSystem = createBrowserSpriteSystem({
  assetDefs: {},
  canvas: { getContext: () => null },
  globalRef: {
    Image: class FakeImage {
      addEventListener() {}
      set src(value) {
        assignedImageSources.push(value);
      }
    },
  },
});
spriteSystem.loadSprites({
  weapons: {
    ...Object.fromEntries(hostilePaths.map((path, index) => [`hostile${index}`, path])),
    local: "assets/ui/icon.png",
  },
});
check(
  "sprite loader assigns only validated local paths",
  assignedImageSources.length === 1 && assignedImageSources[0] === "assets/ui/icon.png"
);

const documentRef = {
  createElement(tagName) {
    return {
      children: [],
      tagName,
      textContent: "",
      appendChild(child) {
        this.children.push(child);
      },
    };
  },
};
const runStats = {
  ownerDocument: documentRef,
  children: [],
  replaceChildren(...children) {
    this.children = children;
  },
};
createRunUi({
  ui: { endScreen: { classList: { remove() {} } }, runStats },
  formatTime: () => "0:00",
  getGame: () => ({
    elapsed: 0,
    enemies: [],
    kills: 0,
    laserDamage: 0,
    player: { level: 1 },
    towerFloor: 1,
    xpCollected: 0,
  }),
  getSave: () => ({ coins: 0, questPoints: 0 }),
  getGameSpeed: () => 1,
  maxEquippedWeapons: () => 1,
  renderDebug() {},
}).showEndScreen('<img src=x onerror="alert(1)">');
check(
  "hostile runtime strings remain text nodes",
  runStats.children[0]?.textContent.includes("<img src=x onerror")
);

const root = fileURLToPath(new URL("..", import.meta.url));
const fixtureParent = join(root, ".agent");
mkdirSync(fixtureParent, { recursive: true });
const knownGoodResult = spawnSync(
  process.execPath,
  [join(root, "scripts/check-browser-security.mjs")],
  {
    encoding: "utf8",
  }
);
check(
  "guard accepts known-good source fixture",
  knownGoodResult.status === 0 &&
    knownGoodResult.stdout.includes("PASS CSP and referrer policy are restrictive")
);
[
  [
    "lookalike CSP attribute",
    (fixtureRoot) =>
      mutateIndex(
        fixtureRoot,
        'http-equiv="Content-Security-Policy"',
        'data-http-equiv="Content-Security-Policy"'
      ),
    "index.html must contain exactly one CSP meta tag",
  ],
  [
    "widened script source",
    (fixtureRoot) =>
      mutateIndex(fixtureRoot, "script-src 'self'", "script-src 'self' 'unsafe-inline'"),
    "CSP script-src must exactly match approved sources",
  ],
  [
    "duplicate CSP directive",
    (fixtureRoot) =>
      mutateIndex(fixtureRoot, "script-src 'self';", "script-src 'self'; script-src 'self';"),
    "CSP contains duplicate script-src directive",
  ],
  [
    "duplicate CSP source",
    (fixtureRoot) =>
      mutateIndex(fixtureRoot, "style-src 'self' 'unsafe-inline'", "style-src 'self' 'self'"),
    "CSP style-src must exactly match approved sources",
  ],
  [
    "Function call without new",
    (fixtureRoot) => writeFixtureSource(fixtureRoot, "Function('return 1')"),
    "src/browser-security-fixture.js contains Function constructor",
  ],
  [
    "network primitive",
    (fixtureRoot) => writeFixtureSource(fixtureRoot, "fetch('/fixture')"),
    "src/browser-security-fixture.js contains fetch",
  ],
  [
    "HTML sink",
    (fixtureRoot) => writeFixtureUiSource(fixtureRoot, "node.innerHTML = value"),
    "src/modules/run-ui.js contains an HTML execution sink",
  ],
].forEach(([name, mutate, diagnostic]) => {
  const fixtureRoot = mkdtempSync(join(fixtureParent, "browser-security-"));
  try {
    cpSync(join(root, "src"), join(fixtureRoot, "src"), { recursive: true });
    writeFileSync(join(fixtureRoot, "index.html"), readFileSync(join(root, "index.html")));
    mutate(fixtureRoot);
    const result = spawnSync(
      process.execPath,
      [join(root, "scripts/check-browser-security.mjs"), fixtureRoot],
      {
        encoding: "utf8",
      }
    );
    check(
      `guard rejects ${name}`,
      result.status === 1 && `${result.stdout}\n${result.stderr}`.includes(diagnostic)
    );
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

if (process.exitCode) process.exit(process.exitCode);
console.log("Browser security smoke passed.");

function mutateIndex(fixtureRoot, before, after) {
  const indexPath = join(fixtureRoot, "index.html");
  writeFileSync(indexPath, readFileSync(indexPath, "utf8").replace(before, after));
}

function writeFixtureSource(fixtureRoot, source) {
  writeFileSync(join(fixtureRoot, "src", "browser-security-fixture.js"), source);
}

function writeFixtureUiSource(fixtureRoot, source) {
  writeFileSync(join(fixtureRoot, "src", "modules", "run-ui.js"), source);
}
