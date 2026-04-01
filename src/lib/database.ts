/**
 * DatabaseService — Singleton that holds all 5e reference data in memory.
 *
 * Loaded from IDB cache (already typed + parsed). Exposes synchronous query
 * methods — no async after the initial load.
 */

import type { RawDbTables } from '../db'

// ─── Row types ────────────────────────────────────────────────────────────────
// Typed from actual CSV headers.  All IDs are numbers, pipe-separated columns
// become number[], booleans stored as "0"/"1" become boolean.

export interface ClassRow {
  class_id: number
  name: string
  hit_die_size: number
  primary_ability_id: number | null
  spellcasting_ability_id: number | null
  spellcasting_type: string           // '1' full, '2' half, '3' none
  subclass_unlock_level: number
  prepared_ability_id: number | null
  prepared_level_divisor: number | null
  skill_choice_id: number
  unarmored_defense_base: number | null
  unarmored_defense_ability_1: string
  unarmored_defense_ability_2: string
  starting_equipment_choice_id: number | null
}

export interface SubclassRow {
  subclass_id: number
  class_id: number
  name: string
  description: string
}

export interface TraitRow {
  trait_id: number
  name: string
  description: string
  feature_type: string   // 'passive' | 'active' | 'resource' | 'choice'
  choice_id: number | null
}

export interface ChoiceRow {
  choice_id: number
  verbage: string
  pick_count: number
  option_source: string        // 'skills' | 'spells' | 'weapons' | 'feats' | 'grant' | 'subclasses'
  choice_elements: number[]    // pipe-separated IDs
  notes: string
  replace_on: string
}

export interface RecurringChoiceRow {
  choice_id: number
  verbage: string
  pick_count: number
  option_source: string
  choice_elements: number[]
  notes: string
  replace_on: string
  trigger_condition: string
}

export interface ProgressionRow {
  level: number
  class_id: number
  subclass_id: number | null
  feature_ids: number[]      // pipe-separated
  choice_ids: number[]       // pipe-separated
  is_asi: boolean
  cantrips_known: number | null
  spells_known: number | null
}

export interface SpellSlotsRow {
  class_id: number
  level: number
  slot_level_1: number
  slot_level_2: number
  slot_level_3: number
  slot_level_4: number
  slot_level_5: number
  slot_level_6: number
  slot_level_7: number
  slot_level_8: number
  slot_level_9: number
  pact_magic_count: number | null
  pact_magic_level: number | null
  sorcery_points: number | null
}

export interface FeatureBonusRow {
  feature_id: number
  class_level: number
  bonus_type: string
  bonus_value: number
  bonus_unit: string
}

export interface CharacterLevelRow {
  level: number
  proficiency_bonus: number
  xp_required: number
}

export interface SpellRow {
  spell_id: number
  name: string
  level: number            // 0 = cantrip
  school: string
  casting_time: string
  range: string
  components: string
  duration: string
  requires_concentration: boolean
  is_ritual: boolean
  description: string
  damage_dice: string
}

export interface ClassSpellRow {
  class_id: number
  subclass_id: number | null
  level: number
  spell_ids: number[]        // pipe-separated
  is_always_prepared: boolean
}

export interface ClassSavingThrowRow {
  class_id: number
  ability_ids: number[]      // pipe-separated
}

export interface ClassWeaponProfRow {
  class_id: number
  weapon_ids: number[]       // pipe-separated
}

export interface ClassArmourProfRow {
  class_id: number
  armour_ids: number[]       // pipe-separated
}

export interface WeaponRow {
  item_id: number
  name: string
  weapon_category: string
  attack_type: string
  damage_dice: string
  damage_type: string
  ability_options: string
  range_normal: number | null
  range_long: number | null
  is_finesse: boolean
  is_thrown: boolean
  is_two_handed: boolean
  is_versatile: boolean
  versatile_dice: string
  is_light: boolean
  is_heavy: boolean
  is_reach: boolean
  is_loading: boolean
  mastery: string
}

export interface ArmourRow {
  armour_id: number
  name: string
  armour_category: string    // 'light' | 'medium' | 'heavy' | 'shield'
  base_ac: number
  bonus_ac: number
  dex_bonus_limit: number    // -1 = unlimited
  stealth_disadvantage: boolean
  strength_requirement: number
}

export interface SkillRow {
  skill_id: number
  name: string
  ability_id: number
}

