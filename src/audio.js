// GENERATED FILE. Do not edit directly.
// Source: src/modules/module-runtime-audio-adapter.js
// Run: npm run build:bridges
// Retired global: TapSurvivorAudio. Exports are supplied through the game dependency bag.
(() => {
  "use strict";

  const MODULE_RUNTIME_AUDIO_ADAPTER_SLOTS = Object.freeze(["audio"]);

  const MODULE_RUNTIME_AUDIO_ADAPTER_PROOF_SLOTS = Object.freeze([
    "createAudioSystem",
    "isBgmPlaying",
    "isMuted",
    "play",
    "playRunUpgrade",
    "playShopPurchase",
    "playStartLaugh",
    "playWeapon",
    "startBgm",
    "stopBgm",
    "setMuted",
    "toggleMuted",
  ]);

  const MODULE_RUNTIME_AUDIO_ADAPTER_LOW_LEVEL_SLOTS = Object.freeze([
    "audioContextFactory",
    "audioFactory",
    "clock",
    "onError",
    "sfxDefs",
  ]);

  function createModuleRuntimeAudioAdapter(options = {}) {
    const resolvedOptions = requireObject(options, "options");
    const baseSfxDefs = requireObject(resolvedOptions.sfxDefs || {}, "options.sfxDefs");

    return {
      audio: {
        createAudioSystem: (audioOptions = {}) =>
          createAudioSystem({
            audioContextFactory: audioOptions.audioContextFactory || resolvedOptions.audioContextFactory,
            audioFactory: audioOptions.audioFactory || resolvedOptions.audioFactory,
            clock: audioOptions.clock || resolvedOptions.clock,
            onError: audioOptions.onError || resolvedOptions.onError,
            sfxDefs: audioOptions.sfxDefs || baseSfxDefs,
          }),
      },
    };
  }

  function createAudioSystem({ audioContextFactory, audioFactory, clock, onError, sfxDefs }) {
    const audioById = new Map();
    const lastPlayed = new Map();
    const weaponSfx = sfxDefs.weapons || {};
    const runUpgradeSfx = sfxDefs.runUpgrades || {};
    const volume = Number.isFinite(sfxDefs.volume) ? sfxDefs.volume : 0.45;
    const bgmVolume = Number.isFinite(sfxDefs.bgmVolume)
      ? Math.max(0, Math.min(0.12, sfxDefs.bgmVolume))
      : Math.min(0.1, volume * 0.18);
    const minGapMs = Number.isFinite(sfxDefs.minGapMs) ? sfxDefs.minGapMs : 70;
    const now = typeof clock === "function" ? clock : () => 0;
    let muted = false;
    let bgmContext = null;
    let bgmMaster = null;
    let bgmVoices = [];
    let bgmRequested = false;

    function audioFor(src) {
      if (!src || typeof audioFactory !== "function") return null;
      if (!audioById.has(src)) {
        audioById.set(src, audioFactory(src));
      }
      return audioById.get(src);
    }

    function play(src, options = {}) {
      const currentTime = now();
      const gapMs = Number.isFinite(options.minGapMs) ? Math.max(0, options.minGapMs) : minGapMs;
      if (muted) return false;
      const previousTime = lastPlayed.has(src) ? lastPlayed.get(src) : -Infinity;
      if (!src || currentTime - previousTime < gapMs) return false;

      const audio = audioFor(src);
      if (!audio) return false;

      try {
        lastPlayed.set(src, currentTime);
        const player = typeof audio.cloneNode === "function" ? audio.cloneNode() : audio;
        player.volume = Number.isFinite(options.volume)
          ? Math.max(0, Math.min(1, options.volume))
          : volume;
        player.playbackRate = Number.isFinite(options.playbackRate)
          ? Math.max(0.5, Math.min(2.5, options.playbackRate))
          : 1;
        player.currentTime = 0;
        player.play?.();
        return true;
      } catch (error) {
        reportError(onError, "play", error);
        return false;
      }
    }

    function playWeapon(weaponId, options = {}) {
      return play(weaponSfx[weaponId], options);
    }

    function playRunUpgrade(runUpgradeId) {
      return play(runUpgradeSfx[runUpgradeId]);
    }

    function playStartLaugh() {
      if (muted || typeof audioContextFactory !== "function") return false;

      try {
        const context = audioContextFactory("start-laugh");
        if (!context) return false;
        resumeContext(context, "start-laugh");
        if (!hasStartLaughContext(context)) return false;

        const startAt = context.currentTime;
        const master = context.createGain();
        const tone = context.createBiquadFilter();
        const throat = context.createBiquadFilter();
        if (!hasStartLaughGain(master) || !hasStartLaughFilter(tone) || !hasStartLaughFilter(throat)) {
          return false;
        }

        master.gain.setValueAtTime(0.0001, startAt);
        master.gain.exponentialRampToValueAtTime(volume * 0.55, startAt + 0.04);
        master.gain.exponentialRampToValueAtTime(0.0001, startAt + 1.02);
        tone.type = "lowpass";
        tone.frequency.setValueAtTime(920, startAt);
        tone.Q.setValueAtTime(2.2, startAt);
        throat.type = "bandpass";
        throat.frequency.setValueAtTime(360, startAt);
        throat.Q.setValueAtTime(4.6, startAt);
        tone.connect(throat);
        throat.connect(master);
        master.connect(context.destination);

        for (const [index, offset] of [0, 0.23, 0.48].entries()) {
          const oscillator = context.createOscillator();
          const syllable = context.createGain();
          if (!hasStartLaughOscillator(oscillator) || !hasStartLaughGain(syllable)) return false;

          oscillator.type = "sawtooth";
          oscillator.frequency.setValueAtTime(118 - index * 16, startAt + offset);
          oscillator.frequency.exponentialRampToValueAtTime(64 - index * 7, startAt + offset + 0.18);
          syllable.gain.setValueAtTime(0.0001, startAt + offset);
          syllable.gain.exponentialRampToValueAtTime(0.74, startAt + offset + 0.035);
          syllable.gain.exponentialRampToValueAtTime(0.0001, startAt + offset + 0.24);
          oscillator.connect(syllable);
          syllable.connect(tone);
          oscillator.start(startAt + offset);
          oscillator.stop(startAt + offset + 0.26);
        }
        return true;
      } catch (error) {
        reportError(onError, "start-laugh", error);
        return false;
      }
    }

    function playShopPurchase() {
      if (muted || typeof audioContextFactory !== "function") return false;

      try {
        const context = audioContextFactory("shop-purchase");
        if (!context) return false;
        resumeContext(context, "shop-purchase");
        if (
          !Number.isFinite(context.currentTime) ||
          !context.destination ||
          typeof context.createGain !== "function" ||
          typeof context.createOscillator !== "function"
        ) {
          return false;
        }

        const startAt = context.currentTime;
        const master = context.createGain();
        master.gain.setValueAtTime(0.0001, startAt);
        master.gain.exponentialRampToValueAtTime(volume * 0.42, startAt + 0.015);
        master.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.48);
        master.connect(context.destination);

        [880, 1175, 1480, 1976].forEach((frequency, index) => {
          const offset = index * 0.055;
          const osc = context.createOscillator();
          const note = context.createGain();
          osc.type = index % 2 ? "sine" : "triangle";
          osc.frequency.setValueAtTime(frequency, startAt + offset);
          osc.frequency.exponentialRampToValueAtTime(frequency * 0.82, startAt + offset + 0.16);
          note.gain.setValueAtTime(0.0001, startAt + offset);
          note.gain.exponentialRampToValueAtTime(0.6, startAt + offset + 0.012);
          note.gain.exponentialRampToValueAtTime(0.0001, startAt + offset + 0.19);
          osc.connect(note);
          note.connect(master);
          osc.start(startAt + offset);
          osc.stop(startAt + offset + 0.22);
        });
        return true;
      } catch (error) {
        reportError(onError, "shop-purchase", error);
        return false;
      }
    }

    function playProceduralCue(cueId) {
      if (muted || typeof audioContextFactory !== "function") return false;

      try {
        const context = audioContextFactory(cueId);
        resumeContext(context, cueId);
        return Boolean(context);
      } catch (error) {
        reportError(onError, cueId, error);
        return false;
      }
    }

    function startBgm() {
      bgmRequested = true;
      if (muted || typeof audioContextFactory !== "function") return false;
      if (bgmVoices.length > 0) {
        resumeContext(bgmContext, "bgm");
        return true;
      }

      try {
        bgmContext ||= audioContextFactory("bgm");
        const context = bgmContext;
        resumeContext(context, "bgm");
        if (
          !Number.isFinite(context?.currentTime) ||
          !context.destination ||
          typeof context.createGain !== "function" ||
          typeof context.createOscillator !== "function"
        ) {
          return false;
        }

        const startAt = context.currentTime;
        const master = context.createGain();
        if (!master?.gain || typeof master.connect !== "function") return false;
        setAudioParam(master.gain, 0.0001, startAt);
        rampAudioParam(master.gain, bgmVolume, startAt + 0.24);
        master.connect(context.destination);

        const voices = [
          { frequency: 110, gain: 0.42, type: "triangle" },
          { frequency: 164.81, gain: 0.22, type: "sine" },
          { frequency: 220, gain: 0.12, type: "sine" },
        ]
          .map((voice) => createBgmVoice(context, master, startAt, voice))
          .filter(Boolean);
        if (voices.length === 0) {
          master.disconnect?.();
          return false;
        }

        bgmMaster = master;
        bgmVoices = voices;
        return true;
      } catch (error) {
        reportError(onError, "bgm", error);
        stopBgm({ clearRequest: false });
        return false;
      }
    }

    function stopBgm({ clearRequest = true } = {}) {
      if (clearRequest) bgmRequested = false;
      const context = bgmContext;
      const stopAt = Number.isFinite(context?.currentTime) ? context.currentTime + 0.02 : undefined;
      bgmVoices.forEach(({ oscillator, gain }) => {
        try {
          if (stopAt === undefined) oscillator.stop?.();
          else oscillator.stop?.(stopAt);
        } catch (error) {
          reportError(onError, "bgm-stop", error);
        }
        oscillator.disconnect?.();
        gain.disconnect?.();
      });
      if (bgmMaster) {
        try {
          setAudioParam(bgmMaster.gain, 0.0001, stopAt ?? 0);
          bgmMaster.disconnect?.();
        } catch (error) {
          reportError(onError, "bgm-stop", error);
        }
      }
      bgmVoices = [];
      bgmMaster = null;
      return true;
    }

    function isBgmPlaying() {
      return bgmVoices.length > 0;
    }

    function createBgmVoice(context, master, startAt, voice) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      if (
        !oscillator ||
        !gain?.gain ||
        typeof oscillator.connect !== "function" ||
        typeof oscillator.start !== "function" ||
        typeof gain.connect !== "function"
      ) {
        return null;
      }
      oscillator.type = voice.type;
      setAudioParam(oscillator.frequency, voice.frequency, startAt);
      setAudioParam(gain.gain, voice.gain, startAt);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(startAt);
      return { gain, oscillator };
    }

    function resumeContext(context, operation) {
      try {
        const result = context?.resume?.();
        result?.catch?.((error) => reportError(onError, operation, error));
      } catch (error) {
        reportError(onError, operation, error);
      }
    }

    function setAudioParam(param, value, at) {
      if (!param) return;
      if (typeof param.setValueAtTime === "function" && Number.isFinite(at)) {
        param.setValueAtTime(value, at);
        return;
      }
      param.value = value;
    }

    function rampAudioParam(param, value, at) {
      if (!param) return;
      if (typeof param.exponentialRampToValueAtTime === "function" && Number.isFinite(at)) {
        param.exponentialRampToValueAtTime(Math.max(0.0001, value), at);
        return;
      }
      if (typeof param.linearRampToValueAtTime === "function" && Number.isFinite(at)) {
        param.linearRampToValueAtTime(value, at);
        return;
      }
      param.value = value;
    }

    function setMuted(nextMuted) {
      muted = Boolean(nextMuted);
      if (muted) stopBgm({ clearRequest: false });
      else if (bgmRequested) startBgm();
      return muted;
    }

    function toggleMuted() {
      return setMuted(!muted);
    }

    function isMuted() {
      return muted;
    }

    return {
      isBgmPlaying,
      isMuted,
      play,
      playRunUpgrade,
      playShopPurchase,
      playStartLaugh,
      playWeapon,
      startBgm,
      stopBgm,
      setMuted,
      toggleMuted,
    };
  }

  function reportError(onError, operation, error) {
    if (typeof onError === "function") {
      onError({ error, operation });
    }
  }

  function hasStartLaughContext(context) {
    return Boolean(
      Number.isFinite(context?.currentTime) &&
        context.destination &&
        typeof context.createGain === "function" &&
        typeof context.createBiquadFilter === "function" &&
        typeof context.createOscillator === "function"
    );
  }

  function hasStartLaughGain(node) {
    return Boolean(
      node?.gain &&
        typeof node.connect === "function" &&
        typeof node.gain.setValueAtTime === "function" &&
        typeof node.gain.exponentialRampToValueAtTime === "function"
    );
  }

  function hasStartLaughFilter(node) {
    return Boolean(
      node?.frequency &&
        node?.Q &&
        typeof node.connect === "function" &&
        typeof node.frequency.setValueAtTime === "function" &&
        typeof node.Q.setValueAtTime === "function"
    );
  }

  function hasStartLaughOscillator(node) {
    return Boolean(
      node?.frequency &&
        typeof node.connect === "function" &&
        typeof node.start === "function" &&
        typeof node.stop === "function" &&
        typeof node.frequency.setValueAtTime === "function" &&
        typeof node.frequency.exponentialRampToValueAtTime === "function"
    );
  }

  function requireObject(value, name) {
    if (!value || typeof value !== "object") {
      throw new Error(`Missing Tap Survivor module runtime audio adapter options: ${name}`);
    }
    return value;
  }
})();
