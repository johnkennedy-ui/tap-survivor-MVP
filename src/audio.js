(() => {
function createAudioSystem({ sfxDefs = {} }) {
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

  function playStartLaugh() {
    if (muted) return false;
    const AudioContextRef = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextRef) return false;

    try {
      audioContext ||= new AudioContextRef();
      audioContext.resume?.();
      const startAt = audioContext.currentTime;
      const master = audioContext.createGain();
      master.gain.setValueAtTime(0.0001, startAt);
      master.gain.exponentialRampToValueAtTime(volume * 0.45, startAt + 0.025);
      master.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.34);
      master.connect(audioContext.destination);

      [0, 0.11, 0.22].forEach((offset, index) => {
        const osc = audioContext.createOscillator();
        const vowel = audioContext.createBiquadFilter();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(280 - index * 34, startAt + offset);
        osc.frequency.exponentialRampToValueAtTime(210 - index * 22, startAt + offset + 0.08);
        vowel.type = "bandpass";
        vowel.frequency.setValueAtTime(760 + index * 90, startAt + offset);
        vowel.Q.setValueAtTime(6, startAt + offset);
        osc.connect(vowel);
        vowel.connect(master);
        osc.start(startAt + offset);
        osc.stop(startAt + offset + 0.1);
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