export interface BackgroundRow {
  background_id: number
  name: string
  asi_ability_1: string
  asi_ability_2: string
  origin_feat_id: number | null
  origin_feat_preset: string
  skill_ids: number[]          // pipe-separated
  tool_ids: number[]           // pipe-separated
  starting_equipment_option_id: number | null
}

export interface RaceRow {
  race_id: number
  name: string
  parent_race: string
  size: string
  speed: number
  darkvision_range: number
  trait_ids: number[]          // derived from trait_1..trait_6
}

export interface StartingEquipmentRow {
  option_id: number
  source_type: string
  source_id: number
  option_label: string
  weapon_ids: string           // colon-separated quantities like "13:4"
  armour_ids: string
  tool_ids: string
  item_ids: string
  gold_gp: number
}

export interface GeneralFeatRow {
  feat_id: number
  name: string
  description: string
  prerequisite_text: string
  asi_ability_id: number | null
  asi_amount: number | null
}

export interface EpicBoonFeatRow {
  feat_id: number
  name: string
  description: string
  prerequisite_text: string
}

export interface TraitSpellRow {
  trait_id: number
  spell_id: number
  granted_at_level: number
  uses_per_rest: number | null   // null = at-will (cantrip), number = X/long rest
}

// ─── Parse helpers ────────────────────────────────────────────────────────────

/** Parse a string to a number, returning null for empty/NaN. */
function num(s: string | undefined): number | null {
  if (!s || s === '') return null
  const n = Number(s)
  return Number.isNaN(n) ? null : n
}

/** Parse a string to a number, defaulting to 0 for empty/NaN. */
function numZ(s: string | undefined): number {
  return num(s) ?? 0
}

/** Parse a pipe-separated string of numbers. Empty string → []. */
function pipeNums(s: string | undefined): number[] {
  if (!s || s === '') return []
  return s.split('|').map(Number).filter(n => !Number.isNaN(n))
}

/** Parse "0"/"1"/"TRUE"/"FALSE" to boolean. */
function bool(s: string | undefined): boolean {
  if (!s) return false
  const lower = s.toLowerCase()
  return lower === '1' || lower === 'true'
}

// ─── DatabaseService ──────────────────────────────────────────────────────────

class DatabaseService {
  loaded = false

  // Parsed, typed tables
  classes: ClassRow[] = []
  subclasses: SubclassRow[] = []
  traits = new Map<number, TraitRow>()
  choices = new Map<number, ChoiceRow>()
  choicesRecurring: RecurringChoiceRow[] = []
  progression: ProgressionRow[] = []
  spellSlots: SpellSlotsRow[] = []
  featureBonuses: FeatureBonusRow[] = []
  characterLevels: CharacterLevelRow[] = []
  spells = new Map<number, SpellRow>()
  classSpells: ClassSpellRow[] = []
  classSavingThrows: ClassSavingThrowRow[] = []
  classWeaponProfs: ClassWeaponProfRow[] = []
  classArmourProfs: ClassArmourProfRow[] = []
  weapons = new Map<number, WeaponRow>()
  armour = new Map<number, ArmourRow>()
  skills: SkillRow[] = []
  backgrounds: BackgroundRow[] = []
  races: RaceRow[] = []
  startingEquipment: StartingEquipmentRow[] = []
  generalFeats: GeneralFeatRow[] = []
  epicBoonFeats: EpicBoonFeatRow[] = []
  traitSpells: TraitSpellRow[] = []

  // ── Load ──────────────────────────────────────────────────────────────────

