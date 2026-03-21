import { useState } from 'react'
import { db } from '../lib/database'
import { useCharacter } from '../context/CharacterContext'
import type { AbilityScores } from '../types'
import type { ChoiceRow } from '../lib/database'

interface Props {
  newLevel: number
  className: string
  onDismiss: () => void
}

const ABILITY_KEYS: (keyof AbilityScores)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const ABILITY_LABELS: Record<keyof AbilityScores, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
}

const KNOWN_SPELL_CLASSES = new Set(['bard', 'ranger', 'sorcerer', 'warlock'])
const PREPARED_CASTER_CLASSES = new Set(['cleric', 'druid', 'paladin', 'wizard'])

function mod(score: number) { return Math.floor((score - 10) / 2) }

type Step = 'subclass' | 'features' | 'choices' | 'asi' | 'hp' | 'spells' | 'done'

export default function LevelUpModal({ newLevel, className, onDismiss }: Props) {
  const { character, updateChoices, updateMaxHp, updateAbilityScores, updateHp } = useCharacter()

  // ── Resolve class + subclass from DB
  const classRow = db.loaded
    ? db.classes.find(c => c.name.toLowerCase() === className.toLowerCase())
    : undefined
  const classId = classRow?.class_id ?? null

  const subclassRow = db.loaded && classId && character?.subclass
    ? db.getSubclassesForClass(classId).find(
        s => s.name.toLowerCase() === character.subclass!.toLowerCase()
      )
    : undefined
  const subclassId = subclassRow?.subclass_id ?? null

  const hitDie = classRow?.hit_die_size ?? 8
  const conMod = character ? mod(character.abilityScores.con) : 0

  // ── Progression data
  const progressionRows = db.loaded && classId !== null
    ? db.getProgressionAtLevel(classId, subclassId, newLevel)
    : []

  const hasASI = progressionRows.some(r => r.is_asi)
  const featureIds = progressionRows.flatMap(r => r.feature_ids)
  const features = featureIds
    .map(id => db.getTrait(id))
    .filter((t): t is NonNullable<typeof t> => t !== undefined)
    .filter(f => f.name !== 'Ability Score Improvement')

  const choices: ChoiceRow[] = db.loaded && classId !== null
    ? db.getChoicesAtLevel(classId, subclassId, newLevel)
    : []
  const actionableChoices = choices.filter(c =>
    c.option_source !== 'grant' && c.option_source !== 'subclasses'
  )

  // ── Subclass check
  const needsSubclass = classRow
    && classRow.subclass_unlock_level === newLevel
    && !character?.subclass
  const subclasses = db.loaded && classId
    ? db.getSubclassesForClass(classId)
    : []

  // ── Spell progression
  const prevProgRow = db.loaded && classId !== null
    ? db.progression.find(r => r.class_id === classId && r.subclass_id === null && r.level === newLevel - 1)
    : undefined
  const currProgRow = db.loaded && classId !== null
    ? db.progression.find(r => r.class_id === classId && r.subclass_id === null && r.level === newLevel)
    : undefined

  const cantripsGained = (currProgRow?.cantrips_known ?? 0) - (prevProgRow?.cantrips_known ?? 0)
  const spellsGained = (currProgRow?.spells_known ?? 0) - (prevProgRow?.spells_known ?? 0)
  const classNameLower = className.toLowerCase()
  const isKnownSpellClass = KNOWN_SPELL_CLASSES.has(classNameLower)
  const isPreparedCaster = PREPARED_CASTER_CLASSES.has(classNameLower)
  const prevSlots = classId !== null ? db.getSpellSlots(classId, newLevel - 1) : undefined
  const currSlots = classId !== null ? db.getSpellSlots(classId, newLevel) : undefined
  const prevHadSlots = prevSlots ? (prevSlots.slot_level_1 + prevSlots.slot_level_2 + prevSlots.slot_level_3) > 0 : false
  const currHasSlots = currSlots ? (currSlots.slot_level_1 + currSlots.slot_level_2 + currSlots.slot_level_3) > 0 : false
  const firstGainsSpellcasting = !prevHadSlots && currHasSlots
  const hasSpellStep = cantripsGained > 0 || spellsGained > 0 || isPreparedCaster || firstGainsSpellcasting

  // ── Build step list
  const stepList: Step[] = []
  if (needsSubclass) stepList.push('subclass')
  if (features.length > 0) stepList.push('features')
  if (actionableChoices.length > 0) stepList.push('choices')
  if (hasASI) stepList.push('asi')
  stepList.push('hp')
  if (hasSpellStep) stepList.push('spells')
  stepList.push('done')

  const [stepIdx, setStepIdx] = useState(0)
  const step = stepList[stepIdx]

  // ── State
  const [hpRoll, setHpRoll] = useState('')
  const [asiOrFeat, setAsiOrFeat] = useState<'asi' | 'feat'>('asi')
  const [asiMode, setAsiMode] = useState<'+2' | '+1+1'>('+2')
  const [asiSingle, setAsiSingle] = useState<keyof AbilityScores>('str')
  const [asiFirst, setAsiFirst] = useState<keyof AbilityScores>('str')
  const [asiSecond, setAsiSecond] = useState<keyof AbilityScores>('dex')
  const [selectedFeatId, setSelectedFeatId] = useState<number | null>(null)
  const [selectedSubclass, setSelectedSubclass] = useState<number | null>(null)
  const [choiceAnswers, setChoiceAnswers] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {}
    for (const c of actionableChoices) {
      const firstId = c.choice_elements[0]
      if (c.option_source === 'feats') {
        init[c.choice_id] = firstId !== undefined
          ? (db.getGeneralFeat(firstId)?.name ?? String(firstId))
          : ''
      } else if (c.option_source === 'skills') {
        init[c.choice_id] = firstId !== undefined
          ? (db.skills.find(s => s.skill_id === firstId)?.name ?? String(firstId))
          : ''
      } else {
        init[c.choice_id] = firstId !== undefined ? String(firstId) : ''
      }
    }
    return init
  })

  // HP calculations
  const hpRollNum = parseInt(hpRoll)
  const hpValid = !isNaN(hpRollNum) && hpRollNum >= 1 && hpRollNum <= hitDie
  const hpIncrease = hpValid ? Math.max(1, hpRollNum + conMod) : null

  // Feat lists
  const isEpicBoon = newLevel === 19
  const featList = isEpicBoon
    ? db.epicBoonFeats ?? []
    : db.generalFeats ?? []

  const next = () => setStepIdx(i => Math.min(i + 1, stepList.length - 1))

  function handleConfirm() {
    if (!character) { onDismiss(); return }

    // HP: set full HP
    if (hpIncrease !== null) {
      const newMax = character.maxHp + hpIncrease
      updateMaxHp(newMax)
      updateHp(newMax, character.tempHp)
    }

    // ASI or Feat
    if (hasASI) {
      if (asiOrFeat === 'asi') {
        const scores = { ...character.abilityScores }
        if (asiMode === '+2') {
          scores[asiSingle] = Math.min(20, scores[asiSingle] + 2)
        } else {
          scores[asiFirst] = Math.min(20, scores[asiFirst] + 1)
          scores[asiSecond] = Math.min(20, scores[asiSecond] + 1)
        }
        updateAbilityScores(scores)
      }
      // Feat: store in choices
      if (asiOrFeat === 'feat' && selectedFeatId !== null) {
        const feat = isEpicBoon
          ? db.getEpicBoonFeat(selectedFeatId)
          : db.getGeneralFeat(selectedFeatId)
        if (feat) {
          updateChoices({ ...character.choices, [`feat_${newLevel}`]: feat.name })
        }
      }
    }

    // Subclass
    if (needsSubclass && selectedSubclass !== null) {
      const sc = subclasses.find(s => s.subclass_id === selectedSubclass)
      if (sc) {
        updateChoices({ ...character.choices, subclass: sc.name })
      }
    }

    // Choice answers
    if (Object.keys(choiceAnswers).length > 0) {
      const newChoices: Record<string, string> = {}
      for (const [id, val] of Object.entries(choiceAnswers)) {
        newChoices[id] = val
      }
      updateChoices({ ...character.choices, ...newChoices })
    }

    onDismiss()
  }

  const canGoNext = (() => {
    switch (step) {
      case 'subclass': return selectedSubclass !== null
      case 'features': return true
      case 'choices': return true
      case 'asi': return true
      case 'hp': return hpValid
      case 'spells': return true
      case 'done': return true
      default: return true
    }
  })()

  // ── Render choice row
  const renderChoice = (choice: ChoiceRow) => {
    const src = choice.option_source
    const selectedVal = choiceAnswers[choice.choice_id] ?? ''

    if (src === 'feats') {
      const opts = choice.choice_elements
        .map(id => db.getGeneralFeat(id))
        .filter((f): f is NonNullable<typeof f> => f !== undefined)
      const selectedFeat = opts.find(f => f.name === selectedVal)
      return (
        <div key={choice.choice_id} style={{ marginTop: '0.5rem' }}>
          <label className="levelup-choice-label">{choice.verbage}:</label>
          <select className="creator-ability-select"
            value={selectedVal}
            onChange={e => setChoiceAnswers(prev => ({ ...prev, [choice.choice_id]: e.target.value }))}
          >
            {opts.map(f => <option key={f.feat_id} value={f.name}>{f.name}</option>)}
          </select>
          {selectedFeat?.description && (
            <div className="levelup-choice-desc">{selectedFeat.description}</div>
          )}
        </div>
      )
    }
    if (src === 'skills') {
      const opts = choice.choice_elements
        .map(id => db.skills.find(s => s.skill_id === id))
        .filter((s): s is NonNullable<typeof s> => s !== undefined)
      return (
        <div key={choice.choice_id} style={{ marginTop: '0.5rem' }}>
          <label className="levelup-choice-label">{choice.verbage}:</label>
          <select className="creator-ability-select"
            value={selectedVal}
            onChange={e => setChoiceAnswers(prev => ({ ...prev, [choice.choice_id]: e.target.value }))}
          >
            {opts.map(s => <option key={s.skill_id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
      )
    }
    if (src === 'weapons') {
      const opts = choice.choice_elements
        .map(id => db.getWeapon(id))
        .filter((w): w is NonNullable<typeof w> => w !== undefined)
      const selectedWeapon = opts.find(w => w.name === selectedVal)
      return (
        <div key={choice.choice_id} style={{ marginTop: '0.5rem' }}>
          <label className="levelup-choice-label">{choice.verbage}:</label>
          <select className="creator-ability-select"
            value={selectedVal}
            onChange={e => setChoiceAnswers(prev => ({ ...prev, [choice.choice_id]: e.target.value }))}
          >
            {opts.map(w => <option key={w.item_id} value={w.name}>{w.name}</option>)}
          </select>
          {selectedWeapon && (
            <div className="levelup-choice-desc">
              {selectedWeapon.damage_dice} {selectedWeapon.damage_type}
              {selectedWeapon.mastery ? ` · Mastery: ${selectedWeapon.mastery}` : ''}
            </div>
          )}
        </div>
      )
    }
    if (src === 'spells') {
      const spellOpts = choice.choice_elements
        .map(id => db.getSpell(id))
        .filter((s): s is NonNullable<typeof s> => s !== undefined)
      const selectedSpell = spellOpts.find(s => s.name === selectedVal)
      if (spellOpts.length === 0) {
        return (
          <div key={choice.choice_id} style={{ marginTop: '0.5rem' }}>
            <label className="levelup-choice-label">{choice.verbage}</label>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Use the Spells tab to add your new spell(s).
            </p>
          </div>
        )
      }
      return (
        <div key={choice.choice_id} style={{ marginTop: '0.5rem' }}>
          <label className="levelup-choice-label">{choice.verbage}:</label>
          <select className="creator-ability-select"
            value={selectedVal}
            onChange={e => setChoiceAnswers(prev => ({ ...prev, [choice.choice_id]: e.target.value }))}
          >
            {spellOpts.map(s => <option key={s.spell_id} value={s.name}>{s.name}</option>)}
          </select>
          {selectedSpell?.description && (
            <div className="levelup-choice-desc">{selectedSpell.description}</div>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="levelup-overlay" onClick={e => e.stopPropagation()}>
      <div className="levelup-card levelup-card--full">
        <div className="levelup-title">Level {newLevel}!</div>
        <div className="levelup-step-indicator">
          {stepList.filter(s => s !== 'done').map((s, i) => (
            <span key={s} className={`levelup-step-dot ${i <= stepIdx ? 'active' : ''}`} />
          ))}
        </div>

        <div className="levelup-scroll-area">

        {/* ── Subclass Step ── */}
        {step === 'subclass' && (
          <div className="levelup-section">
            <div className="levelup-section-title">Choose Your Subclass</div>
            <div className="levelup-features">
              {subclasses.map(sc => (
                <div
                  key={sc.subclass_id}
                  className={`levelup-feature levelup-feature--selectable ${selectedSubclass === sc.subclass_id ? 'selected' : ''}`}
                  onClick={() => setSelectedSubclass(sc.subclass_id)}
                >
                  <div className="levelup-feature-name">{sc.name}</div>
                  {sc.description && <div className="levelup-feature-desc">{sc.description}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Features Step ── */}
        {step === 'features' && (
          <div className="levelup-section">
            <div className="levelup-section-title">New Features</div>
            <div className="levelup-features">
              {features.map(f => (
                <div key={f.trait_id} className="levelup-feature">
                  <div className="levelup-feature-name">{f.name}</div>
                  {f.description && <div className="levelup-feature-desc">{f.description}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Choices Step ── */}
        {step === 'choices' && (
          <div className="levelup-section">
            <div className="levelup-section-title">Choices</div>
            {actionableChoices.map(c => renderChoice(c))}
          </div>
        )}

        {/* ── ASI / Feat Step ── */}
        {step === 'asi' && (
          <div className="levelup-section">
            <div className="levelup-section-title">
              {isEpicBoon ? 'Epic Boon' : 'Ability Score Improvement'}
            </div>

            {/* Step 1: Choose ASI or Feat */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
              <button
                className={`levelup-asi-toggle${asiOrFeat === 'asi' ? ' active' : ''}`}
                onClick={() => setAsiOrFeat('asi')}
              >Ability Score Improvement</button>
              <button
                className={`levelup-asi-toggle${asiOrFeat === 'feat' ? ' active' : ''}`}
                onClick={() => setAsiOrFeat('feat')}
              >Feat</button>
            </div>

            {asiOrFeat === 'asi' ? (
              <>
                <p className="levelup-section-desc">+2 to one ability, or +1 to two different abilities. Max 20.</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
                  <button
                    className={`levelup-asi-toggle${asiMode === '+2' ? ' active' : ''}`}
                    onClick={() => setAsiMode('+2')}
                  >+2 to one</button>
                  <button
                    className={`levelup-asi-toggle${asiMode === '+1+1' ? ' active' : ''}`}
                    onClick={() => setAsiMode('+1+1')}
                  >+1 to two</button>
                </div>
                {asiMode === '+2' ? (
                  <select className="creator-ability-select" value={asiSingle}
                    onChange={e => setAsiSingle(e.target.value as keyof AbilityScores)}>
                    {ABILITY_KEYS.map(k => (
                      <option key={k} value={k}>
                        {ABILITY_LABELS[k]} ({character?.abilityScores[k] ?? 0} → {Math.min(20, (character?.abilityScores[k] ?? 0) + 2)})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <select className="creator-ability-select" value={asiFirst}
                      onChange={e => setAsiFirst(e.target.value as keyof AbilityScores)}>
                      {ABILITY_KEYS.map(k => (
                        <option key={k} value={k} disabled={k === asiSecond}>
                          {ABILITY_LABELS[k]} ({character?.abilityScores[k] ?? 0} → {Math.min(20, (character?.abilityScores[k] ?? 0) + 1)})
                        </option>
                      ))}
                    </select>
                    <select className="creator-ability-select" value={asiSecond}
                      onChange={e => setAsiSecond(e.target.value as keyof AbilityScores)}>
                      {ABILITY_KEYS.map(k => (
                        <option key={k} value={k} disabled={k === asiFirst}>
                          {ABILITY_LABELS[k]} ({character?.abilityScores[k] ?? 0} → {Math.min(20, (character?.abilityScores[k] ?? 0) + 1)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            ) : (
              <div className="levelup-feat-list">
                {featList.map(f => (
                  <div
                    key={f.feat_id}
                    className={`levelup-feature levelup-feature--selectable ${selectedFeatId === f.feat_id ? 'selected' : ''}`}
                    onClick={() => setSelectedFeatId(f.feat_id)}
                  >
                    <div className="levelup-feature-name">{f.name}</div>
                    {f.prerequisite_text && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Prereq: {f.prerequisite_text}
                      </div>
                    )}
                    {f.description && <div className="levelup-feature-desc">{f.description}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── HP Step ── */}
        {step === 'hp' && (
          <div className="levelup-section">
            <div className="levelup-section-title">Hit Points</div>
            <p className="levelup-section-desc">
              Roll your d{hitDie} and enter the result.
              {conMod !== 0 && ` CON modifier: ${conMod >= 0 ? '+' : ''}${conMod}`}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem' }}>
              <input
                className="levelup-hp-input"
                type="number" min={1} max={hitDie}
                placeholder={`1–${hitDie}`}
                value={hpRoll}
                onChange={e => setHpRoll(e.target.value)}
              />
              {hpIncrease !== null && (
                <span className="levelup-hp-result">+{hpIncrease} HP</span>
              )}
            </div>
          </div>
        )}

        {/* ── Spells Step ── */}
        {step === 'spells' && (
          <div className="levelup-section">
            <div className="levelup-section-title">Spellcasting</div>
            {firstGainsSpellcasting && (
              <p className="levelup-section-desc" style={{ fontWeight: 600 }}>
                You've gained the ability to cast spells! Go to the Spells tab to choose and prepare your spells.
              </p>
            )}
            {isPreparedCaster && !firstGainsSpellcasting && (
              <p className="levelup-section-desc">
                You can now prepare more spells. Check your Spells tab to update your prepared spell list.
              </p>
            )}
            {isKnownSpellClass && (
              <p className="levelup-section-desc">
                {cantripsGained > 0 && `You can learn ${cantripsGained} new cantrip${cantripsGained > 1 ? 's' : ''}. `}
                {spellsGained > 0 && `You can learn ${spellsGained} new spell${spellsGained > 1 ? 's' : ''}. `}
                Use the Spells tab to choose them.
              </p>
            )}
          </div>
        )}

        {/* ── Done Step ── */}
        {step === 'done' && (
          <div className="levelup-section" style={{ textAlign: 'center' }}>
            <div className="levelup-section-title" style={{ fontSize: '1rem' }}>Ready!</div>
            <p className="levelup-section-desc">
              Your character is now level {newLevel}. HP will be set to full.
            </p>
          </div>
        )}

        </div>{/* end levelup-scroll-area */}

        {/* ── Navigation ── */}
        <div className="levelup-nav">
          {stepIdx > 0 && (
            <button
              className="levelup-btn levelup-btn--back"
              onClick={() => setStepIdx(i => Math.max(0, i - 1))}
            >
              Back
            </button>
          )}
          {step === 'done' ? (
            <button className="levelup-btn" onClick={handleConfirm}>
              Complete Level Up
            </button>
          ) : (
            <button
              className="levelup-btn"
              onClick={next}
              disabled={!canGoNext}
              style={{ opacity: canGoNext ? 1 : 0.45 }}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
