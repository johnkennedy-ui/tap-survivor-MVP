# MVP Game Plan

## 1. Project Summary

This project is a small survivor-like action game prototype with tap/click-to-move controls, automatic combat, local progression, and a quest-linked skill tree. It should sit in the broad arena survival genre without copying Vampire Survivors names, weapon behaviour, art, enemies, UI, progression, or exact mechanics.

Recommended engine: Unity.

Reason: Unity is a practical default for a 2D prototype targeting both Windows/Steam and Android/Google Play from one project, with mature input, build, UI, save-data, and controller support.

The MVP should prove only one loop: movement, combat, XP, level-up choice, Laser unlock/use quest, Quest Point reward, tiny tree spend, and follow-up quest unlock.

## 2. MVP Goal

Build a first playable prototype where the player can:

1. Start a run.
2. Tap/click to move around one arena.
3. Auto-attack one enemy type.
4. Collect XP drops.
5. Level up and select a Laser upgrade.
6. Use Laser during the run.
7. Complete the first Laser quest.
8. Earn 1 Quest Point.
9. Spend that Quest Point in a tiny progression tree.
10. Unlock a follow-up Laser quest.

This is the first manual test milestone. The prototype may use a 2-minute test timer instead of the intended 10-minute run timer.

## 3. Platforms

MVP targets:

- Windows build suitable for eventual Steam release.
- Android build suitable for eventual Google Play release.

MVP constraints:

- Offline only.
- Local save only.
- No online accounts.
- No cloud saves.
- No monetisation.
- No multiplayer.

Unity project setup should keep both platforms in mind from day one:

- Use resolution-independent UI.
- Avoid platform-specific code unless wrapped behind small input/build helpers.
- Keep save data in Unity-supported local persistent storage.
- Use placeholder assets that are legally safe to replace later.

## 4. Core Controls

Android MVP controls:

- Tap-to-move: tapping the arena sets a destination.
- Drag-to-steer: holding and dragging continuously updates the movement direction or destination.
- No complex virtual joystick required for the first playable unless tap/drag feels poor.

Steam/Windows MVP controls:

- Click-to-move: clicking the arena sets a destination.
- Optional WASD movement can be added if cheap, but click-to-move is the main control style.
- Controller support is later, not required for this milestone.

Movement behaviour:

- Player moves toward the selected destination.
- Movement stops when close enough to the destination.
- Player remains able to auto-attack while moving.

## 5. Core Game Loop

Run loop:

1. Player starts a run from a simple menu.
2. Player spawns in one arena as the single MVP class.
3. Enemies spawn and move toward the player.
4. Player weapons auto-fire without manual aim.
5. Defeated enemies drop XP.
6. Player collects XP by touching drops or entering pickup radius.
7. XP fills a level bar.
8. On level-up, the game pauses and shows 3 simple upgrade choices.
9. Player selects an upgrade and resumes the run.
10. Quest progress updates during the run.
11. Player dies or the test timer ends.
12. End screen shows basic run stats and any completed quests/rewards.

Run length:

- Intended design target: 10-minute runs.
- First prototype target: 2-minute test timer.

Basic run stats:

- Time survived.
- Enemies defeated.
- Level reached.
- XP collected.
- Laser damage dealt.
- Quests completed.
- Quest Points earned.

## 6. One-Class MVP Design

Class placeholder name: Pathfinder.

Role:

- Simple all-rounder used only to test the core loop.
- No alternate classes in MVP.

Starting stats:

- Health: 100.
- Move speed: 1 baseline unit.
- Pickup radius: small baseline radius.
- Starting weapon: basic auto-shot placeholder.

Starting weapon placeholder:

- Name: Spark Bolt.
- Behaviour: fires at the nearest enemy on a short cooldown.
- Purpose: lets the run function before Laser is unlocked or selected.

Class progression:

- No class-specific talent system in MVP.
- All permanent progression comes from the small Quest Point tree.

## 7. Weapons

MVP weapons use placeholder names and placeholder art. They should be visually and mechanically distinct enough to test the systems, but not final-balanced.

### Laser

Placeholder name: Prism Beam.

MVP behaviour:

- Auto-fires either at the nearest enemy or in the player's current facing/movement direction.
- Uses a short beam or ray visual.
- Deals damage to one or more enemies along the beam.
- Tracks damage dealt by weapon ID for quests.

Quest purpose:

- This is the required weapon for the first quest chain.
- Unlocking Laser opens the first Laser quest.
- Using Laser in a run completes the first Laser quest.

### Orbital Weapon

Placeholder name: Ring Shard.

