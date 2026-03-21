import { useState } from 'react'
import type { AbilityScores, CharacterData } from '../types'
import { useCharacter } from '../context/CharacterContext'
import { db } from '../lib/database'
import type { ClassRow, StartingEquipmentRow } from '../lib/database'

// ── Types ───────────────────────────────────────────────────────────────────

type WizardStep = 'class' | 'subclass' | 'race' | 'background' | 'abilities' | 'proficiency' | 'spells' | 'equipment' | 'name' | 'review'

interface WizardState {
  step: WizardStep
  selectedClassId: number | null
  selectedRaceId: number | null
  selectedBackgroundId: number | null
  abilityAssignments: Partial<Record<keyof AbilityScores, number>>
  selectedSkillIds: number[]
  selectedSubclassId: number | null
  selectedCantripIds: number[]
  selectedSpellIds: number[]
  selectedEquipmentOptionId: number | null
  characterName: string
  playerName: string
  passkey: string
}

interface Props {
  onComplete: () => void
  onBack?: () => void
}

// ── Constants ───────────────────────────────────────────────────────────────

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]
const ABILITY_KEYS: (keyof AbilityScores)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const ABILITY_LABELS: Record<keyof AbilityScores, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
}

const DRAGONBORN_ELEMENT: Record<string, string> = {
  black: 'Acid', blue: 'Lightning', green: 'Poison', red: 'Fire', white: 'Cold',
  brass: 'Fire', bronze: 'Lightning', copper: 'Acid', gold: 'Fire', silver: 'Cold',
}

const ABILITY_ID_TO_KEY: Record<number, keyof AbilityScores> = {
  1: 'str', 2: 'dex', 3: 'con', 4: 'int', 5: 'wis', 6: 'cha',
}

