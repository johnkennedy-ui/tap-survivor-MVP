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
  } = options;

  if (!presenter || typeof presenter.createInventoryViewModel !== "function") {
    throw new Error("Missing Tap Survivor module shell relic UI dependency: presenter");
  }
  if (!documentRef || typeof documentRef.createElement !== "function") {
    throw new Error("Missing Tap Survivor module shell relic UI dependency: documentRef");
  }
  if (!root || typeof root.appendChild !== "function") {
    throw new Error("Missing Tap Survivor module shell relic UI dependency: root");
  }

  function renderShellRelics(save = {}) {
    return renderViewModel(presenter.createInventoryViewModel(save));
  }

  function renderViewModel(model) {
    clearRoot(root);
    root.appendChild(createSummary(model));
    root.appendChild(createSlotList(model));
    root.appendChild(createAvailableList(model));
    return model;
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
    return summary;
  }

  function createSlotList(model) {
    const list = documentRef.createElement("section");
    list.className = "shell-relic-slots";
    model.slots.forEach((slot) => {
      const item = documentRef.createElement("article");
      item.className = `shell-relic-slot ${slot.unlocked ? "unlocked" : "locked"} ${slot.relic ? "equipped" : "empty"}`;
      item.dataset.slotIndex = String(slot.index);
      item.textContent = slot.relic
        ? `${slot.label}: ${slot.relic.name}`
        : slot.unlocked
          ? `${slot.label}: Empty relic slot`
          : `${slot.label}: Locked until tower level ${slot.unlockLevel}`;
      if (slot.relic) {
        const button = documentRef.createElement("button");
        button.type = "button";
        button.textContent = "Unequip";
        button.addEventListener("click", () => onUnequip?.(slot.relic, model));
        item.appendChild(button);
      }
      list.appendChild(item);
    });
    return list;
  }

  function createAvailableList(model) {
    const list = documentRef.createElement("section");
    list.className = "shell-relic-available";
    model.availableRelics.forEach((relic) => {
      const button = documentRef.createElement("button");
      button.type = "button";
      button.className = `shell-relic-row ${relic.unlocked ? "available" : "locked"}`;
      button.disabled = !relic.unlocked;
      button.dataset.relicId = relic.id;
      button.textContent = `${relic.name}${relic.linkedSkill ? ` (${relic.linkedSkill.name})` : ""}`;
      button.addEventListener("click", () => {
        if (relic.unlocked) onSelect?.(relic, model);
      });
      list.appendChild(button);
    });
    return list;
  }

  return {
    renderShellRelics,
    renderViewModel,
  };
}

function clearRoot(root) {
  if (typeof root.replaceChildren === "function") {
    root.replaceChildren();
    return;
  }
  root.innerHTML = "";
  if (Array.isArray(root.children)) root.children.length = 0;
}
