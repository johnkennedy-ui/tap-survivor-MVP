import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { createGameDependencyBag } from "../src/modules/game-dependencies.js";

function assert(name, condition) {
  if (!condition) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS ${name}`);
}

function createAutomationValue() {
  return {
    exponentialRampToValueAtTime() {},
    setValueAtTime() {},
  };
}

function createProceduralContext(label) {
  return {
    currentTime: 0,
    destination: { label },
    resume() {},
    createBiquadFilter() {
      return {
        Q: createAutomationValue(),
        connect() {},
        frequency: createAutomationValue(),
      };
    },
    createGain() {
      return {
        connect() {},
        gain: createAutomationValue(),
      };
    },
    createOscillator() {
      return {
        connect() {},
        frequency: createAutomationValue(),
        start() {},
        stop() {},
      };
    },
  };
}

function createClassicGlobalRef(audio) {
  return new Proxy(
    {
      TapSurvivorAudio: audio,
      TapSurvivorInput: { bindMovementInput() {} },
    },
    {
      get(target, key, receiver) {
        if (Reflect.has(target, key)) return Reflect.get(target, key, receiver);
        return typeof key === "string" && key.startsWith("TapSurvivor") ? {} : undefined;
      },
    }
  );
}

const root = new URL("..", import.meta.url).pathname;
const mediaPlays = [];
function FakeAudio(src = "") {
  this.currentTime = 0;
  this.preload = "";
  this.src = src;
  this.volume = 1;
  this.cloneNode = () => new FakeAudio(this.src);
  this.play = () => {
    mediaPlays.push(this.src);
    return Promise.resolve();
  };
}

const classicContext = { Audio: FakeAudio, console };
vm.createContext(classicContext);
const audioSource = readFileSync(join(root, "src/audio.js"), "utf8");
vm.runInContext(audioSource, classicContext);

const audioPublisher = classicContext.TapSurvivorAudio;
const missingGlobalRef = createClassicGlobalRef(audioPublisher);
createGameDependencyBag({ globalRef: missingGlobalRef });
const recoveringSystem = audioPublisher.createAudioSystem();

assert(
  "audio source has no direct browser audio-global reads",
  !/\b(?:globalThis|window)\s*\.\s*(?:AudioContext|webkitAudioContext)\b/.test(audioSource)
);
assert("missing default provider returns false for procedural audio", recoveringSystem.playStartLaugh() === false);
assert(
  "missing default provider preserves ordinary audio playback",
  recoveringSystem.play("audio/test.ogg", { minGapMs: 0 }) === true && mediaPlays.length === 1
);

const defaultFactoryCalls = [];
function DefaultAudioContext() {
  defaultFactoryCalls.push("default");
  return createProceduralContext("default");
}
const defaultGlobalRef = createClassicGlobalRef(audioPublisher);
defaultGlobalRef.AudioContext = DefaultAudioContext;
createGameDependencyBag({ globalRef: defaultGlobalRef });

assert("classic audio publisher identity is retained", defaultGlobalRef.TapSurvivorAudio === audioPublisher);
assert(
  "later default configuration recovers the same audio system",
  recoveringSystem.playStartLaugh() === true && defaultFactoryCalls.length === 1
);

function WebkitAudioContext() {
  defaultFactoryCalls.push("webkit");
  return createProceduralContext("webkit");
}
const webkitGlobalRef = createClassicGlobalRef(audioPublisher);
webkitGlobalRef.webkitAudioContext = WebkitAudioContext;
createGameDependencyBag({ globalRef: webkitGlobalRef });
const webkitSystem = audioPublisher.createAudioSystem();
assert(
  "default provider retains the webkit audio-context fallback",
  webkitSystem.playShopPurchase() === true &&
    defaultFactoryCalls[defaultFactoryCalls.length - 1] === "webkit"
);

const explicitFactoryCalls = [];
const explicitSystem = audioPublisher.createAudioSystem({
  audioContextFactory: (cueId) => {
    explicitFactoryCalls.push(cueId);
    return createProceduralContext("explicit");
  },
});
const defaultFactoryCallsBeforeExplicitOverride = defaultFactoryCalls.length;
assert(
  "explicit audio-context factory overrides the configured default",
  explicitSystem.playShopPurchase() === true &&
    explicitFactoryCalls.join(",") === "shop-purchase" &&
    defaultFactoryCalls.length === defaultFactoryCallsBeforeExplicitOverride
);

const poisonedGlobalRef = createClassicGlobalRef(audioPublisher);
Object.defineProperty(poisonedGlobalRef, "AudioContext", {
  configurable: true,
  get() {
    throw new Error("poisoned audio constructor read");
  },
});
createGameDependencyBag({ globalRef: poisonedGlobalRef });
const poisonedSystem = audioPublisher.createAudioSystem();
assert("throwing default provider returns false without escaping", poisonedSystem.playShopPurchase() === false);

const recoveredGlobalRef = createClassicGlobalRef(audioPublisher);
recoveredGlobalRef.AudioContext = DefaultAudioContext;
createGameDependencyBag({ globalRef: recoveredGlobalRef });
assert(
  "later valid configuration recovers from a throwing provider on the same audio system",
  poisonedSystem.playShopPurchase() === true
);