MVP behaviour:

- One projectile rotates around the player.
- Damages enemies it touches.
- Uses simple circular movement around the player.

Purpose:

- Tests non-targeted weapon behaviour.
- Gives level-up choice variety.

### Area Pulse

Placeholder name: Static Bloom.

MVP behaviour:

- Periodically emits close-range area damage around the player.
- Uses a simple expanding circle visual.

Purpose:

- Tests timed area damage and close-range survival.

## 8. Upgrades

MVP level-up upgrades:

- Laser Damage I: increases Prism Beam damage.
- Laser Cooldown I: reduces Prism Beam cooldown.
- Laser Width I: increases Prism Beam hit width or collision radius.
- Move Speed I: increases player movement speed.
- Max Health I: increases maximum health.
- Pickup Radius I: increases XP pickup radius.
- XP Gain I: increases XP gained from drops.

Upgrade rules:

- Level-up screen shows 3 choices from the available pool.
- If Laser is not unlocked, Laser-specific upgrades should not appear.
- Upgrades can be single-rank for the prototype.
- Balance only needs to be good enough to test the loop.

## 9. Quest System

The MVP quest system should be data-driven enough to avoid hardcoding every quest in scene logic, but small enough to implement quickly.

Required quest states:

- Locked.
- Active.
- Completed.
- Reward claimed or reward granted.

Required quest data:

- Quest ID.
- Display name.
- Description.
- Quest type.
- Target weapon or upgrade ID where relevant.
- Target amount.
- Reward type.
- Reward amount.
- Follow-up quest IDs to activate after completion or after a progression node unlock.

Required quest types:

- Use a specific weapon in a run.
- Deal X damage with a weapon.
- Kill X enemies with a weapon.
- Survive X minutes with an upgrade equipped.

Minimum MVP quest chain:

1. Progression node: Unlock Laser.
2. Auto-opens quest: Use Laser in a run.
3. Player selects or equips Prism Beam during a run.
4. Quest completes when Prism Beam fires or deals damage.
5. Reward: 1 Quest Point.
6. Player spends 1 Quest Point on Laser Damage I in the progression tree.
7. Unlocking Laser Damage I auto-opens quest: Deal 5,000 damage with Laser.
8. Completing that quest opens the next Laser branch placeholder.

Quest progress timing:

- Quest progress should update during runs.
- Completion may be shown immediately or summarized on the end screen.
- Quest Point rewards should persist after the run ends.

## 10. Progression Tree

The MVP progression tree should contain 8-12 nodes. It should prove node costs, prerequisites, weapon unlocks, stat unlocks, and follow-up quest activation.

Suggested 10-node MVP tree:

1. Unlock Laser
   - Cost: 0 Quest Points or granted after tutorial start.
   - Unlocks: Prism Beam available in level-up choices.
   - Auto-opens quest: Use Laser in a run.

2. Laser Damage I
   - Cost: 1 Quest Point.
   - Prerequisite: Unlock Laser.
   - Unlocks: Laser Damage I upgrade.
   - Auto-opens quest: Deal 5,000 damage with Laser.

3. Laser Cooldown I
   - Cost: 1 Quest Point.
   - Prerequisite: Laser Damage I.
   - Unlocks: Laser Cooldown I upgrade.
   - Auto-opens quest: Kill 25 enemies with Laser.

4. Laser Width I
   - Cost: 1 Quest Point.
   - Prerequisite: Laser Damage I.
   - Unlocks: Laser Width I upgrade.
   - Auto-opens quest: Survive 2 minutes with Laser Width I equipped.

5. Unlock Orbital Weapon
   - Cost: 1 Quest Point.
   - Prerequisite: Unlock Laser.
   - Unlocks: Ring Shard in level-up choices.

6. Unlock Area Pulse
   - Cost: 1 Quest Point.
   - Prerequisite: Unlock Laser.
   - Unlocks: Static Bloom in level-up choices.

7. Move Speed I
   - Cost: 1 Quest Point.
   - Prerequisite: Unlock Laser.
   - Unlocks: Move Speed I upgrade.

8. Max Health I
   - Cost: 1 Quest Point.
   - Prerequisite: Unlock Laser.
   - Unlocks: Max Health I upgrade.

9. Pickup Radius I
   - Cost: 1 Quest Point.
   - Prerequisite: Move Speed I.
   - Unlocks: Pickup Radius I upgrade.

10. XP Gain I
   - Cost: 1 Quest Point.
   - Prerequisite: Pickup Radius I.
   - Unlocks: XP Gain I upgrade.

