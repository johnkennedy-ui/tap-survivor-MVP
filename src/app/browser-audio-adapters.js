export function createBrowserAudioAdapters({ globalRef }) {
  return {
    audioContextFactory: () => {
      const AudioContextCtor = globalRef.AudioContext || globalRef.webkitAudioContext;
      return typeof AudioContextCtor === "function" ? new AudioContextCtor() : null;
    },
    audioFactory: (src) => (typeof globalRef.Audio === "function" ? new globalRef.Audio(src) : null),
    clock: () => globalRef.performance?.now?.() || 0,
  };
}
