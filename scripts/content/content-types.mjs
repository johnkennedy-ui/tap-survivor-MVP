/**
 * @typedef {string | number | boolean | null} JsonPrimitive
 * @typedef {any} JsonValue
 * @typedef {{ [key: string]: JsonValue }} JsonObject
 *
 * @typedef {{ id?: string, [key: string]: any }} ContentEntry
 * @typedef {{
 *   schemaVersion?: number,
 *   weapons?: Record<string, ContentEntry>,
 *   weaponUnlocks?: ContentEntry[],
 *   metaUpgrades?: ContentEntry[],
 *   runUpgrades?: ContentEntry[],
 *   quests?: Record<string, ContentEntry>,
 *   questGroups?: Record<string, string[]>,
 *   enemyTypes?: ContentEntry[],
 *   bossConfig?: ContentEntry,
 *   bossAbilities?: Record<string, ContentEntry>,
 *   characters?: ContentEntry[],
 *   shopItems?: ContentEntry[],
 *   relics?: ContentEntry[],
 *   levels?: ContentEntry[],
 *   maps?: ContentEntry[],
 *   assets?: ContentEntry,
 *   tuning?: ContentEntry,
 *   activeBalanceProfile?: string,
 *   [key: string]: any
 * }} ContentRecord
 *
 * @typedef {{ [key: string]: any }} SchemaRule
 * @typedef {{
 *   fieldRules?: Record<string, SchemaRule>,
 *   effectRegistries?: Record<string, JsonObject>,
 *   behaviorRegistries?: Record<string, { ids?: string[] }>,
 *   templates?: Record<string, JsonObject>,
 *   [key: string]: any
 * }} ContentSchema
 *
 * @typedef {Record<string, Record<string, JsonValue> | JsonValue>} BalanceOverrideSection
 * @typedef {Record<string, BalanceOverrideSection>} BalanceOverrides
 * @typedef {{ profileId?: string, overrides?: BalanceOverrides, [key: string]: any }} BalanceProfile
 * @typedef {{ section: string, id: string, field: string, before: JsonValue | undefined, after: JsonValue | undefined }} BalanceChange
 *
 * @typedef {{ _: string[], [key: string]: string | boolean | string[] }} ParsedArgs
 * @typedef {(message: string) => void} ValidationFailure
 * @typedef {(value: unknown, owner: string, min?: number) => void} RequireNumber
 * @typedef {(value: unknown, owner: string) => void} RequireString
 * @typedef {(value: unknown, owner: string) => void} ValidateSpritePath
 */

export {};