Progression tree rules:

- Nodes have Quest Point costs.
- Nodes can have prerequisite nodes.
- Nodes can unlock weapons.
- Nodes can unlock stat upgrades.
- Nodes can activate one or more follow-up quests.
- Tree UI can be a simple list for MVP; a visual node map is later.

## 11. Save Data

MVP save data should be local only.

Save fields:

- Total Quest Points available.
- Total Quest Points earned.
- Unlocked progression node IDs.
- Active quest IDs.
- Completed quest IDs.
- Quest progress values.
- Unlocked weapon IDs.
- Unlocked upgrade IDs.

Save format:

- JSON is acceptable for the prototype.
- Use Unity persistent data path.
- Include a simple version number for future migrations.

Save timing:

- Save after quest completion reward is granted.
- Save after spending Quest Points.
- Save after unlocking a node.
- Save after run end.

No cloud sync, accounts, backend, analytics, or online profile systems in MVP.

## 12. Prototype Milestones

### Milestone 1: First Playable Quest Loop

Deliver exactly the MVP goal:

- Start run.
- Tap/click to move.
- Auto-attack enemies.
- Collect XP.
- Level up.
- Select or use Laser.
- Complete "Use Laser in a run".
- Earn 1 Quest Point.
- Spend Quest Point on Laser Damage I.
- Auto-open "Deal 5,000 damage with Laser".

### Milestone 2: Basic Run Completion

- Add 2-minute test timer.
- Add player death.
- Add end screen stats.
- Persist quest and progression state.

### Milestone 3: MVP Weapon Variety

- Add Ring Shard orbital weapon.
- Add Static Bloom area pulse.
- Add related unlock nodes.
- Confirm level-up choices respect unlocked content.

### Milestone 4: Small Tree Completion

- Add all 8-12 MVP progression nodes.
- Add the four required quest type handlers.
- Confirm follow-up quests open from node unlocks and quest completions.

## 13. Test Acceptance Criteria

The plan is implemented enough for the first milestone only when the tester can manually verify:

1. A Windows editor/play build can start a run.
2. Clicking or tapping the arena moves the player.
3. Drag input can steer or update the movement target on Android-style input.
4. Enemies spawn and move toward the player.
5. Player auto-attacks without pressing an attack button.
6. Enemies can die and drop XP.
7. XP can be collected and increases the level meter.
8. Level-up pauses the run and offers upgrade choices.
9. Laser/Prism Beam can be selected or unlocked and then used in the run.
10. The quest "Use Laser in a run" becomes active after Unlock Laser.
11. Using Laser completes that quest.
12. Completing the quest grants 1 Quest Point.
13. The player can spend 1 Quest Point on Laser Damage I.
14. Buying Laser Damage I automatically opens "Deal 5,000 damage with Laser".
15. Progression and quest state persist after returning to menu and restarting the game.

Exact first playable test goal:

Start a run, click/tap to move, kill enemies through auto-attacks, collect XP, level up, use Prism Beam, complete the first Laser quest, receive 1 Quest Point, buy Laser Damage I, and see the follow-up Laser damage quest become active.

## 14. Out of Scope

Not part of this MVP:

- Multiplayer.
- Monetisation.
- Online accounts.
- Cloud saves.
- Multiple playable classes.
- Large skill tree.
- Full Steam integration.
- Full Google Play Services integration.
- Controller support beyond planning.
- Final art.
- Final sound.
- Final UI theme.
- Boss-heavy content.
- Multiple arenas.
- Multiple enemy factions.
- Complex enemy AI.
- Meta-currencies beyond Quest Points.
- Achievements.
- Daily quests.
- Shops.
- Inventory systems.
- Equipment systems.
- Story campaign.
- Analytics.
- Live operations.

Mini-boss status:

- Later unless it is trivial after the basic enemy spawner exists.
- Do not block the first playable milestone on a mini-boss.

## 15. Recommended First Implementation Step

Create a minimal Unity 2D project with one scene and implement the movement/combat test loop first:

1. Player object with click/tap destination movement.
2. One arena scene.
3. Enemy spawner.
4. One basic enemy that moves toward the player.
5. One simple auto-shot weapon.
6. XP drops and pickup.
7. Level-up pause screen with placeholder choices.

Only after that feels playable, add:

- Prism Beam weapon ID.
- Unlock Laser progression node.
- "Use Laser in a run" quest.
- Quest Point reward.
- Laser Damage I node.
- Follow-up "Deal 5,000 damage with Laser" quest.

This keeps the first implementation focused on a playable loop before adding more progression content.
