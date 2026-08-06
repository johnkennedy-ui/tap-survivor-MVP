(() => {
let defaultProviders = {};

function createAudioSystem({ sfxDefs = {}, audioContextFactory } = {}) {
  const audioById = new Map();
  const lastPlayed = new Map();
  const weaponSfx = sfxDefs.weapons || {};
  const runUpgradeSfx = sfxDefs.runUpgrades || {};
  const volume = Number.isFinite(sfxDefs.volume) ? sfxDefs.volume : 0.45;
  const minGapMs = Number.isFinite(sfxDefs.minGapMs) ? sfxDefs.minGapMs : 70;
  let muted = false;
  let audioContext = null;

  function audioFor(src) {
    if (!src || typeof Audio === "undefined") return null;
    if (!audioById.has(src)) {
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.volume = volume;
      audioById.set(src, audio);
    }
    return audioById.get(src);
  }

  function play(src, options = {}) {
    const now = Date.now();
    const gapMs = Number.isFinite(options.minGapMs) ? Math.max(0, options.minGapMs) : minGapMs;
    if (muted) return false;
    if (!src || now - (lastPlayed.get(src) || 0) < gapMs) return false;
    const audio = audioFor(src);
    if (!audio) return false;
    lastPlayed.set(src, now);
    const player = audio.cloneNode ? audio.cloneNode() : audio;
    player.volume = Number.isFinite(options.volume) ? Math.max(0, Math.min(1, options.volume)) : volume;
    player.playbackRate = Number.isFinite(options.playbackRate) ? Math.max(0.5, Math.min(2.5, options.playbackRate)) : 1;
    player.currentTime = 0;
    player.play?.().catch?.(() => {});
    return true;
  }

  function playWeapon(weaponId, options = {}) {
    return play(weaponSfx[weaponId], options);
  }

  function playRunUpgrade(runUpgradeId) {
    return play(runUpgradeSfx[runUpgradeId]);
  }

  function proceduralAudioContext(cueId) {
    if (audioContext) return audioContext;
    const contextFactory =
      typeof audioContextFactory === "function"
        ? audioContextFactory
        : defaultProviders.audioContextFactory;
    if (typeof contextFactory !== "function") return null;

    try {
      audioContext = contextFactory(cueId) || null;
    } catch {
      return null;
    }
    return audioContext;
  }

  function playStartLaugh() {
    if (muted) return false;

    try {
      const context = proceduralAudioContext("start-laugh");
      if (!context) return false;
      context.resume?.();
      const startAt = context.currentTime;
      const master = context.createGain();
      const tone = context.createBiquadFilter();
      const throat = context.createBiquadFilter();
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

      [0, 0.23, 0.48].forEach((offset, index) => {
        const osc = context.createOscillator();
        const syllable = context.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(118 - index * 16, startAt + offset);
        osc.frequency.exponentialRampToValueAtTime(64 - index * 7, startAt + offset + 0.18);
        syllable.gain.setValueAtTime(0.0001, startAt + offset);
        syllable.gain.exponentialRampToValueAtTime(0.74, startAt + offset + 0.035);
        syllable.gain.exponentialRampToValueAtTime(0.0001, startAt + offset + 0.24);
        osc.connect(syllable);
        syllable.connect(tone);
        osc.start(startAt + offset);
        osc.stop(startAt + offset + 0.26);
      });
      return true;
    } catch {
      return false;
    }
  }

  function playShopPurchase() {
    if (muted) return false;

    try {
      const context = proceduralAudioContext("shop-purchase");
      if (!context) return false;
      context.resume?.();
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
    } catch {
      return false;
    }
  }

  function setMuted(nextMuted) {
    muted = Boolean(nextMuted);
    return muted;
  }

  function toggleMuted() {
    return setMuted(!muted);
  }

  function isMuted() {
    return muted;
  }

  return {
    play,
    playStartLaugh,
    playShopPurchase,
    playWeapon,
    playRunUpgrade,
    setMuted,
    toggleMuted,
    isMuted,
  };
}

function configureDefaultProviders({ audioContextFactory } = {}) {
  defaultProviders = { audioContextFactory };
  return defaultProviders.audioContextFactory;
}

globalThis.TapSurvivorAudio = {
  createAudioSystem,
  configureDefaultProviders,
};
})();
