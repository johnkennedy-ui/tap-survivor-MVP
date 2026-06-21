(() => {
const { clamp } = globalThis.TapSurvivorMath;

function createRenderer({ canvas, ctx, drawImage, drawSprite, weaponDefs }) {
  const skillEffectSprites = globalThis.TapSurvivorContent?.assets?.sprites?.weapons || {};
  const hudRenderer = globalThis.TapSurvivorRenderHud.createHudRenderer({
    canvas,
    ctx,
    roundedRectPath,
    drawSprite,
    weaponDefs,
  });
  const enemyRenderer = globalThis.TapSurvivorRenderEnemies.createEnemyRenderer({
    ctx,
    drawSprite,
    clamp,
  });

  function draw(game) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawArena(game);
    if (!game) {
      drawMenuHint();
      return;
    }

    game.areas.forEach(drawArea);
    game.weaponBursts.forEach(drawWeaponBurst);
    game.bossAttacks.forEach(drawBossAttack);
    game.xpDrops.forEach(drawXp);
    game.lootDrops.forEach(drawLoot);
    game.bolts.forEach(drawBolt);
    game.enemyBolts.forEach(enemyRenderer.drawEnemyBolt);
    game.enemies.forEach(enemyRenderer.drawEnemy);
    game.beams.forEach(drawBeam);
    game.pickupTexts.forEach(drawPickupText);
    drawPlayer(game.player);
    hudRenderer.drawBossSpawnNotice(game);
    hudRenderer.drawGameHud(game);
  }

  function roundedRectPath(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    if (!ctx.quadraticCurveTo) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      return;
    }
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawArena(game) {
    const backgroundDrawn = drawImage?.("background:tower_floor", 0, 0, canvas.width, canvas.height);
    if (!backgroundDrawn) {
      ctx.fillStyle = "#17202c";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.fillStyle = "rgba(10, 14, 20, 0.16)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = backgroundDrawn ? "rgba(223, 246, 255, 0.08)" : "#243244";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    hudRenderer.drawTowerFloorBadge(game);
  }

  function drawMenuHint() {
    ctx.fillStyle = "#f3f6fb";
    ctx.font = "700 28px sans-serif";
    ctx.fillText("Tap Survivor", 36, 58);
    ctx.font = "16px sans-serif";
    ctx.fillText("Unlock weapons, then start a run.", 36, 88);
  }

  function drawPlayer(p) {
    drawPlayerHpBar(p);
    const previousAlpha = ctx.globalAlpha;
    if (p.blinkTimer > 0) ctx.globalAlpha = 0.35 + Math.abs(Math.sin(p.blinkTimer * 24)) * 0.65;
    const spriteId = playerSpriteId(p);
    const playerDrawn = drawSprite(spriteId, p.x, p.y, Math.max(70, p.radius * 3.8), 0, {
      flipX: playerFacesLeft(p),
    }) || (spriteId !== "player" && drawSprite("player", p.x, p.y, Math.max(70, p.radius * 3.8), 0, {
      flipX: playerFacesLeft(p),
    }));
    if (!playerDrawn) {
      ctx.fillStyle = "#69d2ff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = previousAlpha;
    if (p.invincibleTimer > 0) {
      ctx.strokeStyle = "rgba(88, 255, 157, 0.72)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(105, 210, 255, 0.28)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.pickupRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#dff6ff";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.targetX, p.targetY);
    ctx.stroke();
  }

  function playerFacesLeft(p) {
    return p.targetX < p.x - 2;
  }

  function playerSpriteId(p) {
    if (p.actionTimer > 0 && p.actionSprite) return `player:${p.actionSprite}`;
    if (p.moving) return "player:walk";
    return "player";
  }

  function drawPlayerHpBar(p) {
    const width = 44;
    const height = 6;
    const x = p.x - width / 2;
    const y = p.y - p.radius - 16;
    const fillWidth = width * clamp(p.hp / p.maxHp, 0, 1);
    ctx.fillStyle = "rgba(10, 14, 20, 0.82)";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = fillWidth > width * 0.35 ? "#78e08f" : "#ff6b6b";
    ctx.fillRect(x, y, fillWidth, height);
    ctx.strokeStyle = "#f3f6fb";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    drawProjectileBlockBar(p, x, y + height + 3, width);
  }

  function drawProjectileBlockBar(p, x, y, width) {
    const progress = p.projectileBlockReady ? 1 : clamp((p.projectileBlockCharge || 0) / (p.projectileBlockNeeded || 1), 0, 1);
    if (progress <= 0) return;
    ctx.fillStyle = "rgba(10, 14, 20, 0.82)";
    ctx.fillRect(x, y, width, 4);
    ctx.fillStyle = p.projectileBlockReady ? "#8de7ff" : "#4aa3ff";
    ctx.fillRect(x, y, width * progress, 4);
  }

  function drawXp(drop) {
    ctx.fillStyle = "#78e08f";
    ctx.beginPath();
    ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawLoot(drop) {
    if (drop.type === "coin") {
      if (drawSprite("ui:coin", drop.x, drop.y, Math.max(24, drop.radius * 3.1))) return;
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff0a8";
      ctx.lineWidth = 2;
      ctx.stroke();
      return;
    }

    if (drop.type === "heart" && drawSprite("ui:heart", drop.x, drop.y, Math.max(26, drop.radius * 3))) return;
    ctx.fillStyle = "#ff5f7a";
    ctx.beginPath();
    ctx.arc(drop.x - drop.radius * 0.34, drop.y - drop.radius * 0.18, drop.radius * 0.5, 0, Math.PI * 2);
    ctx.arc(drop.x + drop.radius * 0.34, drop.y - drop.radius * 0.18, drop.radius * 0.5, 0, Math.PI * 2);
    ctx.moveTo(drop.x - drop.radius, drop.y);
    ctx.lineTo(drop.x, drop.y + drop.radius);
    ctx.lineTo(drop.x + drop.radius, drop.y);
    ctx.closePath();
    ctx.fill();
  }

  function drawPickupText(text) {
    const alpha = clamp(text.life / text.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = text.color;
    ctx.font = "700 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text.text, text.x, text.y);
    ctx.restore();
    ctx.textAlign = "start";
  }

  function drawBolt(bolt) {
    const weapon = weaponDefs[bolt.weaponId];
    const rotation = Math.atan2(bolt.vy || 0, bolt.vx || 1);
    const tuning = skillEffectTuning(bolt.weaponId, weapon);
    const boltDrawn = drawSprite(`weapon:${weapon?.assetId || bolt.weaponId}`, bolt.x, bolt.y, bolt.radius * 2 * tuning.scale, rotation, { alpha: tuning.alpha });
    if (!boltDrawn) {
      ctx.fillStyle = bolt.color;
      ctx.beginPath();
      ctx.arc(bolt.x, bolt.y, bolt.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBeam(beam) {
    const weapon = weaponDefs[beam.weaponId];
    const tuning = skillEffectTuning(beam.weaponId, weapon);
    const length = Math.max(1, Math.hypot(beam.endX - beam.x, beam.endY - beam.y));
    const midX = (beam.x + beam.endX) / 2;
    const midY = (beam.y + beam.endY) / 2;
    const rotation = Math.atan2(beam.endY - beam.y, beam.endX - beam.x);
    const spriteHeight = Math.max(1, beam.width * tuning.scale);
    if (weapon && drawSprite(`weapon:${weapon.assetId || beam.weaponId}`, midX, midY, length, rotation, { width: length, height: spriteHeight, alpha: tuning.alpha })) {
      return;
    }
    ctx.save();
    ctx.strokeStyle = beam.color;
    ctx.lineWidth = beam.width;
    ctx.globalAlpha = Math.max(0.2, beam.life / 0.24) * tuning.alpha;
    ctx.beginPath();
    ctx.moveTo(beam.x, beam.y);
    ctx.lineTo(beam.endX, beam.endY);
    ctx.stroke();
    ctx.restore();
  }

  function drawArea(area) {
    const weapon = weaponDefs[area.weaponId];
    const tuning = skillEffectTuning(area.weaponId, weapon);
    const spriteSize = area.radius * 2 * tuning.scale;
    const spriteDrawn = weapon && drawSprite(`weapon:${weapon.assetId || area.weaponId}`, area.x, area.y, spriteSize, 0, {
      width: spriteSize,
      height: spriteSize,
      alpha: Math.max(0.1, Math.min(1, area.life)) * tuning.alpha,
    });
    ctx.save();
    ctx.strokeStyle = area.color;
    ctx.fillStyle = area.color;
    ctx.globalAlpha = spriteDrawn ? 0.12 * tuning.alpha : Math.max(0.1, Math.min(0.32, area.life)) * tuning.alpha;
    ctx.beginPath();
    ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.8 * tuning.alpha;
    ctx.stroke();
    ctx.restore();
  }

  function drawWeaponBurst(burst) {
    const progress = 1 - burst.life / burst.maxLife;
    const radius = burst.radius + progress * 26;
    ctx.globalAlpha = Math.max(0, burst.life / burst.maxLife) * 0.78;
    ctx.strokeStyle = burst.color;
    ctx.lineWidth = 3 + progress * 4;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha *= 0.22;
    ctx.fillStyle = burst.color;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, Math.max(8, radius * 0.46), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function skillEffectTuning(weaponId, weapon) {
    const sprite = skillEffectSprites[weapon?.assetId || weaponId] || {};
    return {
      scale: Math.max(0.1, Number(sprite.effectScale || 1)),
      alpha: Math.max(0, Math.min(1, Number(sprite.effectAlpha ?? 1))),
    };
  }

  function drawBossAttack(attack) {
    if (attack.type === "boss_slash") {
      drawBossSlash(attack);
      return;
    }
    const charging = attack.age < attack.windup;
    const progress = clamp(attack.age / attack.windup, 0, 1);
    const radius = charging ? attack.radius * progress : attack.radius;
    const drop = attack.type === "boss_drop";
    ctx.strokeStyle = charging ? (drop ? "#8de7ff" : "#ffd166") : "#ff5f7a";
    ctx.fillStyle = charging ? (drop ? "rgba(141, 231, 255, 0.14)" : "rgba(255, 209, 102, 0.12)") : "rgba(255, 95, 122, 0.2)";
    ctx.lineWidth = charging ? 3 : 5;
    ctx.beginPath();
    ctx.arc(attack.x, attack.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  function drawBossSlash(attack) {
    const charging = attack.age < attack.windup;
    const progress = clamp(attack.age / attack.windup, 0, 1);
    const reach = charging ? attack.radius * progress : attack.radius;
    const angle = Math.atan2(attack.dirY, attack.dirX);
    const left = angle - attack.arc / 2;
    const right = angle + attack.arc / 2;
    ctx.fillStyle = charging ? "rgba(255, 209, 102, 0.12)" : "rgba(255, 95, 122, 0.24)";
    ctx.strokeStyle = charging ? "#ffd166" : "#ff5f7a";
    ctx.lineWidth = charging ? 3 : 5;
    ctx.beginPath();
    ctx.moveTo(attack.x, attack.y);
    ctx.lineTo(attack.x + Math.cos(left) * reach, attack.y + Math.sin(left) * reach);
    ctx.arc(attack.x, attack.y, reach, left, right);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  return { draw };
}

globalThis.TapSurvivorRendering = {
  createRenderer,
};
})();
