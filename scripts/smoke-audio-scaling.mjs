import { createModuleRuntimeAudioAdapter } from "../src/modules/module-runtime-audio-adapter.js";

function assert(name, condition) {
  if (!condition) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS ${name}`);
}

const plays = [];
const audio = createModuleRuntimeAudioAdapter({
  audioFactory: createFakeAudio,
  clock: () => plays.length * 1000,
}).audio.createAudioSystem({
  sfxDefs: {
    weapons: {
      nova_burst: "audio/nova-burst.ogg",
      spark_bolt: "audio/spark-bolt.ogg",
    },
  },
});

audio.playWeapon("spark_bolt", { playbackRate: 2.2, minGapMs: 0, volume: 0.3 });
audio.playWeapon("nova_burst", { playbackRate: 0.8, minGapMs: 0 });

assert("weapon audio records two plays", plays.length === 2);
assert("fast weapon playback rate is applied", plays[0].playbackRate === 2.2);
assert("slow weapon playback rate is applied", plays[1].playbackRate === 0.8);
assert("weapon audio volume override is bounded and applied", plays[0].volume === 0.3);

const startLaughFixture = createStartLaughFixture();
const proceduralAudio = createModuleRuntimeAudioAdapter({
  audioContextFactory: () => startLaughFixture.context,
}).audio.createAudioSystem({ sfxDefs: {} });

assert("source-owned start laugh creates the procedural cue", proceduralAudio.playStartLaugh() === true);
assert(
  "source-owned start laugh creates three sawtooth syllable oscillators",
  startLaughFixture.oscillators.length === 3 &&
    startLaughFixture.oscillators.every(({ type }) => type === "sawtooth") &&
    startLaughFixture.starts.join(",") === "4,4.23,4.48"
);
assert(
  "source-owned start laugh keeps the lowpass and bandpass shaping",
  startLaughFixture.filters.map(({ type }) => type).join(",") === "lowpass,bandpass"
);

const missingProviderAudio = createModuleRuntimeAudioAdapter().audio.createAudioSystem({ sfxDefs: {} });
assert(
  "source-owned start laugh fails closed without an explicit AudioContext provider",
  missingProviderAudio.playStartLaugh() === false
);

const incompleteProviderAudio = createModuleRuntimeAudioAdapter({
  audioContextFactory: () => ({
    createGain() {},
    createOscillator() {},
    currentTime: 0,
    destination: {},
  }),
}).audio.createAudioSystem({ sfxDefs: {} });
assert(
  "source-owned start laugh fails closed for an incomplete AudioContext provider",
  incompleteProviderAudio.playStartLaugh() === false
);

const providerErrors = [];
const throwingProviderAudio = createModuleRuntimeAudioAdapter({
  audioContextFactory() {
    throw new Error("AudioContext unavailable");
  },
  onError: (event) => providerErrors.push(event),
}).audio.createAudioSystem({ sfxDefs: {} });
assert(
  "source-owned start laugh reports explicit provider errors and fails closed",
  throwingProviderAudio.playStartLaugh() === false &&
    providerErrors.length === 1 &&
    providerErrors[0].operation === "start-laugh"
);

function createFakeAudio(src) {
  return {
    cloneNode() {
      return createFakeAudio(src);
    },
    currentTime: 0,
    playbackRate: 1,
    play() {
      plays.push({ src, volume: this.volume, playbackRate: this.playbackRate });
      return Promise.resolve();
    },
    src,
    volume: 1,
  };
}

function createStartLaughFixture() {
  const filters = [];
  const oscillators = [];
  const starts = [];
  const context = {
    createBiquadFilter() {
      const filter = {
        connect() {},
        frequency: createAudioParam(),
        Q: createAudioParam(),
        type: "",
      };
      filters.push(filter);
      return filter;
    },
    createGain() {
      return {
        connect() {},
        gain: createAudioParam(),
      };
    },
    createOscillator() {
      const oscillator = {
        connect() {},
        frequency: createAudioParam(),
        start(at) {
          starts.push(at);
        },
        stop() {},
        type: "",
      };
      oscillators.push(oscillator);
      return oscillator;
    },
    currentTime: 4,
    destination: {},
    resume() {
      return Promise.resolve();
    },
  };
  return { context, filters, oscillators, starts };
}

function createAudioParam() {
  return {
    exponentialRampToValueAtTime() {},
    setValueAtTime() {},
  };
}
