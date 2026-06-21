/** @typedef {import("./content-types.mjs").ContentEntry} ContentEntry */
/** @typedef {import("./content-types.mjs").ContentRecord} ContentRecord */

/** @param {Record<string, unknown> | undefined} value */
export function idsFromMap(value) {
  return Object.keys(value || {}).sort();
}

/** @param {ContentEntry[] | undefined} value */
export function idsFromList(value) {
  return (value || []).map((item) => item.id).filter(Boolean).sort();
}

/** @param {ContentRecord} content */
export function contentCounts(content) {
  return {
    weapons: Object.keys(content.weapons || {}).length,
    weaponUnlocks: (content.weaponUnlocks || []).length,
    quests: Object.keys(content.quests || {}).length,
    enemyTypes: (content.enemyTypes || []).length,
    characters: (content.characters || []).length,
    shopItems: (content.shopItems || []).length,
    levels: (content.levels || []).length,
    maps: (content.maps || []).length,
  };
}
