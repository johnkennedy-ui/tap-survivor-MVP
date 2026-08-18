export function createBrowserRenderingAdapters({ canvas, content = {} }) {
  const context = canvas.getContext?.("2d");
  const diagnostics = canvas?.ownerDocument?.__TapSurvivorBrowserSmoke?.diagnostics;
  const weaponDefs = content.weapons || content.weaponDefs || {};
  const runUpgradeDefs = Array.isArray(content.runUpgrades) ? content.runUpgrades : [];
  const skillEffectSprites = content.assets?.sprites?.weapons || {};

  const call = (method, ...args) => {
    try {
      return typeof context?.[method] === "function" ? context[method](...args) : undefined;
    } catch {
      return undefined;
    }
  };
  const set = (property, value) => {
    try {
      if (context) context[property] = value;
    } catch {
      // Canvas properties are optional in deterministic fixtures.
    }
  };
  const number = (value, fallback = 0) => {
    const resolved = Number(value);
    return Number.isFinite(resolved) ? resolved : fallback;
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, number(value, min)));
  const list = (value) => (Array.isArray(value) ? value : []);

  return {
    renderers: {
      clearFrame() {
        call("clearRect", 0, 0, canvas.width || 0, canvas.height || 0);
        return true;
      },
      renderEnemies({ enemies = [], spriteAdapters }) {
        list(enemies).forEach((enemy) => drawEnemy(enemy, spriteAdapters));
        return true;
      },
      renderFrame({ game, spriteAdapters }) {
        const width = canvas.width || 0;
        const height = canvas.height || 0;
        drawArena(game, spriteAdapters, width, height);
        if (!game) {
          drawMenuHint();
          return true;
        }
        list(game.areas).forEach((area) => drawArea(area, spriteAdapters));
        list(game.weaponBursts).forEach(drawWeaponBurst);
        list(game.bossAttacks).forEach(drawBossAttack);
        list(game.xpDrops).forEach(drawXp);
        list(game.lootDrops).forEach((drop) => drawLoot(drop, spriteAdapters));
        list(game.bolts).forEach((bolt) => drawBolt(bolt, spriteAdapters));
        list(game.enemyBolts).forEach(drawEnemyBolt);
        list(game.beams).forEach((beam) => drawBeam(beam, spriteAdapters));
        list(game.pickupTexts).forEach(drawPickupText);
        return true;
      },
      renderHud({ game }) {
        drawBossSpawnNotice(game);
        drawBossHealthBar(game);
        drawBossSpecialBar(game);
        return true;
      },
      renderPlayer({ game, spriteAdapters }) {
        const player = game?.player;
        if (!player) return true;
        drawPlayerHpBar(player);
        const previousAlpha = number(context?.globalAlpha, 1);
        if (number(player.blinkTimer) > 0) {
          set("globalAlpha", 0.35 + Math.abs(Math.sin(number(player.blinkTimer) * 24)) * 0.65);
        }
        const spriteId = playerSpriteId(player);
        const size = Math.max(70, (player.radius || 16) * 3.8);
        const drawn =
          spriteAdapters?.spriteSystem?.drawSprite?.(spriteId, player.x || 0, player.y || 0, size, 0, {
            flipX: playerFacesLeft(player),
          }) ||
          (spriteId !== "player" &&
            spriteAdapters?.spriteSystem?.drawSprite?.("player", player.x || 0, player.y || 0, size, 0, {
              flipX: playerFacesLeft(player),
            }));
        if (!drawn) drawPlayerFallback(player);
        set("globalAlpha", previousAlpha);
        if (number(player.invincibleTimer) > 0) {
          set("strokeStyle", "rgba(88, 255, 157, 0.72)");
          set("lineWidth", 3);
          circlePath(player.x, player.y, number(player.radius, 16) + 8);
          call("stroke");
        }
        set("strokeStyle", "rgba(105, 210, 255, 0.28)");
        set("lineWidth", 2);
        circlePath(player.x, player.y, number(player.pickupRadius, 54));
        call("stroke");
        set("strokeStyle", "#dff6ff");
        set("lineWidth", 1);
        call("beginPath");
        call("moveTo", number(player.x), number(player.y));
        call("lineTo", number(player.targetX, player.x), number(player.targetY, player.y));
        call("stroke");
        diagnostics?.spriteDraws?.push?.({
          id: spriteId,
          kind: "renderPlayer",
          success: Boolean(drawn),
        });
        return true;
      },
      renderSkillRail({ game, spriteAdapters }) {
        drawSkillRail(game, spriteAdapters);
        return true;
      },
    },
  };

  function drawArena(game, spriteAdapters, width, height) {
    const backgroundId = game?.background?.spriteId || "background:tower_floor";
    const backgroundDrawn = spriteAdapters?.spriteSystem?.drawImage?.(
      backgroundId,
      0,
      0,
      width,
      height
    );
    if (!backgroundDrawn) {
      set("fillStyle", "#17202c");
      call("fillRect", 0, 0, width, height);
    }
    set("fillStyle", "rgba(10, 14, 20, 0.16)");
    call("fillRect", 0, 0, width, height);
    set("strokeStyle", backgroundDrawn ? "rgba(223, 246, 255, 0.08)" : "#243244");
    set("lineWidth", 1);
    let gridPathStarted = false;
    for (let x = 0; x < width; x += 48) {
      if (!gridPathStarted) {
        call("beginPath");
        gridPathStarted = true;
      }
      call("moveTo", x, 0);
      call("lineTo", x, height);
    }
    for (let y = 0; y < height; y += 48) {
      if (!gridPathStarted) {
        call("beginPath");
        gridPathStarted = true;
      }
      call("moveTo", 0, y);
      call("lineTo", width, y);
    }
    if (gridPathStarted) {
      call("stroke");
    }
    if (game) drawTowerFloorBadge(game);
  }

  function drawMenuHint() {
    set("fillStyle", "#f3f6fb");
    set("font", "700 28px sans-serif");
    call("fillText", "Tap Survivor", 36, 58);
    set("font", "16px sans-serif");
    call("fillText", "Unlock weapons, then start a run.", 36, 88);
  }

  function drawEnemy(enemy, spriteAdapters) {
    const boss = Boolean(enemy?.boss);
    const radius = Math.max(6, number(enemy?.radius, boss ? 38 : 14));
    const spriteSize = boss ? Math.max(116, radius * 3.3) : Math.max(48, radius * 4.0);
    const id = enemy?.assetId || enemy?.type || enemy?.kind || enemy?.id || "default";
    const spriteId = `enemy:${id}`;
    const animationId = boss
      ? enemy?.bossKind || enemy?.bossAbilities?.[0] || "warden"
      : id;
    const animationState = boss
      ? bossAnimationState(enemy)
      : enemyAnimationState(enemy);
    const drawn = spriteAdapters?.spriteSystem?.drawSprite?.(
      spriteId,
      number(enemy?.x),
      number(enemy?.y),
      spriteSize,
      0,
      {
        animationId,
        animationState,
        flipX: enemyFacesLeft(enemy),
        sheetId: boss ? "bosses" : "enemies",
        time: number(enemy?.animTime),
      }
    );
    if (!drawn) drawEnemyFallback(enemy, radius, boss);
    if (boss) {
      const charging = enemy?.chargeState === "windup";
      const ringColor = charging ? "#ff3b3b" : enemy?.superBoss ? "#ff74c8" : "#ffd166";
      strokeEnemyRing(enemy, ringColor, charging ? 7 : enemy?.superBoss ? 6 : 4);
      const label = enemy?.superBoss
        ? "SUPER"
        : enemy?.bossKind === "turret"
          ? "TURRET"
          : enemy?.bossKind === "charger"
            ? "CHARGE"
            : "BOSS";
      drawText(label, number(enemy?.x) - label.length * 3.6, number(enemy?.y) - radius - 10, {
        color: "#f3f6fb",
        font: "700 14px sans-serif",
      });
    } else {
      drawEnemyFloorTint(enemy, spriteSize);
    }
    drawEnemyHpBar(enemy, radius, boss);
    if (enemy?.type === "skitter") {
      set("fillStyle", "#17202c");
      circlePath(enemy.x, enemy.y, 3);
      call("fill");
    } else if (enemy?.type === "bulwark") {
      strokeEnemyRing(enemy, "#dff6ff", 3);
    }
  }

  function drawEnemyFallback(enemy, radius, boss) {
    const x = number(enemy?.x);
    const y = number(enemy?.y);
    set("fillStyle", boss ? enemy?.color || "#ff4f8b" : enemy?.color || "#63d6b0");
    if (boss) {
      call("beginPath");
      call("moveTo", x, y - radius * 1.3);
      call("lineTo", x + radius * 1.1, y);
      call("lineTo", x, y + radius * 1.3);
      call("lineTo", x - radius * 1.1, y);
      call("closePath");
    } else {
      circlePath(x, y, radius);
    }
    call("fill");
    if (boss) {
      set("fillStyle", "#10141d");
      circlePath(x - radius * 0.35, y - radius * 0.14, 4);
      call("fill");
      circlePath(x + radius * 0.35, y - radius * 0.14, 4);
      call("fill");
    }
  }

  function drawEnemyFloorTint(enemy, spriteSize) {
    const floor = clamp(Math.floor(number(enemy?.towerFloor, 1)), 1, 100);
    const bucket = Math.floor((floor - 1) / 5);
    const progress = bucket / 19;
    const red = Math.round(52 + progress * 154);
    const green = Math.round(230 - progress * 190);
    const blue = Math.round(190 - progress * 162);
    const alpha = 0.12 + progress * 0.14;
    const previousComposite = context?.globalCompositeOperation;
    set("globalCompositeOperation", "multiply");
    set("fillStyle", `rgba(${red}, ${green}, ${blue}, ${alpha})`);
    circlePath(enemy.x, enemy.y, Math.max(number(enemy.radius, 8) + 4, spriteSize * 0.36));
    call("fill");
    set("globalCompositeOperation", previousComposite || "source-over");
    strokeEnemyRing(enemy, `rgba(${red}, ${green}, ${blue}, ${0.48 + progress * 0.28})`, 2 + progress * 2);
  }

  function drawEnemyHpBar(enemy, radius, boss) {
    if (!Number.isFinite(Number(enemy?.maxHp)) || !Number.isFinite(Number(enemy?.hp))) return;
    const width = boss ? Math.max(76, radius * 2.8) : Math.max(34, radius * 2.2);
    const height = boss ? 6 : 4;
    const x = number(enemy.x) - width / 2;
    const y = number(enemy.y) - radius - (boss ? 25 : 9);
    drawBar(x, y, width, height, clamp(number(enemy.hp) / Math.max(1, number(enemy.maxHp)), 0, 1), {
      fill: boss ? (enemy.superBoss ? "#ff74c8" : "#ff5f7a") : "#ff6b6b",
      border: boss ? "#f3f6fb" : "rgba(243, 246, 251, 0.72)",
    });
  }

  function strokeEnemyRing(enemy, color, width) {
    set("strokeStyle", color);
    set("lineWidth", width);
    circlePath(enemy?.x, enemy?.y, Math.max(1, number(enemy?.radius, 8)));
    call("stroke");
  }

  function drawEnemyBolt(bolt) {
    const speed = Math.max(1, Math.hypot(number(bolt?.vx), number(bolt?.vy)));
    const radius = Math.max(2, number(bolt?.radius, 5));
    const tailX = number(bolt?.x) - (number(bolt?.vx) / speed) * radius * 3.2;
    const tailY = number(bolt?.y) - (number(bolt?.vy) / speed) * radius * 3.2;
    const alpha = clamp(number(bolt?.life, 1) / Math.max(0.01, number(bolt?.maxLife, 1)), 0.3, 1);
    const color = bolt?.color || "#b794ff";
    set("globalAlpha", alpha);
    set("strokeStyle", withAlpha(bolt?.glowColor || color, 0.55));
    set("lineWidth", Math.max(4, radius * 0.8));
    call("beginPath");
    call("moveTo", tailX, tailY);
    call("lineTo", number(bolt?.x), number(bolt?.y));
    call("stroke");
    set("strokeStyle", bolt?.trailColor || color);
    set("lineWidth", Math.max(2, radius * 0.45));
    call("beginPath");
    call("moveTo", tailX, tailY);
    call("lineTo", number(bolt?.x), number(bolt?.y));
    call("stroke");
    set("fillStyle", withAlpha(bolt?.glowColor || color, 0.42));
    circlePath(bolt?.x, bolt?.y, radius + 4);
    call("fill");
    set("fillStyle", color);
    circlePath(bolt?.x, bolt?.y, radius);
    call("fill");
    set("strokeStyle", "#10141d");
    set("lineWidth", 2);
    circlePath(bolt?.x, bolt?.y, radius);
    call("stroke");
    set("globalAlpha", 1);
  }

  function drawXp(drop) {
    const radius = Math.max(3, number(drop?.radius, 6));
    set("fillStyle", "#78e08f");
    circlePath(drop?.x, drop?.y, radius);
    call("fill");
    set("strokeStyle", "#d9ff9f");
    set("lineWidth", 1.5);
    circlePath(drop?.x, drop?.y, radius);
    call("stroke");
  }

  function drawLoot(drop, spriteAdapters) {
    const radius = Math.max(4, number(drop?.radius, 7));
    if (drop?.type === "coin") {
      if (spriteAdapters?.spriteSystem?.drawSprite?.("ui:coin", drop.x, drop.y, Math.max(26, radius * 3.1))) return;
      set("fillStyle", "#ffd166");
      circlePath(drop?.x, drop?.y, radius);
      call("fill");
      set("strokeStyle", "#fff0a8");
      set("lineWidth", 2);
      circlePath(drop?.x, drop?.y, radius);
      call("stroke");
      return;
    }
    if (drop?.type === "heart" && spriteAdapters?.spriteSystem?.drawSprite?.("ui:heart", drop.x, drop.y, Math.max(28, radius * 3))) return;
    set("fillStyle", "#ff5f7a");
    call("beginPath");
    call("arc", number(drop?.x) - radius * 0.34, number(drop?.y) - radius * 0.18, radius * 0.5, 0, Math.PI * 2);
    call("arc", number(drop?.x) + radius * 0.34, number(drop?.y) - radius * 0.18, radius * 0.5, 0, Math.PI * 2);
    call("moveTo", number(drop?.x) - radius, number(drop?.y));
    call("lineTo", number(drop?.x), number(drop?.y) + radius);
    call("lineTo", number(drop?.x) + radius, number(drop?.y));
    call("closePath");
    call("fill");
  }

  function drawPickupText(text) {
    const alpha = clamp(number(text?.life, 0) / Math.max(0.01, number(text?.maxLife, 1)), 0, 1);
    set("globalAlpha", alpha);
    drawText(text?.text || "", text?.x, text?.y, {
      color: text?.color || "#f3f6fb",
      font: "700 14px sans-serif",
      align: "center",
    });
    set("globalAlpha", 1);
  }

  function drawBolt(bolt, spriteAdapters) {
    const weapon = weaponDefs[bolt?.weaponId] || {};
    const weaponId = bolt?.weaponId || "spark_bolt";
    const rotation = Math.atan2(number(bolt?.vy), number(bolt?.vx, 1));
    const tuning = skillEffectTuning(weaponId, weapon);
    const radius = Math.max(3, number(bolt?.radius, 5));
    const drawn = spriteAdapters?.spriteSystem?.drawSprite?.(
      `weapon:${weapon.assetId || weaponId}`,
      number(bolt?.x),
      number(bolt?.y),
      radius * 2 * tuning.scale,
      rotation,
      { alpha: tuning.alpha }
    );
    if (drawn) return;
    set("fillStyle", bolt?.color || weapon.color || "#ffd166");
    circlePath(bolt?.x, bolt?.y, radius);
    call("fill");
    set("strokeStyle", "rgba(255,255,255,0.72)");
    set("lineWidth", 1.5);
    circlePath(bolt?.x, bolt?.y, radius + 2);
    call("stroke");
  }

  function drawBeam(beam, spriteAdapters) {
    const weapon = weaponDefs[beam?.weaponId] || {};
    const weaponId = beam?.weaponId || "prism_beam";
    const tuning = skillEffectTuning(weaponId, weapon);
    const x = number(beam?.x);
    const y = number(beam?.y);
    const endX = number(beam?.endX, x);
    const endY = number(beam?.endY, y);
    const length = Math.max(1, Math.hypot(endX - x, endY - y));
    const midX = (x + endX) / 2;
    const midY = (y + endY) / 2;
    const rotation = Math.atan2(endY - y, endX - x);
    const spriteHeight = Math.max(2, number(beam?.width, 8) * tuning.scale);
    const drawn = spriteAdapters?.spriteSystem?.drawSprite?.(
      `weapon:${weapon.assetId || weaponId}`,
      midX,
      midY,
      length,
      rotation,
      {
        alpha: tuning.alpha,
        height: spriteHeight,
        rasterHeight: spriteHeight,
        rasterWidth: 256,
        width: length,
      }
    );
    if (drawn) return;
    set("strokeStyle", beam?.color || weapon.color || "#b794ff");
    set("lineWidth", Math.max(2, number(beam?.width, 8) * 0.72));
    set("globalAlpha", Math.max(0.25, number(beam?.life, 0.16) / 0.24) * tuning.alpha);
    call("beginPath");
    call("moveTo", x, y);
    call("lineTo", endX, endY);
    call("stroke");
    set("globalAlpha", 1);
  }

  function drawArea(area, spriteAdapters) {
    const weapon = weaponDefs[area?.weaponId] || {};
    const weaponId = area?.weaponId || "area";
    const tuning = skillEffectTuning(weaponId, weapon);
    const radius = Math.max(4, number(area?.radius, 20));
    const spriteSize = Math.max(24, radius * 1.9 * tuning.scale);
    const spriteDrawn =
      area?.weaponId &&
      spriteAdapters?.spriteSystem?.drawSprite?.(
        `weapon:${weapon.assetId || weaponId}`,
        number(area?.x),
        number(area?.y),
        spriteSize,
        0,
        { alpha: Math.max(0.45, tuning.alpha * 1.25) }
      );
    if (spriteDrawn) return;
    set("fillStyle", area?.color || weapon.color || "#8de7ff");
    set("strokeStyle", area?.color || weapon.color || "#8de7ff");
    set("globalAlpha", Math.max(0.1, Math.min(0.34, number(area?.life, 0.2))) * tuning.alpha);
    circlePath(area?.x, area?.y, radius);
    call("fill");
    set("globalAlpha", 0.82 * tuning.alpha);
    set("lineWidth", 2);
    circlePath(area?.x, area?.y, radius);
    call("stroke");
    set("globalAlpha", 1);
  }

  function drawWeaponBurst(burst) {
    const life = Math.max(0, number(burst?.life, 0));
    const maxLife = Math.max(0.01, number(burst?.maxLife, 0.32));
    const progress = clamp(1 - life / maxLife, 0, 1);
    const radius = Math.max(8, number(burst?.radius, 24)) + progress * 26;
    set("globalAlpha", Math.max(0, life / maxLife) * 0.78);
    set("strokeStyle", burst?.color || "#ffd166");
    set("lineWidth", 3 + progress * 4);
    circlePath(burst?.x, burst?.y, radius);
    call("stroke");
    set("globalAlpha", Math.max(0, life / maxLife) * 0.22);
    set("fillStyle", burst?.color || "#ffd166");
    circlePath(burst?.x, burst?.y, Math.max(8, radius * 0.46));
    call("fill");
    set("globalAlpha", 1);
  }

  function drawBossAttack(attack) {
    if (attack?.type === "boss_slash") {
      drawBossSlash(attack);
      return;
    }
    const windup = Math.max(0.01, number(attack?.windup, 1));
    const age = Math.max(0, number(attack?.age));
    const charging = age < windup;
    const progress = clamp(age / windup, 0, 1);
    const radius = Math.max(8, number(attack?.radius, 40));
    const currentRadius = charging ? radius * progress : radius;
    const drop = attack?.type === "boss_drop";
    set("strokeStyle", charging ? (drop ? "#8de7ff" : "#ffd166") : "#ff5f7a");
    set("fillStyle", charging ? (drop ? "rgba(141, 231, 255, 0.14)" : "rgba(255, 209, 102, 0.12)") : "rgba(255, 95, 122, 0.2)");
    set("lineWidth", charging ? 3 : 5);
    circlePath(attack?.x, attack?.y, currentRadius);
    call("fill");
    call("stroke");
  }

  function drawBossSlash(attack) {
    const windup = Math.max(0.01, number(attack?.windup, 1));
    const age = Math.max(0, number(attack?.age));
    const charging = age < windup;
    const progress = clamp(age / windup, 0, 1);
    const reach = Math.max(8, number(attack?.radius, 60)) * (charging ? progress : 1);
    const angle = Math.atan2(number(attack?.dirY), number(attack?.dirX, 1));
    const arc = number(attack?.arc, Math.PI * 0.7);
    const left = angle - arc / 2;
    const right = angle + arc / 2;
    set("fillStyle", charging ? "rgba(255, 209, 102, 0.12)" : "rgba(255, 95, 122, 0.24)");
    set("strokeStyle", charging ? "#ffd166" : "#ff5f7a");
    set("lineWidth", charging ? 3 : 5);
    call("beginPath");
    call("moveTo", number(attack?.x), number(attack?.y));
    call("lineTo", number(attack?.x) + Math.cos(left) * reach, number(attack?.y) + Math.sin(left) * reach);
    call("arc", number(attack?.x), number(attack?.y), reach, left, right);
    call("closePath");
    call("fill");
    call("stroke");
  }

  function drawPlayerHpBar(player) {
    const width = 64;
    const height = 7;
    const radius = Math.max(8, number(player?.radius, 16));
    const x = number(player?.x) - width / 2;
    const y = number(player?.y) - radius - 19;
    const hp = clamp(number(player?.hp, 0) / Math.max(1, number(player?.maxHp, 1)), 0, 1);
    drawBar(x, y, width, height, hp, {
      fill: hp > 0.35 ? "#78e08f" : "#ff6b6b",
      border: "#f3f6fb",
    });
    const protection = player?.projectileBlockReady
      ? 1
      : clamp(number(player?.projectileBlockCharge) / Math.max(1, number(player?.projectileBlockNeeded, 1)), 0, 1);
    drawBar(x, y + height + 3, width, 4, protection, {
      fill: player?.projectileBlockReady ? "#8de7ff" : "#4aa3ff",
      border: "rgba(141, 231, 255, 0.7)",
    });
  }

  function drawPlayerFallback(player) {
    set("fillStyle", "#69d2ff");
    circlePath(player?.x, player?.y, Math.max(6, number(player?.radius, 16)));
    call("fill");
    set("strokeStyle", "#dff6ff");
    set("lineWidth", 2);
    circlePath(player?.x, player?.y, Math.max(6, number(player?.radius, 16)));
    call("stroke");
  }

  function drawBossSpawnNotice(game) {
    const notice = game?.bossSpawnNotice;
    if (!notice) return;
    const alpha = clamp(number(notice.life) / Math.max(0.01, number(notice.maxLife, 1)), 0, 1);
    set("globalAlpha", alpha);
    drawText(notice.text || "BOSS INCOMING", canvas.width / 2, 104, {
      align: "center",
      color: "#ffd166",
      font: "800 24px sans-serif",
    });
    set("globalAlpha", 1);
  }

  function drawTowerFloorBadge(game) {
    const width = 150;
    const height = 34;
    const x = canvas.width / 2 - width / 2;
    const y = 12;
    roundedRectPath(x, y, width, height, 8);
    set("fillStyle", "rgba(10, 14, 20, 0.76)");
    call("fill");
    set("strokeStyle", "rgba(255, 209, 102, 0.7)");
    set("lineWidth", 2);
    call("stroke");
    drawText(`Tower Floor ${Math.max(1, Math.floor(number(game?.towerFloor, 1)))}`, canvas.width / 2, y + 22, {
      align: "center",
      color: "#ffd166",
      font: "700 15px sans-serif",
    });
  }

  function drawBossHealthBar(game) {
    const boss = list(game?.enemies).find((enemy) => enemy?.boss);
    if (!boss) return;
    const width = Math.min(560, Math.max(240, canvas.width - 220));
    const height = 18;
    const x = canvas.width / 2 - width / 2;
    const y = 54;
    const progress = clamp(number(boss.hp) / Math.max(1, number(boss.maxHp, 1)), 0, 1);
    drawBar(x, y, width, height, progress, {
      fill: boss.superBoss ? "#ff74c8" : "#ff5f7a",
      border: boss.superBoss ? "#ffd166" : "#f3f6fb",
    });
    const kind = boss.superBoss
      ? "SUPER BOSS"
      : boss.bossKind === "charger"
        ? "CHARGER BOSS"
        : boss.bossKind === "turret"
          ? "TURRET BOSS"
          : "BOSS";
    drawText(`${kind} ${Math.max(0, Math.ceil(number(boss.hp)))} / ${Math.ceil(number(boss.maxHp))}`, canvas.width / 2, y + 13, {
      align: "center",
      color: "#ffffff",
      font: "700 12px sans-serif",
    });
  }

  function drawBossSpecialBar(game) {
    const boss = list(game?.enemies).find((enemy) => enemy?.boss);
    if (!boss || number(boss.dropTimer) > 0) return;
    const max = Math.max(0.1, number(game?.bossAttackCooldownMax, 3.8));
    const progress = clamp(1 - number(game?.bossAttackTimer) / max, 0, 1);
    const width = Math.min(390, Math.max(180, canvas.width - 320));
    const height = 10;
    const x = canvas.width / 2 - width / 2;
    const y = 78;
    drawBar(x, y, width, height, progress, {
      fill: progress > 0.82 ? "#ff5f56" : "#ffd166",
      border: progress > 0.82 ? "#ffffff" : "rgba(255, 209, 102, 0.75)",
    });
    drawText("SPECIAL", canvas.width / 2, y + 9, {
      align: "center",
      color: "#ffffff",
      font: "700 10px sans-serif",
    });
  }

  function drawBar(x, y, width, height, progress, colors) {
    roundedRectPath(x, y, width, height, Math.min(7, height / 2));
    set("fillStyle", "rgba(10, 14, 20, 0.84)");
    call("fill");
    if (progress > 0) {
      roundedRectPath(x, y, width * clamp(progress, 0, 1), height, Math.min(7, height / 2));
      set("fillStyle", colors.fill);
      call("fill");
    }
    roundedRectPath(x, y, width, height, Math.min(7, height / 2));
    set("strokeStyle", colors.border);
    set("lineWidth", height > 5 ? 2 : 1);
    call("stroke");
  }

  function drawSkillRail(game, spriteAdapters) {
    const equipped = list(game?.player?.equippedWeapons).filter((weaponId) => weaponDefs[weaponId]);
    if (!equipped.length) return;
    const maxRailHeight = canvas.height - 120;
    const gap = 8;
    const size = Math.max(32, Math.min(48, Math.floor((maxRailHeight - (equipped.length - 1) * gap - 16) / equipped.length)));
    const x = 18;
    const y = 108;
    const railHeight = equipped.length * size + (equipped.length - 1) * gap + 16;
    roundedRectPath(x - 8, y - 8, size + 16, railHeight, 8);
    set("fillStyle", "rgba(10, 14, 20, 0.78)");
    call("fill");
    set("strokeStyle", "rgba(243, 246, 251, 0.14)");
    set("lineWidth", 1);
    call("stroke");
    equipped.forEach((weaponId, index) => {
      const weapon = weaponDefs[weaponId] || {};
      drawSkillIcon(
        weaponId,
        weapon,
        x,
        y + index * (size + gap),
        size,
        number(game?.weaponIconFlashes?.[weaponId]),
        spriteAdapters
      );
    });

    const activeUpgrades = Object.entries(game?.runUpgradeTiers || {})
      .filter(([, tier]) => number(tier) > 0)
      .map(([id, tier]) => ({ id, tier, upgrade: runUpgradeDefs.find((item) => item?.id === id) }))
      .filter((item) => item.upgrade);
    if (!activeUpgrades.length) return;
    const upgradeSize = 34;
    const upgradeGap = 7;
    const upgradeX = 78;
    const upgradeY = 108;
    const railHeightUpgrade = activeUpgrades.length * upgradeSize + (activeUpgrades.length - 1) * upgradeGap + 14;
    roundedRectPath(upgradeX - 7, upgradeY - 7, upgradeSize + 14, railHeightUpgrade, 8);
    set("fillStyle", "rgba(10, 14, 20, 0.72)");
    call("fill");
    set("strokeStyle", "rgba(120, 224, 143, 0.24)");
    call("stroke");
    activeUpgrades.forEach(({ id, tier, upgrade }, index) => {
      drawUpgradeIcon(id, upgrade, tier, upgradeX, upgradeY + index * (upgradeSize + upgradeGap), upgradeSize, spriteAdapters);
    });
  }

  function drawSkillIcon(weaponId, weapon, x, y, size, flash, spriteAdapters) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const color = weapon.color || "#f3f6fb";
    const active = flash > 0;
    const pulse = 1 + flash * 0.14;
    const iconSize = size * (active ? 0.74 : 0.62) * pulse;
    roundedRectPath(x, y, size, size, 7);
    set("fillStyle", "rgba(18, 24, 34, 0.94)");
    call("fill");
    set("strokeStyle", active ? "#ffd166" : color);
    set("lineWidth", active ? 4 : 3);
    call("stroke");
    set("fillStyle", color);
    set("globalAlpha", active ? 0.3 : 0.16);
    roundedRectPath(x + 5, y + 5, size - 10, size - 10, 5);
    call("fill");
    set("globalAlpha", 1);
    if (active) {
      set("strokeStyle", color);
      set("globalAlpha", 0.35 + flash * 0.45);
      circlePath(centerX, centerY, size * (0.34 + flash * 0.22));
      call("stroke");
      set("globalAlpha", 1);
    }
    drawWeaponGlyph(weapon.kind, centerX, centerY, size, color, 0.44);
    spriteAdapters?.spriteSystem?.drawSprite?.(`weaponIcon:${weapon.assetId || weaponId}`, centerX, centerY, iconSize, 0, { trim: false }) ||
      spriteAdapters?.spriteSystem?.drawSprite?.(`weapon:${weapon.assetId || weaponId}`, centerX, centerY, iconSize);
  }

  function drawUpgradeIcon(upgradeId, upgrade, tier, x, y, size, spriteAdapters) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    roundedRectPath(x, y, size, size, 7);
    set("fillStyle", "rgba(18, 24, 34, 0.92)");
    call("fill");
    set("strokeStyle", "#78e08f");
    set("lineWidth", 2);
    call("stroke");
    drawUpgradeGlyph(upgradeId, centerX, centerY, size, "#78e08f", 0.5);
    spriteAdapters?.spriteSystem?.drawSprite?.(`runUpgradeIcon:${upgradeId}`, centerX, centerY, size * 0.68, 0, { trim: false });
    const badgeSize = 14;
    roundedRectPath(x + size - badgeSize, y + size - badgeSize, badgeSize, badgeSize, 5);
    set("fillStyle", "rgba(120, 224, 143, 0.92)");
    call("fill");
    drawText(String(tier), x + size - badgeSize / 2, y + size - 3, {
      align: "center",
      color: "#10141d",
      font: "800 10px sans-serif",
    });
  }

  function drawWeaponGlyph(kind, x, y, size, color, alpha = 1) {
    set("globalAlpha", alpha);
    set("strokeStyle", color);
    set("fillStyle", color);
    set("lineWidth", 4);
    set("lineCap", "round");
    set("lineJoin", "round");
    if (kind === "beam") {
      call("beginPath");
      call("moveTo", x - size * 0.22, y + size * 0.18);
      call("lineTo", x + size * 0.22, y - size * 0.18);
      call("stroke");
    } else if (kind === "cone") {
      call("beginPath");
      call("moveTo", x, y - size * 0.22);
      call("lineTo", x + size * 0.24, y + size * 0.2);
      call("lineTo", x - size * 0.24, y + size * 0.2);
      call("closePath");
      call("fill");
    } else if (kind === "radial") {
      circlePath(x, y, size * 0.2);
      call("stroke");
      circlePath(x, y, size * 0.08);
      call("fill");
    } else if (kind === "chain") {
      call("beginPath");
      call("moveTo", x - size * 0.18, y - size * 0.2);
      call("lineTo", x + size * 0.02, y - size * 0.02);
      call("lineTo", x - size * 0.04, y + size * 0.02);
      call("lineTo", x + size * 0.18, y + size * 0.2);
      call("stroke");
    } else if (kind === "target_area" || kind === "lingering_area") {
      circlePath(x, y, size * 0.2);
      call("stroke");
      call("beginPath");
      call("moveTo", x - size * 0.25, y);
      call("lineTo", x + size * 0.25, y);
      call("moveTo", x, y - size * 0.25);
      call("lineTo", x, y + size * 0.25);
      call("stroke");
    } else if (kind === "mine") {
      call("beginPath");
      call("moveTo", x, y - size * 0.24);
      call("lineTo", x + size * 0.24, y);
      call("lineTo", x, y + size * 0.24);
      call("lineTo", x - size * 0.24, y);
      call("closePath");
      call("fill");
    } else {
      circlePath(x, y, size * 0.16);
      call("fill");
    }
    set("globalAlpha", 1);
  }

  function drawUpgradeGlyph(id, x, y, size, color, alpha = 1) {
    set("globalAlpha", alpha);
    set("strokeStyle", color);
    set("fillStyle", color);
    set("lineWidth", 3);
    set("lineCap", "round");
    if (String(id).includes("fire_rate")) {
      circlePath(x, y, size * 0.18);
      call("stroke");
    } else if (String(id).includes("damage")) {
      call("beginPath");
      call("moveTo", x - size * 0.2, y + size * 0.16);
      call("lineTo", x + size * 0.2, y - size * 0.16);
      call("stroke");
    } else {
      circlePath(x, y, size * 0.16);
      call("fill");
    }
    set("globalAlpha", 1);
  }

  function roundedRectPath(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    call("beginPath");
    if (typeof context?.quadraticCurveTo !== "function") {
      call("moveTo", x, y);
      call("lineTo", x + width, y);
      call("lineTo", x + width, y + height);
      call("lineTo", x, y + height);
      call("closePath");
      return;
    }
    call("moveTo", x + r, y);
    call("lineTo", x + width - r, y);
    call("quadraticCurveTo", x + width, y, x + width, y + r);
    call("lineTo", x + width, y + height - r);
    call("quadraticCurveTo", x + width, y + height, x + width - r, y + height);
    call("lineTo", x + r, y + height);
    call("quadraticCurveTo", x, y + height, x, y + height - r);
    call("lineTo", x, y + r);
    call("quadraticCurveTo", x, y, x + r, y);
    call("closePath");
  }

  function circlePath(x, y, radius) {
    call("beginPath");
    call("arc", number(x), number(y), Math.max(0, number(radius)), 0, Math.PI * 2);
  }

  function drawText(text, x, y, { align = "start", color = "#f3f6fb", font = "14px sans-serif" } = {}) {
    set("fillStyle", color);
    set("font", font);
    set("textAlign", align);
    call("fillText", String(text), number(x), number(y));
    set("textAlign", "start");
  }

  function skillEffectTuning(weaponId, weapon) {
    const sprite = skillEffectSprites[weapon?.assetId || weaponId] || {};
    return {
      alpha: Math.max(0, Math.min(1, number(sprite.effectAlpha, 1))),
      scale: Math.max(0.1, number(sprite.effectScale, 1)),
    };
  }

  function enemyAnimationState(enemy) {
    if (enemy?.attackRange && enemy?.projectileCooldown && number(enemy.attackVisualTimer) > 0) return "attack";
    return "default";
  }

  function bossAnimationState(enemy) {
    if (enemy?.bossKind === "charger") {
      if (enemy.chargeState === "windup") return "windup";
      if (enemy.chargeState === "charging") return "release";
    }
    if (enemy?.bossKind === "turret") {
      if (number(enemy.attackVisualTimer) > 0) return "release";
      if (number(enemy.shootTimer) <= 0.45) return "windup";
    }
    if (enemy?.bossKind === "warden" && number(enemy.dropTimer) > 0) return "windup";
    return "idle";
  }

  function enemyFacesLeft(enemy) {
    if (Number.isFinite(Number(enemy?.vx))) return number(enemy.vx) < -1;
    if (Number.isFinite(Number(enemy?.chargeDirX))) return number(enemy.chargeDirX) < -0.1;
    return false;
  }

  function playerFacesLeft(player) {
    return Number.isFinite(Number(player?.targetX)) && Number.isFinite(Number(player?.x)) && number(player.targetX) < number(player.x) - 2;
  }

  function playerSpriteId(player) {
    if (number(player?.actionTimer) > 0 && player?.actionSprite) return `player:${player.actionSprite}`;
    if (player?.moving) return "player:walk";
    return "player";
  }

  function withAlpha(color, alpha) {
    const match = typeof color === "string" ? /^#([0-9a-f]{6})$/i.exec(color.trim()) : null;
    if (!match) return color;
    const value = Number.parseInt(match[1], 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
  }
}
