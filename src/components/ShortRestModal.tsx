import { useState } from 'react'
import { useCharacter } from '../context/CharacterContext'

interface Props {
  onClose: () => void
}

function mod(score: number) { return Math.floor((score - 10) / 2) }

function hitDieSize(hitDice: string): number {
  const m = hitDice.match(/d(\d+)/)
  return m ? parseInt(m[1]) : 8
}

export default function ShortRestModal({ onClose }: Props) {
  const { character, shortRest } = useCharacter()
  const [diceToSpend, setDiceToSpend] = useState(0)

  if (!character) return null

  const diceAvailable = character.hitDiceCurrent ?? 0
  const dieSize = hitDieSize(character.hitDice)
  const conMod = mod(character.abilityScores.con)

  const avgPerDie = Math.max(1, Math.ceil(dieSize / 2) + 1 + conMod)
  const estimatedHp = diceToSpend * avgPerDie

  const handleTakeRest = () => {
    shortRest(diceToSpend, estimatedHp)
    onClose()
  }

  return (
    <div className="levelup-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="levelup-card levelup-card--full">
        <div className="levelup-title">Short Rest</div>

        <div className="levelup-section">
          <div className="levelup-section-title">Hit Dice</div>
          <p className="levelup-section-desc">
            Spend hit dice to recover HP. d{dieSize}{conMod >= 0 ? ` + ${conMod}` : ` ${conMod}`} per die.
            {diceAvailable === 0 && ' No hit dice remaining.'}
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Available: {diceAvailable} / {character.level} d{dieSize}
          </p>

          {diceAvailable > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                className="resource-btn resource-btn-use"
                style={{ fontSize: '1.2rem', width: '2rem', height: '2rem' }}
                onClick={() => setDiceToSpend(d => Math.max(0, d - 1))}
                disabled={diceToSpend === 0}
              >−</button>
              <span style={{ fontSize: '1.4rem', fontWeight: 600, minWidth: '2rem', textAlign: 'center' }}>
                {diceToSpend}
              </span>
              <button
                className="resource-btn resource-btn-gain"
                style={{ fontSize: '1.2rem', width: '2rem', height: '2rem' }}
                onClick={() => setDiceToSpend(d => Math.min(diceAvailable, d + 1))}
                disabled={diceToSpend >= diceAvailable}
              >+</button>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>dice to spend</span>
            </div>
          )}

          {diceToSpend > 0 && (
            <p style={{ marginTop: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>
              ≈ +{estimatedHp} HP (avg {avgPerDie} per die)
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button className="levelup-btn" style={{ flex: 1, opacity: 0.6 }} onClick={onClose}>
            Cancel
          </button>
          <button className="levelup-btn" style={{ flex: 1 }} onClick={handleTakeRest}>
            Take Short Rest
          </button>
        </div>
      </div>
    </div>
  )
}
