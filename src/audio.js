(() => {
function createAudioSystem({ sfxDefs = {} }) {
  const audioById = new Map();
  const lastPlayed = new Map();
  const weaponSfx = sfxDefs.weapons || {};
  const volume = Number.isFinite(sfxDefs.volume) ? sfxDefs.volume : 0.45;
  const minGapMs = Number.isFinite(sfxDefs.minGapMs) ? sfxDefs.minGapMs : 70;

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

  function play(src) {
    const now = Date.now();
    if (!src || now - (lastPlayed.get(src) || 0) < minGapMs) return false;
    const audio = audioFor(src);
    if (!audio) return false;
    lastPlayed.set(src, now);
    const player = audio.cloneNode ? audio.cloneNode() : audio;
    player.volume = volume;
    player.currentTime = 0;
    player.play?.().catch?.(() => {});
    return true;
  }

  function playWeapon(weaponId) {
    return play(weaponSfx[weaponId]);
  }

  return {
    play,
    playWeapon,
  };
}

globalThis.TapSurvivorAudio = {
  createAudioSystem,
};
})();