const STEP_TITLES: Record<WizardStep, string> = {
  class:       'Choose Your Class',
  subclass:    'Choose Your Subclass',
  race:        'Choose Your Species',
  background:  'Choose Your Background',
  abilities:   'Assign Ability Scores',
  proficiency: 'Skill Proficiencies',
  spells:      'Choose Your Spells',
  equipment:   'Starting Equipment',
  name:        'Name Your Character',
  review:      'Review & Confirm',
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function mod(score: number) { return Math.floor((score - 10) / 2) }
function fmtMod(m: number) { return m >= 0 ? `+${m}` : `${m}` }

function isSpellcaster(cls: ClassRow): boolean {
  return cls.spellcasting_type !== '3'
}

function isKnownSpellClass(cls: ClassRow): boolean {
  // Known-spells class: Bard, Ranger, Sorcerer, Warlock — no prepared_level_divisor, but is a caster
  return isSpellcaster(cls) && cls.prepared_level_divisor === null
}

function isPreparedCaster(cls: ClassRow): boolean {
  return isSpellcaster(cls) && cls.prepared_level_divisor !== null
}

function getClassPrimaryAbility(cls: ClassRow): string | undefined {
  const id = cls.primary_ability_id
  if (!id) return undefined
  const key = ABILITY_ID_TO_KEY[id]
  return key ? key.toUpperCase() : undefined
}

function getSpellAbilityKey(cls: ClassRow): keyof AbilityScores | undefined {
  if (cls.spellcasting_ability_id === null) return undefined
  return ABILITY_ID_TO_KEY[cls.spellcasting_ability_id]
}

/** Parse "id:qty|id:qty" or "id:qty" colon-separated IDs from StartingEquipmentRow fields */
function parseIdQtyString(s: string): Array<{ id: number; qty: number }> {
  if (!s || s.trim() === '') return []
  return s.split('|').map(part => {
    const [idStr, qtyStr] = part.split(':')
    return { id: Number(idStr), qty: Number(qtyStr) || 1 }
  }).filter(x => !isNaN(x.id))
}

/** Build a display items string from a StartingEquipmentRow */
function buildEquipmentLabel(opt: StartingEquipmentRow): string {
  const parts: string[] = []
  for (const { id, qty } of parseIdQtyString(opt.weapon_ids)) {
    const w = db.getWeapon(id)
    if (w) parts.push(qty > 1 ? `${qty}x ${w.name}` : w.name)
  }
  for (const { id, qty } of parseIdQtyString(opt.armour_ids)) {
    const a = db.getArmour(id)
    if (a) parts.push(qty > 1 ? `${qty}x ${a.name}` : a.name)
  }
  if (opt.gold_gp > 0) parts.push(`${opt.gold_gp} gp`)
  return parts.length > 0 ? parts.join(', ') : opt.option_label
}

/** Calculate AC from equipment option + class unarmored defense + ability scores */
function calcAcFromOption(
  classRow: ClassRow,
  equipOpt: StartingEquipmentRow | undefined,
  scores: AbilityScores,
): number {
  const dexMod = mod(scores.dex)

  if (equipOpt) {
    const armourIds = parseIdQtyString(equipOpt.armour_ids)
    let baseAc = 0
    let hasArmour = false
    let shieldBonus = 0

    for (const { id } of armourIds) {
      const armour = db.getArmour(id)
      if (!armour) continue
      if (armour.armour_category === 'shield') {
        shieldBonus += armour.bonus_ac
      } else {
        hasArmour = true
        const dexBonus = armour.dex_bonus_limit === -1
          ? dexMod
          : Math.min(dexMod, armour.dex_bonus_limit)
        baseAc = armour.base_ac + dexBonus
      }
    }

    if (hasArmour || shieldBonus > 0) {
      return (hasArmour ? baseAc : (10 + dexMod)) + shieldBonus
    }
  }

  // Unarmored
  if (classRow.unarmored_defense_base !== null) {
    const base = classRow.unarmored_defense_base
    const a1 = classRow.unarmored_defense_ability_1 as keyof AbilityScores
    const a2 = classRow.unarmored_defense_ability_2 as keyof AbilityScores
    let ac = base + dexMod
    if (a1 && a1 in scores) ac += mod(scores[a1])
    if (a2 && a2 in scores) ac += mod(scores[a2])
    return ac
  }

  return 10 + dexMod
}

function getL1ProgressionData(classId: number) {
  return db.getProgressionAtLevel(classId, null, 1)
}

function getCantripsKnownAtL1(classId: number): number {
  const rows = getL1ProgressionData(classId)
  for (const r of rows) {
    if (r.cantrips_known !== null) return r.cantrips_known
  }
  return 0
}

function getSpellsKnownAtL1(classId: number): number {
  const rows = getL1ProgressionData(classId)
  for (const r of rows) {
    if (r.spells_known !== null) return r.spells_known
  }
  return 0
}

/** Get level 1 spell slots count for a class */
function getSlotsAtL1(classId: number): number {
  const slotsRow = db.getSpellSlots(classId, 1)
  if (!slotsRow) return 0
  if (slotsRow.pact_magic_count !== null) return slotsRow.pact_magic_count
  return slotsRow.slot_level_1
}

function getStepOrder(wizard: WizardState): WizardStep[] {
  const steps: WizardStep[] = ['class']

  // Insert subclass step if class has subclass_unlock_level === 1
  if (wizard.selectedClassId !== null) {
    const cls = db.getClass(wizard.selectedClassId)
    if (cls && cls.subclass_unlock_level === 1) {
      steps.push('subclass')
    }
  }

  steps.push('race', 'background', 'abilities', 'proficiency')

  if (wizard.selectedClassId !== null) {
    const cls = db.getClass(wizard.selectedClassId)
    if (cls && isSpellcaster(cls)) {
      const cantrips = getCantripsKnownAtL1(cls.class_id)
      const spellsKnown = getSpellsKnownAtL1(cls.class_id)
      // Show spell step if there are cantrips to pick, or if it's a known-spell class, or wizard (always picks spellbook)
      const isWizard = cls.name === 'Wizard'
      if (cantrips > 0 || isKnownSpellClass(cls) && spellsKnown > 0 || isWizard) {
        steps.push('spells')
      }
    }
  }

  steps.push('equipment', 'name', 'review')
  return steps
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function CharacterCreator({ onComplete, onBack }: Props) {
  const { createCharacterFull } = useCharacter()

  const [wizard, setWizard] = useState<WizardState>({
    step: 'class',
    selectedClassId: null,
    selectedSubclassId: null,
    selectedRaceId: null,
    selectedBackgroundId: null,
    abilityAssignments: {},
    selectedSkillIds: [],
    selectedCantripIds: [],
    selectedSpellIds: [],
    selectedEquipmentOptionId: null,
    characterName: '',
    playerName: '',
    passkey: '',
  })

  const [saving, setSaving] = useState(false)

  const stepOrder = getStepOrder(wizard)
  const stepIndex = stepOrder.indexOf(wizard.step)

  function update(patch: Partial<WizardState>) {
    setWizard(prev => ({ ...prev, ...patch }))
  }

  function goNext() {
    const next = stepOrder[stepIndex + 1]
    if (next) update({ step: next })
  }

  function goBack() {
    if (stepIndex === 0) onBack?.()
    else update({ step: stepOrder[stepIndex - 1] })
  }

  function canAdvance(): boolean {
    const cls = wizard.selectedClassId !== null ? db.getClass(wizard.selectedClassId) : undefined
    switch (wizard.step) {
      case 'class':      return wizard.selectedClassId !== null
      case 'subclass':   return wizard.selectedSubclassId !== null
      case 'race':       return wizard.selectedRaceId !== null
      case 'background': return wizard.selectedBackgroundId !== null
      case 'abilities':  return ABILITY_KEYS.every(k => wizard.abilityAssignments[k] !== undefined)
      case 'proficiency': {
        if (!cls) return false
        const skillChoice = db.getChoice(cls.skill_choice_id)
        const needed = skillChoice?.pick_count ?? 0
        return wizard.selectedSkillIds.length === needed
      }
      case 'spells': {
        if (!cls || !isSpellcaster(cls)) return true
        const cantripsNeeded = getCantripsKnownAtL1(cls.class_id)
        if (cantripsNeeded > 0 && wizard.selectedCantripIds.length !== cantripsNeeded) return false
        const isWizard = cls.name === 'Wizard'
        const spellsKnown = getSpellsKnownAtL1(cls.class_id)
        if ((isWizard || isKnownSpellClass(cls)) && spellsKnown > 0 && wizard.selectedSpellIds.length !== spellsKnown) return false
        return true
      }
      case 'equipment': {
        const equipOptions = wizard.selectedClassId !== null ? db.getStartingEquipment(wizard.selectedClassId) : []
        if (equipOptions.length > 0 && wizard.selectedEquipmentOptionId === null) return false
        return true
      }
      case 'name':   return wizard.characterName.trim().length > 0 && /^[a-zA-Z]{5}$/.test(wizard.passkey)
      case 'review': return !saving
      default:       return true
    }
  }

  async function handleConfirm() {
    const classRow = db.getClass(wizard.selectedClassId!)!
    const raceRow  = db.getRace(wizard.selectedRaceId!)!
    const bgRow    = db.getBackground(wizard.selectedBackgroundId!)!

    // Ability scores + background bonuses
    const base = wizard.abilityAssignments as Record<keyof AbilityScores, number>
    const finalScores: AbilityScores = { str: base.str, dex: base.dex, con: base.con, int: base.int, wis: base.wis, cha: base.cha }
    const asi1 = bgRow.asi_ability_1 as keyof AbilityScores
    const asi2 = bgRow.asi_ability_2 as keyof AbilityScores
    if (asi1 && asi1 in finalScores) finalScores[asi1] += 2
    if (asi2 && asi2 in finalScores) finalScores[asi2] += 1

    const profBonus = 2
    const hp = Math.max(1, classRow.hit_die_size + mod(finalScores.con))
    const initiative = mod(finalScores.dex)
    const speed = raceRow.speed

    // Equipment option
    const equipOpt = wizard.selectedEquipmentOptionId !== null
      ? db.startingEquipment.find(e => e.option_id === wizard.selectedEquipmentOptionId)
      : undefined

    const ac = calcAcFromOption(classRow, equipOpt, finalScores)

    // Saving throws — store as ability IDs
    const savingThrows: number[] = db.getClassSavingThrows(classRow.class_id)

    // Skills — store as skill IDs
    const bgSkillIds = bgRow.skill_ids
    const skillIds = [...new Set([...bgSkillIds, ...wizard.selectedSkillIds])]

    // Race traits — store IDs only
    const raceTraits = raceRow.trait_ids

    // Armour + weapon proficiency summary
    const armourProfIds = db.getClassArmourProficiencies(classRow.class_id)
    const armourProfNames = armourProfIds.map(id => db.getArmour(id)?.name).filter(Boolean).join(', ')

    // Languages from race
    const languages: string[] = []

    // Items from equipment option
    const itemLines: string[] = []
    if (equipOpt) {
      itemLines.push(buildEquipmentLabel(equipOpt))
    }
    const bagItems = itemLines.flatMap(l => l.split('\n').map(s => s.trim()).filter(Boolean))

    // Origin feat
    const originFeat = bgRow.origin_feat_id !== null ? db.getGeneralFeat(bgRow.origin_feat_id) : undefined
    const choices: Record<string, string> = {}
    if (originFeat) choices['Origin Feat'] = originFeat.name
    else if (bgRow.origin_feat_preset) choices['Origin Feat'] = bgRow.origin_feat_preset

    // Spellcasting
    const ABILITY_KEY_TO_ID_MAP: Record<string, number> = {
      str: 1, dex: 2, con: 3, int: 4, wis: 5, cha: 6,
    }
    let spellAbility: number | null = null
    let spellAttackBonus: number | null = null
    let spellSaveDc: number | null = null
    let spellSlots: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0]
    let spellSlotsMax: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0]

    // spellsByLevel: index 0=cantrips, 1..9=spell levels — store spell IDs
    const spellsByLevel: number[][] = [[], [], [], [], [], [], [], [], [], []]
    const preparedSpells: number[] = []

    if (isSpellcaster(classRow)) {
      const abilityKey = getSpellAbilityKey(classRow)
      if (abilityKey) {
        const abilityMod = mod(finalScores[abilityKey])
        spellAbility    = ABILITY_KEY_TO_ID_MAP[abilityKey] ?? null
        spellAttackBonus = profBonus + abilityMod
        spellSaveDc     = 8 + profBonus + abilityMod
      }

      // Build spell slots from DB
      const slotsRow = db.getSpellSlots(classRow.class_id, 1)
      if (slotsRow) {
        if (slotsRow.pact_magic_count !== null && slotsRow.pact_magic_count > 0) {
          // Pact magic (Warlock): put pact slots at level 1
          spellSlotsMax = [slotsRow.pact_magic_count, 0, 0, 0, 0, 0, 0, 0, 0]
        } else {
          spellSlotsMax = [
            slotsRow.slot_level_1, slotsRow.slot_level_2, slotsRow.slot_level_3,
            slotsRow.slot_level_4, slotsRow.slot_level_5, slotsRow.slot_level_6,
            slotsRow.slot_level_7, slotsRow.slot_level_8, slotsRow.slot_level_9,
          ]
        }
        spellSlots = [...spellSlotsMax]
      }

      // Add selected spells to spellsByLevel by their spell level
      for (const id of wizard.selectedCantripIds) {
        spellsByLevel[0].push(id)
      }
      for (const id of wizard.selectedSpellIds) {
        const sr = db.getSpell(id)
        if (sr) {
          spellsByLevel[sr.level].push(id)
          preparedSpells.push(id) // auto-prepare selected spells
        }
      }
    }

    // Subclass (if selected in creator, e.g. Cleric)
    const selectedSubclass = wizard.selectedSubclassId !== null
      ? db.getSubclassesForClass(classRow.class_id).find(s => s.subclass_id === wizard.selectedSubclassId)
      : undefined

    const id = Date.now().toString()

    const char: CharacterData = {
      id,
      name: wizard.characterName.trim(),
      player: wizard.playerName.trim(),
      passkey: wizard.passkey.toLowerCase(),
      class: classRow.name,
      subclass: selectedSubclass?.name ?? null,
      level: 1,
      race: raceRow.name,
      alignment: '',
      deity: null,
      abilityScores: finalScores,
      savingThrows,
      skills: skillIds,
      skillDetails: {},
      maxHp: hp,
      currentHp: hp,
      tempHp: 0,
      ac,
      initiative,
      speed,
      hitDice: `1d${classRow.hit_die_size}`,
      hitDiceCurrent: 1,
      proficiencyBonus: profBonus,
      deathSaves: [0, 0],
      conditions: [],
      spellAbility,
      spellAttackBonus,
      spellSaveDc,
      spellSlots,
      spellSlotsMax,
      spellsByLevel,
      preparedSpells,
      currency: [0, 0, 0],
      equipment: [null, null, null],
      onPerson: [],
      bag: bagItems,
      bag2: [],
      bag3: [],
      bag4: [],
      bag5: [],
      sack1: [],
      sack2: [],
      sack3: [],
      sack4: [],
      sack5: [],
      bagOfHolding: [],
      notes: '',
      description: '',
      choices,
      traits: [],
      raceTraits,
      resources: {},
      languages,
      otherProficiencies: armourProfNames || '',
      aliases: [],
    }

    setSaving(true)
    try {
      await createCharacterFull(char)
      onComplete()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="creator-wizard">
      <div className="creator-header">
        <button className="btn btn-secondary btn-sm" onClick={goBack} type="button">←</button>
        <div className="creator-header-title">{STEP_TITLES[wizard.step]}</div>
        <div className="creator-step-indicator">Step {stepIndex + 1} of {stepOrder.length}</div>
      </div>

      <div className="creator-content">
        {wizard.step === 'class'       && <ClassStep       wizard={wizard} update={update} />}
        {wizard.step === 'subclass'    && <SubclassStep    wizard={wizard} update={update} />}
        {wizard.step === 'race'        && <RaceStep        wizard={wizard} update={update} />}
        {wizard.step === 'background'  && <BackgroundStep  wizard={wizard} update={update} />}
        {wizard.step === 'abilities'   && <AbilitiesStep   wizard={wizard} update={update} />}
        {wizard.step === 'proficiency' && <ProficiencyStep wizard={wizard} update={update} />}
        {wizard.step === 'spells'      && <SpellsStep      wizard={wizard} update={update} />}
        {wizard.step === 'equipment'   && <EquipmentStep   wizard={wizard} update={update} />}
        {wizard.step === 'name'        && <NameStep        wizard={wizard} update={update} />}
        {wizard.step === 'review'      && <ReviewStep      wizard={wizard} />}
      </div>

      <div className="creator-footer">
        {wizard.step === 'review' ? (
          <button className="btn btn-primary creator-next-btn" onClick={handleConfirm} disabled={!canAdvance()} type="button">
            {saving ? 'Creating…' : 'Confirm & Play'}
          </button>
        ) : (
          <button className="btn btn-primary creator-next-btn" onClick={goNext} disabled={!canAdvance()} type="button">
            Next →
          </button>
        )}
      </div>
    </div>
  )
}

// ── Step: Class ─────────────────────────────────────────────────────────────

function ClassStep({ wizard, update }: { wizard: WizardState; update: (p: Partial<WizardState>) => void }) {
  const [expandedId, setExpandedId] = useState<number | null>(wizard.selectedClassId)

  function selectClass(id: number) {
    update({
      selectedClassId: id,
      selectedSubclassId: null,
      selectedSkillIds: [],
      selectedCantripIds: [],
      selectedSpellIds: [],
      selectedEquipmentOptionId: null,
    })
    setExpandedId(id)
  }

  const cls = expandedId !== null ? db.getClass(expandedId) : undefined

  // Level-1 features, excluding pure proficiency grants (shown in Proficiencies section)
  const l1Features = cls
    ? getL1ProgressionData(cls.class_id).flatMap(r => r.feature_ids)
        .map(id => db.getTrait(id)).filter((t): t is NonNullable<typeof t> => !!t)
        .filter(t => !t.description.startsWith('Proficiency with') && !t.name.endsWith('Proficiency'))
    : []

  const armourProfIds = cls ? db.getClassArmourProficiencies(cls.class_id) : []
  const armourProfNames = armourProfIds.map(id => db.getArmour(id)?.name).filter(Boolean).join(', ')

  const weaponIds = cls ? db.getClassWeaponProficiencies(cls.class_id) : []
  const weaponCats = [...new Set(weaponIds.map(id => {
    const cat = db.getWeapon(id)?.weapon_category ?? ''
    if (cat.startsWith('simple')) return 'Simple'
    if (cat.startsWith('martial')) return 'Martial'
    return null
  }).filter(Boolean))] as string[]
  const weaponProfText = weaponCats.length > 0 ? weaponCats.join(' & ') + ' weapons' : ''

  const skillChoice = cls?.skill_choice_id ? db.choices.get(cls.skill_choice_id) : undefined
  const skillOptions = skillChoice?.choice_elements.map(id => db.skills.find(s => s.skill_id === id)?.name).filter(Boolean) ?? []
  const skillProfText = skillChoice ? `Choose ${skillChoice.pick_count} from: ${skillOptions.join(', ')}` : ''

  const spellAbilityKey = cls ? getSpellAbilityKey(cls) : undefined
  const cantripsAtL1 = cls && isSpellcaster(cls) ? getCantripsKnownAtL1(cls.class_id) : 0
  const spellsAtL1 = cls && isSpellcaster(cls) ? getSpellsKnownAtL1(cls.class_id) : 0
  const slotsAtL1 = cls && isSpellcaster(cls) ? getSlotsAtL1(cls.class_id) : 0

  return (
    <>
      <div className="creator-grid">
        {db.classes.map(c => (
          <div
            key={c.class_id}
            className={`creator-card${wizard.selectedClassId === c.class_id ? ' creator-card--selected' : ''}`}
            onClick={() => selectClass(c.class_id)}
          >
            <div className="creator-card-name">{c.name}</div>
            <div className="creator-card-sub">{[getClassPrimaryAbility(c), `d${c.hit_die_size}`].filter(Boolean).join(' · ')}</div>
          </div>
        ))}
      </div>

      {cls && (
        <div className="creator-detail">
          <h3>{cls.name}</h3>

          <div className="creator-detail-section">
            <div className="creator-detail-section-title">Proficiencies</div>
            {skillProfText && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                <strong>Skills:</strong> {skillProfText}
              </div>
            )}
            {armourProfNames && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                <strong>Armour:</strong> {armourProfNames}
              </div>
            )}
            {weaponProfText && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                <strong>Weapons:</strong> {weaponProfText}
              </div>
            )}
          </div>

          {isSpellcaster(cls) && spellAbilityKey && (
            <div className="creator-detail-section">
              <div className="creator-detail-section-title">Spellcasting</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Ability: {spellAbilityKey.toUpperCase()}
                {cantripsAtL1 > 0 && ` · ${cantripsAtL1} cantrips`}
                {cls.name === 'Wizard'
                  ? ' · 6 spellbook spells'
                  : spellsAtL1 > 0 && isKnownSpellClass(cls)
                    ? ` · ${spellsAtL1} spells known`
                    : isPreparedCaster(cls) && cls.name !== 'Wizard'
                      ? ' · Prepared caster'
                      : ''}
                {slotsAtL1 > 0 && ` · ${slotsAtL1} level-1 slot${slotsAtL1 !== 1 ? 's' : ''}`}
              </div>
            </div>
          )}

          {l1Features.length > 0 && (
            <div className="creator-detail-section">
              <div className="creator-detail-section-title">Level 1 Features</div>
              {l1Features.map(f => f && (
                <div key={f.trait_id} className="creator-detail-feature">
                  <div className="creator-detail-feature-name">{f.name}</div>
                  <div className="creator-detail-feature-desc">{f.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

// ── Step: Subclass ──────────────────────────────────────────────────────────

function SubclassStep({ wizard, update }: { wizard: WizardState; update: (p: Partial<WizardState>) => void }) {
  if (wizard.selectedClassId === null) return null
  const subclasses = db.getSubclassesForClass(wizard.selectedClassId)
  const cls = db.getClass(wizard.selectedClassId)

  return (
    <>
      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
        Choose a subclass for your {cls?.name ?? 'character'}.
      </p>
      <div className="creator-grid">
        {subclasses.map(sc => (
          <div
            key={sc.subclass_id}
            className={`creator-card ${wizard.selectedSubclassId === sc.subclass_id ? 'creator-card--selected' : ''}`}
            onClick={() => update({ selectedSubclassId: sc.subclass_id })}
          >
            <div className="creator-card-name">{sc.name}</div>
            {sc.description && (
              <div className="creator-card-desc">{sc.description}</div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

// ── Step: Race ──────────────────────────────────────────────────────────────


function RaceStep({ wizard, update }: { wizard: WizardState; update: (p: Partial<WizardState>) => void }) {
  const selectedRace = wizard.selectedRaceId !== null ? db.getRace(wizard.selectedRaceId) : undefined
  const initGroup = selectedRace?.parent_race || null
  const [expandedGroup, setExpandedGroup] = useState<string | null>(initGroup)

  const standaloneRaces = db.races.filter(r => !r.parent_race)
  const groupNames = [...new Set(
    db.races.filter(r => !!r.parent_race).map(r => r.parent_race)
  )].sort()

  const allTopLevel = [
    ...standaloneRaces.map(r => ({ kind: 'race' as const, race: r, sortKey: r.name })),
    ...groupNames.map(g => ({ kind: 'group' as const, groupName: g, sortKey: g })),
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey))

  const subraces = expandedGroup ? db.races.filter(r => r.parent_race === expandedGroup) : []
  const sharedTraitIds = subraces.length > 0
    ? subraces[0].trait_ids.filter(id => subraces.every(r => r.trait_ids.includes(id)))
    : []
  const sharedTraits = sharedTraitIds.map(id => db.getTrait(id)).filter(Boolean)

  const selectedSubrace = expandedGroup && wizard.selectedRaceId !== null ? db.getRace(wizard.selectedRaceId) : undefined
  const expandedStandalone = !expandedGroup && wizard.selectedRaceId !== null ? db.getRace(wizard.selectedRaceId) : undefined
  const expandedTraits = expandedStandalone?.trait_ids.map(id => db.getTrait(id)).filter(Boolean) ?? []

  function clickRace(id: number) {
    setExpandedGroup(null)
    update({ selectedRaceId: id })
  }

  function clickGroup(groupName: string) {
    if (expandedGroup === groupName) {
      setExpandedGroup(null)
    } else {
      setExpandedGroup(groupName)
      update({ selectedRaceId: null })
    }
  }

  return (
    <>
      <div className="creator-grid">
        {allTopLevel.map(item => item.kind === 'race' ? (
          <div
            key={item.race.race_id}
            className={`creator-card${wizard.selectedRaceId === item.race.race_id && !expandedGroup ? ' creator-card--selected' : ''}`}
            onClick={() => clickRace(item.race.race_id)}
          >
            <div className="creator-card-name">{item.race.name}</div>
          </div>
        ) : (
          <div
            key={item.groupName}
            className={`creator-card${expandedGroup === item.groupName ? ' creator-card--selected' : ''}`}
            onClick={() => clickGroup(item.groupName)}
          >
            <div className="creator-card-name">{item.groupName}</div>
          </div>
        ))}
      </div>

      {/* Standalone race detail */}
      {expandedStandalone && (
        <div className="creator-detail">
          <h3>{expandedStandalone.name}</h3>
          {(expandedStandalone.darkvision_range > 0 || expandedStandalone.speed !== 30) && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              {[
                expandedStandalone.speed !== 30 && `${expandedStandalone.speed} ft movement`,
                expandedStandalone.darkvision_range > 0 && `Darkvision ${expandedStandalone.darkvision_range} ft`,
              ].filter(Boolean).join(' · ')}
            </p>
          )}
          {expandedTraits.map(t => t && (
            <div key={t.trait_id} className="creator-detail-feature">
              <div className="creator-detail-feature-name">{t.name}</div>
              <div className="creator-detail-feature-desc">{t.description}</div>
            </div>
          ))}
        </div>
      )}

      {/* Group inline detail: shared traits + subrace grid */}
      {expandedGroup && (() => {
        const rep = subraces[0]
        const groupSpeed = rep && subraces.every(r => r.speed === rep.speed) ? rep.speed : null
        const groupDarkvision = rep && subraces.every(r => r.darkvision_range === rep.darkvision_range) ? rep.darkvision_range : null
        const statLine = [
          groupSpeed !== null && groupSpeed !== 30 && `${groupSpeed} ft movement`,
          groupDarkvision !== null && groupDarkvision > 0 && `Darkvision ${groupDarkvision} ft`,
        ].filter(Boolean).join(' · ')
        return (
        <div className="creator-detail">
          <h3>{expandedGroup}</h3>
          {statLine && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{statLine}</p>}
          {sharedTraits.map(t => t && (
            <div key={t.trait_id} className="creator-detail-feature">
              <div className="creator-detail-feature-name">{t.name}</div>
              <div className="creator-detail-feature-desc">{t.description}</div>
            </div>
          ))}
          <div className="creator-section-title" style={{ marginTop: '0.75rem', marginBottom: '0.5rem' }}>Choose your variant</div>
          <div className="creator-grid" style={{ marginBottom: selectedSubrace ? '0.75rem' : 0 }}>
            {subraces.map(r => {
              const shortName = r.parent_race ? r.name.replace(r.parent_race, '').trim() : r.name
              const element = DRAGONBORN_ELEMENT[shortName.toLowerCase()]
              return (
                <div
                  key={r.race_id}
                  className={`creator-card${wizard.selectedRaceId === r.race_id ? ' creator-card--selected' : ''}`}
                  onClick={() => update({ selectedRaceId: r.race_id })}
                >
                  <div className="creator-card-name">{shortName}</div>
                  {element && <div className="creator-card-sub">{element}</div>}
                </div>
              )
            })}
          </div>
          {selectedSubrace && (
            <>
              {(selectedSubrace.darkvision_range > 0 || selectedSubrace.speed !== 30) && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  {[
                    selectedSubrace.speed !== 30 && `${selectedSubrace.speed} ft movement`,
                    selectedSubrace.darkvision_range > 0 && `Darkvision ${selectedSubrace.darkvision_range} ft`,
                  ].filter(Boolean).join(' · ')}
                </p>
              )}
              {selectedSubrace.trait_ids.filter(id => !sharedTraitIds.includes(id)).map(id => db.getTrait(id)).filter(Boolean).map(t => t && (
                <div key={t.trait_id} className="creator-detail-feature">
                  <div className="creator-detail-feature-name">{t.name}</div>
                  <div className="creator-detail-feature-desc">{t.description}</div>
                </div>
              ))}
            </>
          )}
        </div>
        )
      })()}
    </>
  )
}

// ── Step: Background ────────────────────────────────────────────────────────

function BackgroundStep({ wizard, update }: { wizard: WizardState; update: (p: Partial<WizardState>) => void }) {
  const [expandedId, setExpandedId] = useState<number | null>(wizard.selectedBackgroundId)

  function selectBg(id: number) {
    update({ selectedBackgroundId: id })
    setExpandedId(id)
  }

  const bg = expandedId !== null ? db.getBackground(expandedId) : undefined
  const originFeat = bg?.origin_feat_id !== undefined && bg.origin_feat_id !== null
    ? db.getGeneralFeat(bg.origin_feat_id)
    : undefined

  const bgSkills = bg
    ? db.skills.filter(s => bg.skill_ids.includes(s.skill_id))
    : []

  const bgEquipOpt = bg?.starting_equipment_option_id !== null && bg?.starting_equipment_option_id !== undefined
    ? db.startingEquipment.find(e => e.option_id === bg.starting_equipment_option_id)
    : undefined

  return (
    <>
      <div className="creator-grid">
        {db.backgrounds.map(b => {
          const feat = b.origin_feat_id !== null ? db.getGeneralFeat(b.origin_feat_id) : undefined
          return (
            <div
              key={b.background_id}
              className={`creator-card${wizard.selectedBackgroundId === b.background_id ? ' creator-card--selected' : ''}`}
              onClick={() => selectBg(b.background_id)}
            >
              <div className="creator-card-name">{b.name}</div>
              {feat && <span className="creator-card-badge">{feat.name}</span>}
            </div>
          )
        })}
      </div>

      {bg && (
        <div className="creator-detail">
          <h3>{bg.name}</h3>

          <div className="creator-detail-section">
            <div className="creator-detail-section-title">Ability Score Bonus</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              +2 {bg.asi_ability_1.toUpperCase()}, +1 {bg.asi_ability_2.toUpperCase()}
            </div>
          </div>

          <div className="creator-detail-section">
            <div className="creator-detail-section-title">Skills (auto-granted)</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {bgSkills.map(s => s.name).join(', ')}
            </div>
          </div>

          {originFeat && (
            <div className="creator-detail-section">
              <div className="creator-detail-section-title">Origin Feat</div>
              <div className="creator-detail-feature">
                <div className="creator-detail-feature-name">{originFeat.name}</div>
                <div className="creator-detail-feature-desc">{originFeat.description}</div>
              </div>
            </div>
          )}

          {bgEquipOpt && (
            <div className="creator-detail-section">
              <div className="creator-detail-section-title">Starting Equipment</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {buildEquipmentLabel(bgEquipOpt)}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}

// ── Step: Abilities ─────────────────────────────────────────────────────────

function AbilitiesStep({ wizard, update }: { wizard: WizardState; update: (p: Partial<WizardState>) => void }) {
  const assigned = wizard.abilityAssignments
  const cls = wizard.selectedClassId !== null ? db.getClass(wizard.selectedClassId) : undefined
  const bg  = wizard.selectedBackgroundId !== null ? db.getBackground(wizard.selectedBackgroundId) : undefined

  const primaryKey = cls?.primary_ability_id ? ABILITY_ID_TO_KEY[cls.primary_ability_id] : undefined
  const saveAbilityIds = cls ? db.getClassSavingThrows(cls.class_id) : []
  const saveKeys = saveAbilityIds.map(id => ABILITY_ID_TO_KEY[id]).filter(Boolean) as (keyof AbilityScores)[]

  const bgBonus = (key: keyof AbilityScores): number => {
    if (bg?.asi_ability_1.toLowerCase() === key) return 2
    if (bg?.asi_ability_2.toLowerCase() === key) return 1
    return 0
  }

  function usedValues(): number[] {
    return Object.values(assigned).filter((v): v is number => v !== undefined)
  }

  function availableFor(key: keyof AbilityScores): number[] {
    const used    = usedValues()
    const current = assigned[key]
    return STANDARD_ARRAY.filter(v => v === current || !used.includes(v))
  }

  function assign(key: keyof AbilityScores, val: string) {
    const num = val === '' ? undefined : parseInt(val)
    update({ abilityAssignments: { ...assigned, [key]: num } })
  }

  return (
    <>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
        Assign the standard array to your ability scores: <strong>{STANDARD_ARRAY.join(', ')}</strong>
      </p>

      {bg && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem', padding: '0.4rem 0.6rem', background: 'var(--bg-secondary)', borderRadius: '0.375rem', borderLeft: '2px solid var(--accent)' }}>
          <strong>{bg.name}:</strong> +2 {(bg.asi_ability_1 as string).toUpperCase()} · +1 {(bg.asi_ability_2 as string).toUpperCase()}
        </div>
      )}

      {ABILITY_KEYS.map(key => {
        const base    = assigned[key]
        const bonus   = bgBonus(key)
        const total   = base !== undefined ? base + bonus : undefined
        const m       = total !== undefined ? mod(total) : null
        const isPrimary = key === primaryKey

        return (
          <div key={key} className={`creator-ability-row${isPrimary ? ' creator-ability-row--save' : ''}`}>
            <div className="creator-ability-label">{ABILITY_LABELS[key]}</div>
            <select
              className="creator-ability-select"
              value={base ?? ''}
              onChange={e => assign(key, e.target.value)}
            >
              <option value="">—</option>
              {availableFor(key).map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <div className="creator-ability-score">
              {total !== undefined ? total : '—'}
            </div>
            <div className="creator-ability-mod">
              {m !== null ? fmtMod(m) : ''}
            </div>
          </div>
        )
      })}

      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.75rem', lineHeight: 1.5 }}>
        {primaryKey && <><strong>Primary:</strong> {ABILITY_LABELS[primaryKey]}<br /></>}
        {saveKeys.length > 0 && <><strong>Saving Throws:</strong> {saveKeys.map(k => ABILITY_LABELS[k]).join(', ')}</>}
      </p>
    </>
  )
}

// ── Step: Proficiency ───────────────────────────────────────────────────────

function ProficiencyStep({ wizard, update }: { wizard: WizardState; update: (p: Partial<WizardState>) => void }) {
  const cls = wizard.selectedClassId !== null ? db.getClass(wizard.selectedClassId) : undefined
  const bg  = wizard.selectedBackgroundId !== null ? db.getBackground(wizard.selectedBackgroundId) : undefined
  if (!cls || !bg) return null

  const skillChoice = db.getChoice(cls.skill_choice_id)
  const pickCount = skillChoice?.pick_count ?? 0
  const allowedSkillIds: number[] = skillChoice?.choice_elements ?? []

  // Background auto-granted skill IDs
  const bgSkillIds = bg.skill_ids
  const bgSkillRows = db.skills.filter(s => bgSkillIds.includes(s.skill_id))

  function toggleSkill(skillId: number) {
    if (bgSkillIds.includes(skillId)) return
    const has = wizard.selectedSkillIds.includes(skillId)
    if (has) {
      update({ selectedSkillIds: wizard.selectedSkillIds.filter(id => id !== skillId) })
    } else if (wizard.selectedSkillIds.length < pickCount) {
      update({ selectedSkillIds: [...wizard.selectedSkillIds, skillId] })
    }
  }

  const remaining = pickCount - wizard.selectedSkillIds.length
  const allProficientIds = [...new Set([...wizard.selectedSkillIds, ...bgSkillIds])]
  const allProficientNames = allProficientIds
    .map(id => db.skills.find(s => s.skill_id === id)?.name)
    .filter(Boolean)

  return (
    <>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Your background auto-grants skills. Choose <strong>{pickCount}</strong> additional skill{pickCount !== 1 ? 's' : ''} from your class options below.
      </p>

      <div className="creator-section-title">Auto-granted Skills</div>
      <div className="creator-chip-row" style={{ marginBottom: '1rem' }}>
        {bgSkillRows.map(s => (
          <span key={s.skill_id} className="creator-chip creator-chip--granted">
            {s.name}
          </span>
        ))}
        {bgSkillRows.length === 0 && (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>None</span>
        )}
      </div>

      <div className="creator-section-title" style={{ marginTop: '0' }}>
        Class Skills — choose {pickCount} ({remaining > 0 ? `${remaining} more needed` : 'done'})
      </div>
      <div className="creator-chip-row" style={{ marginBottom: '1rem' }}>
        {allowedSkillIds.map(skillId => {
          const skill = db.skills.find(s => s.skill_id === skillId)
          if (!skill) return null
          const isGrantedByBg = bgSkillIds.includes(skillId)
          const isActive      = wizard.selectedSkillIds.includes(skillId)
          const isDisabled    = !isActive && !isGrantedByBg && wizard.selectedSkillIds.length >= pickCount

          if (isGrantedByBg) {
            return (
              <span key={skillId} className="creator-chip creator-chip--granted" title="Already granted">
                {skill.name} ✓
              </span>
            )
          }

          return (
            <button
              key={skillId}
              className={`creator-chip${isActive ? ' creator-chip--active' : ''}${isDisabled ? ' creator-chip--disabled' : ''}`}
              onClick={() => !isDisabled && toggleSkill(skillId)}
              type="button"
            >
              {skill.name}
            </button>
          )
        })}
      </div>

      <div className="creator-detail" style={{ marginTop: '0.5rem' }}>
        <div className="creator-detail-section-title">All Proficient Skills</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
          {allProficientNames.length === 0
            ? <span style={{ color: 'var(--text-muted)' }}>None yet</span>
            : allProficientNames.join(', ')}
        </div>
      </div>
    </>
  )
}

// ── Step: Spells ────────────────────────────────────────────────────────────

interface SpellPreview { id: number; isCantrip: boolean }

function SpellsStep({ wizard, update }: { wizard: WizardState; update: (p: Partial<WizardState>) => void }) {
  const cls = wizard.selectedClassId !== null ? db.getClass(wizard.selectedClassId) : undefined
  const [preview, setPreview]   = useState<SpellPreview | null>(null)
  const [removing, setRemoving] = useState<SpellPreview | null>(null)

  if (!cls || !isSpellcaster(cls)) return null

  const cantripsAtL1 = getCantripsKnownAtL1(cls.class_id)
  const spellsAtL1   = getSpellsKnownAtL1(cls.class_id)
  const isWizard     = cls.name === 'Wizard'

  const allClassSpells = db.getClassSpells(cls.class_id)
  const cantripList = allClassSpells.filter(s => s.level === 0)
  const spellList   = allClassSpells.filter(s => s.level === 1)

  const showCantrips = cantripsAtL1 > 0
  const showSpells   = isWizard || (isKnownSpellClass(cls) && spellsAtL1 > 0)

  function clickEntry(id: number, isCantrip: boolean) {
    const selected = isCantrip ? wizard.selectedCantripIds : wizard.selectedSpellIds
    if (selected.includes(id)) {
      setRemoving({ id, isCantrip })
      setPreview(null)
    } else {
      setPreview({ id, isCantrip })
      setRemoving(null)
    }
  }

  function confirmAdd(id: number, isCantrip: boolean) {
    if (isCantrip) {
      if (wizard.selectedCantripIds.length < cantripsAtL1) {
        update({ selectedCantripIds: [...wizard.selectedCantripIds, id] })
      }
    } else {
      if (wizard.selectedSpellIds.length < spellsAtL1) {
        update({ selectedSpellIds: [...wizard.selectedSpellIds, id] })
      }
    }
    setPreview(null)
  }

  function confirmRemove(id: number, isCantrip: boolean) {
    if (isCantrip) {
      update({ selectedCantripIds: wizard.selectedCantripIds.filter(x => x !== id) })
    } else {
      update({ selectedSpellIds: wizard.selectedSpellIds.filter(x => x !== id) })
    }
    setRemoving(null)
  }

  const previewSpell  = preview  ? db.getSpell(preview.id)  : null
  const removingSpell = removing ? db.getSpell(removing.id) : null

  function SpellDetailPanel({ sr, isCantrip, mode }: { sr: SpellRow; isCantrip: boolean; mode: 'add' | 'remove' }) {
    if (mode === 'remove') {
      return (
        <div className="creator-spell-preview creator-spell-preview--remove">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Remove <strong>{sr.name}</strong> from your {isCantrip ? 'cantrips' : (isWizard ? 'spellbook' : 'spells known')}?
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-danger" onClick={() => confirmRemove(sr.spell_id, isCantrip)} type="button" style={{ flex: 1 }}>
              Remove
            </button>
            <button className="btn btn-secondary" onClick={() => setRemoving(null)} type="button">
              Keep
            </button>
          </div>
        </div>
      )
    }
    return (
      <div className="creator-spell-preview">
        <div className="creator-spell-preview-header">
          <span className="creator-spell-preview-name">{sr.name}</span>
          <span className="creator-spell-preview-school">{sr.school}</span>
        </div>
        <div className="creator-spell-preview-meta">
          {sr.casting_time} · {sr.range} · {sr.duration}
          {sr.components && ` · ${sr.components}`}
        </div>
        <div className="creator-spell-preview-desc">{sr.description}</div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button className="btn btn-primary" onClick={() => confirmAdd(sr.spell_id, isCantrip)} type="button" style={{ flex: 1 }}>
            {isCantrip ? 'Add Cantrip' : (isWizard ? 'Add to Spellbook' : 'Learn Spell')}
          </button>
          <button className="btn btn-secondary" onClick={() => setPreview(null)} type="button">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {showCantrips && (
        <>
          <div className="creator-section-title" style={{ marginTop: 0 }}>
            Cantrips — choose {cantripsAtL1} ({wizard.selectedCantripIds.length}/{cantripsAtL1} selected)
          </div>

          {wizard.selectedCantripIds.length > 0 && (
            <div className="creator-chip-row" style={{ marginBottom: '0.75rem' }}>
              {wizard.selectedCantripIds.map(id => {
                const s = db.getSpell(id)
                return s ? (
                  <button
                    key={id}
                    className="creator-chip creator-chip--active"
                    onClick={() => clickEntry(id, true)}
                    type="button"
                  >
                    {s.name} ×
                  </button>
                ) : null
              })}
            </div>
          )}

          <div className="creator-spell-list">
            {cantripList.map(spell => {
              const isSelected = wizard.selectedCantripIds.includes(spell.spell_id)
              const isOpen     = preview?.id === spell.spell_id && preview.isCantrip
              const isRem      = removing?.id === spell.spell_id && removing.isCantrip
              const maxReached = !isSelected && wizard.selectedCantripIds.length >= cantripsAtL1

              return (
                <div key={spell.spell_id}>
                  <button
                    className={`creator-spell-item${isSelected ? ' creator-spell-item--selected' : ''}${maxReached ? ' creator-spell-item--dim' : ''}`}
                    onClick={() => !maxReached && clickEntry(spell.spell_id, true)}
                    type="button"
                    disabled={maxReached && !isSelected}
                  >
                    <span>{spell.name}</span>
                    <span className="creator-spell-item-meta">Cantrip</span>
                  </button>

                  {isOpen && previewSpell && (
                    <SpellDetailPanel sr={previewSpell} isCantrip={true} mode="add" />
                  )}
                  {isRem && removingSpell && (
                    <SpellDetailPanel sr={removingSpell} isCantrip={true} mode="remove" />
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {showSpells && (
        <>
          <div className="creator-section-title">
            {isWizard
              ? `Spellbook — choose ${spellsAtL1} (${wizard.selectedSpellIds.length}/${spellsAtL1} chosen)`
              : `Level 1 Spells — choose ${spellsAtL1} (${wizard.selectedSpellIds.length}/${spellsAtL1} selected)`}
          </div>

          {wizard.selectedSpellIds.length > 0 && (
            <div className="creator-chip-row" style={{ marginBottom: '0.75rem' }}>
              {wizard.selectedSpellIds.map(id => {
                const s = db.getSpell(id)
                return s ? (
                  <button
                    key={id}
                    className="creator-chip creator-chip--active"
                    onClick={() => clickEntry(id, false)}
                    type="button"
                  >
                    {s.name} ×
                  </button>
                ) : null
              })}
            </div>
          )}

          <div className="creator-spell-list">
            {spellList.map(spell => {
              const isSelected = wizard.selectedSpellIds.includes(spell.spell_id)
              const isOpen     = preview?.id === spell.spell_id && !preview.isCantrip
              const isRem      = removing?.id === spell.spell_id && !removing.isCantrip
              const maxReached = !isSelected && wizard.selectedSpellIds.length >= spellsAtL1

              return (
                <div key={spell.spell_id}>
                  <button
                    className={`creator-spell-item${isSelected ? ' creator-spell-item--selected' : ''}${maxReached ? ' creator-spell-item--dim' : ''}`}
                    onClick={() => !maxReached && clickEntry(spell.spell_id, false)}
                    type="button"
                    disabled={maxReached && !isSelected}
                  >
                    <span>{spell.name}</span>
                    <span className="creator-spell-item-meta">Level 1</span>
                  </button>

                  {isOpen && previewSpell && (
                    <SpellDetailPanel sr={previewSpell} isCantrip={false} mode="add" />
                  )}
                  {isRem && removingSpell && (
                    <SpellDetailPanel sr={removingSpell} isCantrip={false} mode="remove" />
                  )}
                </div>
              )
            })}
          </div>

          {isPreparedCaster(cls) && cls.name !== 'Wizard' && (
            <p className="creator-note">As a prepared caster, you choose spells each day from your full class list — no selection needed now.</p>
          )}
        </>
      )}
    </>
  )
}

// ── Step: Equipment ──────────────────────────────────────────────────────────

function EquipmentStep({ wizard, update }: { wizard: WizardState; update: (p: Partial<WizardState>) => void }) {
  const cls = wizard.selectedClassId !== null ? db.getClass(wizard.selectedClassId) : undefined
  const bg  = wizard.selectedBackgroundId !== null ? db.getBackground(wizard.selectedBackgroundId) : undefined
  if (!cls || !bg) return null

  const equipOptions = db.getStartingEquipment(cls.class_id)
  const bgEquipOpt = bg.starting_equipment_option_id !== null
    ? db.startingEquipment.find(e => e.option_id === bg.starting_equipment_option_id)
    : undefined

  return (
    <>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        {equipOptions.length > 0
          ? 'Choose your starting equipment package from your class options below.'
          : 'Here is everything you start with from your background.'}
      </p>

      {equipOptions.length > 0 && (
        <div className="creator-detail">
          <div className="creator-detail-section-title">Class Equipment Options</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            {equipOptions.map(opt => {
              const selected = wizard.selectedEquipmentOptionId === opt.option_id
              return (
                <button
                  key={opt.option_id}
                  className={`creator-card${selected ? ' creator-card--selected' : ''}`}
                  style={{ textAlign: 'left', padding: '0.6rem 0.9rem' }}
                  onClick={() => update({ selectedEquipmentOptionId: opt.option_id })}
                  type="button"
                >
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    {opt.option_label || buildEquipmentLabel(opt)}
                  </div>
                  {opt.option_label && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {buildEquipmentLabel(opt)}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {bgEquipOpt && (
        <div className="creator-detail">
          <div className="creator-detail-section-title">From {bg.name} background</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            {buildEquipmentLabel(bgEquipOpt)}
          </div>
        </div>
      )}
    </>
  )
}

// ── Step: Name ──────────────────────────────────────────────────────────────

function NameStep({ wizard, update }: { wizard: WizardState; update: (p: Partial<WizardState>) => void }) {
  const passkeyValid = wizard.passkey.length === 0 || /^[a-zA-Z]{1,5}$/.test(wizard.passkey)
  const passkeyComplete = /^[a-zA-Z]{5}$/.test(wizard.passkey)
  return (
    <div className="creator-name-form">
      <div>
        <div className="creator-name-label">Character Name *</div>
        <input
          className="creator-name-input"
          type="text"
          value={wizard.characterName}
          onChange={e => update({ characterName: e.target.value })}
          placeholder="e.g. Thorin Ironside"
          autoFocus
        />
      </div>
      <div>
        <div className="creator-name-label">Player Name</div>
        <input
          className="creator-name-input"
          type="text"
          value={wizard.playerName}
          onChange={e => update({ playerName: e.target.value })}
          placeholder="e.g. Alice (optional)"
        />
      </div>
      <div>
        <div className="creator-name-label">Passkey *</div>
        <input
          className="creator-name-input"
          type="text"
          value={wizard.passkey}
          onChange={e => {
            const v = e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 5)
            update({ passkey: v })
          }}
          placeholder="5-letter word (e.g. flame)"
          maxLength={5}
          style={{ textTransform: 'lowercase' }}
        />
        {!passkeyValid && <p className="creator-note" style={{ color: 'var(--danger)' }}>Letters only, 5 characters.</p>}
        {wizard.passkey.length > 0 && passkeyValid && !passkeyComplete && (
          <p className="creator-note" style={{ color: 'var(--text-muted)' }}>{5 - wizard.passkey.length} more letter{5 - wizard.passkey.length !== 1 ? 's' : ''} needed</p>
        )}
        <p className="creator-note" style={{ marginTop: 6 }}>
          This passkey will be visible to your DM and must be remembered to sign in.
        </p>
      </div>
    </div>
  )
}

// ── Step: Review ────────────────────────────────────────────────────────────

function ReviewStep({ wizard }: { wizard: WizardState }) {
  const cls     = wizard.selectedClassId !== null ? db.getClass(wizard.selectedClassId) : undefined
  const raceRow = wizard.selectedRaceId !== null ? db.getRace(wizard.selectedRaceId) : undefined
  const bg      = wizard.selectedBackgroundId !== null ? db.getBackground(wizard.selectedBackgroundId) : undefined

  if (!cls || !raceRow || !bg) return <p style={{ color: 'var(--text-muted)' }}>Incomplete selections.</p>

  const base = wizard.abilityAssignments as Record<keyof AbilityScores, number>
  const finalScores: AbilityScores = { str: base.str, dex: base.dex, con: base.con, int: base.int, wis: base.wis, cha: base.cha }
  const asi1 = bg.asi_ability_1 as keyof AbilityScores
  const asi2 = bg.asi_ability_2 as keyof AbilityScores
  if (asi1 && asi1 in finalScores) finalScores[asi1] += 2
  if (asi2 && asi2 in finalScores) finalScores[asi2] += 1

  const profBonus  = 2
  const hp         = Math.max(1, cls.hit_die_size + mod(finalScores.con))
  const initiative = mod(finalScores.dex)

  const equipOpt = wizard.selectedEquipmentOptionId !== null
    ? db.startingEquipment.find(e => e.option_id === wizard.selectedEquipmentOptionId)
    : undefined

  const ac = calcAcFromOption(cls, equipOpt, finalScores)

  const allProficientIds = [...new Set([...wizard.selectedSkillIds, ...bg.skill_ids])]
  const allProficientNames = allProficientIds
    .map(id => db.skills.find(s => s.skill_id === id)?.name)
    .filter(Boolean)

  const spellAbilityKey = getSpellAbilityKey(cls)
  const slotsAtL1 = isSpellcaster(cls) ? getSlotsAtL1(cls.class_id) : 0

  const selectedCantrips = wizard.selectedCantripIds.map(id => db.getSpell(id)?.name).filter(Boolean)
  const selectedSpells   = wizard.selectedSpellIds.map(id => db.getSpell(id)?.name).filter(Boolean)

  const originFeat = bg.origin_feat_id !== null ? db.getGeneralFeat(bg.origin_feat_id) : undefined

  return (
    <>
      <div className="creator-review-block">
        <div className="creator-review-block-title">Identity</div>
        <ReviewRow label="Character"  value={wizard.characterName} />
        {wizard.playerName && <ReviewRow label="Player" value={wizard.playerName} />}
        <ReviewRow label="Passkey" value={wizard.passkey.toLowerCase()} />
        <ReviewRow label="Class"      value={cls.name} />
        <ReviewRow label="Species"    value={raceRow.name} />
        <ReviewRow label="Background" value={bg.name} />
        <ReviewRow label="Level"      value="1" />
      </div>

      <div className="creator-review-block">
        <div className="creator-review-block-title">Ability Scores</div>
        {ABILITY_KEYS.map(key => (
          <ReviewRow
            key={key}
            label={ABILITY_LABELS[key]}
            value={`${finalScores[key]} (${fmtMod(mod(finalScores[key]))})`}
          />
        ))}
        <p className="creator-note">
          Includes +2 {bg.asi_ability_1.toUpperCase()} and +1 {bg.asi_ability_2.toUpperCase()} from {bg.name}.
        </p>
      </div>

      <div className="creator-review-block">
        <div className="creator-review-block-title">Combat Stats</div>
        <ReviewRow label="HP"                value={`${hp}`} />
        <ReviewRow label="AC"                value={`${ac}`} />
        <ReviewRow label="Speed"             value={`${raceRow.speed} ft`} />
        <ReviewRow label="Initiative"        value={fmtMod(initiative)} />
        <ReviewRow label="Proficiency Bonus" value={`+${profBonus}`} />
        <ReviewRow label="Hit Dice"          value={`1d${cls.hit_die_size}`} />
      </div>

      <div className="creator-review-block">
        <div className="creator-review-block-title">Proficient Skills</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
          {allProficientNames.join(', ')}
        </div>
      </div>

      {isSpellcaster(cls) && spellAbilityKey && (
        <div className="creator-review-block">
          <div className="creator-review-block-title">Spellcasting</div>
          <ReviewRow label="Ability"       value={spellAbilityKey.toUpperCase()} />
          <ReviewRow label="Spell Attack"  value={fmtMod(profBonus + mod(finalScores[spellAbilityKey]))} />
          <ReviewRow label="Spell Save DC" value={`${8 + profBonus + mod(finalScores[spellAbilityKey])}`} />
          <ReviewRow label="Slots (L1)"    value={`${slotsAtL1}`} />
          {selectedCantrips.length > 0 && (
            <ReviewRow label="Cantrips" value={selectedCantrips.join(', ')} />
          )}
          {selectedSpells.length > 0 && (
            <ReviewRow
              label={cls.name === 'Wizard' ? 'Spellbook' : 'Spells Known'}
              value={selectedSpells.join(', ')}
            />
          )}
          {isPreparedCaster(cls) && cls.name !== 'Wizard' && (
            <p className="creator-note">Prepares spells each day from full class list.</p>
          )}
        </div>
      )}

      {originFeat && (
        <div className="creator-review-block">
          <div className="creator-review-block-title">Origin Feat</div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)', marginBottom: '0.25rem' }}>{originFeat.name}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{originFeat.description}</div>
        </div>
      )}

      {equipOpt && (
        <div className="creator-review-block">
          <div className="creator-review-block-title">Starting Equipment</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent)', lineHeight: '1.5', marginBottom: '0.25rem' }}>
            <strong>Class:</strong> {buildEquipmentLabel(equipOpt)}
          </div>
        </div>
      )}
    </>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="creator-review-row">
      <span className="creator-review-label">{label}</span>
      <span className="creator-review-value">{value}</span>
    </div>
  )
}
