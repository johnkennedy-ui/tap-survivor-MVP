(() => {
  const floorTable = [
    { hp: 0.9, damage: 0.85, spawnRate: 0.9 },
    { hp: 1.1, damage: 1, spawnRate: 1 },
    { hp: 1.33, damage: 1.15, spawnRate: 1.08 },
  ];

  function floorDifficulty(floor) {
    const floorNumber = Math.max(1, Math.floor(floor || 1));
    const tableEntry = floorTable[floorNumber - 1];
    if (tableEntry) return { ...tableEntry };

    const extraFloors = floorNumber - floorTable.length;
    const floorThree = floorTable[floorTable.length - 1];
    return {
      hp: floorThree.hp + extraFloors * 0.2,
      damage: floorThree.damage + extraFloors * 0.13,
      spawnRate: floorThree.spawnRate + extraFloors * 0.05,
    };
  }

  globalThis.TapSurvivorBalance = {
    floorDifficulty,
  };
})();
