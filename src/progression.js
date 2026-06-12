(() => {
  function createProgressionSystem({
    weaponDefs,
    weaponUnlocks,
    questDefs,
    getSave,
    openQuest,
    persist,
    renderMeta,
    applyRunMetaUpgrades,
  }) {
    function hasNode(id) {
      return getSave().unlockedNodes.includes(id);
    }

    function getUpgradeTier(id) {
      return Math.min(3, getSave().upgradeTiers[id] || 0);
    }

    function isQuestComplete(id) {
      return !id || getSave().completedQuests.includes(id);
    }

    function labelUnlock(id) {
      const unlock = weaponUnlocks.find((node) => node.id === id);
      return unlock ? weaponDefs[unlock.weaponId].name : id;
    }

    function isNodeVisible(node) {
      return !node.requiresNode || hasNode(node.requiresNode);
    }

    function nodeGateStatus(node) {
      const save = getSave();
      if (node.requiresNode && !hasNode(node.requiresNode)) {
        return `Requires ${labelUnlock(node.requiresNode)}`;
      }
      if (node.requiresQuest && !isQuestComplete(node.requiresQuest)) {
        return `Complete quest: ${questDefs[node.requiresQuest]?.name || node.requiresQuest}`;
      }
      if (save.questPoints < node.cost) {
        return `Needs ${node.cost} QP`;
      }
      return "";
    }

    function buyWeaponUnlock(unlock) {
      const save = getSave();
      if (hasNode(unlock.id) || nodeGateStatus(unlock)) return;
      save.questPoints -= unlock.cost;
      save.unlockedNodes.push(unlock.id);
      if (!save.unlockedWeapons.includes(unlock.weaponId)) {
        save.unlockedWeapons.push(unlock.weaponId);
      }
      if (unlock.opensQuest) openQuest(unlock.opensQuest);
      persist();
      renderMeta();
    }

    function buyUpgrade(upgrade) {
      const save = getSave();
      const tier = getUpgradeTier(upgrade.id);
      if (tier >= upgrade.maxTier) return;
      if (upgrade.requiresWeapon && !save.unlockedWeapons.includes(upgrade.requiresWeapon)) return;
      if (upgrade.requiresNode && !hasNode(upgrade.requiresNode)) return;
      if (upgrade.requiresQuest && !isQuestComplete(upgrade.requiresQuest)) return;
      const cost = upgrade.cost[tier];
      if (save.questPoints < cost) return;
      save.questPoints -= cost;
      save.upgradeTiers[upgrade.id] = tier + 1;
      if (upgrade.opensQuest && tier === 0) openQuest(upgrade.opensQuest);
      persist();
      applyRunMetaUpgrades();
      renderMeta();
    }

    return {
      hasNode,
      getUpgradeTier,
      isQuestComplete,
      isNodeVisible,
      nodeGateStatus,
      buyWeaponUnlock,
      buyUpgrade,
    };
  }

  globalThis.TapSurvivorProgression = {
    createProgressionSystem,
  };
})();
