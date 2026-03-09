import { useState } from 'react'
import { useCharacter } from '../context/CharacterContext'
import CharacterHeader from '../components/CharacterHeader'
import { CLASS_FEATURES } from '../data/classFeatures'
import { CHOICE_DESCRIPTIONS } from '../data/choiceDescriptions'
import type { Currency } from '../types'

const CURRENCY_KEYS: { key: keyof Currency; label: string; color: string }[] = [
  { key: 'gp', label: 'GP', color: '#ffd700' },
  { key: 'sp', label: 'SP', color: '#aaaaaa' },
  { key: 'cp', label: 'CP', color: '#b87333' },
]

export default function Traits({ hideHeader }: { hideHeader?: boolean } = {}) {
  const { sheet, state, updateChoices, updateCurrency, updateItems } = useCharacter()
  const [coinEdit, setCoinEdit] = useState<keyof Currency | null>(null)
  const [coinInput, setCoinInput] = useState('')
  const [pending, setPending] = useState<{ key: string; option: string } | null>(null)

  if (!sheet || !state) return null

  const classKey = Object.keys(CLASS_FEATURES).find(
    k => k.toLowerCase() === sheet.class.toLowerCase()
  )
  const allFeatures = classKey ? CLASS_FEATURES[classKey] : []
  const features = allFeatures.filter(f => f.level <= sheet.level)

  // Separate normal features from subclass-linked ones
  const mainFeatures = features.filter(f => !f.linkedChoice)
  const linkedFeatures = features.filter(f => f.linkedChoice)

  const handleOptionTap = (choiceKey: string, option: string) => {
    if (sheet.choices[choiceKey]) return // locked
    if (pending?.key === choiceKey && pending.option === option) {
      setPending(null)
    } else {
      setPending({ key: choiceKey, option })
    }
  }

  const confirmChoice = () => {
    if (!pending) return
    updateChoices({ ...sheet.choices, [pending.key]: pending.option })
    setPending(null)
  }

  const commitCoin = (key: keyof Currency) => {
    const v = parseInt(coinInput)
    if (!isNaN(v) && v >= 0) updateCurrency({ ...state.currency, [key]: v })
    setCoinEdit(null)
    setCoinInput('')
  }

  return (
    <div className="traits-page">

      <div className="traits-sticky">
        {!hideHeader && <CharacterHeader />}
      </div>

      <div className="traits-list">
        {mainFeatures.length === 0 ? (
          <div className="trait-no-class">
            {sheet.class ? `No features found for ${sheet.class}.` : 'No class set.'}
          </div>
        ) : (
          mainFeatures.map((f, i) => {
            const confirmed = f.choice ? sheet.choices[f.choice.key] : undefined
            const isPending = f.choice && pending?.key === f.choice.key
            const previewOption = isPending ? pending!.option : undefined
            const pendingDesc = previewOption ? CHOICE_DESCRIPTIONS[previewOption] : undefined

            // Sub-features linked to this choice
            const subfeatures = f.choice
              ? linkedFeatures.filter(lf => lf.linkedChoice === f.choice!.key)
              : []

            return (
              <div key={i} className="trait-card">
                <div className="trait-title-row">
                  <span className="trait-name">{f.name}</span>
                  <span className="trait-level">Lv {f.level}</span>
                </div>

                {/* If choice is confirmed, replace description with choice result */}
                {confirmed ? (
                  <>
                    <div className="trait-confirmed">
                      <span className="trait-confirmed-label">{f.choice!.label}:</span>
                      <span className="trait-confirmed-value">{confirmed}</span>
                    </div>
                    {CHOICE_DESCRIPTIONS[confirmed] && (
                      <p className="trait-desc" style={{ marginTop: 6 }}>
                        {CHOICE_DESCRIPTIONS[confirmed]}
                      </p>
                    )}
                    {/* Show linked subclass features */}
                    {subfeatures.length > 0 && (
                      <div className="trait-subfeatures">
                        {subfeatures.map((sf, j) => (
                          <div key={j} className="trait-subfeature">
                            <span className="trait-subfeature-lv">Lv {sf.level}</span>
                            <span className="trait-subfeature-name">{confirmed} Feature</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="trait-desc">{f.description}</div>
                    {f.choice && (
                      <div className="trait-choice">
                        <div className="trait-choice-label">{f.choice.label}</div>
                        <div className="trait-options">
                          {f.choice.options.map(opt => (
                            <button
                              key={opt}
                              className={`trait-option ${previewOption === opt ? 'previewing' : ''}`}
                              onClick={() => handleOptionTap(f.choice!.key, opt)}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                        {isPending && (
                          <div className="trait-preview">
                            {pendingDesc && (
                              <p className="trait-preview-desc">{pendingDesc}</p>
                            )}
                            <button className="trait-confirm-btn" onClick={confirmChoice}>
                              Confirm — {previewOption}
                            </button>
                          </div>
                        )}
                        {/* Preview future subclass features */}
                        {subfeatures.length > 0 && (
                          <div className="trait-subfeatures" style={{ opacity: 0.45 }}>
                            {subfeatures.map((sf, j) => (
                              <div key={j} className="trait-subfeature">
                                <span className="trait-subfeature-lv">Lv {sf.level}</span>
                                <span className="trait-subfeature-name">Subclass Feature</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Currency + Items */}
      <div className="traits-items">
        <div className="sheet-currency">
          {CURRENCY_KEYS.map(({ key, label, color }) => (
            <div
              key={key}
              className={`sheet-coin ${coinEdit === key ? 'active' : ''}`}
              onClick={() => { setCoinEdit(key); setCoinInput(String(state.currency[key])) }}
            >
              <span className="sheet-coin-symbol" style={{ background: color }} />
              {coinEdit === key
                ? <input
                    className="sheet-coin-input"
                    type="text" inputMode="numeric" pattern="[0-9]*" value={coinInput} autoFocus
                    onChange={e => setCoinInput(e.target.value.replace(/\D/g, ''))}
                    onBlur={() => commitCoin(key)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitCoin(key)
                      if (e.key === 'Escape') { setCoinEdit(null); setCoinInput('') }
                    }}
                  />
                : <span className="sheet-coin-val">{state.currency[key]}</span>}
              <span className="sheet-coin-lbl">{label}</span>
            </div>
          ))}
        </div>
        <textarea
          className="sheet-items-textarea traits-textarea"
          value={state.items}
          onChange={e => updateItems(e.target.value)}
          placeholder="Items & equipment..."
        />
      </div>

    </div>
  )
}
