(() => {
function createEnemyRenderer({ ctx, drawSprite, clamp }) {
  function drawEnemy(enemy) {
    const enemySprite = enemy.boss ? "enemy:boss" : `enemy:${enemy.assetId || enemy.type}`;
    const spriteSize = enemy.boss ? Math.max(92, enemy.radius * 2.9) : Math.max(34, enemy.radius * 3.8);
    const enemyDrawn = drawSprite(enemySprite, enemy.x, enemy.y, spriteSize);
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
    } else {
      drawEnemyFloorTint(enemy, spriteSize);
    }
    if (enemy.type === "skitter") {
      ctx.fillStyle = "#17202c";
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.type === "bulwark") {
      strokeEnemyRing(enemy, "#dff6ff", 3);
    }
  }

  function drawEnemyFloorTint(enemy, spriteSize) {
    const floor = clamp(Math.floor(enemy.towerFloor || 1), 1, 100);
    const bucket = Math.floor((floor - 1) / 5);
    const progress = bucket / 19;
    const red = Math.round(52 + progress * 154);
    const green = Math.round(230 - progress * 190);
    const blue = Math.round(190 - progress * 162);
    const alpha = 0.12 + progress * 0.14;
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, Math.max(enemy.radius + 4, spriteSize * 0.36), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    strokeEnemyRing(enemy, `rgba(${red}, ${green}, ${blue}, ${0.48 + progress * 0.28})`, 2 + progress * 2);
  }

  function strokeEnemyRing(enemy, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.stroke();
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

  return {
    drawEnemy,
    drawEnemyBolt,
  };
}

globalThis.TapSurvivorRenderEnemies = {
  createEnemyRenderer,
};
})();
