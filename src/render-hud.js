(() => {
const { clamp } = globalThis.TapSurvivorMath;

function createHudRenderer({ canvas, ctx, roundedRectPath, drawSprite, weaponDefs }) {
  const runUpgradeDefs = globalThis.TapSurvivorContent?.runUpgrades || [];
  const skillRail = globalThis.TapSurvivorRenderSkillRail.createSkillRailRenderer({
    canvas,
    ctx,
    roundedRectPath,
    drawSprite,
    weaponDefs,
    runUpgradeDefs,
  });

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
    skillRail.drawSkillRail(game);
    skillRail.drawUpgradeRail(game);
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
