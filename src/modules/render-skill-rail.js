export const MODULE_NATIVE_RENDER_SKILL_RAIL_SLOTS = Object.freeze(["renderSkillRail"]);

export const MODULE_NATIVE_RENDER_SKILL_RAIL_PROOF_SLOTS = Object.freeze([
  "createSkillRailRenderer",
]);

/**
 * @param {any} [options]
 */
export function createSkillRailRenderer(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const renderSkillRail = requireGlobal(globalThis, "TapSurvivorRenderSkillRail");
  const factory = renderSkillRail.createSkillRailRenderer;

  if (typeof factory !== "function") {
    throw new Error(
      "Missing Tap Survivor module render-skill-rail dependency: createSkillRailRenderer"
    );
  }

  return factory(resolvedOptions);
}

function requireGlobal(globalRef, name) {
  const value = globalRef?.[name];
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module render-skill-rail dependency: ${name}`);
  }
  return value;
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module render-skill-rail dependency: ${name}`);
  }
  return value;
}
