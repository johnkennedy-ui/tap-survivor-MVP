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
  playStartLaugh,
  toggleAudioMute,
  isAudioMuted,
  persist,
  renderMeta,
}) {
  const assetResolver = globalThis.TapSurvivorAssets?.createAssetResolver?.() || {
    relicIcon: (relic) => relic?.iconPath || globalThis.TapSurvivorContent?.assets?.sprites?.ui?.quest || "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610",
    runUpgradeSprite: (upgradeId) => globalThis.TapSurvivorContent?.assets?.sprites?.runUpgrades?.[upgradeId],
    spriteSource: (definition) => typeof definition === "string" ? definition : definition?.src || definition?.path || definition?.iconSrc || "",
  };
  let currentScreen = "title";
  let startTransitionTimer = 0;

  function openRunMenu() {
    if (currentScreen === "startingTransition") return;
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
    ui.titleScreen?.classList.add("hidden");
    ui.startTransition?.classList.add("hidden");
    ui.startMenu.classList.remove("hidden");
    currentScreen = "start";
  }

  function closeStartMenu() {
    ui.startMenu.classList.add("hidden");
    currentScreen = "game";
  }

  function startGameFromTitle() {
    if (currentScreen !== "title") return;
    playStartLaugh?.();
    currentScreen = "startingTransition";
    ui.titleScreen?.classList.add("hidden");
    ui.startTransition?.classList.remove("hidden");
    if (startTransitionTimer) clearTimeout(startTransitionTimer);
    startTransitionTimer = setTimeout(() => {
      startTransitionTimer = 0;
      showStartMenu();
    }, 450);
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

    const inventoryRelics = relicDefs.filter((relic) => !equipped.has(relic.id));
    const list = documentRef.createElement("div");
    list.className = "relic-icon-grid";
    if (!inventoryRelics.length) {
      const empty = documentRef.createElement("div");
      empty.className = "relic-item locked";
      empty.textContent = "All relics are equipped.";
      list.appendChild(empty);
      ui.menuRelicInventory.appendChild(list);
      return;
    }
    inventoryRelics.forEach((relic) => {
      list.appendChild(createRelicIconButton(relic, unlocked.has(relic.id)));
    });
    ui.menuRelicInventory.appendChild(list);
  }

  function createRelicIconButton(relic, isUnlocked = true) {
    const button = documentRef.createElement("button");
    button.className = `relic-icon-button ${isUnlocked ? "available" : "locked"} ${relic.rarity === "green" ? "green-relic" : ""}`;
    setRelicBackground(button, relic);
    button.type = "button";
    button.setAttribute("aria-label", isUnlocked ? `View ${relic.name}` : `${relic.name} locked`);
    button.innerHTML = `
      <img class="relic-icon" src="${relicIconSrc(relic)}" alt="" />
      <span>${relic.name}</span>
      ${isUnlocked ? "" : '<em class="relic-lock-badge">Locked</em>'}
    `;
    button.addEventListener("click", () => {
      if (!isUnlocked) {
        showRelicLockedMessage();
        return;
      }
      openRelicDetail(relic);
    });
    return button;
  }

  function relicIconSrc(relic) {
    return assetResolver.relicIcon(relic);
  }

  function showRelicLockedMessage() {
    if (!ui.menuRelicInventory) return;
    let popup = ui.menuRelicInventory.querySelector?.(".relic-lock-popup");
    if (!popup) {
      popup = documentRef.createElement("div");
      popup.className = "relic-lock-popup";
      ui.menuRelicInventory.prepend?.(popup) || ui.menuRelicInventory.appendChild(popup);
    }
    popup.textContent = "Locked, play more to unlock this skill.";
    popup.classList.remove("hidden");
    globalThis.clearTimeout?.(popup.hideTimer);
    popup.hideTimer = globalThis.setTimeout?.(() => {
      if (popup.isConnected) popup.classList.add("hidden");
    }, 1800);
  }

  function openRelicDetail(relic) {
    const save = getSave();
    const slots = relicSystem.maxEquippedRelics(save);
    const equippedRelics = relicSystem.equippedRelics(save);
    const canEquip = equippedRelics.length < slots;
    const skill = (globalThis.TapSurvivorContent?.runUpgrades || []).find((upgrade) => upgrade.id === relic.targetUpgradeId);
    ui.menuRelicSlots.textContent = relic.name;
    ui.menuRelicInventory.innerHTML = "";

    const detail = documentRef.createElement("div");
    detail.className = `relic-detail-screen ${relic.rarity === "green" ? "green-relic" : ""}`;
    setRelicBackground(detail, relic);
    const preview = createRelicSkillPreview(relic);
    detail.appendChild(preview);
    const copy = documentRef.createElement("div");
    copy.className = "relic-detail-copy";
    copy.innerHTML = `
      <span class="relic-slot-index">Selected relic</span>
      <strong>${relic.name}</strong>
      <p>${relic.description}</p>
      ${relic.specialAbility ? `<p><strong>${relic.specialAbility.label}</strong>: ${relic.specialAbility.description}</p>` : ""}
      ${skill ? `<p>Linked skill: ${skill.name}</p>` : ""}
    `;
    detail.appendChild(copy);

    const actions = documentRef.createElement("div");
    actions.className = "relic-detail-actions";
    const equipButton = documentRef.createElement("button");
    equipButton.type = "button";
    equipButton.textContent = "Equip relic";
    equipButton.disabled = !canEquip;
    equipButton.addEventListener("click", () => {
      if (relicSystem.setRelicEquipped(save, relic.id, true)) {
        persist?.();
        renderInventory();
        renderMeta();
      }
    });
    const cancelButton = documentRef.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", renderInventory);
    actions.appendChild(equipButton);
    actions.appendChild(cancelButton);
    detail.appendChild(actions);
    ui.menuRelicInventory.appendChild(detail);
  }

  function createRelicSkillPreview(relic) {
    const sprite = assetResolver.runUpgradeSprite(relic.targetUpgradeId);
    const frames = Array.isArray(sprite?.frames) ? sprite.frames : [];
    if (frames.length && typeof Image !== "undefined") {
      const canvas = documentRef.createElement("canvas");
      canvas.className = "relic-detail-preview relic-detail-canvas";
      canvas.width = 112;
      canvas.height = 112;
      if (animateRelicSkillPreview(canvas, sprite)) return canvas;
    }
    const image = documentRef.createElement("img");
    image.className = "relic-detail-preview";
    image.src = relicIconSrc(relic);
    image.alt = "";
    return image;
  }

  function animateRelicSkillPreview(canvas, sprite) {
    const ctx = canvas.getContext?.("2d", { willReadFrequently: true });
    const frames = Array.isArray(sprite?.frames) ? sprite.frames : [];
    const src = assetResolver.spriteSource(sprite);
    if (!ctx || !frames.length || !src) return false;
    const image = new Image();
    let frameIndex = 0;
    function drawFrame() {
      if (canvas.isConnected === false) return;
      const frame = frames[frameIndex % frames.length];
      frameIndex += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, frame.x, frame.y, frame.width, frame.height, 0, 0, canvas.width, canvas.height);
      applyPreviewTransparency(ctx, canvas.width, canvas.height, sprite);
      globalThis.setTimeout?.(drawFrame, 1000 / Math.max(1, sprite.fps || 10));
    }
    image.addEventListener?.("load", drawFrame, { once: true });
    image.src = src;
    return true;
  }

  function applyPreviewTransparency(ctx, width, height, sprite) {
    const color = sprite?.transparentColor;
    if (!Array.isArray(color) || color.length < 3) return;
    const tolerance = Math.max(0, Number(sprite.transparentTolerance ?? 28));
    try {
      const pixels = ctx.getImageData(0, 0, width, height);
      const data = pixels.data;
      for (let index = 0; index < data.length; index += 4) {
        const delta = Math.abs(data[index] - color[0]) + Math.abs(data[index + 1] - color[1]) + Math.abs(data[index + 2] - color[2]);
        if (delta <= tolerance) data[index + 3] = 0;
      }
      ctx.putImageData(pixels, 0, 0);
    } catch {
      // If a browser blocks pixel reads, the preview still shows the untrimmed frame.
    }
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
    slot.className = `relic-slot ${unlocked ? relic ? "equipped" : "empty" : "locked"} ${relic?.rarity === "green" ? "green-relic" : ""}`;
    setRelicBackground(slot, relic);
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
      <img class="relic-icon" src="${relicIconSrc(relic)}" alt="" />
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

  function setRelicBackground(element, relic) {
    if (!element?.style || !relic?.backgroundColor) return;
    if (typeof element.style.setProperty === "function") element.style.setProperty("--relic-bg", relic.backgroundColor);
    else element.style["--relic-bg"] = relic.backgroundColor;
  }

  function bind() {
    ui.startRun?.addEventListener("click", startRun);
    ui.titleStartGame?.addEventListener("click", startGameFromTitle);
    ui.startMenuStartRun.addEventListener("click", startRun);
    ui.openShop?.addEventListener("click", openShopMenu);
    ui.startMenuOpenShop?.addEventListener("click", openShopMenu);
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
    ui.resetSave?.addEventListener("click", resetSave);
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
    startGameFromTitle,
    showStartMenu,
  };
}

globalThis.TapSurvivorShellUi = {
  createShellUiController,
};
})();
