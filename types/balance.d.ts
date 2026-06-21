import type { ContentRecord, JsonValue } from "./content.d.ts";

export type BalanceOverrideSection = Record<string, Record<string, JsonValue> | JsonValue>;
export type BalanceOverrides = Record<string, BalanceOverrideSection>;

export interface BalanceProfile {
  profileId?: string;
  overrides?: BalanceOverrides;
  [key: string]: any;
}

export interface BalanceChange {
  section: string;
  id: string;
  field: string;
  before: JsonValue | undefined;
  after: JsonValue | undefined;
}

export interface BalanceOverrideRule {
  collection?: keyof ContentRecord;
  list?: boolean;
  singleton?: boolean;
  fields?: string[];
  arrays?: string[];
  nested?: Record<string, "number" | "numberMap">;
}
