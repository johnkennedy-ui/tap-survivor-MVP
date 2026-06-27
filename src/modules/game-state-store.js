export const MODULE_NATIVE_STATE_PERSISTENCE_SLOTS = Object.freeze([
  "getGame",
  "setGame",
  "getSave",
  "setSave",
  "persist",
  "renderMeta",
]);

export const INJECTED_STATE_PERSISTENCE_SLOTS = Object.freeze([
  "initialGame",
  "initialSave",
  "renderMetaSink",
  "storageAdapter",
]);

/**
 * @param {any} [options]
 */
export function createGameStateStore({
  initialGame = null,
  initialSave,
  renderMetaSink = () => {},
  saveSystem,
} = {}) {
  if (!saveSystem) {
    throw new Error("Missing Tap Survivor module state dependency: saveSystem");
  }

  let game = initialGame;
  let save = normalizeSave(initialSave ?? saveSystem.defaultSave());

  function getGame() {
    return game;
  }

  function setGame(nextGame) {
    game = nextGame;
    return game;
  }

  function getSave() {
    return save;
  }

  function setSave(nextSave) {
    save = normalizeSave(nextSave);
    return save;
  }

  function persist() {
    return saveSystem.persist(save);
  }

  function renderMeta() {
    return renderMetaSink({ game, save });
  }

  function normalizeSave(nextSave) {
    return saveSystem.normalizeSave
      ? saveSystem.normalizeSave(nextSave)
      : { ...saveSystem.defaultSave(), ...(nextSave || {}) };
  }

  return {
    getGame,
    getSave,
    persist,
    renderMeta,
    setGame,
    setSave,
  };
}
