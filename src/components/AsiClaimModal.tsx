import { useState } from 'react'
import { db } from '../lib/database'
import { useCharacter } from '../context/CharacterContext'
import type { AbilityScores } from '../types'

interface Props {
  level: number
  onDismiss: () => void
}

const ABILITY_KEYS: (keyof AbilityScores)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const ABILITY_LABELS: Record<keyof AbilityScores, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
}

export default function AsiClaimModal({ level, onDismiss }: Props) {
  const { character, updateChoices, updateAbilityScores } = useCharacter()

  const [asiOrFeat, setAsiOrFeat] = useState<'asi' | 'feat'>('asi')
  const [asiMode, setAsiMode] = useState<'+2' | '+1+1'>('+2')
  const [asiSingle, setAsiSingle] = useState<keyof AbilityScores>('str')
  const [asiFirst, setAsiFirst] = useState<keyof AbilityScores>('str')
  const [asiSecond, setAsiSecond] = useState<keyof AbilityScores>('dex')
  const [selectedFeatId, setSelectedFeatId] = useState<number | null>(null)

  if (!character) return null

  // Exclude already-chosen feats
  const chosenFeatNames = new Set(
    Object.entries(character.choices)
      .filter(([k]) => /^feat_\d+$/.test(k))
      .map(([, v]) => v?.toLowerCase())
      .filter(Boolean)
  )
  const isEpicBoon = level === 19
  const featList = isEpicBoon
    ? (db.epicBoonFeats ?? []).filter(f => !chosenFeatNames.has(f.name.toLowerCase()))
    : (db.generalFeats ?? []).filter(f =>
        f.name !== 'Ability Score Improvement' &&
        f.prerequisite_text !== 'Fighting Style' &&
        !chosenFeatNames.has(f.name.toLowerCase())
      )

  const canConfirm = asiOrFeat === 'asi' || selectedFeatId !== null

  function handleConfirm() {
    if (!character) return

    if (asiOrFeat === 'asi') {
      const scores = { ...character.abilityScores }
      if (asiMode === '+2') {
        scores[asiSingle] = Math.min(20, scores[asiSingle] + 2)
        updateChoices({ ...character.choices, [`asi_${level}`]: `+2 ${ABILITY_LABELS[asiSingle]}` })
      } else {
        scores[asiFirst] = Math.min(20, scores[asiFirst] + 1)
        scores[asiSecond] = Math.min(20, scores[asiSecond] + 1)
        updateChoices({ ...character.choices, [`asi_${level}`]: `+1 ${ABILITY_LABELS[asiFirst]}, +1 ${ABILITY_LABELS[asiSecond]}` })
      }
      updateAbilityScores(scores)
    } else if (selectedFeatId !== null) {
      const feat = isEpicBoon
        ? db.getEpicBoonFeat(selectedFeatId)
        : db.getGeneralFeat(selectedFeatId)
      if (feat) {
        updateChoices({ ...character.choices, [`feat_${level}`]: feat.name })
      }
    }

    onDismiss()
  }

  return (
    <div className="levelup-overlay" onClick={e => e.stopPropagation()}>
      <div className="levelup-card levelup-card--full">
        <div className="levelup-title">Level {level} — ASI / Feat</div>

        <div className="levelup-scroll-area">
          <div className="levelup-section">
            <div className="levelup-section-title">
              {isEpicBoon ? 'Epic Boon' : 'Ability Score Improvement'}
            </div>

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
                        {ABILITY_LABELS[k]} ({character.abilityScores[k]} → {Math.min(20, character.abilityScores[k] + 2)})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <select className="creator-ability-select" value={asiFirst}
                      onChange={e => setAsiFirst(e.target.value as keyof AbilityScores)}>
                      {ABILITY_KEYS.map(k => (
                        <option key={k} value={k} disabled={k === asiSecond}>
                          {ABILITY_LABELS[k]} ({character.abilityScores[k]} → {Math.min(20, character.abilityScores[k] + 1)})
                        </option>
                      ))}
                    </select>
                    <select className="creator-ability-select" value={asiSecond}
                      onChange={e => setAsiSecond(e.target.value as keyof AbilityScores)}>
                      {ABILITY_KEYS.map(k => (
                        <option key={k} value={k} disabled={k === asiFirst}>
                          {ABILITY_LABELS[k]} ({character.abilityScores[k]} → {Math.min(20, character.abilityScores[k] + 1)})
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
        </div>

        <div className="levelup-nav">
          <button className="levelup-btn levelup-btn--back" onClick={onDismiss}>Cancel</button>
          <button
            className="levelup-btn"
            onClick={handleConfirm}
            disabled={!canConfirm}
            style={{ opacity: canConfirm ? 1 : 0.45 }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
