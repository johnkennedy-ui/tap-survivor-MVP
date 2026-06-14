(() => {
const { clamp } = globalThis.TapSurvivorMath;

function createHudRenderer({ canvas, ctx, roundedRectPath, drawSprite, weaponDefs }) {
  function drawTowerFloorBadge(game) {
    const floor = game?.towerFloor || 1;
    const width = 132;
    const height = 34;
    const x = canvas.width / 2 - width / 2;
    const y = 12;
    roundedRectPath(x, y, width, height, 8);
    ctx.fillStyle = "rgba(10, 14, 20, 0.76)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 209, 102, 0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#ffd166";
    ctx.font = "700 15px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Tower Floor ${floor}`, canvas.width / 2, y + 22);
    ctx.textAlign = "start";
  }

  function drawBossSpawnNotice(game) {
    const notice = game.bossSpawnNotice;
    if (!notice) return;
    const alpha = clamp(notice.life / notice.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ffd166";
    ctx.font = "800 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(notice.text, canvas.width / 2, 104);
    ctx.restore();
    ctx.textAlign = "start";
  }

  function drawGameHud(game) {
    drawBossHealthBar(game);
    drawBossSpecialBar(game);
    drawSkillRail(game);
  }

  function drawBossHealthBar(game) {
    const boss = game.enemies.find((enemy) => enemy.boss);
    if (!boss) return;
    const width = Math.min(520, canvas.width - 220);
    const height = 18;
    const x = canvas.width / 2 - width / 2;
    const y = 54;
    const fillWidth = width * clamp(boss.hp / boss.maxHp, 0, 1);

    roundedRectPath(x, y, width, height, 7);
    ctx.fillStyle = "rgba(10, 14, 20, 0.84)";
    ctx.fill();
    roundedRectPath(x, y, fillWidth, height, 7);
    ctx.fillStyle = boss.superBoss ? "#ff74c8" : "#ff5f7a";
    ctx.fill();
    ctx.strokeStyle = boss.superBoss ? "#ffd166" : "#f3f6fb";
    ctx.lineWidth = 2;
    roundedRectPath(x, y, width, height, 7);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 12px sans-serif";
    ctx.textAlign = "center";
    const kind = boss.superBoss ? "SUPER BOSS" : boss.bossKind === "charger" ? "CHARGER BOSS" : boss.bossKind === "turret" ? "TURRET BOSS" : "BOSS";
    ctx.fillText(`${kind} ${Math.max(0, Math.ceil(boss.hp))}/${Math.ceil(boss.maxHp)}`, canvas.width / 2, y + 13);
    ctx.textAlign = "start";
  }

  function drawBossSpecialBar(game) {
    const boss = game.enemies.find((enemy) => enemy.boss);
    if (!boss || boss.dropTimer > 0) return;
    const max = Math.max(0.1, game.bossAttackCooldownMax || 3.8);
    const progress = clamp(1 - (game.bossAttackTimer || 0) / max, 0, 1);
    const width = Math.min(360, canvas.width - 320);
    const height = 10;
    const x = canvas.width / 2 - width / 2;
    const y = 78;
    roundedRectPath(x, y, width, height, 5);
    ctx.fillStyle = "rgba(10, 14, 20, 0.86)";
    ctx.fill();
    roundedRectPath(x, y, width * progress, height, 5);
    ctx.fillStyle = progress > 0.82 ? "#ff5f56" : "#ffd166";
    ctx.fill();
    ctx.strokeStyle = progress > 0.82 ? "#ffffff" : "rgba(255, 209, 102, 0.75)";
    ctx.lineWidth = 1.5;
    roundedRectPath(x, y, width, height, 5);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SPECIAL", canvas.width / 2, y + 9);
    ctx.textAlign = "start";
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
      drawSkillIcon(weaponId, weapon, x, top, size, game.weaponBursts.some((burst) => burst.weaponId === weaponId));
    });
  }

  function drawSkillIcon(weaponId, weapon, x, y, size, active = false) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const color = weapon.color || "#f3f6fb";

    roundedRectPath(x, y, size, size, 7);
    ctx.fillStyle = "rgba(18, 24, 34, 0.94)";
    ctx.fill();
    ctx.strokeStyle = active ? "#ffd166" : color;
    ctx.lineWidth = active ? 4 : 3;
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.globalAlpha = active ? 0.3 : 0.16;
    roundedRectPath(x + 5, y + 5, size - 10, size - 10, 5);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (active) {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size * 0.42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (drawSprite(`weapon:${weapon.assetId || weaponId}`, centerX, centerY, size * (active ? 0.72 : 0.62))) return;
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

  return {
    drawBossSpawnNotice,
    drawGameHud,
    drawBossSpecialBar,
    drawTowerFloorBadge,
  };
}

globalThis.TapSurvivorRenderHud = {
  createHudRenderer,
};
})();
