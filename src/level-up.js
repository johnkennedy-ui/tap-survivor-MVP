(() => {
function shuffleChoices(choices) {
  return choices
    .map((choice) => ({ choice, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ choice }) => choice);
}

function weightedChoices(choices, weightForChoice) {
  return choices
    .map((choice) => ({
      choice,
      sort: Math.random() / Math.max(1, weightForChoice(choice)),
    }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ choice }) => choice);
}

function createLevelUpSystem({
  ui,
  weaponDefs,
  runUpgradeDefs,
  relicDefs,
  getSave,
  getGame,
  getRunUpgradeTier,
  maxEquippedWeapons,
  activeQuestWeaponIds,
  playChoiceSfx,
}) {
  const skillIconByRunUpgrade = {
    run_move_speed: "speed",
    run_pickup_radius: "pickupRadius",
    run_max_hp: "maxHp",
    run_attack_radius: "attackRadius",
    run_fire_rate: "fireRate",
    run_flat_damage: "flatDamage",
    run_percent_damage: "percentDamage",
  };
  const shopIconByStat = new Map(
    (globalThis.TapSurvivorContent?.shopItems || [])
      .filter((item) => item.effect?.stat && item.spritePath)
      .map((item) => [item.effect.stat, item.spritePath]),
  );
  const weaponIcons = globalThis.TapSurvivorContent?.assets?.sprites?.weapons || {};
  const runUpgradeIcons = globalThis.TapSurvivorContent?.assets?.sprites?.runUpgrades || {};
  const fallbackSkillIcon = globalThis.TapSurvivorContent?.assets?.sprites?.ui?.quest || "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610";

  function iconDefinitionForChoice(choice) {
    if (choice.weaponId) return weaponIcons[choice.weaponId] || fallbackSkillIcon;
    if (choice.runUpgradeId) return runUpgradeIcons[choice.runUpgradeId] || shopIconByStat.get(skillIconByRunUpgrade[choice.runUpgradeId]) || fallbackSkillIcon;
    return fallbackSkillIcon;
  }

  function spritePath(definition) {
    if (typeof definition === "string") return definition;
    if (definition && typeof definition === "object") return definition.src || definition.path || "";
    return "";
  }

  function showLevelUp() {
    const game = getGame();
    if (!game) return;
    const save = getSave();
    game.paused = true;
    game.pauseReason = "level";
    ui.choices.innerHTML = "";
    const maxWeapons = maxEquippedWeapons?.() || 4;
    const canEquipWeapon = game.player.equippedWeapons.length < maxWeapons;
    const weaponChoices = canEquipWeapon
      ? save.unlockedWeapons
        .filter((weaponId) => !game.player.equippedWeapons.includes(weaponId))
        .map((weaponId) => ({
          weaponId,
          name: weaponDefs[weaponId].name,
          description: `Equip ${weaponDefs[weaponId].name} for this run. Weapon ${game.player.equippedWeapons.length + 1}/${maxWeapons}.`,
          apply: () => game.player.equippedWeapons.push(weaponId),
        }))
      : [];
    const questWeaponIds = activeQuestWeaponIds();
    const questWeaponChoices = weaponChoices.filter((choice) =>
      questWeaponIds.includes(choice.weaponId),
    );
    const otherWeaponChoices = weaponChoices.filter((choice) => !questWeaponChoices.includes(choice));
    const activeRelics = (save.equippedRelics || [])
      .map((id) => (relicDefs || []).find((relic) => relic.id === id))
      .filter(Boolean);
    function relicBonusFor(upgradeId, field) {
      return activeRelics
        .filter((relic) => relic.targetUpgradeId === upgradeId)
        .reduce((total, relic) => total + (relic[field] || 0), 0);
    }
    const runUpgradeChoices = runUpgradeDefs
      .filter((upgrade) => getRunUpgradeTier(upgrade.id) < upgrade.maxTier + relicBonusFor(upgrade.id, "maxTierBonus"))
      .map((upgrade) => {
        const tier = getRunUpgradeTier(upgrade.id);
        const maxTier = upgrade.maxTier + relicBonusFor(upgrade.id, "maxTierBonus");
        return {
          name: `${upgrade.name} ${tier + 1}`,
          description: `${upgrade.description} Tier ${tier + 1}/${maxTier}.`,
          family: upgrade.family || upgrade.id,
          relicWeightBonus: relicBonusFor(upgrade.id, "selectionWeightBonus"),
          runUpgradeId: upgrade.id,
          apply: () => {
            game.runUpgradeTiers[upgrade.id] = tier + 1;
            upgrade.apply?.(game);
          },
        };
      });
    const familyTiers = runUpgradeDefs.reduce((totals, upgrade) => {
      const family = upgrade.family || upgrade.id;
      totals[family] = (totals[family] || 0) + getRunUpgradeTier(upgrade.id);
      return totals;
    }, {});
    const recentChoiceIds = new Set(game.lastLevelUpChoiceIds || []);
    const otherChoicePool = [...otherWeaponChoices, ...runUpgradeChoices];
    const freshChoices = otherChoicePool.filter((choice) => !recentChoiceIds.has(choiceId(choice)));
    const repeatChoices = otherChoicePool.filter((choice) => recentChoiceIds.has(choiceId(choice)));
    const otherChoices = [
      ...weightedChoices(freshChoices, choiceWeight),
      ...weightedChoices(repeatChoices, choiceWeight),
    ];
    function choiceWeight(choice) {
      if (!choice.runUpgradeId) return 1;
      const shopFocus = shopFocusBonus(save);
      return 1 + (familyTiers[choice.family] || 0) * 1.4 + getRunUpgradeTier(choice.runUpgradeId) * 0.8 + choice.relicWeightBonus + shopFocus;
    }
    const choices = [
      ...questWeaponChoices,
      ...otherChoices,
    ].slice(0, 3);

    if (!choices.length) {
      choices.push({
        name: "Repair",
        description: "Recover 30 HP.",
        apply: () => {
          game.player.hp = Math.min(game.player.maxHp, game.player.hp + 30);
        },
      });
    }
    game.lastLevelUpChoiceIds = choices.map(choiceId);

    choices.forEach((choice) => {
      const button = document.createElement("button");
      button.className = "level-choice";
      button.disabled = true;
      button.appendChild(createChoiceIcon(choice));
      const copy = document.createElement("span");
      copy.className = "level-choice-copy";
      const name = document.createElement("strong");
      name.textContent = choice.name;
      const description = document.createElement("span");
      description.textContent = choice.description;
      copy.appendChild(name);
      copy.appendChild(description);
      button.appendChild(copy);
      button.addEventListener("click", () => {
        if (button.disabled) return;
        choice.apply();
        playChoiceSfx?.(choice);
        game.paused = false;
        game.pauseReason = "";
        ui.levelUp.classList.add("hidden");
      });
      setTimeout(() => {
        if (!ui.levelUp.classList.contains("hidden")) button.disabled = false;
      }, 500);
      ui.choices.appendChild(button);
    });
    ui.levelUp.classList.remove("hidden");
  }

  function shopFocusBonus(save) {
    return (save.shopPurchases?.relic_compass || 0) * 0.5;
  }

  function createChoiceIcon(choice) {
    const definition = iconDefinitionForChoice(choice);
    const path = choiceIconPath(definition) || fallbackSkillIcon;
    const animated = definition && typeof definition === "object" && definition.animatedIcon === true;
    const frames = animated && Array.isArray(definition.frames) ? definition.frames : [];
    if (frames.length && typeof Image !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.className = "level-choice-icon level-choice-sprite";
      canvas.width = 72;
      canvas.height = 72;
      canvas.setAttribute("aria-hidden", "true");
      renderChoiceSprite(canvas, definition, path, true);
      return canvas;
    }
    const image = document.createElement("img");
    image.className = "level-choice-icon";
    image.src = path;
    image.alt = "";
    return image;
  }

  function renderChoiceSprite(canvas, definition, path, animated = false) {
    const ctx = canvas.getContext?.("2d", { willReadFrequently: true });
    if (!ctx) return;
    const image = new Image();
    const frames = definition.frames || [];
    const fps = Math.max(1, Number(definition.fps || 10));
    const iconScale = Math.max(0.4, Math.min(1.6, Number(definition.iconScale || 1)));
    const temp = document.createElement("canvas");
    const tempCtx = temp.getContext?.("2d", { willReadFrequently: true });

    image.onload = () => drawFrame();
    image.src = path;

    function drawFrame() {
      if (!frames.length || ui.levelUp.classList.contains("hidden")) return;
      const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
      const frame = animated ? frames[Math.floor((now / 1000) * fps) % frames.length] : frames[0];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bounds = trimmedFrameBounds(image, frame, definition, temp, tempCtx);
      const fit = Math.min(canvas.width / bounds.width, canvas.height / bounds.height) * iconScale;
      const width = Math.max(1, bounds.width * fit);
      const height = Math.max(1, bounds.height * fit);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        bounds.source,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        (canvas.width - width) / 2,
        (canvas.height - height) / 2,
        width,
        height,
      );
      if (animated) requestAnimationFrame(drawFrame);
    }
  }

  function choiceIconPath(definition) {
    if (definition && typeof definition === "object" && definition.animatedIcon !== true) {
      return definition.iconSrc || spritePath(definition);
    }
    return spritePath(definition);
  }

  function trimmedFrameBounds(image, frame, definition, temp, tempCtx) {
    const fallback = {
      source: image,
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
    };
    const color = definition.transparentColor;
    if (!temp || !tempCtx || !Array.isArray(color) || color.length < 3) return fallback;
    temp.width = frame.width;
    temp.height = frame.height;
    tempCtx.imageSmoothingEnabled = false;
    tempCtx.clearRect(0, 0, frame.width, frame.height);
    tempCtx.drawImage(image, frame.x, frame.y, frame.width, frame.height, 0, 0, frame.width, frame.height);
    try {
      const pixels = tempCtx.getImageData(0, 0, frame.width, frame.height);
      const data = pixels.data;
      const tolerance = Math.max(0, Number(definition.transparentTolerance ?? 28));
      let minX = frame.width;
      let minY = frame.height;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < frame.height; y += 1) {
        for (let x = 0; x < frame.width; x += 1) {
          const offset = (y * frame.width + x) * 4;
          const delta = Math.abs(data[offset] - color[0]) + Math.abs(data[offset + 1] - color[1]) + Math.abs(data[offset + 2] - color[2]);
          if (delta <= tolerance || data[offset + 3] <= 8) {
            data[offset + 3] = 0;
            continue;
          }
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
      tempCtx.putImageData(pixels, 0, 0);
      if (maxX >= minX && maxY >= minY) {
        return {
          source: temp,
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        };
      }
    } catch {
      return fallback;
    }
    return fallback;
  }

  function choiceId(choice) {
    return choice.weaponId ? `weapon:${choice.weaponId}` : `run:${choice.runUpgradeId || choice.name}`;
  }

  function closeLevelUpMenu() {
    ui.levelUp.classList.add("hidden");
    const game = getGame();
    if (game?.pauseReason === "level") {
      game.paused = false;
      game.pauseReason = "";
    }
  }

  return {
    showLevelUp,
    closeLevelUpMenu,
  };
}

globalThis.TapSurvivorLevelUp = {
  createLevelUpSystem,
};
})();