  /** Load from IDB snapshot. Call once at startup after ensuring snapshot is fresh. */
  loadFromSnapshot(raw: RawDbTables): void {
    // Classes
    this.classes = raw.classes.map(r => ({
      class_id: numZ(r.class_id),
      name: r.name ?? '',
      hit_die_size: numZ(r.hit_die_size),
      primary_ability_id: num(r.primary_ability_id),
      spellcasting_ability_id: num(r.spellcasting_ability_id),
      spellcasting_type: r.spellcasting_type ?? '',
      subclass_unlock_level: numZ(r.subclass_unlock_level),
      prepared_ability_id: num(r.prepared_ability_id),
      prepared_level_divisor: num(r.prepared_level_divisor),
      skill_choice_id: numZ(r.skill_choice_id),
      unarmored_defense_base: num(r.unarmored_defense_base),
      unarmored_defense_ability_1: r.unarmored_defense_ability_1 ?? '',
      unarmored_defense_ability_2: r.unarmored_defense_ability_2 ?? '',
      starting_equipment_choice_id: num(r.starting_equipment_choice_id),
    }))

    // Subclasses
    this.subclasses = raw.subclasses.map(r => ({
      subclass_id: numZ(r.subclass_id),
      class_id: numZ(r.class_id),
      name: r.name ?? '',
      description: r.description ?? '',
    }))

    // Traits (Map for O(1) lookup)
    this.traits.clear()
    for (const r of raw.traits) {
      const row: TraitRow = {
        trait_id: numZ(r.trait_id),
        name: r.name ?? '',
        description: r.description ?? '',
        feature_type: r.feature_type ?? '',
        choice_id: num(r.choice_id),
      }
      this.traits.set(row.trait_id, row)
    }

    // Choices (Map)
    this.choices.clear()
    for (const r of raw.choices) {
      const row: ChoiceRow = {
        choice_id: numZ(r.choice_id),
        verbage: r.verbage ?? '',
        pick_count: numZ(r.pick_count),
        option_source: r.option_source ?? '',
        choice_elements: pipeNums(r.choice_elements),
        notes: r.notes ?? '',
        replace_on: r.replace_on ?? '',
      }
      this.choices.set(row.choice_id, row)
    }

    // Recurring choices
    this.choicesRecurring = raw.choices_recurring.map(r => ({
      choice_id: numZ(r.choice_id),
      verbage: r.verbage ?? '',
      pick_count: numZ(r.pick_count),
      option_source: r.option_source ?? '',
      choice_elements: pipeNums(r.choice_elements),
      notes: r.notes ?? '',
      replace_on: r.replace_on ?? '',
      trigger_condition: r.trigger_condition ?? '',
    }))

    // Progression
    this.progression = raw.progression.map(r => ({
      level: numZ(r.level),
      class_id: numZ(r.class_id),
      subclass_id: num(r.subclass_id),
      feature_ids: pipeNums(r.feature_ids),
      choice_ids: pipeNums(r.choice_ids),
      is_asi: bool(r.is_asi),
      cantrips_known: num(r.cantrips_known),
      spells_known: num(r.spells_known),
    }))

    // Spell slots
    this.spellSlots = raw.spell_slots.map(r => ({
      class_id: numZ(r.class_id),
      level: numZ(r.level),
      slot_level_1: numZ(r.slot_level_1),
      slot_level_2: numZ(r.slot_level_2),
      slot_level_3: numZ(r.slot_level_3),
      slot_level_4: numZ(r.slot_level_4),
      slot_level_5: numZ(r.slot_level_5),
      slot_level_6: numZ(r.slot_level_6),
      slot_level_7: numZ(r.slot_level_7),
      slot_level_8: numZ(r.slot_level_8),
      slot_level_9: numZ(r.slot_level_9),
      pact_magic_count: num(r.pact_magic_count),
      pact_magic_level: num(r.pact_magic_level),
      sorcery_points: num(r.sorcery_points),
    }))

    // Feature bonuses
    this.featureBonuses = raw.feature_bonuses.map(r => ({
      feature_id: numZ(r.feature_id),
      class_level: numZ(r.class_level),
      bonus_type: r.bonus_type ?? '',
      bonus_value: numZ(r.bonus_value),
      bonus_unit: r.bonus_unit ?? '',
    }))

    // Character levels
    this.characterLevels = raw.character_levels.map(r => ({
      level: numZ(r.level),
      proficiency_bonus: numZ(r.proficiency_bonus),
      xp_required: numZ(r.xp_required),
    }))

    // Spells (Map)
    this.spells.clear()
    for (const r of raw.spells) {
      const row: SpellRow = {
        spell_id: numZ(r.spell_id),
        name: r.name ?? '',
        level: numZ(r.level),
        school: r.school ?? '',
        casting_time: r.casting_time ?? '',
        range: r.range ?? '',
        components: r.components ?? '',
        duration: r.duration ?? '',
        requires_concentration: bool(r.requires_concentration),
        is_ritual: bool(r.is_ritual),
        description: r.description ?? '',
        damage_dice: r.damage_dice ?? '',
      }
      this.spells.set(row.spell_id, row)
    }

    // Class spells
    this.classSpells = raw.class_spells.map(r => ({
      class_id: numZ(r.class_id),
      subclass_id: num(r.subclass_id),
      level: numZ(r.level),
      spell_ids: pipeNums(r.spell_ids),
      is_always_prepared: bool(r.is_always_prepared),
    }))

    // Class saving throws
    this.classSavingThrows = raw.class_saving_throws.map(r => ({
      class_id: numZ(r.class_id),
      ability_ids: pipeNums(r.ability_ids),
    }))

    // Class weapon proficiencies
    this.classWeaponProfs = raw.class_weapon_profs.map(r => ({
      class_id: numZ(r.class_id),
      weapon_ids: pipeNums(r.weapon_ids),
    }))

    // Class armour proficiencies
    this.classArmourProfs = raw.class_armour_profs.map(r => ({
      class_id: numZ(r.class_id),
      armour_ids: pipeNums(r.armour_ids),
    }))

    // Weapons (Map by item_id)
    this.weapons.clear()
    for (const r of raw.weapons) {
      const row: WeaponRow = {
        item_id: numZ(r.item_id),
        name: r.name ?? '',
        weapon_category: r.weapon_category ?? '',
        attack_type: r.attack_type ?? '',
        damage_dice: r.damage_dice ?? '',
        damage_type: r.damage_type ?? '',
        ability_options: r.ability_options ?? '',
        range_normal: num(r.range_normal),
        range_long: num(r.range_long),
        is_finesse: bool(r.is_finesse),
        is_thrown: bool(r.is_thrown),
        is_two_handed: bool(r.is_two_handed),
        is_versatile: bool(r.is_versatile),
        versatile_dice: r.versatile_dice ?? '',
        is_light: bool(r.is_light),
        is_heavy: bool(r.is_heavy),
        is_reach: bool(r.is_reach),
        is_loading: bool(r.is_loading),
        mastery: r.mastery ?? '',
      }
      this.weapons.set(row.item_id, row)
    }

    // Armour (Map)
    this.armour.clear()
    for (const r of raw.armour) {
      const row: ArmourRow = {
        armour_id: numZ(r.armour_id),
        name: r.name ?? '',
        armour_category: r.armour_category ?? '',
        base_ac: numZ(r.base_ac),
        bonus_ac: numZ(r.bonus_ac),
        dex_bonus_limit: numZ(r.dex_bonus_limit),
        stealth_disadvantage: bool(r.stealth_disadvantage),
        strength_requirement: numZ(r.strength_requirement),
      }
      this.armour.set(row.armour_id, row)
    }

    // Skills
    this.skills = raw.skills.map(r => ({
      skill_id: numZ(r.skill_id),
      name: r.name ?? '',
      ability_id: numZ(r.ability_id),
    }))

    // Backgrounds
    this.backgrounds = raw.backgrounds.map(r => ({
      background_id: numZ(r.background_id),
      name: r.name ?? '',
      asi_ability_1: r.asi_ability_1 ?? '',
      asi_ability_2: r.asi_ability_2 ?? '',
      origin_feat_id: num(r.origin_feat_id),
      origin_feat_preset: r.origin_feat_preset ?? '',
      skill_ids: pipeNums(r.skill_ids),
      tool_ids: pipeNums(r.tool_ids),
      starting_equipment_option_id: num(r.starting_equipment_option_id),
    }))

    // Races — trait columns are trait_1..trait_6, merge into trait_ids[]
    this.races = raw.races.map(r => {
      const traitIds: number[] = []
      for (let i = 1; i <= 6; i++) {
        const v = num(r[`trait_${i}`])
        if (v !== null) traitIds.push(v)
      }
      return {
        race_id: numZ(r.race_id),
        name: r.name ?? '',
        parent_race: r.parent_race ?? '',
        size: r.size ?? '',
        speed: numZ(r.speed),
        darkvision_range: numZ(r.darkvision_range),
        trait_ids: traitIds,
      }
    })

    // Starting equipment
    this.startingEquipment = raw.starting_equipment.map(r => ({
      option_id: numZ(r.option_id),
      source_type: r.source_type ?? '',
      source_id: numZ(r.source_id),
      option_label: r.option_label ?? '',
      weapon_ids: r.weapon_ids ?? '',
      armour_ids: r.armour_ids ?? '',
      tool_ids: r.tool_ids ?? '',
      item_ids: r.item_ids ?? '',
      gold_gp: numZ(r.gold_gp),
    }))

    // General feats
    this.generalFeats = raw.general_feats.map(r => ({
      feat_id: numZ(r.feat_id),
      name: r.name ?? '',
      description: r.description ?? '',
      prerequisite_text: r.prerequisite_text ?? '',
      asi_ability_id: num(r.asi_ability_id),
      asi_amount: num(r.asi_amount),
    }))

    // Epic boon feats
    this.epicBoonFeats = raw.epic_boon_feats.map(r => ({
      feat_id: numZ(r.feat_id),
      name: r.name ?? '',
      description: r.description ?? '',
      prerequisite_text: r.prerequisite_text ?? '',
    }))

    // Trait → spell grants
    this.traitSpells = (raw.trait_spells ?? []).map(r => ({
      trait_id: numZ(r.trait_id),
      spell_id: numZ(r.spell_id),
      granted_at_level: numZ(r.granted_at_level),
      uses_per_rest: num(r.uses_per_rest),
    }))

    this.loaded = true
  }

