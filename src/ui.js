(() => {
function createUi() {
  return {
    canvas: document.getElementById("game"),
    startRun: document.getElementById("startRun"),
    resetSave: document.getElementById("resetSave"),
    openMenu: document.getElementById("openMenu"),
    closeMenu: document.getElementById("closeMenu"),
    closeLevelUp: document.getElementById("closeLevelUp"),
    speedButtons: [...document.querySelectorAll("[data-speed]")],
    runMenu: document.getElementById("runMenu"),
    runHud: document.getElementById("runHud"),
    qpHud: document.getElementById("qpHud"),
    menuQpHud: document.getElementById("menuQpHud"),
    tree: document.getElementById("tree"),
    menuTree: document.getElementById("menuTree"),
    quests: document.getElementById("quests"),
    menuQuests: document.getElementById("menuQuests"),
    levelUp: document.getElementById("levelUp"),
    choices: document.getElementById("choices"),
    endScreen: document.getElementById("endScreen"),
    runStats: document.getElementById("runStats"),
    closeEnd: document.getElementById("closeEnd"),
    closeEndX: document.getElementById("closeEndX"),
  };
}

globalThis.TapSurvivorUi = {
  createUi,
};
})();
