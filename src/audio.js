(() => {
function createAudioSystem({ sfxDefs = {} }) {
  const audioById = new Map();
  const lastPlayed = new Map();
  const weaponSfx = sfxDefs.weapons || {};
  const runUpgradeSfx = sfxDefs.runUpgrades || {};
  const volume = Number.isFinite(sfxDefs.volume) ? sfxDefs.volume : 0.45;
  const minGapMs = Number.isFinite(sfxDefs.minGapMs) ? sfxDefs.minGapMs : 70;
  let muted = false;

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
    playWeapon,
    playRunUpgrade,
    setMuted,
    toggleMuted,
    isMuted,
  };
}

globalThis.TapSurvivorAudio = {
  createAudioSystem,
};
})();
