const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  startRun: document.getElementById("startRun"),
  resetSave: document.getElementById("resetSave"),
  runHud: document.getElementById("runHud"),
  qpHud: document.getElementById("qpHud"),
  tree: document.getElementById("tree"),
  quests: document.getElementById("quests"),
  levelUp: document.getElementById("levelUp"),
  choices: document.getElementById("choices"),
  endScreen: document.getElementById("endScreen"),
  runStats: document.getElementById("runStats"),
  closeEnd: document.getElementById("closeEnd"),
};

const saveKey = "tap-survivor-mvp-save-v1";
const weaponIds = {
  spark: "spark_bolt",
  laser: "prism_beam",
};

const treeNodes = [
  {
    id: "unlock_laser",
    name: "Unlock Laser",
    cost: 0,
    description: "Adds Prism Beam to level-up choices.",
    unlockWeapon: weaponIds.laser,
    opensQuest: "use_laser_run",
  },
  {
    id: "laser_damage_1",
    name: "Laser Damage I",
    cost: 1,
    requires: "unlock_laser",
    description: "Unlocks a stronger Prism Beam upgrade path.",
    unlockUpgrade: "laser_damage_1",
    opensQuest: "laser_damage_5000",
  },
  {
    id: "move_speed_1",
    name: "Move Speed I",
    cost: 1,
    requires: "unlock_laser",
    description: "Future node: unlocks Move Speed I in level-up choices.",
  },
];

const questDefs = {
  use_laser_run: {
    name: "Use Laser in a run",
    description: "Fire Prism Beam during a run.",
    target: 1,
    rewardQp: 1,
  },
  laser_damage_5000: {
    name: "Deal 5,000 damage with Laser",
    description: "Deal 5,000 total damage with Prism Beam.",
    target: 5000,
    rewardQp: 1,
  },
};

let save = loadSave();
let game = null;
let lastFrame = performance.now();

function defaultSave() {
  return {
    questPoints: 0,
    totalQuestPoints: 0,
    unlockedNodes: [],
    unlockedWeapons: [weaponIds.spark],
    unlockedUpgrades: [],
    activeQuests: [],
    completedQuests: [],
    questProgress: {},
  };
}

function loadSave() {
  try {
    const raw = localStorage.getItem(saveKey);
    return raw ? { ...defaultSave(), ...JSON.parse(raw) } : defaultSave();
  } catch {
    return defaultSave();
  }
}

function persist() {
  localStorage.setItem(saveKey, JSON.stringify(save));
}

function hasNode(id) {
  return save.unlockedNodes.includes(id);
}

function hasQuest(id) {
  return save.activeQuests.includes(id) || save.completedQuests.includes(id);
}

function openQuest(id) {
  if (!questDefs[id] || hasQuest(id)) return;
  save.activeQuests.push(id);
  save.questProgress[id] = save.questProgress[id] || 0;
  persist();
}

function completeQuest(id) {
  if (!save.activeQuests.includes(id) || save.completedQuests.includes(id)) return;
  save.activeQuests = save.activeQuests.filter((questId) => questId !== id);
  save.completedQuests.push(id);
  const reward = questDefs[id].rewardQp || 0;
  save.questPoints += reward;
  save.totalQuestPoints += reward;
  persist();
  renderMeta();
}

function addQuestProgress(id, amount) {
  if (!save.activeQuests.includes(id)) return;
  save.questProgress[id] = Math.min(
    questDefs[id].target,
    (save.questProgress[id] || 0) + amount,
  );
  if (save.questProgress[id] >= questDefs[id].target) completeQuest(id);
}

function buyNode(node) {
  if (hasNode(node.id)) return;
  if (node.requires && !hasNode(node.requires)) return;
  if (save.questPoints < node.cost) return;

  save.questPoints -= node.cost;
  save.unlockedNodes.push(node.id);
  if (node.unlockWeapon && !save.unlockedWeapons.includes(node.unlockWeapon)) {
    save.unlockedWeapons.push(node.unlockWeapon);
  }
  if (node.unlockUpgrade && !save.unlockedUpgrades.includes(node.unlockUpgrade)) {
    save.unlockedUpgrades.push(node.unlockUpgrade);
  }
  if (node.opensQuest) openQuest(node.opensQuest);
  persist();
  renderMeta();
}

