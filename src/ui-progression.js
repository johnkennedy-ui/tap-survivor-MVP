// GENERATED FILE. Do not edit directly.
// Source: src/modules/ui-progression.js
// Run: npm run build:bridges
// Retired global: TapSurvivorUiProgression. Exports are supplied through the game dependency bag.
(() => {
  "use strict";

  const MODULE_NATIVE_UI_PROGRESSION_RENDERER_PROOF_SLOTS = Object.freeze([
    "renderMeta",
    "renderTree",
    "renderQuests",
  ]);

  /**
   * @typedef {object} UiProgressionRendererOptions
   * @property {*} [ui]
   * @property {*} [assets]
   * @property {*} [weaponDefs]
   * @property {*} [weaponUnlocks]
   * @property {*} [upgradeDefs]
   * @property {*} [questDefs]
   * @property {*} [progressionConfig]
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
  function createUiProgressionRenderer({
    ui,
    assets,
    weaponDefs,
    weaponUnlocks,
    upgradeDefs,
    questDefs,
    progressionConfig,
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
    const assetResolver = assets?.createAssetResolver?.();
    const hasQuestContent = Object.keys(questDefs || {}).length > 0;
    const questCacheCost = positiveIntegerOrDefault(progressionConfig?.questCacheCost, 1);

    function renderMeta() {
      const save = getSave();
      const qpText = `Coins: ${save.coins} | Quest Points: ${save.questPoints} available, ${save.totalQuestPoints} earned.`;
      if (resolvedUi.menuQpHud) resolvedUi.menuQpHud.textContent = qpText;

      if (resolvedUi.menuTree) renderTree(resolvedUi.menuTree);
      if (resolvedUi.menuQuests) renderQuests(resolvedUi.menuQuests);
    }

    function renderTree(container) {
      if (!container) return;
      const doc = requireDocument(documentRef);
      const save = getSave();
      container.replaceChildren();
      const availableWeaponUnlocks = weaponUnlocks.filter(
        (unlock) => !hasNode(unlock.id) && isNodeVisible(unlock)
      );
      const availableUpgrades = upgradeDefs.filter((upgrade) => {
        if (!Array.isArray(upgrade.cost) || !Number.isFinite(upgrade.maxTier)) return false;
        const tier = getUpgradeTier(upgrade.id);
        if (tier >= upgrade.maxTier) return false;
        if (upgrade.requiresWeapon && !save.unlockedWeapons.includes(upgrade.requiresWeapon)) return false;
        if (upgrade.requiresNode && !hasNode(upgrade.requiresNode)) return false;
        return !upgrade.requiresQuest || isQuestComplete(upgrade.requiresQuest);
      });

      if (!availableWeaponUnlocks.length && !availableUpgrades.length) {
        const empty = doc.createElement("div");
        empty.className = "node";
        empty.textContent = hasQuestContent
          ? `No available skill nodes. Open Inventory to claim a Quest Cache for ${questCacheCost} QP.`
          : "No available skill nodes. Complete active quests to reveal the next branch.";
        container.appendChild(empty);
        return;
      }

      availableWeaponUnlocks.forEach((unlock) => {
        const weapon = weaponDefs[unlock.weaponId];
        const gateStatus = nodeGateStatus(unlock);
        const el = doc.createElement("div");
        el.className = `node ${gateStatus ? "locked" : "available"}`;
        appendTextElement(doc, el, "strong", `Unlock ${weapon.name}`);
        appendTextElement(doc, el, "span", weapon.description);
        el.appendChild(doc.createElement("br"));
        appendTextElement(doc, el, "span", `Branch: ${unlock.branch} | Cost: ${unlock.cost} QP`);
        el.appendChild(doc.createElement("br"));
        appendTextElement(doc, el, "span", gateStatus || "Ready to unlock");
        const iconSource = assetResolver?.weaponIcon?.(unlock.weaponId);
        if (iconSource) {
          const icon = doc.createElement("img");
          icon.className = "level-choice-icon";
          icon.src = iconSource;
          icon.alt = `${weapon.name} skill icon`;
          el.prepend?.(icon);
        }
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
        appendTextElement(doc, el, "strong", upgrade.name);
        appendTextElement(doc, el, "span", upgrade.description);
        el.appendChild(doc.createElement("br"));
        appendTextElement(doc, el, "span", `Tier: ${tier}/${upgrade.maxTier}`);
        el.appendChild(doc.createElement("br"));
        appendTextElement(doc, el, "span", canBuy ? `Next cost: ${nextCost} QP` : `Needs ${nextCost} QP`);
        const button = doc.createElement("button");
        button.textContent = `Buy Tier ${tier + 1}`;
        button.disabled = !canBuy;
        button.addEventListener("click", () => buyUpgrade(upgrade));
        el.appendChild(button);
        container.appendChild(el);
      });
    }

    function renderQuests(container) {
      if (!container) return;
      const doc = requireDocument(documentRef);
      const save = getSave();
      container.replaceChildren();
      const activeQuestIds = Object.keys(questDefs).filter((id) => save.activeQuests.includes(id));
      if (!activeQuestIds.length) {
        const empty = doc.createElement("div");
        empty.className = "quest";
        empty.textContent = hasQuestContent
          ? `No active quests. Open Inventory to spend ${questCacheCost} QP on a Quest Cache.`
          : "No active quests. Unlock the next available skill node to reveal one.";
        container.appendChild(empty);
        return;
      }

      activeQuestIds.forEach((id) => {
        const quest = questDefs[id];
        const progress = save.questProgress[id] || 0;
        const el = doc.createElement("div");
        el.className = "quest active";
        appendTextElement(doc, el, "strong", quest.name);
        appendTextElement(doc, el, "span", quest.description);
        el.appendChild(doc.createElement("br"));
        appendTextElement(doc, el, "span", "Status: Active");
        el.appendChild(doc.createElement("br"));
        appendTextElement(doc, el, "span", `Progress: ${Math.floor(progress)} / ${quest.target}`);
        el.appendChild(doc.createElement("br"));
        appendTextElement(doc, el, "span", `Reward: ${quest.rewardQp} QP`);
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

  function positiveIntegerOrDefault(value, fallback) {
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }

  function appendTextElement(documentRef, parent, tagName, text) {
    const element = documentRef.createElement(tagName);
    element.textContent = text;
    parent.appendChild(element);
    return element;
  }
})();
