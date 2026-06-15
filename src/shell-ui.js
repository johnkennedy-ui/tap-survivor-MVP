(() => {
function createShellUiController({
  ui,
  documentRef = document,
  getGame,
  getSave,
  relicDefs = [],
  relicSystem,
  shopSystem,
  startRun,
  exitRun,
  resetSave,
  closeLevelUpMenu,
  closeEndScreen,
  setGameSpeed,
  toggleAudioMute,
  isAudioMuted,
  persist,
  renderMeta,
}) {
  function openRunMenu() {
    ui.runMenu.classList.remove("hidden");
    ui.openMenu.setAttribute("aria-expanded", "true");
    ui.exitRun.disabled = !getGame()?.running;
    const game = getGame();
    if (game?.running && !game.paused) {
      game.paused = true;
      game.pauseReason = "menu";
    }
    showRunMenuTab("progress");
    shopSystem.renderShop();
    renderInventory();
    renderMeta();
  }

  function closeRunMenu(resume = true) {
    ui.runMenu.classList.add("hidden");
    ui.openMenu.setAttribute("aria-expanded", "false");
    const game = getGame();
    if (resume && game?.pauseReason === "menu") {
      game.paused = false;
      game.pauseReason = "";
    }
  }

  function showStartMenu() {
    ui.startMenu.classList.remove("hidden");
  }

  function closeStartMenu() {
    ui.startMenu.classList.add("hidden");
  }

  function toggleRunMenu() {
    if (ui.runMenu.classList.contains("hidden")) {
      openRunMenu();
      return;
    }
    closeRunMenu(true);
  }

  function isFullscreen() {
    return documentRef.fullscreenElement || documentRef.webkitFullscreenElement;
  }

  function updateFullscreenButton() {
    const fullscreen = Boolean(isFullscreen());
    const label = fullscreen ? "Exit Full Screen" : "Full Screen";
    ui.fullscreenButton.textContent = label;
    ui.startMenuFullscreen.textContent = label;
    ui.fullscreenButton.setAttribute("aria-pressed", String(fullscreen));
    ui.startMenuFullscreen.setAttribute("aria-pressed", String(fullscreen));
  }

  function toggleFullscreen() {
    const target = ui.canvas.parentElement || documentRef.documentElement;
    if (isFullscreen()) {
      const exitFullscreen = documentRef.exitFullscreen || documentRef.webkitExitFullscreen;
      const result = exitFullscreen?.call(documentRef);
      result?.catch?.(() => {});
      return;
    }

    const requestFullscreen = target.requestFullscreen || target.webkitRequestFullscreen;
    const result = requestFullscreen?.call(target);
    result?.catch?.(() => {});
  }

  function openShopMenu() {
    closeStartMenu();
    shopSystem.openShop();
  }

  function closeShopMenu() {
    shopSystem.closeShop();
    if (!getGame()?.running) showStartMenu();
  }

  function showRunMenuTab(tab) {
    const shop = tab === "shop";
    const inventory = tab === "inventory";
    ui.menuProgressTab.classList.toggle("active", tab === "progress");
    ui.menuShopTab.classList.toggle("active", shop);
    ui.menuInventoryTab.classList.toggle("active", inventory);
    ui.menuProgressPanel.classList.toggle("hidden", tab !== "progress");
    ui.menuShopPanel.classList.toggle("hidden", !shop);
    ui.menuInventoryPanel.classList.toggle("hidden", !inventory);
    if (shop) shopSystem.renderShop();
    if (inventory) renderInventory();
  }

  function renderInventory() {
    if (!ui.menuRelicSlots || !ui.menuRelicInventory || !relicSystem) return;
    const save = getSave();
    const slots = relicSystem.maxEquippedRelics(save);
    const equippedRelics = relicSystem.equippedRelics(save);
    const equipped = new Set(equippedRelics.map((relic) => relic.id));
    const unlocked = new Set(save.unlockedRelics || []);
    const nextLevel = slots >= 5 ? null : (slots + 1) * 10;
    ui.menuRelicSlots.textContent = `Relic slots: ${slots}/5 unlocked. ${nextLevel ? `Next slot at tower level ${nextLevel}.` : "Maximum slots unlocked."}`;
    ui.menuRelicInventory.innerHTML = "";
    const loadout = documentRef.createElement("div");
    loadout.className = "relic-loadout";
    loadout.appendChild(createCharacterPanel(save));

    const slotGrid = documentRef.createElement("div");
    slotGrid.className = "relic-slots";
    for (let index = 0; index < 5; index += 1) {
      slotGrid.appendChild(createRelicSlot(index, slots, equippedRelics[index]));
    }
    loadout.appendChild(slotGrid);
    ui.menuRelicInventory.appendChild(loadout);

    const availableRelics = relicDefs.filter((relic) => unlocked.has(relic.id) && !equipped.has(relic.id));
    const list = documentRef.createElement("div");
    list.className = "relic-inventory-list";
    if (!availableRelics.length) {
      const empty = documentRef.createElement("div");
      empty.className = "relic-item locked";
      empty.textContent = unlocked.size ? "No unequipped relics available." : "No relics unlocked yet. Defeat bosses to add relics here.";
      list.appendChild(empty);
      ui.menuRelicInventory.appendChild(list);
      return;
    }
    availableRelics.forEach((relic) => {
      const canEquip = equipped.size < slots;
      const el = documentRef.createElement("div");
      el.className = `relic-item ${canEquip ? "available" : "locked"}`;
      el.innerHTML = `
        <img class="relic-icon" src="${relic.iconPath || "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610"}" alt="" />
        <span>
          <strong>${relic.name}</strong>
          <span>${relic.description}</span>
        </span>
      `;
      const button = documentRef.createElement("button");
      button.textContent = canEquip ? "Equip" : "Slots Full";
      button.disabled = !canEquip;
      button.addEventListener("click", () => {
        if (relicSystem.setRelicEquipped(save, relic.id, true)) {
          persist?.();
          renderInventory();
          renderMeta();
        }
      });
      el.appendChild(button);
      list.appendChild(el);
    });
    ui.menuRelicInventory.appendChild(list);
  }

  function createCharacterPanel(save) {
    const panel = documentRef.createElement("div");
    panel.className = "relic-character-panel";
    const playerSprite = globalThis.TapSurvivorContent?.assets?.sprites?.player || "assets/kenney/desert-shooter/player.png?v=kenney-20260610";
    panel.innerHTML = `
      <img class="relic-character-sprite" src="${playerSprite}" alt="" />
      <span>
        <strong>Character</strong>
        <span>Tower level ${Math.max(1, save.towerFloor || 1)}</span>
      </span>
    `;
    return panel;
  }

  function createRelicSlot(index, unlockedSlots, relic) {
    const slot = documentRef.createElement("div");
    const unlockLevel = (index + 1) * 10;
    const unlocked = index < unlockedSlots;
    slot.className = `relic-slot ${unlocked ? relic ? "equipped" : "empty" : "locked"}`;
    if (!unlocked) {
      slot.innerHTML = `
        <span class="relic-slot-index">Slot ${index + 1}</span>
        <strong>Locked</strong>
        <span>Unlocked at tower level ${unlockLevel}.</span>
      `;
      return slot;
    }
    if (!relic) {
      slot.innerHTML = `
        <span class="relic-slot-index">Slot ${index + 1}</span>
        <strong>Empty relic slot</strong>
        <span>Equip an unlocked relic below.</span>
      `;
      return slot;
    }

    slot.innerHTML = `
      <img class="relic-icon" src="${relic.iconPath || "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610"}" alt="" />
      <span>
        <span class="relic-slot-index">Slot ${index + 1}</span>
        <strong>${relic.name}</strong>
        <span>${relic.description}</span>
      </span>
    `;
    const button = documentRef.createElement("button");
    button.textContent = "Unequip";
    button.addEventListener("click", () => {
      const save = getSave();
      if (relicSystem.setRelicEquipped(save, relic.id, false)) {
        persist?.();
        renderInventory();
        renderMeta();
      }
    });
    slot.appendChild(button);
    return slot;
  }

  function bind() {
    ui.startRun.addEventListener("click", startRun);
    ui.startMenuStartRun.addEventListener("click", startRun);
    ui.openShop.addEventListener("click", openShopMenu);
    ui.startMenuOpenShop.addEventListener("click", openShopMenu);
    ui.closeShop.addEventListener("click", closeShopMenu);
    ui.closeShopBottom.addEventListener("click", closeShopMenu);
    ui.openMenu.addEventListener("click", toggleRunMenu);
    ui.closeMenu.addEventListener("click", () => closeRunMenu(true));
    ui.menuProgressTab.addEventListener("click", () => showRunMenuTab("progress"));
    ui.menuShopTab.addEventListener("click", () => showRunMenuTab("shop"));
    ui.menuInventoryTab.addEventListener("click", () => showRunMenuTab("inventory"));
    ui.closeLevelUp.addEventListener("click", closeLevelUpMenu);
    ui.fullscreenButton.addEventListener("click", toggleFullscreen);
    ui.startMenuFullscreen.addEventListener("click", toggleFullscreen);
    ui.exitRun.addEventListener("click", exitRun);
    ui.resetSave.addEventListener("click", resetSave);
    ui.closeEnd.addEventListener("click", closeEndScreen);
    ui.closeEndX.addEventListener("click", closeEndScreen);
    documentRef.addEventListener?.("fullscreenchange", updateFullscreenButton);
    documentRef.addEventListener?.("webkitfullscreenchange", updateFullscreenButton);
    ui.speedButtons.forEach((button) => {
      button.addEventListener("click", () => setGameSpeed(Number(button.dataset.speed)));
    });
    ui.muteAudio?.addEventListener("click", () => updateMuteButton(toggleAudioMute?.()));
    updateMuteButton(isAudioMuted?.());
    updateFullscreenButton();
  }

  function updateMuteButton(muted = false) {
    if (!ui.muteAudio) return;
    ui.muteAudio.classList.toggle("active", Boolean(muted));
    ui.muteAudio.textContent = muted ? "Muted" : "Sound";
    ui.muteAudio.setAttribute("aria-pressed", String(Boolean(muted)));
  }

  return {
    bind,
    closeRunMenu,
    closeShopMenu,
    closeStartMenu,
    showStartMenu,
  };
}

globalThis.TapSurvivorShellUi = {
  createShellUiController,
};
})();