function renderMeta() {
  ui.qpHud.textContent = `Quest Points: ${save.questPoints} available, ${save.totalQuestPoints} earned.`;

  ui.tree.innerHTML = "";
  treeNodes.forEach((node) => {
    const lockedByPrereq = node.requires && !hasNode(node.requires);
    const bought = hasNode(node.id);
    const canBuy = !bought && !lockedByPrereq && save.questPoints >= node.cost;
    const el = document.createElement("div");
    el.className = "node";
    el.innerHTML = `
      <strong>${node.name}</strong>
      <span>${node.description}</span><br />
      <span>Cost: ${node.cost} QP${node.requires ? ` | Requires: ${labelNode(node.requires)}` : ""}</span>
    `;
    const button = document.createElement("button");
    button.textContent = bought ? "Unlocked" : lockedByPrereq ? "Prerequisite locked" : "Unlock";
    button.disabled = bought || lockedByPrereq || !canBuy;
    button.addEventListener("click", () => buyNode(node));
    el.appendChild(button);
    ui.tree.appendChild(el);
  });

  ui.quests.innerHTML = "";
  Object.entries(questDefs).forEach(([id, quest]) => {
    const complete = save.completedQuests.includes(id);
    const active = save.activeQuests.includes(id);
    const progress = save.questProgress[id] || 0;
    const el = document.createElement("div");
    el.className = `quest ${complete ? "complete" : active ? "active" : ""}`;
    el.innerHTML = `
      <strong>${quest.name}</strong>
      <span>${quest.description}</span><br />
      <span>Status: ${complete ? "Completed" : active ? "Active" : "Locked"}</span><br />
      <span>Progress: ${Math.floor(progress)} / ${quest.target}</span><br />
      <span>Reward: ${quest.rewardQp} QP</span>
    `;
    ui.quests.appendChild(el);
  });
}

function labelNode(id) {
  return treeNodes.find((node) => node.id === id)?.name || id;
}

function resetGameState() {
  const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    targetX: canvas.width / 2,
    targetY: canvas.height / 2,
    radius: 16,
    speed: 185,
    hp: 100,
    maxHp: 100,
    pickupRadius: 54,
    xp: 0,
    level: 1,
    xpToLevel: 5,
    hasLaser: false,
    laserDamageMultiplier: hasNode("laser_damage_1") ? 1.35 : 1,
  };

  game = {
    running: true,
    paused: false,
    elapsed: 0,
    duration: 120,
    player,
    enemies: [],
    xpDrops: [],
    bolts: [],
    beams: [],
    spawnTimer: 0,
    sparkTimer: 0,
    laserTimer: 0,
    kills: 0,
    xpCollected: 0,
    laserDamage: 0,
    levelUps: 0,
    endReason: "",
  };
}

function startRun() {
  ui.endScreen.classList.add("hidden");
  ui.levelUp.classList.add("hidden");
  resetGameState();
}

function endRun(reason) {
  if (!game) return;
  game.running = false;
  game.endReason = reason;
  ui.runStats.innerHTML = `
    <p>Result: ${reason}</p>
    <p>Time survived: ${formatTime(game.elapsed)}</p>
    <p>Enemies defeated: ${game.kills}</p>
    <p>Level reached: ${game.player.level}</p>
    <p>XP collected: ${game.xpCollected}</p>
    <p>Laser damage dealt: ${Math.floor(game.laserDamage)}</p>
    <p>Quest Points: ${save.questPoints} available</p>
  `;
  ui.endScreen.classList.remove("hidden");
  persist();
  renderMeta();
}

function update(dt) {
  if (!game || !game.running || game.paused) return;
  const p = game.player;
  game.elapsed += dt;
  if (game.elapsed >= game.duration) {
    endRun("Timer complete");
    return;
  }

  movePlayer(p, dt);
  spawnEnemies(dt);
  updateEnemies(dt);
  updateWeapons(dt);
  updateBolts(dt);
  updateXpDrops();
  updateBeams(dt);

  if (p.hp <= 0) endRun("Player defeated");
}

function movePlayer(p, dt) {
  const dx = p.targetX - p.x;
  const dy = p.targetY - p.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 3) {
    const step = Math.min(dist, p.speed * dt);
    p.x += (dx / dist) * step;
    p.y += (dy / dist) * step;
  }
  p.x = clamp(p.x, 18, canvas.width - 18);
  p.y = clamp(p.y, 18, canvas.height - 18);
}

function spawnEnemies(dt) {
  game.spawnTimer -= dt;
  if (game.spawnTimer > 0) return;
  game.spawnTimer = Math.max(0.35, 1.1 - game.elapsed / 150);
  const edge = Math.floor(Math.random() * 4);
  const enemy = {
    x: edge === 0 ? -20 : edge === 1 ? canvas.width + 20 : Math.random() * canvas.width,
    y: edge === 2 ? -20 : edge === 3 ? canvas.height + 20 : Math.random() * canvas.height,
    radius: 13,
    hp: 18 + game.elapsed * 0.12,
    speed: 52 + game.elapsed * 0.08,
    touchTimer: 0,
  };
  game.enemies.push(enemy);
}

