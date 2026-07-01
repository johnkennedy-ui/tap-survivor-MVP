export const MODULE_NATIVE_QUEST_SLOTS = Object.freeze(["quests"]);

export const MODULE_NATIVE_QUEST_PROOF_SLOTS = Object.freeze([
  "createQuestSystem",
  "questOpenIds",
]);

/**
 * @param {any} [options]
 */
export function createQuestSystem(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const quests = requireGlobal(globalThis, "TapSurvivorQuests");
  const factory = quests.createQuestSystem;

  if (typeof factory !== "function") {
    throw new Error("Missing Tap Survivor module quests dependency: createQuestSystem");
  }

  return factory(resolvedOptions);
}

/**
 * @param {any} quest
 */
export function questOpenIds(quest) {
  const quests = requireGlobal(globalThis, "TapSurvivorQuests");
  const helper = quests.questOpenIds;
  if (typeof helper === "function") return helper(quest);
  return [quest?.opensQuest, ...(quest?.opensQuests || [])].filter(Boolean);
}

function requireGlobal(globalRef, name) {
  const value = globalRef?.[name];
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module quests dependency: ${name}`);
  }
  return value;
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module quests dependency: ${name}`);
  }
  return value;
}
