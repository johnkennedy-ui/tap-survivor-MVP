(() => {
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createRenderer({ canvas, ctx, drawSprite, weaponDefs }) {
  function draw(game) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawArena();
    if (!game) {
      drawMenuHint();
      return;
    }

    game.areas.forEach(drawArea);
    game.bossAttacks.forEach(drawBossAttack);
    game.xpDrops.forEach(drawXp);
    game.lootDrops.forEach(drawLoot);
    game.bolts.forEach(drawBolt);
    game.enemies.forEach(drawEnemy);
    game.beams.forEach(drawBeam);
    drawPlayer(game.player);
    drawGameHud(game);
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

  function drawArena() {
    ctx.fillStyle = "#17202c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#243244";
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
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = "#f3f6fb";
      ctx.font = "700 14px sans-serif";
      ctx.fillText("BOSS", enemy.x - 19, enemy.y - enemy.radius - 10);
    } else if (enemy.type === "skitter") {
      ctx.fillStyle = "#17202c";
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.type === "bulwark") {
      ctx.strokeStyle = "#dff6ff";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
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

  function drawBossAttack(attack) {
    const charging = attack.age < attack.windup;
    const progress = clamp(attack.age / attack.windup, 0, 1);
    const radius = charging ? attack.radius * progress : attack.radius;
    ctx.strokeStyle = charging ? "#ffd166" : "#ff5f7a";
    ctx.fillStyle = charging ? "rgba(255, 209, 102, 0.12)" : "rgba(255, 95, 122, 0.2)";
    ctx.lineWidth = charging ? 3 : 5;
    ctx.beginPath();
    ctx.arc(attack.x, attack.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  function drawGameHud(game) {
    drawSkillRail(game);
  }

  function drawSkillRail(game) {
    const equipped = game.player.equippedWeapons.filter((weaponId) => weaponDefs[weaponId]);
    if (!equipped.length) return;

    const maxRailHeight = canvas.height - 120;
    const gap = 8;
    const size = Math.max(32, Math.min(48, Math.floor((maxRailHeight - (equipped.length - 1) * gap - 16) / equipped.length)));
    const x = 18;
    const y = 78;
    const railHeight = equipped.length * size + (equipped.length - 1) * gap + 16;

    roundedRectPath(x - 8, y - 8, size + 16, railHeight, 8);
    ctx.fillStyle = "rgba(10, 14, 20, 0.78)";
    ctx.fill();
    ctx.strokeStyle = "rgba(243, 246, 251, 0.14)";
    ctx.lineWidth = 1;
    ctx.stroke();

    equipped.forEach((weaponId, index) => {
      const weapon = weaponDefs[weaponId];
      const top = y + index * (size + gap);
      drawSkillIcon(weaponId, weapon, x, top, size);
    });
  }

  function drawSkillIcon(weaponId, weapon, x, y, size) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const color = weapon.color || "#f3f6fb";

    roundedRectPath(x, y, size, size, 7);
    ctx.fillStyle = "rgba(18, 24, 34, 0.94)";
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.16;
    roundedRectPath(x + 5, y + 5, size - 10, size - 10, 5);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (drawSprite(`weapon:${weapon.assetId || weaponId}`, centerX, centerY, size * 0.62)) return;
    drawWeaponGlyph(weapon.kind, centerX, centerY, size, color);
  }

  function drawWeaponGlyph(kind, x, y, size, color) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (kind === "beam") {
      ctx.beginPath();
      ctx.moveTo(x - size * 0.22, y + size * 0.18);
      ctx.lineTo(x + size * 0.22, y - size * 0.18);
      ctx.stroke();
      return;
    }
    if (kind === "cone") {
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.22);
      ctx.lineTo(x + size * 0.24, y + size * 0.2);
      ctx.lineTo(x - size * 0.24, y + size * 0.2);
      ctx.closePath();
      ctx.fill();
      return;
    }
    if (kind === "radial") {
      ctx.beginPath();
      ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, size * 0.08, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (kind === "chain") {
      ctx.beginPath();
      ctx.moveTo(x - size * 0.18, y - size * 0.2);
      ctx.lineTo(x + size * 0.02, y - size * 0.02);
      ctx.lineTo(x - size * 0.04, y + size * 0.02);
      ctx.lineTo(x + size * 0.18, y + size * 0.2);
      ctx.stroke();
      return;
    }
    if (kind === "target_area" || kind === "lingering_area") {
      ctx.beginPath();
      ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - size * 0.25, y);
      ctx.lineTo(x + size * 0.25, y);
      ctx.moveTo(x, y - size * 0.25);
      ctx.lineTo(x, y + size * 0.25);
      ctx.stroke();
      return;
    }
    if (kind === "mine") {
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.24);
      ctx.lineTo(x + size * 0.24, y);
      ctx.lineTo(x, y + size * 0.24);
      ctx.lineTo(x - size * 0.24, y);
      ctx.closePath();
      ctx.fill();
      return;
    }

    ctx.beginPath();
    ctx.arc(x, y, size * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }

  return { draw };
}

globalThis.TapSurvivorRendering = {
  createRenderer,
};
})();