function updateEnemies(dt) {
  const p = game.player;
  game.enemies.forEach((enemy) => {
    const dx = p.x - enemy.x;
    const dy = p.y - enemy.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    enemy.x += (dx / dist) * enemy.speed * dt;
    enemy.y += (dy / dist) * enemy.speed * dt;
    enemy.touchTimer -= dt;
    if (dist < p.radius + enemy.radius && enemy.touchTimer <= 0) {
      p.hp -= 9;
      enemy.touchTimer = 0.55;
    }
  });
}

function updateWeapons(dt) {
  game.sparkTimer -= dt;
  if (game.sparkTimer <= 0) {
    game.sparkTimer = 0.55;
    fireSparkBolt();
  }

  if (!game.player.hasLaser) return;
  game.laserTimer -= dt;
  if (game.laserTimer <= 0) {
    game.laserTimer = 1.2;
    fireLaser();
  }
}

function fireSparkBolt() {
  const target = nearestEnemy();
  if (!target) return;
  const p = game.player;
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  game.bolts.push({
    x: p.x,
    y: p.y,
    vx: (dx / dist) * 420,
    vy: (dy / dist) * 420,
    radius: 5,
    damage: 12,
    life: 1.4,
  });
}

function fireLaser() {
  const target = nearestEnemy();
  if (!target) return;
  const p = game.player;
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const dirX = dx / dist;
  const dirY = dy / dist;
  const damage = 32 * p.laserDamageMultiplier;
  let dealt = 0;

  game.enemies.forEach((enemy) => {
    const toEnemyX = enemy.x - p.x;
    const toEnemyY = enemy.y - p.y;
    const along = toEnemyX * dirX + toEnemyY * dirY;
    if (along < 0 || along > 430) return;
    const side = Math.abs(toEnemyX * dirY - toEnemyY * dirX);
    if (side <= 24 + enemy.radius) {
      const before = enemy.hp;
      enemy.hp -= damage;
      dealt += Math.max(0, Math.min(before, damage));
    }
  });

  if (dealt > 0) {
    game.laserDamage += dealt;
    addQuestProgress("use_laser_run", 1);
    addQuestProgress("laser_damage_5000", dealt);
  }

  game.beams.push({
    x: p.x,
    y: p.y,
    endX: p.x + dirX * 430,
    endY: p.y + dirY * 430,
    life: 0.16,
  });
}

function updateBolts(dt) {
  game.bolts.forEach((bolt) => {
    bolt.x += bolt.vx * dt;
    bolt.y += bolt.vy * dt;
    bolt.life -= dt;
    const enemy = game.enemies.find((candidate) => distance(bolt, candidate) < bolt.radius + candidate.radius);
    if (enemy) {
      enemy.hp -= bolt.damage;
      bolt.life = 0;
    }
  });
  game.bolts = game.bolts.filter((bolt) => bolt.life > 0);
  reapEnemies();
}

function reapEnemies() {
  const dead = game.enemies.filter((enemy) => enemy.hp <= 0);
  dead.forEach((enemy) => {
    game.kills += 1;
    game.xpDrops.push({ x: enemy.x, y: enemy.y, radius: 7, value: 1 });
  });
  game.enemies = game.enemies.filter((enemy) => enemy.hp > 0);
}

function updateXpDrops() {
  const p = game.player;
  game.xpDrops.forEach((drop) => {
    if (distance(p, drop) < p.pickupRadius) {
      const dx = p.x - drop.x;
      const dy = p.y - drop.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      drop.x += (dx / dist) * 8;
      drop.y += (dy / dist) * 8;
    }
    if (distance(p, drop) < p.radius + drop.radius) {
      drop.collected = true;
      collectXp(drop.value);
    }
  });
  game.xpDrops = game.xpDrops.filter((drop) => !drop.collected);
}

function collectXp(value) {
  const p = game.player;
  p.xp += value;
  game.xpCollected += value;
  if (p.xp >= p.xpToLevel) {
    p.xp -= p.xpToLevel;
    p.level += 1;
    p.xpToLevel += 4;
    game.levelUps += 1;
    showLevelUp();
  }
}

function updateBeams(dt) {
  game.beams.forEach((beam) => (beam.life -= dt));
  game.beams = game.beams.filter((beam) => beam.life > 0);
  reapEnemies();
}

