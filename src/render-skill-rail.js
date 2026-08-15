// GENERATED FILE. Do not edit directly.
// Source: src/modules/render-skill-rail.js
// Run: npm run build:bridges
(() => {
  "use strict";

  /**
   * @typedef {{
   *   canvas?: HTMLCanvasElement,
   *   ctx?: CanvasRenderingContext2D,
   *   roundedRectPath?: (x: number, y: number, width: number, height: number, radius: number) => void,
   *   drawSprite?: (spriteId: string, x: number, y: number, size: number, rotation?: number, options?: { trim?: boolean }) => boolean | void,
   *   weaponDefs?: Record<string, { assetId?: string, color?: string, kind?: string }>,
   *   runUpgradeDefs?: { id: string }[],
   * }} SkillRailRendererOptions
   */

  /**
   * @param {SkillRailRendererOptions} [options]
   */
  function createSkillRailRenderer({
    canvas: suppliedCanvas,
    ctx: suppliedCtx,
    roundedRectPath: suppliedRoundedRectPath,
    drawSprite: suppliedDrawSprite,
    weaponDefs: suppliedWeaponDefs,
    runUpgradeDefs: suppliedRunUpgradeDefs,
  } = {}) {
    const canvas = requireSkillRailObject(suppliedCanvas, "canvas");
    const ctx = requireSkillRailObject(suppliedCtx, "ctx");
    const roundedRectPath = requireSkillRailFunction(suppliedRoundedRectPath, "roundedRectPath");
    const drawSprite = requireSkillRailFunction(suppliedDrawSprite, "drawSprite");
    const weaponDefs = requireSkillRailObject(suppliedWeaponDefs, "weaponDefs");
    const runUpgradeDefs = requireSkillRailObject(suppliedRunUpgradeDefs, "runUpgradeDefs");

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
        drawSkillIcon(weaponId, weapon, x, top, size, weaponFlashAmount(game, weaponId));
      });
    }

    function weaponFlashAmount(game, weaponId) {
      const iconFlash = Math.max(0, game.weaponIconFlashes?.[weaponId] || 0);
      const burstFlash = game.weaponBursts.some((burst) => burst.weaponId === weaponId) ? 0.45 : 0;
      return Math.min(1, Math.max(iconFlash, burstFlash));
    }

    function drawSkillIcon(weaponId, weapon, x, y, size, flash = 0) {
      const centerX = x + size / 2;
      const centerY = y + size / 2;
      const color = weapon.color || "#f3f6fb";
      const active = flash > 0;
      const pulse = 1 + flash * 0.14;
      const iconSize = size * (active ? 0.74 : 0.62) * pulse;

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
        ctx.globalAlpha = 0.35 + flash * 0.45;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * (0.34 + flash * 0.22), 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = flash * 0.32;
        roundedRectPath(x + 3, y + 3, size - 6, size - 6, 6);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      drawFallbackWeaponGlyph(weapon.kind, centerX, centerY, size, color);
      drawSprite(`weaponIcon:${weapon.assetId || weaponId}`, centerX, centerY, iconSize, 0, { trim: false }) ||
        drawSprite(`weapon:${weapon.assetId || weaponId}`, centerX, centerY, iconSize);
    }

    function drawUpgradeRail(game) {
      const activeUpgrades = Object.entries(game.runUpgradeTiers || {})
        .filter(([, tier]) => tier > 0)
        .map(([id, tier]) => ({
          id,
          tier,
          upgrade: runUpgradeDefs.find((item) => item.id === id),
        }))
        .filter((item) => item.upgrade);
      if (!activeUpgrades.length) return;

      const size = 34;
      const gap = 7;
      const x = 78;
      const y = 78;
      const railHeight = activeUpgrades.length * size + (activeUpgrades.length - 1) * gap + 14;

      roundedRectPath(x - 7, y - 7, size + 14, railHeight, 8);
      ctx.fillStyle = "rgba(10, 14, 20, 0.72)";
      ctx.fill();
      ctx.strokeStyle = "rgba(120, 224, 143, 0.24)";
      ctx.lineWidth = 1;
      ctx.stroke();

      activeUpgrades.forEach(({ id, tier, upgrade }, index) => {
        drawUpgradeIcon(id, upgrade, tier, x, y + index * (size + gap), size);
      });
    }

    function drawUpgradeIcon(upgradeId, upgrade, tier, x, y, size) {
      const centerX = x + size / 2;
      const centerY = y + size / 2;
      roundedRectPath(x, y, size, size, 7);
      ctx.fillStyle = "rgba(18, 24, 34, 0.92)";
      ctx.fill();
      ctx.strokeStyle = "#78e08f";
      ctx.lineWidth = 2;
      ctx.stroke();

      drawFallbackUpgradeGlyph(upgradeId, centerX, centerY, size, "#78e08f");
      drawSprite(`runUpgradeIcon:${upgradeId}`, centerX, centerY, size * 0.68, 0, { trim: false });

      const label = String(tier);
      const badgeSize = 14;
      roundedRectPath(x + size - badgeSize, y + size - badgeSize, badgeSize, badgeSize, 5);
      ctx.fillStyle = "rgba(120, 224, 143, 0.92)";
      ctx.fill();
      ctx.fillStyle = "#10141d";
      ctx.font = "800 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, x + size - badgeSize / 2, y + size - 3);
      ctx.textAlign = "start";
    }

    function drawUpgradeGlyph(id, x, y, size, color) {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      if (id.includes("fire_rate")) {
        ctx.beginPath();
        ctx.arc(x, y, size * 0.18, 0, Math.PI * 2);
        ctx.stroke();
        return;
      }
      if (id.includes("damage")) {
        ctx.beginPath();
        ctx.moveTo(x - size * 0.2, y + size * 0.16);
        ctx.lineTo(x + size * 0.2, y - size * 0.16);
        ctx.stroke();
        return;
      }
      ctx.beginPath();
      ctx.arc(x, y, size * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawFallbackUpgradeGlyph(id, x, y, size, color) {
      const previousAlpha = ctx.globalAlpha ?? 1;
      ctx.globalAlpha = 0.5;
      drawUpgradeGlyph(id, x, y, size, color);
      ctx.globalAlpha = previousAlpha;
    }

    function drawFallbackWeaponGlyph(kind, x, y, size, color) {
      const previousAlpha = ctx.globalAlpha ?? 1;
      ctx.globalAlpha = 0.44;
      drawWeaponGlyph(kind, x, y, size, color);
      ctx.globalAlpha = previousAlpha;
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
      drawSkillRail,
      drawUpgradeRail,
    };
  }

  /**
   * @template T
   * @param {T | null | undefined} value
   * @param {string} name
   * @returns {NonNullable<T>}
   */
  function requireSkillRailObject(value, name) {
    if (!value || typeof value !== "object") {
      throw new Error(`Missing Tap Survivor skill rail dependency: ${name}`);
    }
    return /** @type {NonNullable<T>} */ (value);
  }

  /**
   * @template T
   * @param {T | null | undefined} value
   * @param {string} name
   * @returns {NonNullable<T>}
   */
  function requireSkillRailFunction(value, name) {
    if (typeof value !== "function") {
      throw new Error(`Missing Tap Survivor skill rail dependency: ${name}`);
    }
    return /** @type {NonNullable<T>} */ (value);
  }

  globalThis.TapSurvivorRenderSkillRail = {
    createSkillRailRenderer,
  };
})();
