import { createBrowserSpriteSystem } from "../src/app/browser-sprite-system.js";
import { createAssetResolver } from "../src/modules/assets.js";
import { createRunUi } from "../src/modules/run-ui.js";

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
];
const pathResolver = createAssetResolver({ assetDefs: {} });
check("local asset paths remain available", pathResolver.spriteSource("assets/ui/icon.png?v=1") === "assets/ui/icon.png?v=1" && pathResolver.spriteSource("fixture.png") === "fixture.png");
check("hostile asset paths are rejected", hostilePaths.every((path) => pathResolver.spriteSource(path) === ""));

const resolver = createAssetResolver({
  assetDefs: {
    sprites: {
      runUpgradeIcons: { hostile: "javascript:alert(1)" },
      weapons: { hostile: { iconSrc: "https://example.invalid/icon.png" } },
    },
  },
});
check("asset resolver falls back after hostile content paths", resolver.weaponIcon("hostile").startsWith("assets/"));
check("relic icon rejects hostile save/content path", resolver.relicIcon({ iconPath: "data:text/html,x" }).startsWith("assets/"));

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
spriteSystem.loadSprites({ weapons: { hostile: "javascript:alert(1)", local: "assets/ui/icon.png" } });
check("sprite loader assigns only validated local paths", assignedImageSources.length === 1 && assignedImageSources[0] === "assets/ui/icon.png");

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
  getGame: () => ({ elapsed: 0, enemies: [], kills: 0, laserDamage: 0, player: { level: 1 }, towerFloor: 1, xpCollected: 0 }),
  getSave: () => ({ coins: 0, questPoints: 0 }),
  getGameSpeed: () => 1,
  maxEquippedWeapons: () => 1,
  renderDebug() {},
}).showEndScreen('<img src=x onerror="alert(1)">');
check("hostile runtime strings remain text nodes", runStats.children[0]?.textContent.includes("<img src=x onerror"));

if (process.exitCode) process.exit(process.exitCode);
console.log("Browser security smoke passed.");
