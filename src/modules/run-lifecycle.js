export function createRunLifecycle({
  ui,
  getGame,
  getSave,
  resetGameState,
  shopSystem,
  shellUi,
  runUi,
  relicSystem,
  persist,
  renderMeta,
  updateRunHud,
  showMovementGateBanner,
}) {
  function startRun() {
    shellUi.closeStartFlow();
    shopSystem.closeShop();
    runUi.hideEndScreen();
    ui.levelUp.classList.add("hidden");
    shellUi.closeRunMenu(false);
    const game = resetGameState();
    game.awaitingFirstMoveInput = true;
    showMovementGateBanner();
  }

  function endRun(reason) {
    const game = getGame();
    if (!game) return;
    game.running = false;
    game.endReason = reason;
    runUi.showEndScreen(reason);
    persist();
    renderMeta();
  }

  function advanceTowerFloor() {
    const game = getGame();
    if (!game) return;
    const clearedFloor = game.towerFloor || 1;
    const relicDropCount = clearedFloor % 5 === 0 ? 2 : 1;
    showRelicChoice(clearedFloor, relicDropCount, []);
  }

  function showRelicChoice(clearedFloor, remainingPicks, awardedRelics) {
    const save = getSave();
    const game = getGame();
    const choices = relicSystem.relicChoices(save, game.player.equippedWeapons, 3);
    if (!choices.length) {
      finishBossClear(clearedFloor, awardedRelics);
      return;
    }
    game.paused = true;
    game.pauseReason = "relic";
    ui.relicChoiceTitle.textContent =
      remainingPicks > 1 ? `Choose Relic ${awardedRelics.length + 1}` : "Choose Relic";
    ui.relicChoiceText.textContent = "Pick one reward shaped by your current weapons.";
    ui.relicChoices.innerHTML = "";
    choices.forEach((relic) => {
      const button = document.createElement("button");
      button.className = relic.rarity === "green" ? "green-relic" : "";
      if (relic.backgroundColor && typeof button.style?.setProperty === "function") {
        button.style.setProperty("--relic-bg", relic.backgroundColor);
      } else if (relic.backgroundColor && button.style) {
        button.style["--relic-bg"] = relic.backgroundColor;
      }
      button.innerHTML = `
        <img class="level-choice-icon" src="${relic.iconPath || "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610"}" alt="" />
        <strong>${relic.name}</strong><br /><span>${relic.description}</span>
        ${relic.specialAbility ? `<br /><span>${relic.specialAbility.label}: ${relic.specialAbility.description}</span>` : ""}
      `;
      button.addEventListener("click", () => {
        const granted = relicSystem.grantRelic(save, relic);
        const nextAwarded = granted ? [...awardedRelics, granted] : awardedRelics;
        if (remainingPicks > 1) {
          showRelicChoice(clearedFloor, remainingPicks - 1, nextAwarded);
        } else {
          finishBossClear(clearedFloor, nextAwarded);
        }
      });
      ui.relicChoices.appendChild(button);
    });
    ui.relicChoice.classList.remove("hidden");
  }

  function finishBossClear(clearedFloor, awardedRelics) {
    const save = getSave();
    ui.relicChoice.classList.add("hidden");
    save.towerFloor = Math.max(save.towerFloor || 1, clearedFloor + 1);
    persist();
    const game = resetGameState();
    game.lastFloorClear = {
      floor: clearedFloor,
      relicName: awardedRelics.length
        ? awardedRelics.map((relic) => relic.name).join(" + ")
        : "No locked relics remaining",
    };
    updateRunHud();
    renderMeta();
  }

  return {
    advanceTowerFloor,
    endRun,
    startRun,
  };
}
