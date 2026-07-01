export const MODULE_NATIVE_UI_PROGRESSION_RENDERER_PROOF_SLOTS = Object.freeze([
  "renderMeta",
  "renderTree",
  "renderQuests",
]);

/**
 * @typedef {object} UiProgressionRendererOptions
 * @property {*} [ui]
 * @property {*} [weaponDefs]
 * @property {*} [weaponUnlocks]
 * @property {*} [upgradeDefs]
 * @property {*} [questDefs]
 * @property {() => *} [getSave]
 * @property {(upgradeId: string) => number} [getUpgradeTier]
 * @property {(nodeId: string) => boolean} [hasNode]
 * @property {(unlock: *) => boolean} [isNodeVisible]
 * @property {(questId: string) => boolean} [isQuestComplete]
 * @property {(unlock: *) => string | null | undefined} [nodeGateStatus]
 * @property {(unlock: *) => *} [buyWeaponUnlock]
 * @property {(upgrade: *) => *} [buyUpgrade]
 * @property {Document} [documentRef]
 */

/**
 * @param {UiProgressionRendererOptions} [options]
 */
export function createUiProgressionRenderer({
  ui,
  weaponDefs,
  weaponUnlocks,
  upgradeDefs,
  questDefs,
  getSave,
  getUpgradeTier,
  hasNode,
  isNodeVisible,
  isQuestComplete,
  nodeGateStatus,
  buyWeaponUnlock,
  buyUpgrade,
  documentRef,
} = {}) {
  const resolvedUi = requireObject(ui, "ui");

  function renderMeta() {
    const save = getSave();
    const qpText = `Coins: ${save.coins} | Quest Points: ${save.questPoints} available, ${save.totalQuestPoints} earned.`;
    resolvedUi.menuQpHud.textContent = qpText;

    renderTree(resolvedUi.menuTree);
    renderQuests(resolvedUi.menuQuests);
  }

  function renderTree(container) {
    const doc = requireDocument(documentRef);
    const save = getSave();
    container.innerHTML = "";
    const availableWeaponUnlocks = weaponUnlocks.filter(
      (unlock) => !hasNode(unlock.id) && isNodeVisible(unlock)
    );
    const availableUpgrades = upgradeDefs.filter((upgrade) => {
      const tier = getUpgradeTier(upgrade.id);
      if (tier >= upgrade.maxTier) return false;
      if (upgrade.requiresWeapon && !save.unlockedWeapons.includes(upgrade.requiresWeapon)) return false;
      if (upgrade.requiresNode && !hasNode(upgrade.requiresNode)) return false;
      return !upgrade.requiresQuest || isQuestComplete(upgrade.requiresQuest);
    });

    if (!availableWeaponUnlocks.length && !availableUpgrades.length) {
      const empty = doc.createElement("div");
      empty.className = "node";
      empty.textContent = "No available skill nodes. Complete active quests to reveal the next branch.";
      container.appendChild(empty);
      return;
    }

    availableWeaponUnlocks.forEach((unlock) => {
      const weapon = weaponDefs[unlock.weaponId];
      const gateStatus = nodeGateStatus(unlock);
      const el = doc.createElement("div");
      el.className = `node ${gateStatus ? "locked" : "available"}`;
      el.innerHTML = `
        <strong>Unlock ${weapon.name}</strong>
        <span>${weapon.description}</span><br />
        <span>Branch: ${unlock.branch} | Cost: ${unlock.cost} QP</span><br />
        <span>${gateStatus || "Ready to unlock"}</span>
      `;
      const button = doc.createElement("button");
      button.textContent = gateStatus ? "Locked" : "Unlock";
      button.disabled = Boolean(gateStatus);
      button.addEventListener("click", () => buyWeaponUnlock(unlock));
      el.appendChild(button);
      container.appendChild(el);
    });

    availableUpgrades.forEach((upgrade) => {
      const save = getSave();
      const tier = getUpgradeTier(upgrade.id);
      const nextCost = upgrade.cost[tier];
      const canBuy = save.questPoints >= nextCost;
      const el = doc.createElement("div");
      el.className = `node ${canBuy ? "available" : "locked"}`;
      el.innerHTML = `
        <strong>${upgrade.name}</strong>
        <span>${upgrade.description}</span><br />
        <span>Tier: ${tier}/${upgrade.maxTier}</span><br />
        <span>${canBuy ? `Next cost: ${nextCost} QP` : `Needs ${nextCost} QP`}</span>
      `;
      const button = doc.createElement("button");
      button.textContent = `Buy Tier ${tier + 1}`;
      button.disabled = !canBuy;
      button.addEventListener("click", () => buyUpgrade(upgrade));
      el.appendChild(button);
      container.appendChild(el);
    });
  }

  function renderQuests(container) {
    const doc = requireDocument(documentRef);
    const save = getSave();
    container.innerHTML = "";
    const activeQuestIds = Object.keys(questDefs).filter((id) => save.activeQuests.includes(id));
    if (!activeQuestIds.length) {
      const empty = doc.createElement("div");
      empty.className = "quest";
      empty.textContent = "No active quests. Unlock the next available skill node to reveal one.";
      container.appendChild(empty);
      return;
    }

    activeQuestIds.forEach((id) => {
      const quest = questDefs[id];
      const progress = save.questProgress[id] || 0;
      const el = doc.createElement("div");
      el.className = "quest active";
      el.innerHTML = `
        <strong>${quest.name}</strong>
        <span>${quest.description}</span><br />
        <span>Status: Active</span><br />
        <span>Progress: ${Math.floor(progress)} / ${quest.target}</span><br />
        <span>Reward: ${quest.rewardQp} QP</span>
      `;
      container.appendChild(el);
    });
  }

  return {
    renderMeta,
    renderQuests,
    renderTree,
  };
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module UI progression dependency: ${name}`);
  }
  return value;
}

function requireDocument(documentRef) {
  if (!documentRef || typeof documentRef.createElement !== "function") {
    throw new Error("Missing Tap Survivor module UI progression dependency: documentRef");
  }
  return documentRef;
}
