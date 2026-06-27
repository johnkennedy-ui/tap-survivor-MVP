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
