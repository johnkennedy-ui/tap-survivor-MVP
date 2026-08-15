// GENERATED FILE. Do not edit directly.
// Source: src/modules/render-enemies.js
// Run: npm run build:bridges
(() => {
  "use strict";

  const MODULE_NATIVE_RENDER_ENEMIES_SLOTS = Object.freeze(["renderEnemies"]);

  const MODULE_NATIVE_RENDER_ENEMIES_PROOF_SLOTS = Object.freeze(["createEnemyRenderer"]);

  function createEnemyRenderer({ ctx, drawSprite, spriteSheetRenderer, clamp }) {
    function drawEnemy(enemy, game) {
      const enemySprite = enemy.boss ? "enemy:boss" : `enemy:${enemy.assetId || enemy.type}`;
      const spriteSize = enemy.boss ? Math.max(92, enemy.radius * 2.9) : Math.max(34, enemy.radius * 3.8);
      const enemyDrawn = drawEnemySpriteSheet(enemy, game, spriteSize) || drawSprite(enemySprite, enemy.x, enemy.y, spriteSize, 0, {
        flipX: enemyFacesLeft(enemy),
      });
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

    function drawEnemySpriteSheet(enemy, game, spriteSize) {
      if (!spriteSheetRenderer?.drawAnimation) return false;
      const animationTime = Number(enemy.animTime || 0);
      if (enemy.boss) {
        const bossAnimationId = bossAnimationIdFor(enemy);
        return spriteSheetRenderer.drawAnimation(
          "bosses",
          bossAnimationId,
          bossAnimationState(enemy, game, bossAnimationId),
          enemy.x,
          enemy.y,
          spriteSize,
          spriteSize,
          { flipX: enemyFacesLeft(enemy), time: animationTime },
        );
      }
      return spriteSheetRenderer.drawAnimation(
        "enemies",
        enemy.assetId || enemy.type,
        enemyAnimationState(enemy),
        enemy.x,
        enemy.y,
        spriteSize,
        spriteSize,
        { flipX: enemyFacesLeft(enemy), time: animationTime },
      );
    }

    function enemyAnimationState(enemy) {
      if (isRangedEnemy(enemy) && (enemy.attackVisualTimer || 0) > 0) return "attack";
      return "default";
    }

    function isRangedEnemy(enemy) {
      return !enemy?.boss && Boolean(enemy?.attackRange && enemy?.projectileCooldown);
    }

    function bossAnimationIdFor(enemy) {
      if (enemy.bossKind) return enemy.bossKind;
      return enemy.bossAbilities?.[0] || "warden";
    }

    function bossAnimationState(enemy, game, animationId) {
      if (animationId === "charger") {
        if (enemy.chargeState === "windup") return "windup";
        if (enemy.chargeState === "charging") return "release";
      }
      if (animationId === "warden") {
        const shockwave = activeBossAttack(game, "shockwave", enemy);
        if (shockwave) return shockwave.age < shockwave.windup ? "windup" : "release";
        if (enemy.dropTimer > 0) return "windup";
      }
      if (animationId === "turret") {
        if ((enemy.attackVisualTimer || 0) > 0) return "release";
        if (enemy.shootTimer <= Math.min(0.45, (enemy.projectileCooldown || 1) * 0.28)) return "windup";
      }
      return "idle";
    }

    function activeBossAttack(game, type, enemy) {
      return game?.bossAttacks?.find((attack) => attack.type === type && Math.hypot(attack.x - enemy.x, attack.y - enemy.y) <= Math.max(190, enemy.radius * 5));
    }

    function enemyFacesLeft(enemy) {
      if (Number.isFinite(enemy.vx)) return enemy.vx < -1;
      if (Number.isFinite(enemy.chargeDirX)) return enemy.chargeDirX < -0.1;
      return false;
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
      const color = bolt.color || "#b794ff";
      const trailColor = bolt.trailColor || color;
      const glowColor = bolt.glowColor || color;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = withAlpha(glowColor, 0.55);
      ctx.lineWidth = Math.max(4, bolt.radius * 0.8);
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(bolt.x, bolt.y);
      ctx.stroke();
      ctx.strokeStyle = trailColor;
      ctx.lineWidth = Math.max(2, bolt.radius * 0.45);
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(bolt.x, bolt.y);
      ctx.stroke();
      ctx.fillStyle = withAlpha(glowColor, 0.42);
      ctx.beginPath();
      ctx.arc(bolt.x, bolt.y, bolt.radius + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(bolt.x, bolt.y, bolt.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#10141d";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    function withAlpha(color, alpha) {
      const match = typeof color === "string" ? /^#([0-9a-f]{6})$/i.exec(color.trim()) : null;
      if (!match) return color;
      const value = Number.parseInt(match[1], 16);
      const r = (value >> 16) & 255;
      const g = (value >> 8) & 255;
      const b = value & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    return {
      drawEnemy,
      drawEnemyBolt,
      enemyAnimationState,
    };
  }

  globalThis.TapSurvivorRenderEnemies = {
    createEnemyRenderer,
  };
})();
