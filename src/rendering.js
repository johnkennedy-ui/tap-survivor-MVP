(() => {
const { clamp } = globalThis.TapSurvivorMath;

function createRenderer({ canvas, ctx, drawImage, drawSprite, weaponDefs }) {
  const hudRenderer = globalThis.TapSurvivorRenderHud.createHudRenderer({
    canvas,
    ctx,
    roundedRectPath,
    drawSprite,
    weaponDefs,
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
    game.enemyBolts.forEach(drawEnemyBolt);
    game.enemies.forEach(drawEnemy);
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
    ctx.fillText("Tap Survivor MVP", 36, 58);
    ctx.font = "16px sans-serif";
    ctx.fillText("Unlock weapons, then start a run.", 36, 88);
  }

  function drawPlayer(p) {
    drawPlayerHpBar(p);
    const playerDrawn = drawSprite("player", p.x, p.y, p.radius * 2.7);
    if (!playerDrawn) {
      ctx.fillStyle = "#69d2ff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
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

  function drawEnemy(enemy) {
    const enemySprite = enemy.boss ? "enemy:boss" : `enemy:${enemy.assetId || enemy.type}`;
    const enemyDrawn = drawSprite(enemySprite, enemy.x, enemy.y, enemy.radius * (enemy.boss ? 2.2 : 2.4));
    if (!enemyDrawn) {
      ctx.fillStyle = enemy.boss ? "#ff4f8b" : enemy.color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    if (enemy.boss) {
      const charging = (enemy.bossAbilities?.includes("charger") || enemy.bossKind === "charger") && enemy.chargeState === "windup";
      const ringColor = charging ? "#ff3b3b" : enemy.superBoss ? "#ff74c8" : "#ffd166";
      strokeEnemyRing(enemy, ringColor, charging ? 7 : enemy.superBoss ? 6 : 4);
      ctx.fillStyle = "#f3f6fb";
      ctx.font = "700 14px sans-serif";
      const label = enemy.superBoss ? "SUPER" : enemy.bossKind === "turret" ? "TURRET" : enemy.bossKind === "charger" ? "CHARGE" : "BOSS";
      ctx.fillText(label, enemy.x - label.length * 3.6, enemy.y - enemy.radius - 10);
    } else if (enemy.type === "skitter") {
      ctx.fillStyle = "#17202c";
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.type === "bulwark") {
      strokeEnemyRing(enemy, "#dff6ff", 3);
    }
  }

  function strokeEnemyRing(enemy, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawXp(drop) {
    ctx.fillStyle = "#78e08f";
    ctx.beginPath();
    ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawLoot(drop) {
    if (drop.type === "coin") {
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff0a8";
      ctx.lineWidth = 2;
      ctx.stroke();
      return;
    }

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
    const boltDrawn = drawSprite(`weapon:${weapon?.assetId || bolt.weaponId}`, bolt.x, bolt.y, bolt.radius * 3.2, rotation);
    if (!boltDrawn) {
      ctx.fillStyle = bolt.color;
      ctx.beginPath();
      ctx.arc(bolt.x, bolt.y, bolt.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEnemyBolt(bolt) {
    const speed = Math.max(1, Math.hypot(bolt.vx || 0, bolt.vy || 0));
    const tailX = bolt.x - (bolt.vx / speed) * bolt.radius * 3.2;
    const tailY = bolt.y - (bolt.vy / speed) * bolt.radius * 3.2;
    const alpha = clamp((bolt.life || 0) / (bolt.maxLife || 1), 0.3, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(4, bolt.radius * 0.8);
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(bolt.x, bolt.y);
    ctx.stroke();
    ctx.strokeStyle = bolt.color;
    ctx.lineWidth = Math.max(2, bolt.radius * 0.45);
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(bolt.x, bolt.y);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(bolt.x, bolt.y, bolt.radius + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bolt.color;
    ctx.beginPath();
    ctx.arc(bolt.x, bolt.y, bolt.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#10141d";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  function drawBeam(beam) {
    ctx.strokeStyle = beam.color;
    ctx.lineWidth = beam.width;
    ctx.globalAlpha = Math.max(0.2, beam.life / 0.24);
    ctx.beginPath();
    ctx.moveTo(beam.x, beam.y);
    ctx.lineTo(beam.endX, beam.endY);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawArea(area) {
    ctx.strokeStyle = area.color;
    ctx.fillStyle = area.color;
    ctx.globalAlpha = Math.max(0.1, Math.min(0.32, area.life));
    ctx.beginPath();
    ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.stroke();
    ctx.globalAlpha = 1;
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