  // ── Query methods (all synchronous) ──────────────────────────────────────

  getClass(classId: number): ClassRow | undefined {
    return this.classes.find(c => c.class_id === classId)
  }

  getSubclass(subclassId: number): SubclassRow | undefined {
    return this.subclasses.find(s => s.subclass_id === subclassId)
  }

  getSubclassesForClass(classId: number): SubclassRow[] {
    return this.subclasses.filter(s => s.class_id === classId)
  }

  getTrait(traitId: number): TraitRow | undefined {
    return this.traits.get(traitId)
  }

  getChoice(choiceId: number): ChoiceRow | undefined {
    return this.choices.get(choiceId)
  }

  getSpell(spellId: number): SpellRow | undefined {
    return this.spells.get(spellId)
  }

  getWeapon(itemId: number): WeaponRow | undefined {
    return this.weapons.get(itemId)
  }

  getArmour(armourId: number): ArmourRow | undefined {
    return this.armour.get(armourId)
  }

  getRace(raceId: number): RaceRow | undefined {
    return this.races.find(r => r.race_id === raceId)
  }

  getBackground(backgroundId: number): BackgroundRow | undefined {
    return this.backgrounds.find(b => b.background_id === backgroundId)
  }

  getProficiencyBonus(level: number): number {
    return this.characterLevels.find(r => r.level === level)?.proficiency_bonus ?? 2
  }

