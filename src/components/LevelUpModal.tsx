import { useState } from 'react'
import { CLASS_FEATURES } from '../data/classFeatures'
import { CLASSES } from '../data/classes5e'
import { useCharacter } from '../context/CharacterContext'
import type { AbilityScores } from '../types'

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

function mod(score: number) { return Math.floor((score - 10) / 2) }

export default function LevelUpModal({ newLevel, className, onDismiss }: Props) {
  const { sheet, updateExtraTraits, updateChoices, updateMaxHp, updateAbilityScores } = useCharacter()

  const classData = CLASSES.find(c => c.name === className)
  const hitDie = classData?.hitDie ?? 8
  const conMod = sheet ? mod(sheet.abilityScores.con) : 0

  const features = (CLASS_FEATURES[className] ?? []).filter(f => f.level === newLevel)
  const hasASI = features.some(f => f.name === 'Ability Score Improvement')
  const choiceFeatures = features.filter(f => f.choice && f.name !== 'Ability Score Improvement' && !f.linkedChoice)

  // HP roll
  const [hpRoll, setHpRoll] = useState('')

  // ASI
  const [asiMode, setAsiMode] = useState<'+2' | '+1+1'>('+2')
  const [asiSingle, setAsiSingle] = useState<keyof AbilityScores>('str')
  const [asiFirst, setAsiFirst] = useState<keyof AbilityScores>('str')
  const [asiSecond, setAsiSecond] = useState<keyof AbilityScores>('dex')

  // Other choices (e.g. Metamagic, Fighting Style)
  const [choices, setChoices] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of choiceFeatures) {
      if (f.choice) init[f.choice.key] = f.choice.options[0] ?? ''
    }
    return init
  })

  const hpRollNum = parseInt(hpRoll)
  const hpValid = !isNaN(hpRollNum) && hpRollNum >= 1 && hpRollNum <= hitDie
  const hpIncrease = hpValid ? hpRollNum + conMod : null

  function handleConfirm() {
    if (!sheet) { onDismiss(); return }

    // 1. HP increase
    if (hpIncrease !== null) {
      updateMaxHp(sheet.maxHp + Math.max(1, hpIncrease))
    }

    // 2. ASI
    if (hasASI) {
      const scores = { ...sheet.abilityScores }
      if (asiMode === '+2') {
        scores[asiSingle] = Math.min(20, scores[asiSingle] + 2)
      } else {
        scores[asiFirst]  = Math.min(20, scores[asiFirst]  + 1)
        scores[asiSecond] = Math.min(20, scores[asiSecond] + 1)
      }
      updateAbilityScores(scores)
    }

    // 3. Add plain features to extraTraits
    const newTraits = features
      .filter(f => !f.linkedChoice && !f.choice && f.name !== 'Ability Score Improvement')
      .map(f => `${f.name}: ${f.description}`)
    if (newTraits.length > 0) {
      updateExtraTraits([...sheet.extraTraits, ...newTraits])
    }

    // 4. Save other choices
    if (Object.keys(choices).length > 0) {
      updateChoices({ ...sheet.choices, ...choices })
    }

    onDismiss()
  }

  const canConfirm = hpValid

  return (
    <div className="levelup-overlay" onClick={e => e.stopPropagation()}>
      <div className="levelup-card levelup-card--full">
        <div className="levelup-title">Level {newLevel}!</div>

        {/* ── HP Roll ── */}
        <div className="levelup-section">
          <div className="levelup-section-title">Hit Points</div>
          <p className="levelup-section-desc">
            Roll your d{hitDie} and enter the result.
            {conMod !== 0 && ` CON modifier: ${conMod >= 0 ? '+' : ''}${conMod}`}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem' }}>
            <input
              className="levelup-hp-input"
              type="number"
              min={1}
              max={hitDie}
              placeholder={`1–${hitDie}`}
              value={hpRoll}
              onChange={e => setHpRoll(e.target.value)}
            />
            {hpIncrease !== null && (
              <span className="levelup-hp-result">
                +{Math.max(1, hpIncrease)} HP
                {hpRollNum + conMod < 1 && <span style={{ fontSize: '0.7rem', opacity: 0.7 }}> (min 1)</span>}
              </span>
            )}
          </div>
        </div>

        {/* ── ASI ── */}
        {hasASI && (
          <div className="levelup-section">
            <div className="levelup-section-title">Ability Score Improvement</div>
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
              <select
                className="creator-ability-select"
                value={asiSingle}
                onChange={e => setAsiSingle(e.target.value as keyof AbilityScores)}
              >
                {ABILITY_KEYS.map(k => (
                  <option key={k} value={k}>
                    {ABILITY_LABELS[k]} ({sheet?.abilityScores[k] ?? 0} → {Math.min(20, (sheet?.abilityScores[k] ?? 0) + 2)})
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select
                  className="creator-ability-select"
                  value={asiFirst}
                  onChange={e => setAsiFirst(e.target.value as keyof AbilityScores)}
                >
                  {ABILITY_KEYS.map(k => (
                    <option key={k} value={k} disabled={k === asiSecond}>
                      {ABILITY_LABELS[k]} ({sheet?.abilityScores[k] ?? 0} → {Math.min(20, (sheet?.abilityScores[k] ?? 0) + 1)})
                    </option>
                  ))}
                </select>
                <select
                  className="creator-ability-select"
                  value={asiSecond}
                  onChange={e => setAsiSecond(e.target.value as keyof AbilityScores)}
                >
                  {ABILITY_KEYS.map(k => (
                    <option key={k} value={k} disabled={k === asiFirst}>
                      {ABILITY_LABELS[k]} ({sheet?.abilityScores[k] ?? 0} → {Math.min(20, (sheet?.abilityScores[k] ?? 0) + 1)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* ── New Features ── */}
        <div className="levelup-features">
          {features.filter(f => !f.linkedChoice && f.name !== 'Ability Score Improvement').map(f => (
            <div key={f.name} className="levelup-feature">
              <div className="levelup-feature-name">{f.name}</div>
              <div className="levelup-feature-desc">{f.description}</div>
              {f.choice && (
                <div style={{ marginTop: '0.5rem' }}>
                  <label className="levelup-choice-label">{f.choice.label}:</label>
                  <select
                    className="creator-ability-select"
                    value={choices[f.choice.key] ?? ''}
                    onChange={e => setChoices(prev => ({ ...prev, [f.choice!.key]: e.target.value }))}
                  >
                    {f.choice.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
          {features.filter(f => !f.linkedChoice && f.name !== 'Ability Score Improvement').length === 0 && !hasASI && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No new features this level.</p>
          )}
        </div>

        <button
          className="levelup-btn"
          onClick={handleConfirm}
          disabled={!canConfirm}
          style={{ opacity: canConfirm ? 1 : 0.45 }}
        >
          {canConfirm ? 'Confirm Level Up' : `Enter your d${hitDie} roll to confirm`}
        </button>
      </div>
    </div>
  )
}
