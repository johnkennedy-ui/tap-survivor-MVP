/**
 * @param {any} [options]
 */
export function createShellRelicUiAdapter(options = {}) {
  const {
    presenter,
    documentRef,
    root,
    onEquip,
    onUnequip,
    onSelect,
    onLockedSelect,
    getSave,
    relicSystem,
    persist,
    renderMeta,
    scheduler = {},
    lockPopupDelayMs = 1800,
    previewAdapter = {},
  } = options;
  let lockPopup = null;
  let lockPopupHideTimer = null;
  const previewDisposers = [];

  if (!presenter || typeof presenter.createInventoryViewModel !== "function") {
    throw new Error("Missing Tap Survivor module shell relic UI dependency: presenter");
  }
  if (!documentRef || typeof documentRef.createElement !== "function") {
    throw new Error("Missing Tap Survivor module shell relic UI dependency: documentRef");
  }
  if (!root || typeof root.appendChild !== "function") {
    throw new Error("Missing Tap Survivor module shell relic UI dependency: root");
  }

  function renderShellRelics(save = {}, renderOptions = {}) {
    return renderViewModel(presenter.createInventoryViewModel(save), renderOptions);
  }

  function renderViewModel(model, renderOptions = {}) {
    const selectedRelicId = renderOptions.selectedRelicId || model.selectedRelicId || "";
    const selectedRelic = findRelic(model, selectedRelicId);
    clearRoot(root);
    root.appendChild(createCharacterPanel(model));
    root.appendChild(createSummary(model));
    root.appendChild(createSlotList(model));
    root.appendChild(createAvailableList(model, selectedRelicId));
    if (selectedRelic) root.appendChild(createDetail(model, selectedRelic));
    return model;
  }

  function createCharacterPanel(model) {
    const panel = documentRef.createElement("section");
    panel.className = "relic-character-panel";
    appendText(documentRef, panel, "strong", "Character");
    appendText(documentRef, panel, "span", `Tower level ${model.towerFloor}`);
    return panel;
  }

  function createSummary(model) {
    const summary = documentRef.createElement("section");
    summary.className = "shell-relic-summary";
    model.summaryRows.forEach((row) => {
      const item = documentRef.createElement("div");
      item.className = "shell-relic-summary-row";
      item.textContent = `${row.label}: ${row.value}`;
      summary.appendChild(item);
    });
    appendText(documentRef, summary, "div", `Can equip more: ${model.canEquipMore ? "Yes" : "No"}`, {
      className: "shell-relic-summary-row",
    });
    appendBonusRows(documentRef, summary, "Run-start bonuses", model.bonuses?.startingRunUpgradeTiers);
    appendBonusRows(documentRef, summary, "Max-tier bonuses", model.bonuses?.maxTierBonuses);
    appendModifierRows(documentRef, summary, model.specialModifiers);
    return summary;
  }

  function createSlotList(model) {
    const list = documentRef.createElement("section");
    list.className = "shell-relic-slots";
    model.slots.forEach((slot) => {
      const item = documentRef.createElement("article");
      const relic = slot.relic;
      item.className = [
        "relic-slot",
        slot.unlocked ? "unlocked" : "locked",
        relic ? "equipped" : "empty",
        relic?.rarity === "green" ? "green-relic" : "",
      ]
        .filter(Boolean)
        .join(" ");
      item.dataset.slotIndex = String(slot.index);
      if (relic) item.dataset.relicId = relic.id;
      setRelicBackground(item, relic);
      appendText(documentRef, item, "span", slot.label, { className: "relic-slot-index" });
      if (!slot.unlocked) {
        appendText(documentRef, item, "strong", "Locked");
        appendText(documentRef, item, "span", `Unlocked at tower level ${slot.unlockLevel}.`);
      } else if (!relic) {
        appendText(documentRef, item, "strong", "Empty relic slot");
        appendText(documentRef, item, "span", "Equip an unlocked relic below.");
      } else {
        item.appendChild(createRelicImage(documentRef, relic));
        appendText(documentRef, item, "strong", relic.name);
        appendText(documentRef, item, "span", relic.description);
        const button = documentRef.createElement("button");
        button.type = "button";
        button.textContent = "Unequip";
        button.dataset.action = "unequip";
        button.addEventListener("click", () => {
          const changed = commitRelicState(relic, false);
          onUnequip?.(relic, model, { changed });
        });
        item.appendChild(button);
      }
      list.appendChild(item);
    });
    return list;
  }

  function createAvailableList(model, selectedRelicId) {
    const list = documentRef.createElement("section");
    list.className = "relic-icon-grid shell-relic-available";
    if (!model.availableRelics.length) {
      appendText(documentRef, list, "div", "All relics are equipped.", { className: "relic-item locked" });
      return list;
    }
    model.availableRelics.forEach((relic) => {
      const button = documentRef.createElement("button");
      button.type = "button";
      button.className = [
        "relic-icon-button",
        "shell-relic-row",
        relic.unlocked ? "available" : "locked",
        relic.id === selectedRelicId ? "selected" : "",
        relic.rarity === "green" ? "green-relic" : "",
      ]
        .filter(Boolean)
        .join(" ");
      button.disabled = false;
      button.dataset.relicId = relic.id;
      button.dataset.unlocked = String(relic.unlocked);
      setAriaLabel(button, relic.unlocked ? `View ${relic.name}` : `${relic.name} locked`);
      setRelicBackground(button, relic);
      button.appendChild(createRelicImage(documentRef, relic));
      appendText(documentRef, button, "span", relic.name);
      if (!relic.unlocked) appendText(documentRef, button, "em", "Locked", { className: "relic-lock-badge" });
      if (relic.linkedSkill) appendText(documentRef, button, "span", `Linked skill: ${relic.linkedSkill.name}`);
      button.addEventListener("click", () => {
        if (relic.unlocked) onSelect?.(relic, model);
        else {
          showLockedMessage();
          onLockedSelect?.(relic, model);
        }
      });
      list.appendChild(button);
    });
    return list;
  }

  function createDetail(model, relic) {
    const detail = documentRef.createElement("section");
    detail.className = `relic-detail-screen ${relic.rarity === "green" ? "green-relic" : ""}`;
    detail.dataset.relicId = relic.id;
    setRelicBackground(detail, relic);
    detail.appendChild(createRelicPreview(relic));
    appendText(documentRef, detail, "span", "Selected relic", { className: "relic-slot-index" });
    appendText(documentRef, detail, "strong", relic.name);
    appendText(documentRef, detail, "p", relic.description);
    if (relic.specialAbility) {
      appendText(documentRef, detail, "p", `${relic.specialAbility.label}: ${relic.specialAbility.description}`, {
        className: "relic-special-ability",
      });
    }
    if (relic.linkedSkill) appendText(documentRef, detail, "p", `Linked skill: ${relic.linkedSkill.name}`);

    const actions = documentRef.createElement("div");
    actions.className = "relic-detail-actions";
    const equipButton = documentRef.createElement("button");
    equipButton.type = "button";
    equipButton.textContent = "Equip relic";
    equipButton.dataset.action = "equip";
    equipButton.disabled = !relic.unlocked || relic.equipped || !model.canEquipMore;
    equipButton.addEventListener("click", () => {
      if (!equipButton.disabled) {
        const changed = commitRelicState(relic, true);
        onEquip?.(relic, model, { changed });
      }
    });
    const cancelButton = documentRef.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    cancelButton.dataset.action = "cancel";
    cancelButton.addEventListener("click", () => onSelect?.(null, model));
    actions.appendChild(equipButton);
    actions.appendChild(cancelButton);
    detail.appendChild(actions);
    return detail;
  }

  return {
    dispose,
    renderShellRelics,
    renderViewModel,
    showLockedMessage,
  };

  function commitRelicState(relic, equipped) {
    const save = getSave?.();
    const changed = Boolean(save && relicSystem?.setRelicEquipped?.(save, relic.id, equipped));
    if (!changed) return false;
    persist?.(save);
    renderShellRelics(save);
    renderMeta?.(save);
    return true;
  }

  function showLockedMessage() {
    if (!lockPopup) {
      lockPopup = documentRef.createElement("div");
      lockPopup.className = "relic-lock-popup";
      root.appendChild(lockPopup);
    }
    lockPopup.textContent = "Locked, play more to unlock this skill.";
    removeClass(lockPopup, "hidden");
    if (lockPopupHideTimer) scheduler.clearTimeout?.(lockPopupHideTimer);
    lockPopupHideTimer =
      scheduler.setTimeout?.(() => {
        if (lockPopup?.isConnected !== false) addClass(lockPopup, "hidden");
        lockPopupHideTimer = null;
      }, lockPopupDelayMs) || null;
    return lockPopup;
  }

  function dispose() {
    if (lockPopupHideTimer) scheduler.clearTimeout?.(lockPopupHideTimer);
    lockPopupHideTimer = null;
    while (previewDisposers.length) previewDisposers.pop()?.();
  }

  function createRelicPreview(relic) {
    const sprite = previewAdapter.runUpgradeSprite?.(relic.targetUpgradeId);
    const frames = Array.isArray(sprite?.frames) ? sprite.frames : [];
    const source = previewAdapter.spriteSource?.(sprite) || sprite?.src || sprite?.path || sprite?.iconSrc || "";
    if (frames.length && source && previewAdapter.createCanvas && previewAdapter.createImage) {
      const canvas =
        previewAdapter.createCanvas({
          className: "relic-detail-preview relic-detail-canvas",
          height: 112,
          relic,
          sprite,
          width: 112,
        }) || documentRef.createElement("canvas");
      canvas.className = "relic-detail-preview relic-detail-canvas";
      canvas.width = 112;
      canvas.height = 112;
      if (startAnimatedPreview({ canvas, frames, relic, source, sprite })) return canvas;
    }
    return createRelicImage(documentRef, relic, "relic-detail-preview");
  }

  function startAnimatedPreview({ canvas, frames, relic, source, sprite }) {
    const context = previewAdapter.getContext?.(canvas, { willReadFrequently: true }) || canvas.getContext?.("2d", { willReadFrequently: true });
    const image = previewAdapter.createImage?.({ relic, source, sprite });
    if (!context || !image) return false;
    let frameIndex = 0;
    let timer = null;
    let stopped = false;

    function drawFrame() {
      if (stopped || canvas.isConnected === false) return;
      const frame = frames[frameIndex % frames.length];
      frameIndex += 1;
      previewAdapter.clearFrame?.({ canvas, context, sprite });
      if (!previewAdapter.clearFrame) context.clearRect?.(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = false;
      previewAdapter.drawFrame?.({ canvas, context, frame, image, sprite });
      if (!previewAdapter.drawFrame) {
        context.drawImage?.(image, frame.x, frame.y, frame.width, frame.height, 0, 0, canvas.width, canvas.height);
      }
      previewAdapter.applyTransparency?.({ canvas, context, sprite });
      timer = scheduler.setTimeout?.(drawFrame, 1000 / Math.max(1, sprite.fps || 10)) || null;
    }

    const onLoad = () => drawFrame();
    if (typeof image.addEventListener === "function") image.addEventListener("load", onLoad, { once: true });
    else previewAdapter.onImageLoad?.(image, onLoad) ?? onLoad();
    if ("src" in image) image.src = source;
    else previewAdapter.setImageSource?.(image, source);
    previewDisposers.push(() => {
      stopped = true;
      if (timer) scheduler.clearTimeout?.(timer);
      previewAdapter.disposeImage?.(image);
    });
    return true;
  }
}

/**
 * Classic shell relic UI compatibility adapter.
 *
 * This preserves the production API consumed by src/shell-ui.js while keeping
 * the implementation in the module tree for generated bridge output.
 *
 * @param {any} [options]
 */
export function createShellRelicUi(options = {}) {
  const {
    ui,
    content = {},
    documentRef = document,
    assetResolver,
    getSave,
    relicDefs = [],
    relicSystem,
    persist,
    renderMeta,
    scheduler = {
      clearTimeout: (timer) => clearTimeout(timer),
      setTimeout: (callback, delay) => setTimeout(callback, delay),
      animationSetTimeout: (callback, delay) => setTimeout(callback, delay),
    },
    imageFactory = () => (typeof Image === "undefined" ? null : new Image()),
  } = options;

  function renderInventory() {
    if (!ui.menuRelicSlots || !ui.menuRelicInventory || !relicSystem) return;
    const save = getSave();
    const slots = relicSystem.maxEquippedRelics(save);
    const equippedRelics = relicSystem.equippedRelics(save);
    const equipped = new Set(equippedRelics.map((relic) => relic.id));
    const unlocked = new Set(save.unlockedRelics || []);
    const nextLevel = slots >= 5 ? null : (slots + 1) * 10;
    ui.menuRelicSlots.textContent = `Relic slots: ${slots}/5 unlocked. ${
      nextLevel ? `Next slot at tower level ${nextLevel}.` : "Maximum slots unlocked."
    }`;
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
    button.className = `relic-icon-button ${isUnlocked ? "available" : "locked"} ${
      relic.rarity === "green" ? "green-relic" : ""
    }`;
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
    scheduler.clearTimeout?.(popup.hideTimer);
    popup.hideTimer = scheduler.setTimeout?.(() => {
      if (popup.isConnected) popup.classList.add("hidden");
    }, 1800);
  }

  function openRelicDetail(relic) {
    const save = getSave();
    const slots = relicSystem.maxEquippedRelics(save);
    const equippedRelics = relicSystem.equippedRelics(save);
    const canEquip = equippedRelics.length < slots;
    const skill = (content?.runUpgrades || []).find((upgrade) => upgrade.id === relic.targetUpgradeId);
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
    const image = imageFactory();
    if (frames.length && image) {
      const canvas = documentRef.createElement("canvas");
      canvas.className = "relic-detail-preview relic-detail-canvas";
      canvas.width = 112;
      canvas.height = 112;
      if (animateRelicSkillPreview(canvas, sprite, image)) return canvas;
    }
    const fallbackImage = documentRef.createElement("img");
    fallbackImage.className = "relic-detail-preview";
    fallbackImage.src = relicIconSrc(relic);
    fallbackImage.alt = "";
    return fallbackImage;
  }

  function animateRelicSkillPreview(canvas, sprite, image) {
    const ctx = canvas.getContext?.("2d", { willReadFrequently: true });
    const frames = Array.isArray(sprite?.frames) ? sprite.frames : [];
    const src = assetResolver.spriteSource(sprite);
    if (!ctx || !frames.length || !src) return false;
    let frameIndex = 0;
    function drawFrame() {
      if (canvas.isConnected === false) return;
      const frame = frames[frameIndex % frames.length];
      frameIndex += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, frame.x, frame.y, frame.width, frame.height, 0, 0, canvas.width, canvas.height);
      applyPreviewTransparency(ctx, canvas.width, canvas.height, sprite);
      scheduler.animationSetTimeout?.(drawFrame, 1000 / Math.max(1, sprite.fps || 10));
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
    const playerSprite = content?.assets?.sprites?.player || "assets/kenney/desert-shooter/player.png?v=kenney-20260610";
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
    slot.className = `relic-slot ${unlocked ? (relic ? "equipped" : "empty") : "locked"} ${relic?.rarity === "green" ? "green-relic" : ""}`;
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

  return {
    renderInventory,
  };
}

function appendBonusRows(documentRef, parent, label, values = {}) {
  Object.entries(values)
    .filter(([, value]) => value)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([key, value]) => {
      appendText(documentRef, parent, "div", `${label}: ${key} +${value}`, { className: "shell-relic-bonus-row" });
    });
}

function appendModifierRows(documentRef, parent, modifiers = []) {
  modifiers.forEach((modifier) => {
    appendText(documentRef, parent, "div", `Special modifier: ${modifier.key} +${modifier.value}`, {
      className: "shell-relic-special-row",
    });
  });
}

function findRelic(model, relicId) {
  if (!relicId) return null;
  return [...(model.equippedRelics || []), ...(model.availableRelics || [])].find((relic) => relic.id === relicId) || null;
}

function createRelicImage(documentRef, relic, className = "relic-icon") {
  const image = documentRef.createElement("img");
  image.className = className;
  image.src = relic?.iconSrc || "";
  image.alt = "";
  return image;
}

function appendText(documentRef, parent, tagName, text, attributes = {}) {
  const item = documentRef.createElement(tagName);
  item.textContent = text;
  Object.assign(item, attributes);
  parent.appendChild(item);
  return item;
}

function setAriaLabel(element, label) {
  if (typeof element.setAttribute === "function") element.setAttribute("aria-label", label);
  else element.ariaLabel = label;
}

function setRelicBackground(element, relic) {
  if (!element?.style || !relic?.backgroundColor) return;
  if (typeof element.style.setProperty === "function") element.style.setProperty("--relic-bg", relic.backgroundColor);
  else element.style["--relic-bg"] = relic.backgroundColor;
}

function addClass(element, className) {
  const current = new Set(String(element.className || "").split(/\s+/).filter(Boolean));
  current.add(className);
  element.className = [...current].join(" ");
}

function removeClass(element, className) {
  const current = new Set(String(element.className || "").split(/\s+/).filter(Boolean));
  current.delete(className);
  element.className = [...current].join(" ");
}

function clearRoot(root) {
  if (typeof root.replaceChildren === "function") {
    root.replaceChildren();
    return;
  }
  root.innerHTML = "";
  if (Array.isArray(root.children)) root.children.length = 0;
}