  /** All progression rows for a class+subclass at one specific level. */
  getProgressionAtLevel(classId: number, subclassId: number | null, level: number): ProgressionRow[] {
    const rows = this.progression.filter(r =>
      r.level === level &&
      r.class_id === classId &&
      (r.subclass_id === null || r.subclass_id === subclassId)
    )
    // If no rows matched (e.g. subclassId is null but all rows are per-subclass),
    // fall back to the first subclass variant so universal data like ASI still works.
    if (rows.length === 0 && subclassId === null) {
      const fallback = this.progression.find(r =>
        r.level === level && r.class_id === classId
      )
      if (fallback) return [fallback]
    }
    return rows
  }

  /** Resolve cantrips_known and spells_known at a given level.
   *  The CSV uses sparse encoding — values only appear at levels where they change.
   *  This walks backwards to find the most recent non-null value. */
  getKnownCounts(classId: number, subclassId: number | null, level: number): { cantrips: number; spells: number } {
    let cantrips: number | null = null
    let spells: number | null = null
    for (let lv = level; lv >= 1 && (cantrips === null || spells === null); lv--) {
      const rows = this.getProgressionAtLevel(classId, subclassId, lv)
      for (const r of rows) {
        if (cantrips === null && r.cantrips_known !== null) cantrips = r.cantrips_known
        if (spells === null && r.spells_known !== null) spells = r.spells_known
      }
    }
    return { cantrips: cantrips ?? 0, spells: spells ?? 0 }
  }

  /** Accumulated trait IDs for all levels 1–level. Used to derive full trait list. */
  getAllTraitsForCharacter(classId: number, subclassId: number | null, level: number): number[] {
    const ids: number[] = []
    for (let lv = 1; lv <= level; lv++) {
      const rows = this.getProgressionAtLevel(classId, subclassId, lv)
      for (const r of rows) {
        ids.push(...r.feature_ids)
      }
    }
    return ids
  }

