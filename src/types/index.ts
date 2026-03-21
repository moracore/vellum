export type ThemeName = 'arcane' | 'ember' | 'verdant' | 'frost' | 'crimson' | 'parchment'

export interface AppSettings {
  theme: ThemeName
  playerName?: string
}

// ── Ability scores (kept as named object for mod-computation convenience) ─────

export interface AbilityScores {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export type Ability = keyof AbilityScores

// ── Unified character data ───────────────────────────────────────────────────

export interface CharacterData {
  // Identity
  id: string
  name: string           // character name
  player: string         // player name
  passkey: string        // 5-letter sign-in word
  class: string
  subclass: string | null
  level: number
  race: string
  alignment: string
  deity: string | null

  // Abilities
  abilityScores: AbilityScores
  savingThrows: number[]            // ability IDs with proficiency (e.g. [5,6] for WIS+CHA)
  skills: number[]                  // skill IDs with proficiency
  skillDetails: Record<string, string>  // skill_id -> "expertise" | "+N"

  // Combat
  maxHp: number
  currentHp: number
  tempHp: number
  ac: number
  initiative: number
  speed: number
  hitDice: string                   // e.g. "5d10"
  hitDiceCurrent: number
  proficiencyBonus: number
  deathSaves: [number, number]      // [successes, failures]
  conditions: string[]

  // Spellcasting
  spellAbility: number | null       // ability ID (1=STR..6=CHA)
  spellAttackBonus: number | null
  spellSaveDc: number | null
  spellSlots: number[]              // 9 entries: current count per level 1-9
  spellSlotsMax: number[]           // 9 entries: max count per level 1-9
  spellsByLevel: number[][]         // 10 entries: index 0=cantrips, 1=lv1..9=lv9 — spell IDs
  preparedSpells: number[]          // spell IDs that are currently prepared

  // Currency & Equipment
  currency: [number, number, number]  // [gp, sp, cp]
  equipment: [string | null, string | null, string | null]  // [armor, weapon1, weapon2]

  // Inventory (slot-based)
  onPerson: string[]     // up to 5
  bag: string[]          // main bag, up to 20
  bag2: string[]
  bag3: string[]
  bag4: string[]
  bag5: string[]
  sack1: string[]        // up to 3
  sack2: string[]
  sack3: string[]
  sack4: string[]
  sack5: string[]
  bagOfHolding: string[] // unlimited

  // Metadata
  notes: string
  description: string
  choices: Record<string, string>
  traits: number[]       // extra/class trait IDs
  raceTraits: number[]   // race trait IDs
  resources: Record<number, { current: number; max: number }>
  languages: string[]
  otherProficiencies: string
  aliases: string[]
}

