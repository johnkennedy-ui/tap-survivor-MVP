export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = any;
export interface JsonObject {
  [key: string]: any;
}

export interface ContentEntry {
  id?: string;
  [key: string]: any;
}

export interface WeaponDef extends ContentEntry {
  name?: string;
  description?: string;
  kind?: string;
  color?: string;
  upgradeId?: string;
  cooldown?: number;
  damage?: number;
  assetId?: string;
}

export interface EnemyTypeDef extends ContentEntry {
  id: string;
  name?: string;
  color?: string;
  projectileColor?: string;
  spriteAccentColor?: string;
  accentColor?: string;
  assetId?: string;
  behaviorKind?: string;
  radius?: number;
  hp?: number;
  speed?: number;
  damage?: number;
  xp?: number;
  attackRange?: number;
  projectileCooldown?: number;
  projectileSpeed?: number;
  projectileDamage?: number;
}

export interface BossAbilityDef extends ContentEntry {
  name?: string;
  color?: string;
  projectileColor?: string;
  spriteAccentColor?: string;
  accentColor?: string;
  speed?: number;
  attackCooldown?: number;
  attackRange?: number;
  projectileCooldown?: number;
  projectileSpeed?: number;
  projectileDamage?: number;
  superProjectileDamage?: number;
  initialShootTimer?: number;
}

export interface BossConfigDef extends ContentEntry {
  abilityIds?: string[];
  normalAbilityCount?: number;
  superAbilityCount?: number;
  baseHp?: number;
  hpPerKill?: number;
  superHpMultiplier?: number;
  touchDamage?: number;
  touchCooldown?: number;
  defaultAttackCooldown?: number;
}

export interface QuestDef extends ContentEntry {
  name?: string;
  description?: string;
  target?: number;
  rewardQp?: number;
  weaponId?: string;
  opensQuest?: string;
  opensQuests?: string[];
}

export interface ShopItemDef extends ContentEntry {
  name?: string;
  description?: string;
  kind?: string;
  cost?: number | number[];
  maxTier?: number;
  spritePath?: string;
  effect?: {
    stat?: string;
    value?: number;
    [key: string]: unknown;
  };
}

export interface RelicDef extends ContentEntry {
  name?: string;
  description?: string;
  kind?: string;
  iconId?: string;
}

export interface RunUpgradeDef extends ContentEntry {
  name?: string;
  description?: string;
  maxTier?: number;
  effects?: ContentEntry[];
}

export interface FloorDef extends ContentEntry {
  name?: string;
  startsAt?: number;
  enemyIds?: string[];
  spawnCount?: number;
  spawnRateMultiplier?: number;
}

export interface MapDef extends ContentEntry {
  name?: string;
  floorIds?: string[];
  modifiers?: Record<string, number>;
}

export interface CharacterDef extends ContentEntry {
  name?: string;
  description?: string;
  spriteId?: string;
}

export interface AssetSourceDef extends ContentEntry {
  name?: string;
  license?: string;
  commercialUse?: boolean;
  attributionRequired?: boolean;
  localLicense?: string;
}

export interface SpriteAnimationState {
  frames?: number[];
  fps?: number;
  loop?: boolean;
}

export interface SpriteSheetAnimation extends SpriteAnimationState {
  row?: number;
  default?: SpriteAnimationState;
  idle?: SpriteAnimationState;
  attack?: SpriteAnimationState;
  windup?: SpriteAnimationState;
  release?: SpriteAnimationState;
}

export interface SpriteSheetDef extends ContentEntry {
  path?: string;
  kind?: "spritesheet" | string;
  columns?: number;
  rows?: number;
  animations?: Record<string, SpriteSheetAnimation>;
}

export interface SpriteDefs {
  weapons?: Record<string, string>;
  enemies?: Record<string, string>;
  player?: string;
  characters?: Record<string, string>;
  relics?: Record<string, string>;
  spriteSheets?: Record<string, SpriteSheetDef>;
  [key: string]: unknown;
}

export interface AssetDefs {
  sources?: AssetSourceDef[];
  sprites?: SpriteDefs;
  sfx?: Record<string, string | ContentEntry>;
  [key: string]: any;
}

export interface TuningDefs extends ContentEntry {
  shop?: Record<string, number>;
  loot?: Record<string, number>;
  progression?: ProgressionTuning;
}

export interface ProgressionTuning extends ContentEntry {
  relicSlotLevels?: number[];
  questCacheCost?: number;
  questCacheFallbackCoins?: number;
}

export interface ContentSchema {
  fieldRules?: Record<string, any>;
  effectRegistries?: Record<string, any>;
  behaviorRegistries?: Record<string, { ids?: string[] }>;
  templates?: Record<string, JsonObject>;
  [key: string]: any;
}

export interface GeneratedContent {
  schemaVersion?: number;
  weapons?: Record<string, WeaponDef>;
  weaponUnlocks?: ContentEntry[];
  metaUpgrades?: ContentEntry[];
  runUpgrades?: RunUpgradeDef[];
  quests?: Record<string, QuestDef>;
  questGroups?: Record<string, string[]>;
  enemyTypes?: EnemyTypeDef[];
  bossConfig?: BossConfigDef;
  bossAbilities?: Record<string, BossAbilityDef>;
  characters?: CharacterDef[];
  shopItems?: ShopItemDef[];
  relics?: RelicDef[];
  levels?: FloorDef[];
  maps?: MapDef[];
  assets?: AssetDefs;
  tuning?: TuningDefs;
  activeBalanceProfile?: string;
  [key: string]: any;
}

export type ContentRecord = GeneratedContent;

export interface UpgradeContent {
  runUpgradeDefs?: RunUpgradeDef[];
  createUpgradeDefs?: (weaponDefs: Record<string, WeaponDef>) => ContentEntry[];
}

export interface RuntimeContentRegistry {
  weaponDefs: Record<string, WeaponDef>;
  weaponUnlocks: ContentEntry[];
  spriteDefs: SpriteDefs;
  sfxDefs: Record<string, string | ContentEntry>;
  upgradeDefs: ContentEntry[];
  questDefs: Record<string, QuestDef>;
  questGroups: Record<string, string[]>;
  starterQuestIds: string[];
  killQuestIds: string[];
  damageQuestIds: string[];
  survivalQuestIds: string[];
  xpQuestIds: string[];
  levelQuestIds: string[];
  bossQuestIds: string[];
  runUpgradeDefs: RunUpgradeDef[];
  enemyTypes: EnemyTypeDef[];
  bossConfig: BossConfigDef;
  bossAbilities: Record<string, BossAbilityDef>;
  shopItemDefs: ShopItemDef[];
  relicDefs: RelicDef[];
  levelDefs: FloorDef[];
  mapDefs: MapDef[];
  tuningDefs: TuningDefs;
}

export interface ParsedArgs {
  _: string[];
  [key: string]: string | boolean | string[];
}

export type ValidationFailure = (message: string) => void;
export type RequireNumber = (value: unknown, owner: string, min?: number) => void;
export type RequireString = (value: unknown, owner: string) => void;
export type ValidateSpritePath = (value: unknown, owner: string) => void;

declare global {
  var TapSurvivorContentRegistry: {
    createContentRegistry(args: {
      content: GeneratedContent;
      upgradeContent: UpgradeContent;
    }): RuntimeContentRegistry;
  };
}