  /** All choices a character must resolve at a given level. */
  getChoicesAtLevel(classId: number, subclassId: number | null, level: number): ChoiceRow[] {
    const rows = this.getProgressionAtLevel(classId, subclassId, level)
    const choiceIds = rows.flatMap(r => r.choice_ids)
    return choiceIds
      .map(id => this.choices.get(id))
      .filter((c): c is ChoiceRow => c !== undefined)
  }

  /** All levels ≤ characterLevel where this class gets an ASI. */
  getAsiLevels(classId: number, subclassId: number | null, characterLevel: number): number[] {
    const levels: number[] = []
    for (let lv = 1; lv <= characterLevel; lv++) {
      const rows = this.getProgressionAtLevel(classId, subclassId, lv)
      if (rows.some(r => r.is_asi)) levels.push(lv)
    }
    return levels
  }

  /** Recurring choices that fire on level-up for this class. */
  getRecurringLevelUpChoices(_classId: number): RecurringChoiceRow[] {
    // choices_recurring rows reference choice_elements that are class-relative,
    // but filtering by classId is done at usage time based on context.
    // For now return all recurring choices — the caller filters by class context.
    return this.choicesRecurring
  }

  /** Spell slot counts for a class at a level. */
  getSpellSlots(classId: number, level: number): SpellSlotsRow | undefined {
    return this.spellSlots.find(r => r.class_id === classId && r.level === level)
  }

  /** Feature bonus value (e.g. rage_uses at level 5). */
  getFeatureBonus(traitId: number, level: number, bonusType: string): number | null {
    // Find the highest class_level <= level for this trait + bonus type
    const candidates = this.featureBonuses
      .filter(r => r.feature_id === traitId && r.bonus_type === bonusType && r.class_level <= level)
      .sort((a, b) => b.class_level - a.class_level)
    return candidates.length > 0 ? candidates[0].bonus_value : null
  }

  /** All spells on a class's spell list (all levels). */
  getClassSpells(classId: number): SpellRow[] {
    const spellIds = new Set<number>()
    for (const row of this.classSpells) {
      if (row.class_id === classId && row.subclass_id === null) {
        for (const id of row.spell_ids) spellIds.add(id)
      }
    }
    return [...spellIds]
      .map(id => this.spells.get(id))
      .filter((s): s is SpellRow => s !== undefined)
  }

  /** Always-prepared spells granted by a subclass at a given level and below. */
  getSubclassSpells(subclassId: number | null, upToLevel: number): SpellRow[] {
    if (subclassId === null) return []
    const spellIds = new Set<number>()
    for (const row of this.classSpells) {
      if (row.subclass_id === subclassId && row.level <= upToLevel && row.is_always_prepared) {
        for (const id of row.spell_ids) spellIds.add(id)
      }
    }
    return [...spellIds]
      .map(id => this.spells.get(id))
      .filter((s): s is SpellRow => s !== undefined)
  }

  /** Saving throw ability IDs for a class. */
  getClassSavingThrows(classId: number): number[] {
    return this.classSavingThrows.find(r => r.class_id === classId)?.ability_ids ?? []
  }

  /** Weapon proficiency IDs for a class. */
  getClassWeaponProficiencies(classId: number): number[] {
    return this.classWeaponProfs.find(r => r.class_id === classId)?.weapon_ids ?? []
  }

  /** Armour proficiency IDs for a class. */
  getClassArmourProficiencies(classId: number): number[] {
    return this.classArmourProfs.find(r => r.class_id === classId)?.armour_ids ?? []
  }

  /** Starting equipment options for a class. */
  getStartingEquipment(classId: number): StartingEquipmentRow[] {
    return this.startingEquipment.filter(e => e.source_id === classId && e.source_type === 'class')
  }

  /** General feat by ID. */
  getGeneralFeat(featId: number): GeneralFeatRow | undefined {
    return this.generalFeats.find(f => f.feat_id === featId)
  }

  /** Epic boon feat by ID. */
  getEpicBoonFeat(featId: number): EpicBoonFeatRow | undefined {
    return this.epicBoonFeats.find(f => f.feat_id === featId)
  }

  /** Spells granted by a trait, filtered to those available at the given character level. */
  getTraitSpells(traitId: number, characterLevel: number): TraitSpellRow[] {
    return this.traitSpells.filter(r =>
      r.trait_id === traitId && r.granted_at_level <= characterLevel
    )
  }
}

export const db = new DatabaseService()
