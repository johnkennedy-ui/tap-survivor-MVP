import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

function assert(name, condition) {
  if (!condition) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS ${name}`);
}

const root = new URL("..", import.meta.url).pathname;
const plays = [];
const context = {
  console,
  Date: { now: () => plays.length * 1000 },
  Audio: function FakeAudio(src = "") {
    this.src = src;
    this.volume = 1;
    this.currentTime = 0;
    this.playbackRate = 1;
    this.preload = "";
    this.cloneNode = () => new context.Audio(this.src);
    this.play = () => {
      plays.push({ src: this.src, volume: this.volume, playbackRate: this.playbackRate });
      return Promise.resolve();
    };
  },
};
vm.createContext(context);
["src/content.generated.js", "src/audio.js"].forEach((path) => {
  vm.runInContext(readFileSync(join(root, path), "utf8"), context);
});

const audio = context.TapSurvivorAudio.createAudioSystem({ sfxDefs: context.TapSurvivorContent.assets.sfx });
audio.playWeapon("spark_bolt", { playbackRate: 2.2, minGapMs: 0, volume: 0.3 });
audio.playWeapon("nova_burst", { playbackRate: 0.8, minGapMs: 0 });

assert("weapon audio records two plays", plays.length === 2);
assert("fast weapon playback rate is applied", plays[0].playbackRate === 2.2);
assert("slow weapon playback rate is applied", plays[1].playbackRate === 0.8);
assert("weapon audio volume override is bounded and applied", plays[0].volume === 0.3);
