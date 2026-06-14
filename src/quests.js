(() => {
function questOpenIds(quest) {
  return [quest?.opensQuest, ...(quest?.opensQuests || [])].filter(Boolean);
}

function createQuestSystem({ questDefs, getSave, persist, renderMeta, onQuestComplete }) {
  function hasQuest(id) {
    const save = getSave();
    return save.activeQuests.includes(id) || save.completedQuests.includes(id);
  }

  function openQuest(id) {
    const save = getSave();
    if (!questDefs[id] || hasQuest(id)) return;
    save.activeQuests.push(id);
    save.questProgress[id] = save.questProgress[id] || 0;
    persist();
  }

  function completeQuest(id) {
    const save = getSave();
    if (!save.activeQuests.includes(id) || save.completedQuests.includes(id)) return;
    save.activeQuests = save.activeQuests.filter((questId) => questId !== id);
    save.completedQuests.push(id);
    const reward = questDefs[id].rewardQp || 0;
    save.questPoints += reward;
    save.totalQuestPoints += reward;
    questOpenIds(questDefs[id]).forEach(openQuest);
    persist();
    renderMeta();
    onQuestComplete?.(questDefs[id], reward);
  }

  function addQuestProgress(id, amount) {
    const save = getSave();
    if (!questDefs[id] || !save.activeQuests.includes(id)) return;
    save.questProgress[id] = Math.min(
      questDefs[id].target,
      (save.questProgress[id] || 0) + amount,
    );
    if (save.questProgress[id] >= questDefs[id].target) completeQuest(id);
  }

  function addQuestProgressGroup(ids, amount) {
    ids.forEach((questId) => addQuestProgress(questId, amount));
  }

  function addQuestProgressForWeapon(weaponId, amount) {
    const save = getSave();
    save.activeQuests
      .filter((questId) => questDefs[questId]?.weaponId === weaponId)
      .forEach((questId) => addQuestProgress(questId, amount));
  }

  function activeQuestWeaponIds() {
    const save = getSave();
    return save.activeQuests
      .map((questId) => questDefs[questId]?.weaponId)
      .filter(Boolean);
  }

  return {
    activeQuestWeaponIds,
    addQuestProgress,
    addQuestProgressForWeapon,
    addQuestProgressGroup,
    completeQuest,
    hasQuest,
    openQuest,
  };
}

globalThis.TapSurvivorQuests = {
  createQuestSystem,
  questOpenIds,
};
})();
