export function idsFromMap(value) {
  return Object.keys(value || {}).sort();
}

export function idsFromList(value) {
  return (value || []).map((item) => item.id).filter(Boolean).sort();
}

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
