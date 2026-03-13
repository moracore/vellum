import { useState } from 'react'
import type { AbilityScores, CharacterSheet, CharacterState, Skills } from '../types'
import { useCharacter } from '../context/CharacterContext'
import { CLASSES } from '../data/classes5e'
import { RACES } from '../data/races5e'
import { BACKGROUNDS } from '../data/backgrounds5e'
import { CLASS_SPELL_LIST } from '../data/classSpellList'
import { findSpell } from '../data/spells'

// ── Types ───────────────────────────────────────────────────────────────────

type WizardStep = 'class' | 'subclass' | 'race' | 'subrace' | 'background' | 'abilities' | 'proficiency' | 'spells' | 'items' | 'name' | 'review'

interface WizardState {
  step: WizardStep
  selectedClass: string | null
  selectedSubclass: string | null
  selectedRace: string | null
  selectedSubrace: string | null
  abilityAssignments: Partial<Record<keyof AbilityScores, number>>
  selectedSkills: string[]
  selectedCantrips: string[]
  selectedSpells: string[]
  selectedBackground: string | null
  characterName: string
  playerName: string
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
const ABILITY_NAME_TO_KEY: Record<string, keyof AbilityScores> = {
  Strength: 'str', Dexterity: 'dex', Constitution: 'con',
  Intelligence: 'int', Wisdom: 'wis', Charisma: 'cha',
}

const SKILL_DISPLAY: Record<string, string> = {
  acrobatics: 'Acrobatics', animalHandling: 'Animal Handling', arcana: 'Arcana',
  athletics: 'Athletics', deception: 'Deception', history: 'History',
  insight: 'Insight', intimidation: 'Intimidation', investigation: 'Investigation',
  medicine: 'Medicine', nature: 'Nature', perception: 'Perception',
  performance: 'Performance', persuasion: 'Persuasion', religion: 'Religion',
  sleightOfHand: 'Sleight of Hand', stealth: 'Stealth', survival: 'Survival',
}

const STEP_TITLES: Record<WizardStep, string> = {
  class:       'Choose Your Class',
  subclass:    'Choose Your Subclass',
  race:        'Choose Your Species',
  subrace:     'Choose Your Lineage',
  background:  'Choose Your Background',
  abilities:   'Assign Ability Scores',
  proficiency: 'Skill Proficiencies',
  spells:      'Choose Your Spells',
  items:       'Starting Equipment',
  name:        'Name Your Character',
  review:      'Review & Confirm',
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function mod(score: number) { return Math.floor((score - 10) / 2) }
function fmtMod(m: number) { return m >= 0 ? `+${m}` : `${m}` }

function calcAc(acType: string, scores: AbilityScores): number {
  const dex = mod(scores.dex), con = mod(scores.con), wis = mod(scores.wis)
  switch (acType) {
    case 'none':          return 10 + dex
    case 'light':         return 11 + dex
    case 'medium':        return 13 + Math.min(dex, 2)
    case 'heavy':         return 16
    case 'unarmored_con': return 10 + dex + con
    case 'unarmored_wis': return 10 + dex + wis
    default:              return 10 + dex
  }
}

function emptySkills(): Skills {
  const keys = ['acrobatics','animalHandling','arcana','athletics','deception','history',
    'insight','intimidation','investigation','medicine','nature','perception',
    'performance','persuasion','religion','sleightOfHand','stealth','survival'] as const
  return Object.fromEntries(keys.map(k => [k, { proficient: false, expertise: false }])) as Skills
}

function getPrimaryAbilityKeys(primaryAbility: string): (keyof AbilityScores)[] {
  return primaryAbility
    .split(/\s+(?:and|or)\s+/i)
    .map(a => ABILITY_NAME_TO_KEY[a.trim()])
    .filter(Boolean) as (keyof AbilityScores)[]
}

function getStepOrder(wizard: WizardState): WizardStep[] {
  const steps: WizardStep[] = ['class']
  const cls = CLASSES.find(c => c.name === wizard.selectedClass)
  if (cls?.subclasses && cls.subclasses.length > 0) steps.push('subclass')
  const race = RACES.find(r => r.name === wizard.selectedRace)
  steps.push('race')
  if (race?.subraces && race.subraces.length > 0) steps.push('subrace')
  steps.push('background', 'abilities', 'proficiency')
  const hasSpellStep = cls?.spellcasting && (
    cls.spellcasting.cantripsAtL1 > 0 ||
    cls.name === 'Wizard' ||
    (!cls.spellcasting.preparedCaster && cls.spellcasting.spellsAtL1 > 0)
  )
  if (hasSpellStep) steps.push('spells')
  steps.push('items', 'name', 'review')
  return steps
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function CharacterCreator({ onComplete, onBack }: Props) {
  const { createCharacterFull } = useCharacter()

  const [wizard, setWizard] = useState<WizardState>({
    step: 'class',
    selectedClass: null,
    selectedSubclass: null,
    selectedRace: null,
    selectedSubrace: null,
    abilityAssignments: {},
    selectedSkills: [],
    selectedCantrips: [],
    selectedSpells: [],
    selectedBackground: null,
    characterName: '',
    playerName: '',
  })

  const [saving, setSaving] = useState(false)

  const stepOrder  = getStepOrder(wizard)
  const stepIndex  = stepOrder.indexOf(wizard.step)

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
    const cls = CLASSES.find(c => c.name === wizard.selectedClass)
    switch (wizard.step) {
      case 'class':    return wizard.selectedClass !== null
      case 'subclass': return wizard.selectedSubclass !== null
      case 'race':     return wizard.selectedRace !== null
      case 'subrace':  return wizard.selectedSubrace !== null
      case 'background':  return wizard.selectedBackground !== null
      case 'abilities':   return ABILITY_KEYS.every(k => wizard.abilityAssignments[k] !== undefined)
      case 'proficiency': {
        if (!cls) return false
        return wizard.selectedSkills.length === cls.skillCount
      }
      case 'spells': {
        if (!cls?.spellcasting) return true
        const sc = cls.spellcasting
        if (sc.cantripsAtL1 > 0 && wizard.selectedCantrips.length !== sc.cantripsAtL1) return false
        const needSpells = cls.name === 'Wizard' || (!sc.preparedCaster && sc.spellsAtL1 > 0)
        if (needSpells && wizard.selectedSpells.length !== sc.spellsAtL1) return false
        return true
      }
      case 'items':  return true
      case 'name':   return wizard.characterName.trim().length > 0
      case 'review': return !saving
      default:       return true
    }
  }

  async function handleConfirm() {
    const cls      = CLASSES.find(c => c.name === wizard.selectedClass)!
    const raceData = RACES.find(r => r.name === wizard.selectedRace)!
    const bg       = BACKGROUNDS.find(b => b.name === wizard.selectedBackground)!

    const base = wizard.abilityAssignments as Record<keyof AbilityScores, number>
    const finalScores: AbilityScores = { str: base.str, dex: base.dex, con: base.con, int: base.int, wis: base.wis, cha: base.cha }
    finalScores[bg.abilityBonus.primary]   += 2
    finalScores[bg.abilityBonus.secondary] += 1

    const subraceData = raceData.subraces?.find(s => s.name === wizard.selectedSubrace) ?? null

    const profBonus  = 2
    const hp         = cls.hitDie + mod(finalScores.con)
    const initiative = mod(finalScores.dex)
    const speed      = subraceData?.speedOverride ?? raceData.speed
    const ac         = calcAc(cls.acType, finalScores)

    const saves = { str: false, dex: false, con: false, int: false, wis: false, cha: false }
    for (const key of cls.savingThrows) (saves as Record<string, boolean>)[key] = true

    // Collect all race + subrace traits for skill/spell processing
    const allRaceTraits = [...raceData.traits, ...(subraceData?.traits ?? [])]

    const skills = emptySkills()
    const allProfSkills = [...new Set([...wizard.selectedSkills, ...(bg.skills as string[])])]
    for (const sk of allProfSkills) {
      if (sk in skills) (skills as Record<string, { proficient: boolean; expertise: boolean }>)[sk].proficient = true
    }
    for (const t of allRaceTraits) {
      if (t.grantsSkill && (!t.minLevel || t.minLevel <= 1) && t.grantsSkill in skills) {
        (skills as Record<string, { proficient: boolean; expertise: boolean }>)[t.grantsSkill].proficient = true
      }
    }

    const raceName = wizard.selectedRace!

    // Race traits — all L1 traits (grantsSpell/grantsSkill just means auto-apply; still show the trait)
    // Suppress the subrace-choice placeholder once a subrace is chosen
    const raceTraitsArr = raceData.traits
      .filter(t => (!t.minLevel || t.minLevel <= 1) && !(t.isSubraceChoice && subraceData))
      .map(t => `${t.name}: ${t.description}`)

    // Subrace traits
    const subraceTraitsArr = (subraceData?.traits ?? [])
      .filter(t => (!t.minLevel || t.minLevel <= 1))
      .map(t => `${t.name}: ${t.description}`)

    const raceTraits = [...raceTraitsArr, ...subraceTraitsArr]
    const extraTraits: string[] = [
      `Weapon Proficiencies: ${cls.weaponProf}`,
      ...(cls.armorProf && cls.armorProf !== 'None' ? [`Armour Proficiencies: ${cls.armorProf}`] : []),
      ...(cls.toolProf ? [`Tool Proficiencies: ${cls.toolProf}`] : []),
    ]

    const items   = `${cls.startingEquipment}\n${bg.startingEquipment}`
    const choices: Record<string, string> = { 'Origin Feat': bg.feat }
    if (wizard.selectedSubclass) choices['subclass'] = wizard.selectedSubclass

    let spellcastingAbility: CharacterSheet['spellcastingAbility'] = undefined
    let spellAttackBonus: number | undefined = undefined
    let spellSaveDc: number | undefined = undefined
    const spellSlots: CharacterSheet['spellSlots'] = []
    const spells: CharacterSheet['spells'] = []

    if (cls.spellcasting) {
      const ability   = cls.spellcasting.ability
      const abilityMod = mod(finalScores[ability])
      spellcastingAbility = ability
      spellAttackBonus    = profBonus + abilityMod
      spellSaveDc         = 8 + profBonus + abilityMod
      spellSlots.push({ max: cls.spellcasting.slotsAtL1, current: cls.spellcasting.slotsAtL1 })
      for (const name of [...wizard.selectedCantrips, ...wizard.selectedSpells]) {
        const spell = findSpell(name)
        if (spell) spells.push({ ...spell, prepared: true })
      }
    }

    // Racial + subrace spell grants (always added, even for non-casters)
    for (const t of allRaceTraits) {
      if (t.grantsSpell && (!t.minLevel || t.minLevel <= 1)) {
        const spell = findSpell(t.grantsSpell.name)
        if (spell && !spells.find(s => s.name === spell.name)) {
          spells.push({ ...spell, prepared: true })
        }
      }
    }

    const sheet: CharacterSheet = {
      playerName: wizard.playerName.trim(), characterName: wizard.characterName.trim(),
      class: wizard.selectedClass!, level: 1, race: raceName, alignment: '',
      abilityScores: finalScores, savingThrows: saves, skills,
      maxHp: hp, currentHp: hp, tempHp: 0, ac, initiative, speed,
      proficiencyBonus: profBonus, hitDice: `1d${cls.hitDie}`,
      deathSaveSuccesses: 0, deathSaveFailures: 0, conditions: [],
      languages: [...raceData.languages],
      otherProficiencies: [cls.armorProf, cls.weaponProf, cls.toolProf].filter(Boolean).join('; '),
      raceTraits, extraTraits, aliases: [],
      spellcastingAbility, spellAttackBonus, spellSaveDc, spellSlots, spells,
      currency: { gp: 0, sp: 0, cp: 0 }, items, notes: '', choices,
    }

    const id = Date.now().toString()
    const state: CharacterState = {
      id, currentHp: hp, tempHp: 0, deathSaveSuccesses: 0, deathSaveFailures: 0,
      conditions: [], spellSlots: [...spellSlots],
      currency: { gp: 0, sp: 0, cp: 0 }, items, notes: '', description: '',
    }

    setSaving(true)
    try {
      await createCharacterFull(sheet, state)
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
        {wizard.step === 'class'       && <ClassStep        wizard={wizard} update={update} />}
        {wizard.step === 'subclass'    && <SubclassStep     wizard={wizard} update={update} />}
        {wizard.step === 'race'        && <RaceStep         wizard={wizard} update={update} />}
        {wizard.step === 'subrace'     && <SubraceStep      wizard={wizard} update={update} />}
        {wizard.step === 'background'  && <BackgroundStep   wizard={wizard} update={update} />}
        {wizard.step === 'abilities'   && <AbilitiesStep    wizard={wizard} update={update} />}
        {wizard.step === 'proficiency' && <ProficiencyStep  wizard={wizard} update={update} />}
        {wizard.step === 'spells'      && <SpellsStep       wizard={wizard} update={update} />}
        {wizard.step === 'items'       && <ItemsStep        wizard={wizard} />}
        {wizard.step === 'name'        && <NameStep         wizard={wizard} update={update} />}
        {wizard.step === 'review'      && <ReviewStep       wizard={wizard} />}
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
  const [expanded, setExpanded] = useState<string | null>(wizard.selectedClass)

  function selectClass(name: string) {
    update({ selectedClass: name, selectedSkills: [], selectedCantrips: [], selectedSpells: [] })
    setExpanded(name)
  }

  const cls = CLASSES.find(c => c.name === expanded)

  return (
    <>
      <div className="creator-grid">
        {CLASSES.map(c => (
          <div
            key={c.name}
            className={`creator-card${wizard.selectedClass === c.name ? ' creator-card--selected' : ''}`}
            onClick={() => selectClass(c.name)}
          >
            <div className="creator-card-name">{c.name}</div>
            <div className="creator-card-flavor">{c.flavor}</div>
            <span className="creator-card-badge">d{c.hitDie}</span>
            {' '}
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{c.primaryAbility}</span>
          </div>
        ))}
      </div>

      {cls && (
        <div className="creator-detail">
          <h3>{cls.name}</h3>
          <p>{cls.description}</p>

          <div className="creator-detail-section">
            <div className="creator-detail-section-title">Proficiencies</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
              <strong>Armour:</strong> {cls.armorProf}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
              <strong>Weapons:</strong> {cls.weaponProf}
            </div>
            {cls.toolProf && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <strong>Tools:</strong> {cls.toolProf}
              </div>
            )}
          </div>

          {cls.spellcasting && (
            <div className="creator-detail-section">
              <div className="creator-detail-section-title">Spellcasting</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Ability: {cls.spellcasting.ability.toUpperCase()}
                {cls.spellcasting.cantripsAtL1 > 0 && ` · ${cls.spellcasting.cantripsAtL1} cantrips`}
                {cls.name === 'Wizard'
                  ? ' · 6 spellbook spells'
                  : cls.spellcasting.spellsAtL1 > 0 && !cls.spellcasting.preparedCaster
                    ? ` · ${cls.spellcasting.spellsAtL1} spells known`
                    : cls.spellcasting.preparedCaster && cls.name !== 'Wizard'
                      ? ' · Prepared caster'
                      : ''}
                {` · ${cls.spellcasting.slotsAtL1} level-1 slot${cls.spellcasting.slotsAtL1 !== 1 ? 's' : ''}`}
                {cls.spellcasting.slotType === 'pact' ? ' (Pact Magic)' : ''}
              </div>
            </div>
          )}

          <div className="creator-detail-section">
            <div className="creator-detail-section-title">Level 1 Features</div>
            {cls.features.map(f => (
              <div key={f.name} className="creator-detail-feature">
                <div className="creator-detail-feature-name">{f.name}</div>
                <div className="creator-detail-feature-desc">{f.description}</div>
              </div>
            ))}
          </div>

        </div>
      )}
    </>
  )
}

// ── Step: Subclass ───────────────────────────────────────────────────────────

function SubclassStep({ wizard, update }: { wizard: WizardState; update: (p: Partial<WizardState>) => void }) {
  const cls = CLASSES.find(c => c.name === wizard.selectedClass)

  if (!cls) return null

  function select(name: string) {
    update({ selectedSubclass: name })
  }

  return (
    <>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Choose your {cls.name} subclass. This shapes your specialisation throughout your career.
      </p>
      <div className="creator-grid">
        {cls.subclasses.map(s => (
          <div
            key={s.name}
            className={`creator-card${wizard.selectedSubclass === s.name ? ' creator-card--selected' : ''}`}
            onClick={() => select(s.name)}
          >
            <div className="creator-card-name">{s.name}</div>
            <div className="creator-card-flavor">{s.description}</div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Step: Race ──────────────────────────────────────────────────────────────

function RaceStep({ wizard, update }: { wizard: WizardState; update: (p: Partial<WizardState>) => void }) {
  const [expanded, setExpanded] = useState<string | null>(wizard.selectedRace)

  function selectRace(name: string) {
    update({ selectedRace: name, selectedSubrace: null })
    setExpanded(name)
  }

  const raceData = RACES.find(r => r.name === expanded)

  return (
    <>
      <div className="creator-grid">
        {RACES.map(r => (
          <div
            key={r.name}
            className={`creator-card${wizard.selectedRace === r.name ? ' creator-card--selected' : ''}`}
            onClick={() => selectRace(r.name)}
          >
            <div className="creator-card-name">{r.name}</div>
            <div className="creator-card-flavor">{r.flavor}</div>
            <span className="creator-card-badge">{r.speed} ft</span>
            {r.darkvision && <span className="creator-card-badge" style={{ marginLeft: '0.25rem' }}>DV {r.darkvision} ft</span>}
          </div>
        ))}
      </div>

      {raceData && (
        <div className="creator-detail">
          <h3>{raceData.name}</h3>
          <p>{raceData.description}</p>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            <strong>Size:</strong> {raceData.size} · <strong>Speed:</strong> {raceData.speed} ft
            {raceData.darkvision && ` · Darkvision ${raceData.darkvision} ft`}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            <strong>Languages:</strong> {raceData.languages.join(', ')}
          </div>
          <div className="creator-detail-section">
            <div className="creator-detail-section-title">Traits</div>
            {raceData.traits.map(t => (
              <div key={t.name} className="creator-detail-feature">
                <div className="creator-detail-feature-name">{t.name}</div>
                <div className="creator-detail-feature-desc">{t.description}</div>
              </div>
            ))}
          </div>
          {raceData.subraces && raceData.subraces.length > 0 && (
            <p className="creator-note" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              You'll choose your {raceData.name} lineage in the next step.
            </p>
          )}
        </div>
      )}
    </>
  )
}

// ── Step: Subrace ────────────────────────────────────────────────────────────

function SubraceStep({ wizard, update }: { wizard: WizardState; update: (p: Partial<WizardState>) => void }) {
  const race = RACES.find(r => r.name === wizard.selectedRace)
  const [expanded, setExpanded] = useState<string | null>(wizard.selectedSubrace)
  if (!race?.subraces) return null

  function select(name: string) {
    update({ selectedSubrace: name })
    setExpanded(name)
  }

  const preview = race.subraces.find(s => s.name === expanded)

  return (
    <>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Choose your {race.name} lineage. Each grants different traits, resistances, and abilities.
      </p>
      <div className="creator-grid">
        {race.subraces.map(s => (
          <div
            key={s.name}
            className={`creator-card${wizard.selectedSubrace === s.name ? ' creator-card--selected' : ''}`}
            onClick={() => select(s.name)}
          >
            <div className="creator-card-name">{s.name}</div>
            <div className="creator-card-flavor">{s.description}</div>
          </div>
        ))}
      </div>
      {preview && (
        <div className="creator-detail">
          <div className="creator-detail-section-title">Traits</div>
          {preview.traits.map(t => (
            <div key={t.name} className="creator-detail-feature">
              <div className="creator-detail-feature-name">{t.name}</div>
              <div className="creator-detail-feature-desc">{t.description}</div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── Step: Background ────────────────────────────────────────────────────────

function BackgroundStep({ wizard, update }: { wizard: WizardState; update: (p: Partial<WizardState>) => void }) {
  const [expanded, setExpanded] = useState<string | null>(wizard.selectedBackground)

  function selectBg(name: string) {
    update({ selectedBackground: name })
    setExpanded(name)
  }

  const bg = BACKGROUNDS.find(b => b.name === expanded)

  return (
    <>
      <div className="creator-grid">
        {BACKGROUNDS.map(b => (
          <div
            key={b.name}
            className={`creator-card${wizard.selectedBackground === b.name ? ' creator-card--selected' : ''}`}
            onClick={() => selectBg(b.name)}
          >
            <div className="creator-card-name">{b.name}</div>
            <div className="creator-card-flavor">{b.flavor}</div>
            <span className="creator-card-badge">{b.feat}</span>
          </div>
        ))}
      </div>

      {bg && (
        <div className="creator-detail">
          <h3>{bg.name}</h3>
          <p>{bg.description}</p>

          <div className="creator-detail-section">
            <div className="creator-detail-section-title">Ability Score Bonus</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              +2 {bg.abilityBonus.primary.toUpperCase()}, +1 {bg.abilityBonus.secondary.toUpperCase()}
            </div>
          </div>

          <div className="creator-detail-section">
            <div className="creator-detail-section-title">Skills (auto-granted)</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {bg.skills.map(s => SKILL_DISPLAY[s] ?? s).join(', ')}
            </div>
          </div>

          <div className="creator-detail-section">
            <div className="creator-detail-section-title">Origin Feat</div>
            <div className="creator-detail-feature">
              <div className="creator-detail-feature-name">{bg.feat}</div>
              <div className="creator-detail-feature-desc">{bg.featDescription}</div>
            </div>
          </div>

          {bg.toolProficiency && (
            <div className="creator-detail-section">
              <div className="creator-detail-section-title">Tool Proficiency</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{bg.toolProficiency}</div>
            </div>
          )}

          <div className="creator-detail-section">
            <div className="creator-detail-section-title">Starting Equipment</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{bg.startingEquipment}</div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Step: Abilities ─────────────────────────────────────────────────────────

function AbilitiesStep({ wizard, update }: { wizard: WizardState; update: (p: Partial<WizardState>) => void }) {
  const assigned = wizard.abilityAssignments
  const cls = CLASSES.find(c => c.name === wizard.selectedClass)
  const bg  = BACKGROUNDS.find(b => b.name === wizard.selectedBackground)

  const primaryKeys = cls ? getPrimaryAbilityKeys(cls.primaryAbility) : []
  const saveKeys    = (cls?.savingThrows ?? []) as (keyof AbilityScores)[]

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

  function hintFor(key: keyof AbilityScores): 'primary' | 'save' | 'bg-primary' | 'bg-secondary' | null {
    if (primaryKeys.includes(key)) return 'primary'
    if (saveKeys.includes(key)) return 'save'
    if (bg?.abilityBonus.primary === key) return 'bg-primary'
    if (bg?.abilityBonus.secondary === key) return 'bg-secondary'
    return null
  }

  const allAssigned = ABILITY_KEYS.every(k => assigned[k] !== undefined)

  return (
    <>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Assign the standard array to your ability scores: <strong>{STANDARD_ARRAY.join(', ')}</strong>
      </p>

      {ABILITY_KEYS.map(key => {
        const score = assigned[key]
        const m     = score !== undefined ? mod(score) : null
        const hint  = hintFor(key)

        let rowExtra = ''
        if (hint === 'primary') rowExtra = ' creator-ability-row--primary'
        else if (hint === 'save') rowExtra = ' creator-ability-row--save'

        let hintLabel = ''
        if (hint === 'primary')      hintLabel = 'Primary'
        else if (hint === 'save')    hintLabel = 'Save'
        else if (hint === 'bg-primary')   hintLabel = '+2 (background)'
        else if (hint === 'bg-secondary') hintLabel = '+1 (background)'

        return (
          <div key={key} className={`creator-ability-row${rowExtra}`}>
            <div className="creator-ability-label">{ABILITY_LABELS[key]}</div>
            <select
              className="creator-ability-select"
              value={score ?? ''}
              onChange={e => assign(key, e.target.value)}
            >
              <option value="">—</option>
              {availableFor(key).map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <div className="creator-ability-mod">{m !== null ? fmtMod(m) : '—'}</div>
            <div className={`creator-ability-hint${hintLabel ? (hint === 'primary' ? ' creator-ability-hint--primary' : hint === 'save' ? ' creator-ability-hint--save' : ' creator-ability-hint--bg') : ' creator-ability-hint--empty'}`}>
              {hintLabel}
            </div>
          </div>
        )
      })}

      {allAssigned && bg && (
        <p className="creator-note" style={{ marginTop: '0.75rem' }}>
          Background ({bg.name}) will add +2 to {bg.abilityBonus.primary.toUpperCase()} and +1 to {bg.abilityBonus.secondary.toUpperCase()}.
        </p>
      )}
    </>
  )
}

// ── Step: Proficiency ───────────────────────────────────────────────────────

function ProficiencyStep({ wizard, update }: { wizard: WizardState; update: (p: Partial<WizardState>) => void }) {
  const cls      = CLASSES.find(c => c.name === wizard.selectedClass)
  const bg       = BACKGROUNDS.find(b => b.name === wizard.selectedBackground)
  const raceData = RACES.find(r => r.name === wizard.selectedRace)
  if (!cls || !bg) return null

  const bgSkills   = bg.skills as string[]
  const raceSkills = (raceData?.traits ?? [])
    .filter(t => t.grantsSkill && (!t.minLevel || t.minLevel <= 1))
    .map(t => t.grantsSkill!)

  const autoGranted = [...new Set([...bgSkills, ...raceSkills])]

  function toggleSkill(skill: string) {
    if (autoGranted.includes(skill)) return
    const has = wizard.selectedSkills.includes(skill)
    if (has) {
      update({ selectedSkills: wizard.selectedSkills.filter(s => s !== skill) })
    } else if (wizard.selectedSkills.length < cls.skillCount) {
      update({ selectedSkills: [...wizard.selectedSkills, skill] })
    }
  }

  const allProficient = [...new Set([...wizard.selectedSkills, ...autoGranted])]
  const remaining = cls.skillCount - wizard.selectedSkills.length

  return (
    <>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Your background and race may auto-grant skills. Choose <strong>{cls.skillCount}</strong> additional skill{cls.skillCount !== 1 ? 's' : ''} from your class options below.
      </p>

      <div className="creator-section-title">Auto-granted Skills</div>
      <div className="creator-chip-row" style={{ marginBottom: '1rem' }}>
        {autoGranted.map(skill => (
          <span key={skill} className="creator-chip creator-chip--granted">
            {SKILL_DISPLAY[skill] ?? skill}
          </span>
        ))}
        {autoGranted.length === 0 && (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>None</span>
        )}
      </div>

      <div className="creator-section-title" style={{ marginTop: '0' }}>
        Class Skills — choose {cls.skillCount} ({remaining > 0 ? `${remaining} more needed` : 'done'})
      </div>
      <div className="creator-chip-row" style={{ marginBottom: '1rem' }}>
        {cls.skillOptions.map(skill => {
          const isGrantedByAuto = autoGranted.includes(skill)
          const isActive        = wizard.selectedSkills.includes(skill)
          const isDisabled      = !isActive && !isGrantedByAuto && wizard.selectedSkills.length >= cls.skillCount

          if (isGrantedByAuto) {
            return (
              <span key={skill} className="creator-chip creator-chip--granted" title="Already granted">
                {SKILL_DISPLAY[skill] ?? skill} ✓
              </span>
            )
          }

          return (
            <button
              key={skill}
              className={`creator-chip${isActive ? ' creator-chip--active' : ''}${isDisabled ? ' creator-chip--disabled' : ''}`}
              onClick={() => !isDisabled && toggleSkill(skill)}
              type="button"
            >
              {SKILL_DISPLAY[skill] ?? skill}
            </button>
          )
        })}
      </div>

      <div className="creator-detail" style={{ marginTop: '0.5rem' }}>
        <div className="creator-detail-section-title">All Proficient Skills</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
          {allProficient.length === 0
            ? <span style={{ color: 'var(--text-muted)' }}>None yet</span>
            : allProficient.map(s => SKILL_DISPLAY[s] ?? s).join(', ')}
        </div>
      </div>
    </>
  )
}

// ── Step: Spells ────────────────────────────────────────────────────────────

interface SpellPreview { name: string; isCantrip: boolean }

function SpellsStep({ wizard, update }: { wizard: WizardState; update: (p: Partial<WizardState>) => void }) {
  const cls = CLASSES.find(c => c.name === wizard.selectedClass)
  const [preview, setPreview]         = useState<SpellPreview | null>(null)
  const [removing, setRemoving]       = useState<SpellPreview | null>(null)

  if (!cls?.spellcasting) return null
  const sc = cls.spellcasting

  const cantripList: string[] = CLASS_SPELL_LIST[cls.name]?.[0] ?? []
  const spellList:   string[] = CLASS_SPELL_LIST[cls.name]?.[1] ?? []

  const showCantrips = sc.cantripsAtL1 > 0
  const showSpells   = cls.name === 'Wizard' || (!sc.preparedCaster && sc.spellsAtL1 > 0)

  function clickEntry(name: string, isCantrip: boolean) {
    const selected = isCantrip ? wizard.selectedCantrips : wizard.selectedSpells
    if (selected.includes(name)) {
      setRemoving({ name, isCantrip })
      setPreview(null)
    } else {
      setPreview({ name, isCantrip })
      setRemoving(null)
    }
  }

  function confirmAdd(name: string, isCantrip: boolean) {
    if (isCantrip) {
      if (wizard.selectedCantrips.length < sc.cantripsAtL1) {
        update({ selectedCantrips: [...wizard.selectedCantrips, name] })
      }
    } else {
      if (wizard.selectedSpells.length < sc.spellsAtL1) {
        update({ selectedSpells: [...wizard.selectedSpells, name] })
      }
    }
    setPreview(null)
  }

  function confirmRemove(name: string, isCantrip: boolean) {
    if (isCantrip) {
      update({ selectedCantrips: wizard.selectedCantrips.filter(s => s !== name) })
    } else {
      update({ selectedSpells: wizard.selectedSpells.filter(s => s !== name) })
    }
    setRemoving(null)
  }

  const previewSpellData  = preview  ? findSpell(preview.name)  : null
  const removingSpellData = removing ? findSpell(removing.name) : null

  return (
    <>
      {showCantrips && (
        <>
          <div className="creator-section-title" style={{ marginTop: 0 }}>
            Cantrips — choose {sc.cantripsAtL1} ({wizard.selectedCantrips.length}/{sc.cantripsAtL1} selected)
          </div>

          {wizard.selectedCantrips.length > 0 && (
            <div className="creator-chip-row" style={{ marginBottom: '0.75rem' }}>
              {wizard.selectedCantrips.map(name => (
                <button
                  key={name}
                  className="creator-chip creator-chip--active"
                  onClick={() => clickEntry(name, true)}
                  type="button"
                >
                  {name} ×
                </button>
              ))}
            </div>
          )}

          <div className="creator-spell-list">
            {cantripList.map(name => {
              const isSelected = wizard.selectedCantrips.includes(name)
              const isOpen     = preview?.name === name && preview.isCantrip
              const isRemoving = removing?.name === name && removing.isCantrip
              const maxReached = !isSelected && wizard.selectedCantrips.length >= sc.cantripsAtL1

              return (
                <div key={name}>
                  <button
                    className={`creator-spell-item${isSelected ? ' creator-spell-item--selected' : ''}${maxReached ? ' creator-spell-item--dim' : ''}`}
                    onClick={() => !maxReached && clickEntry(name, true)}
                    type="button"
                    disabled={maxReached && !isSelected}
                  >
                    <span>{name}</span>
                    <span className="creator-spell-item-meta">Cantrip</span>
                  </button>

                  {isOpen && previewSpellData && (
                    <div className="creator-spell-preview">
                      <div className="creator-spell-preview-header">
                        <span className="creator-spell-preview-name">{previewSpellData.name}</span>
                        <span className="creator-spell-preview-school">{previewSpellData.school}</span>
                      </div>
                      <div className="creator-spell-preview-meta">
                        {previewSpellData.castingTime} · {previewSpellData.range} · {previewSpellData.duration}
                        {previewSpellData.components && ` · ${previewSpellData.components}`}
                      </div>
                      <div className="creator-spell-preview-desc">{previewSpellData.description}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button className="btn btn-primary" onClick={() => confirmAdd(name, true)} type="button" style={{ flex: 1 }}>
                          Add Cantrip
                        </button>
                        <button className="btn btn-secondary" onClick={() => setPreview(null)} type="button">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {isRemoving && removingSpellData && (
                    <div className="creator-spell-preview creator-spell-preview--remove">
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                        Remove <strong>{removing!.name}</strong> from your cantrips?
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-danger" onClick={() => confirmRemove(name, true)} type="button" style={{ flex: 1 }}>
                          Remove
                        </button>
                        <button className="btn btn-secondary" onClick={() => setRemoving(null)} type="button">
                          Keep
                        </button>
                      </div>
                    </div>
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
            {cls.name === 'Wizard'
              ? `Spellbook — choose ${sc.spellsAtL1} (${wizard.selectedSpells.length}/${sc.spellsAtL1} chosen)`
              : `Level 1 Spells — choose ${sc.spellsAtL1} (${wizard.selectedSpells.length}/${sc.spellsAtL1} selected)`}
          </div>

          {wizard.selectedSpells.length > 0 && (
            <div className="creator-chip-row" style={{ marginBottom: '0.75rem' }}>
              {wizard.selectedSpells.map(name => (
                <button
                  key={name}
                  className="creator-chip creator-chip--active"
                  onClick={() => clickEntry(name, false)}
                  type="button"
                >
                  {name} ×
                </button>
              ))}
            </div>
          )}

          <div className="creator-spell-list">
            {spellList.map(name => {
              const isSelected = wizard.selectedSpells.includes(name)
              const isOpen     = preview?.name === name && !preview.isCantrip
              const isRemoving = removing?.name === name && !removing.isCantrip
              const maxReached = !isSelected && wizard.selectedSpells.length >= sc.spellsAtL1

              return (
                <div key={name}>
                  <button
                    className={`creator-spell-item${isSelected ? ' creator-spell-item--selected' : ''}${maxReached ? ' creator-spell-item--dim' : ''}`}
                    onClick={() => !maxReached && clickEntry(name, false)}
                    type="button"
                    disabled={maxReached && !isSelected}
                  >
                    <span>{name}</span>
                    <span className="creator-spell-item-meta">Level 1</span>
                  </button>

                  {isOpen && previewSpellData && (
                    <div className="creator-spell-preview">
                      <div className="creator-spell-preview-header">
                        <span className="creator-spell-preview-name">{previewSpellData.name}</span>
                        <span className="creator-spell-preview-school">{previewSpellData.school}</span>
                      </div>
                      <div className="creator-spell-preview-meta">
                        {previewSpellData.castingTime} · {previewSpellData.range} · {previewSpellData.duration}
                        {previewSpellData.components && ` · ${previewSpellData.components}`}
                      </div>
                      <div className="creator-spell-preview-desc">{previewSpellData.description}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button className="btn btn-primary" onClick={() => confirmAdd(name, false)} type="button" style={{ flex: 1 }}>
                          {cls.name === 'Wizard' ? 'Add to Spellbook' : 'Learn Spell'}
                        </button>
                        <button className="btn btn-secondary" onClick={() => setPreview(null)} type="button">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {isRemoving && (
                    <div className="creator-spell-preview creator-spell-preview--remove">
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                        Remove <strong>{removing!.name}</strong> from your {cls.name === 'Wizard' ? 'spellbook' : 'spells known'}?
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-danger" onClick={() => confirmRemove(name, false)} type="button" style={{ flex: 1 }}>
                          Remove
                        </button>
                        <button className="btn btn-secondary" onClick={() => setRemoving(null)} type="button">
                          Keep
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {sc.preparedCaster && cls.name !== 'Wizard' && (
            <p className="creator-note">As a prepared caster, you choose spells each day from your full class list — no selection needed now.</p>
          )}
        </>
      )}
    </>
  )
}

// ── Step: Items ─────────────────────────────────────────────────────────────

function ItemsStep({ wizard }: { wizard: WizardState }) {
  const cls = CLASSES.find(c => c.name === wizard.selectedClass)
  const bg  = BACKGROUNDS.find(b => b.name === wizard.selectedBackground)
  if (!cls || !bg) return null

  return (
    <>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Here is everything you start with. Some entries may offer choices — these are made at the table with your DM.
      </p>

      <div className="creator-detail">
        <div className="creator-detail-section-title">From {cls.name}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
          {cls.startingEquipment}
        </div>
      </div>

      <div className="creator-detail">
        <div className="creator-detail-section-title">From {bg.name} background</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
          {bg.startingEquipment}
        </div>
      </div>
    </>
  )
}

// ── Step: Name ──────────────────────────────────────────────────────────────

function NameStep({ wizard, update }: { wizard: WizardState; update: (p: Partial<WizardState>) => void }) {
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
    </div>
  )
}

// ── Step: Review ────────────────────────────────────────────────────────────

function ReviewStep({ wizard }: { wizard: WizardState }) {
  const cls      = CLASSES.find(c => c.name === wizard.selectedClass)
  const raceData = RACES.find(r => r.name === wizard.selectedRace)
  const bg       = BACKGROUNDS.find(b => b.name === wizard.selectedBackground)

  if (!cls || !raceData || !bg) return <p style={{ color: 'var(--text-muted)' }}>Incomplete selections.</p>

  const base = wizard.abilityAssignments as Record<keyof AbilityScores, number>
  const finalScores: AbilityScores = { str: base.str, dex: base.dex, con: base.con, int: base.int, wis: base.wis, cha: base.cha }
  finalScores[bg.abilityBonus.primary]   += 2
  finalScores[bg.abilityBonus.secondary] += 1

  const profBonus  = 2
  const hp         = cls.hitDie + mod(finalScores.con)
  const initiative = mod(finalScores.dex)
  const ac         = calcAc(cls.acType, finalScores)

  const allProficientSkills = [...new Set([...wizard.selectedSkills, ...(bg.skills as string[])])]

  return (
    <>
      <div className="creator-review-block">
        <div className="creator-review-block-title">Identity</div>
        <ReviewRow label="Character" value={wizard.characterName} />
        {wizard.playerName && <ReviewRow label="Player" value={wizard.playerName} />}
        <ReviewRow label="Class"     value={cls.name} />
        <ReviewRow label="Species"   value={wizard.selectedRace ?? ''} />
        <ReviewRow label="Background" value={bg.name} />
        <ReviewRow label="Level"     value="1" />
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
          Includes +2 {bg.abilityBonus.primary.toUpperCase()} and +1 {bg.abilityBonus.secondary.toUpperCase()} from {bg.name}.
        </p>
      </div>

      <div className="creator-review-block">
        <div className="creator-review-block-title">Combat Stats</div>
        <ReviewRow label="HP"               value={`${hp}`} />
        <ReviewRow label="AC"               value={`${ac}`} />
        <ReviewRow label="Speed"            value={`${raceData.speed} ft`} />
        <ReviewRow label="Initiative"       value={fmtMod(initiative)} />
        <ReviewRow label="Proficiency Bonus" value={`+${profBonus}`} />
        <ReviewRow label="Hit Dice"         value={`1d${cls.hitDie}`} />
      </div>

      <div className="creator-review-block">
        <div className="creator-review-block-title">Proficient Skills</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
          {allProficientSkills.map(s => SKILL_DISPLAY[s] ?? s).join(', ')}
        </div>
      </div>

      {cls.spellcasting && (
        <div className="creator-review-block">
          <div className="creator-review-block-title">Spellcasting</div>
          <ReviewRow label="Ability"     value={cls.spellcasting.ability.toUpperCase()} />
          <ReviewRow label="Spell Attack" value={fmtMod(profBonus + mod(finalScores[cls.spellcasting.ability]))} />
          <ReviewRow label="Spell Save DC" value={`${8 + profBonus + mod(finalScores[cls.spellcasting.ability])}`} />
          <ReviewRow
            label="Slots (L1)"
            value={`${cls.spellcasting.slotsAtL1}${cls.spellcasting.slotType === 'pact' ? ' (Pact Magic)' : ''}`}
          />
          {wizard.selectedCantrips.length > 0 && (
            <ReviewRow label="Cantrips" value={wizard.selectedCantrips.join(', ')} />
          )}
          {wizard.selectedSpells.length > 0 && (
            <ReviewRow
              label={cls.name === 'Wizard' ? 'Spellbook' : 'Spells Known'}
              value={wizard.selectedSpells.join(', ')}
            />
          )}
          {cls.spellcasting.preparedCaster && cls.name !== 'Wizard' && (
            <p className="creator-note">Prepares spells each day from full class list.</p>
          )}
        </div>
      )}

      <div className="creator-review-block">
        <div className="creator-review-block-title">Origin Feat</div>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)', marginBottom: '0.25rem' }}>{bg.feat}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{bg.featDescription}</div>
      </div>

      <div className="creator-review-block">
        <div className="creator-review-block-title">Starting Equipment</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          <strong>Class:</strong> {cls.startingEquipment}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginTop: '0.25rem' }}>
          <strong>Background:</strong> {bg.startingEquipment}
        </div>
      </div>
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
