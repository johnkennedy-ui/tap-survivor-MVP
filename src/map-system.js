(() => {
function createMapSystem({ mapDefs = [], levelDefs = [], spriteDefs = {} }) {
  const backgroundSprites = spriteDefs.backgrounds || {};
  const fallbackBackgroundId = backgroundSprites.tower_floor ? "tower_floor" : "";
  const fallbackMap = {
    id: "default_tower",
    name: "Default Tower",
    floorIds: levelDefs.map((level) => level.id).filter(Boolean),
    backgroundAsset: backgroundSprites[fallbackBackgroundId] || "",
    modifiers: {},
  };

  function usableMaps() {
    const maps = (mapDefs || []).filter((map) => map?.id);
    return maps.length ? maps : [fallbackMap];
  }

  function floorPoolForMap(map) {
    const ids = new Set(map?.floorIds || []);
    const floors = ids.size ? levelDefs.filter((level) => ids.has(level.id)) : levelDefs;
    return floors.length ? floors : levelDefs;
  }

  function resolveMap(towerFloor = 1) {
    const maps = usableMaps();
    const index = Math.max(0, Math.floor((Math.max(1, towerFloor) - 1) % maps.length));
    return maps[index] || fallbackMap;
  }

  function resolveFloor({ map, elapsed = 0 }) {
    const pool = floorPoolForMap(map).slice().sort((left, right) => (left.startsAt || 0) - (right.startsAt || 0));
    return pool.reduce((active, floor) => (elapsed >= (floor.startsAt || 0) ? floor : active), pool[0] || null);
  }

  function backgroundIdFor(entry) {
    const asset = entry?.backgroundAsset;
    if (!asset) return fallbackBackgroundId;
    const direct = Object.entries(backgroundSprites).find(([, value]) => {
      if (typeof value === "string") return value === asset;
      return value?.src === asset || value?.path === asset;
    });
    return direct?.[0] || fallbackBackgroundId;
  }

  function resolve({ towerFloor = 1, elapsed = 0 } = {}) {
    const map = resolveMap(towerFloor);
    const floor = resolveFloor({ map, elapsed });
    const backgroundId = backgroundIdFor(floor) || backgroundIdFor(map);
    return {
      map,
      floor,
      modifiers: { ...(map?.modifiers || {}), ...(floor?.modifiers || {}) },
      background: {
        id: backgroundId,
        spriteId: backgroundId ? `background:${backgroundId}` : "",
        asset: floor?.backgroundAsset || map?.backgroundAsset || "",
      },
      floorPool: floorPoolForMap(map),
    };
  }

  function applyToGame(game) {
    if (!game) return null;
    const resolved = resolve({ towerFloor: game.towerFloor || 1, elapsed: game.elapsed || 0 });
    game.activeMap = resolved.map;
    game.activeFloor = resolved.floor;
    game.mapModifiers = resolved.modifiers;
    game.background = resolved.background;
    game.floorPool = resolved.floorPool;
    return resolved;
  }

  return {
    applyToGame,
    resolve,
  };
}

globalThis.TapSurvivorMapSystem = {
  createMapSystem,
};
})();
