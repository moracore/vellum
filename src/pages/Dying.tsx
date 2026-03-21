import { useState, useEffect } from 'react'
import { useCharacter } from '../context/CharacterContext'
import { HeartCrack, HeartPulse } from 'lucide-react'

interface Props {
  onStabilized: () => void
}

const FAIL_BG = [
  'rgba(160, 0, 0, 0.08)',
  'rgba(160, 0, 0, 0.22)',
  'rgba(160, 0, 0, 0.42)',
]

export default function Dying({ onStabilized }: Props) {
  const { character, recordDeathSave, stabilize } = useCharacter()
  const [stabilizeModal, setStabilizeModal] = useState(false)

  useEffect(() => {
    if (character && character.deathSaves[0] >= 3) setStabilizeModal(true)
  }, [character?.deathSaves[0]]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!character) return null

  const failures = character.deathSaves[1]
  const isDead = failures >= 3

  const bgOverlay = FAIL_BG[Math.min(failures, 2)]

  const handleStabilize = () => {
    stabilize()
    onStabilized()
  }

  return (
    <div className="dying-page" style={{ '--dying-red': bgOverlay } as React.CSSProperties}>
      <div className="dying-bg-tint" />

      <div className="dying-content">

        <div className="dying-explainer">
          <div className="dying-explainer-title">
            {isDead ? (
              <>
                <HeartCrack size={20} /> {`${character.name} Has Died`}
              </>
            ) : (
              <>
                <HeartPulse size={20} /> {`${character.name} Is Dying`}
              </>
            )}
          </div>
          {!isDead && (
            <p className="dying-explainer-text">
              You are unconscious and fighting for your life. On each of your turns,
              roll a <strong>d20</strong> — no modifiers.
            </p>
          )}
          {!isDead && (
            <div className="dying-rules">
              <div className="dying-rule dying-rule--success">
                <span className="dying-rule-roll">10 or higher</span>
                <span className="dying-rule-label">→ Success</span>
              </div>
              <div className="dying-rule dying-rule--fail">
                <span className="dying-rule-roll">Below 10</span>
                <span className="dying-rule-label">→ Failure</span>
              </div>
              <div className="dying-rule">
                <span className="dying-rule-roll">Natural 20</span>
                <span className="dying-rule-label">→ Regain 1 HP</span>
              </div>
              <div className="dying-rule dying-rule--fail">
                <span className="dying-rule-roll">Natural 1</span>
                <span className="dying-rule-label">→ 2 Failures</span>
              </div>
            </div>
          )}
          {isDead && (
            <p className="dying-explainer-text">
              Your character has suffered three death save failures.
              Await your Dungeon Master.
            </p>
          )}
        </div>

        {!isDead && (
          <>
            <div className="dying-saves">
              <div className="dying-save-row">
                <span className="dying-save-label dying-save-label--success">Successes</span>
                <div className="dying-pips">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className={`dying-pip dying-pip--success ${i < character.deathSaves[0] ? 'on' : ''}`}
                      onClick={() => character.deathSaves[0] < 3 && recordDeathSave('success')}
                    />
                  ))}
                </div>
              </div>

              <div className="dying-save-row">
                <span className="dying-save-label dying-save-label--fail">Failures</span>
                <div className="dying-pips">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className={`dying-pip dying-pip--fail ${i < character.deathSaves[1] ? 'on' : ''}`}
                      onClick={() => character.deathSaves[1] < 3 && recordDeathSave('failure')}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="dying-hint">
              Tap a pip to record a success or failure
            </div>
          </>
        )}
      </div>

      {stabilizeModal && (
        <div className="dying-modal-overlay">
          <div className="dying-modal">
            <div className="dying-modal-title">Three Successes!</div>
            <p className="dying-modal-body">
              You threw a successful save? Successfully avoiding death?
            </p>
            <div className="dying-modal-btns">
              <button className="dying-modal-btn dying-modal-btn--yes" onClick={handleStabilize}>
                Yes — I Survived!
              </button>
              <button className="dying-modal-btn dying-modal-btn--no" onClick={() => setStabilizeModal(false)}>
                No, mistake
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
