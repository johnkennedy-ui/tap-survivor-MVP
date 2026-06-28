export const MODULE_RUNTIME_AUDIO_ADAPTER_SLOTS = Object.freeze(["audio"]);

export const MODULE_RUNTIME_AUDIO_ADAPTER_PROOF_SLOTS = Object.freeze([
  "createAudioSystem",
  "isMuted",
  "play",
  "playRunUpgrade",
  "playShopPurchase",
  "playStartLaugh",
  "playWeapon",
  "setMuted",
  "toggleMuted",
]);

export const MODULE_RUNTIME_AUDIO_ADAPTER_LOW_LEVEL_SLOTS = Object.freeze([
  "audioContextFactory",
  "audioFactory",
  "clock",
  "onError",
  "sfxDefs",
]);

export function createModuleRuntimeAudioAdapter(options = {}) {
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
  const minGapMs = Number.isFinite(sfxDefs.minGapMs) ? sfxDefs.minGapMs : 70;
  const now = typeof clock === "function" ? clock : () => 0;
  let muted = false;

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
    return playProceduralCue("start-laugh");
  }

  function playShopPurchase() {
    return playProceduralCue("shop-purchase");
  }

  function playProceduralCue(cueId) {
    if (muted || typeof audioContextFactory !== "function") return false;

    try {
      const context = audioContextFactory(cueId);
      context?.resume?.();
      return Boolean(context);
    } catch (error) {
      reportError(onError, cueId, error);
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
    isMuted,
    play,
    playRunUpgrade,
    playShopPurchase,
    playStartLaugh,
    playWeapon,
    setMuted,
    toggleMuted,
  };
}

function reportError(onError, operation, error) {
  if (typeof onError === "function") {
    onError({ error, operation });
  }
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module runtime audio adapter options: ${name}`);
  }
  return value;
}