function showLevelUp() {
  game.paused = true;
  ui.choices.innerHTML = "";
  const choices = [
    {
      name: "Prism Beam",
      description: "Equip the Laser weapon for this run.",
      available: save.unlockedWeapons.includes(weaponIds.laser) && !game.player.hasLaser,
      apply: () => {
        game.player.hasLaser = true;
      },
    },
    {
      name: "Laser Damage I",
      description: "Increase Prism Beam damage for this run.",
      available: game.player.hasLaser && save.unlockedUpgrades.includes("laser_damage_1"),
      apply: () => (game.player.laserDamageMultiplier += 0.45),
    },
    {
      name: "Move Speed I",
      description: "Move faster.",
      available: true,
      apply: () => (game.player.speed += 32),
    },
    {
      name: "Pickup Radius I",
      description: "Collect XP from farther away.",
      available: true,
      apply: () => (game.player.pickupRadius += 22),
    },
  ].filter((choice) => choice.available);

  choices.forEach((choice) => {
    const button = document.createElement("button");
    button.innerHTML = `<strong>${choice.name}</strong><br /><span>${choice.description}</span>`;
    button.addEventListener("click", () => {
      choice.apply();
      game.paused = false;
      ui.levelUp.classList.add("hidden");
    });
    ui.choices.appendChild(button);
  });
  ui.levelUp.classList.remove("hidden");
}

function nearestEnemy() {
  if (!game.enemies.length) return null;
  const p = game.player;
  return game.enemies.reduce((best, enemy) =>
    distance(p, enemy) < distance(p, best) ? enemy : best,
  );
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawArena();
  if (!game) {
    drawMenuHint();
    return;
  }

  game.xpDrops.forEach(drawXp);
  game.bolts.forEach(drawBolt);
  game.enemies.forEach(drawEnemy);
  game.beams.forEach(drawBeam);
  drawPlayer(game.player);
  drawGameHud();
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
  ctx.fillText("Use the Progression Tree to unlock Laser, then start a run.", 36, 88);
}

function drawPlayer(p) {
  ctx.fillStyle = "#69d2ff";
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();
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

function drawEnemy(enemy) {
  ctx.fillStyle = "#f06a78";
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawXp(drop) {
  ctx.fillStyle = "#78e08f";
  ctx.beginPath();
  ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawBolt(bolt) {
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.arc(bolt.x, bolt.y, bolt.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawBeam(beam) {
  ctx.strokeStyle = "#b794ff";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(beam.x, beam.y);
  ctx.lineTo(beam.endX, beam.endY);
  ctx.stroke();
  ctx.strokeStyle = "#f2e9ff";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawGameHud() {
  const p = game.player;
  ctx.fillStyle = "rgba(10, 14, 20, 0.74)";
  ctx.fillRect(16, 16, 320, 86);
  ctx.fillStyle = "#f3f6fb";
  ctx.font = "14px sans-serif";
  ctx.fillText(`Time: ${formatTime(game.elapsed)} / ${formatTime(game.duration)}`, 28, 40);
  ctx.fillText(`HP: ${Math.max(0, Math.ceil(p.hp))}/${p.maxHp}`, 28, 62);
  ctx.fillText(`Level: ${p.level} | XP: ${p.xp}/${p.xpToLevel} | Kills: ${game.kills}`, 28, 84);
}

function updateRunHud() {
  if (!game) return;
  ui.runHud.textContent = `Time ${formatTime(game.elapsed)} | HP ${Math.max(0, Math.ceil(game.player.hp))}/${game.player.maxHp} | Level ${game.player.level} | Kills ${game.kills} | Laser damage ${Math.floor(game.laserDamage)}`;
}

function setTargetFromEvent(event) {
  if (!game || !game.running || game.paused) return;
  const rect = canvas.getBoundingClientRect();
  const point = event.touches ? event.touches[0] : event;
  game.player.targetX = ((point.clientX - rect.left) / rect.width) * canvas.width;
  game.player.targetY = ((point.clientY - rect.top) / rect.height) * canvas.height;
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  update(dt);
  draw();
  updateRunHud();
  requestAnimationFrame(loop);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

ui.startRun.addEventListener("click", startRun);
ui.resetSave.addEventListener("click", () => {
  localStorage.removeItem(saveKey);
  save = defaultSave();
  game = null;
  ui.endScreen.classList.add("hidden");
  ui.levelUp.classList.add("hidden");
  persist();
  renderMeta();
});
ui.closeEnd.addEventListener("click", () => ui.endScreen.classList.add("hidden"));

canvas.addEventListener("mousedown", setTargetFromEvent);
canvas.addEventListener("mousemove", (event) => {
  if (event.buttons === 1) setTargetFromEvent(event);
});
canvas.addEventListener("touchstart", (event) => {
  event.preventDefault();
  setTargetFromEvent(event);
});
canvas.addEventListener("touchmove", (event) => {
  event.preventDefault();
  setTargetFromEvent(event);
});

renderMeta();
requestAnimationFrame(loop);
