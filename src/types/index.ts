export type ThemeName = 'dark' | 'light' | 'woodland' | 'axe'

export interface AppSettings {
  theme: ThemeName
  accentColor: string
  playerName?: string
}

export interface AbilityScores {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export type Ability = keyof AbilityScores

export interface SavingThrows {
  str: boolean
  dex: boolean
  con: boolean
  int: boolean
  wis: boolean
  cha: boolean
}

export interface SkillProficiency {
  proficient: boolean
  expertise: boolean
  bonus?: number // flat bonus added on top of ability mod + proficiency
}

export interface Skills {
  acrobatics: SkillProficiency
  animalHandling: SkillProficiency
  arcana: SkillProficiency
  athletics: SkillProficiency
  deception: SkillProficiency
  history: SkillProficiency
  insight: SkillProficiency
  intimidation: SkillProficiency
  investigation: SkillProficiency
  medicine: SkillProficiency
  nature: SkillProficiency
  perception: SkillProficiency
  performance: SkillProficiency
  persuasion: SkillProficiency
  religion: SkillProficiency
  sleightOfHand: SkillProficiency
  stealth: SkillProficiency
  survival: SkillProficiency
}

export interface Currency {
  gp: number
  sp: number
  cp: number
}

export interface SpellSlots {
  max: number
  current: number
}

export interface Spell {
  name: string
  level: number // 0 = cantrip
  school: string
  castingTime: string
  range: string
  components: string
  duration: string
  description: string
  prepared: boolean
}

export interface CharacterSheet {
  // Identity
  playerName: string
  characterName: string
  class: string
  subclass?: string
  level: number
  race: string
  alignment: string
  deity?: string

  // Core stats
  abilityScores: AbilityScores
  savingThrows: SavingThrows
  skills: Skills

  // Combat
  maxHp: number
  currentHp: number
  tempHp: number
  ac: number
  initiative: number
  speed: number
  proficiencyBonus: number
  hitDice: string // e.g. "1d8"

  // Death saves
  deathSaveSuccesses: number
  deathSaveFailures: number

  // Conditions
  conditions: string[]

  // Languages & proficiencies
  languages: string[]
  otherProficiencies: string
  extraTraits: string[]
  aliases: string[]

  // Spellcasting
  spellcastingAbility?: Ability
  spellAttackBonus?: number
  spellSaveDc?: number
  spellSlots: SpellSlots[] // index 0 = level 1, index 1 = level 2, etc.
  spells: Spell[]

  // Currency
  currency: Currency

  // Items (free text)
  items: string

  // Notes (free text)
  notes: string

  // Player-confirmed feature choices (e.g. subclass, fighting style)
  choices: Record<string, string>
}

// Stored in IndexedDB — runtime mutable fields
export interface CharacterState {
  id: string // characterName lowercase
  currentHp: number
  tempHp: number
  deathSaveSuccesses: number
  deathSaveFailures: number
  conditions: string[]
  spellSlots: SpellSlots[]
  currency: Currency
  items: string
  notes: string
  description: string
}
