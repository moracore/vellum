import { useState } from 'react'
import { useCharacter } from '../context/CharacterContext'
import CharacterHeader from '../components/CharacterHeader'
import { CLASS_FEATURES } from '../data/classFeatures'
import { CHOICE_DESCRIPTIONS } from '../data/choiceDescriptions'
import { RACES } from '../data/races5e'
import type { Currency } from '../types'

const CURRENCY_KEYS: { key: keyof Currency; label: string; color: string }[] = [
  { key: 'gp', label: 'GP', color: '#ffd700' },
  { key: 'sp', label: 'SP', color: '#aaaaaa' },
  { key: 'cp', label: 'CP', color: '#b87333' },
]

export default function Traits({ hideHeader }: { hideHeader?: boolean } = {}) {
  const { sheet, state, updateCurrency, updateItems } = useCharacter()
  const [coinEdit, setCoinEdit] = useState<keyof Currency | null>(null)
  const [coinInput, setCoinInput] = useState('')

  if (!sheet || !state) return null

  const classKey = Object.keys(CLASS_FEATURES).find(
    k => k.toLowerCase() === sheet.class.toLowerCase()
  )
  const allFeatures = classKey ? CLASS_FEATURES[classKey] : []
  const features = allFeatures.filter(f => f.level <= sheet.level)

  // Separate normal features from subclass-linked ones
  const mainFeatures = features.filter(f => !f.linkedChoice)
  const linkedFeatures = features.filter(f => f.linkedChoice)

  // Names to strip from legacy extraTraits: class features + subrace-choice placeholders
  const classFeatureNames = new Set(allFeatures.map(f => f.name))
  const raceData = RACES.find(r => r.name === sheet.race)
  const subraceChoiceNames = new Set(
    (raceData?.traits ?? []).filter(t => t.isSubraceChoice).map(t => t.name)
  )

  // For characters created before raceTraits existed, extraTraits may contain race/class content.
  // Filter class features and subrace-choice placeholders out so they don't appear twice or wrongly.
  // Never filter proficiency entries.
  const profPrefixes = new Set(['Weapon Proficiencies', 'Armour Proficiencies', 'Tool Proficiencies'])
  const cleanedExtras = (sheet.extraTraits ?? []).filter(entry => {
    const name = entry.split(':')[0].trim()
    if (profPrefixes.has(name)) return true
    return !classFeatureNames.has(name) && !subraceChoiceNames.has(name)
  })

  // If raceTraits field exists and is populated, use it; otherwise fall back to cleaned extras as race traits.
  const displayRaceTraits = (sheet.raceTraits ?? []).length > 0
    ? sheet.raceTraits
    : cleanedExtras
  const displayExtraTraits = (sheet.raceTraits ?? []).length > 0 ? cleanedExtras : []

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

        {/* ── Race Traits ── */}
        {displayRaceTraits.length > 0 && (
          <>
            <div className="traits-section-header">Race Traits</div>
            {displayRaceTraits.map((name, i) => {
              const [title, ...rest] = name.split(': ')
              return (
                <div key={`race-${i}`} className="trait-card">
                  <div className="trait-title-row">
                    <span className="trait-name">{title}</span>
                    <span className="trait-level">{sheet.race}</span>
                  </div>
                  {rest.length > 0 && <div className="trait-desc">{rest.join(': ')}</div>}
                </div>
              )
            })}
          </>
        )}

        {/* ── Class Traits ── */}
        <div className="traits-section-header">Class Traits</div>
        {mainFeatures.length === 0 ? (
          <div className="trait-no-class">
            {sheet.class ? `No features found for ${sheet.class}.` : 'No class set.'}
          </div>
        ) : (
          mainFeatures.map((f, i) => {
            const confirmed = f.choice ? sheet.choices[f.choice.key] : undefined

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
                  <div className="trait-desc">{f.description}</div>
                )}
              </div>
            )
          })
        )}

        {/* ── Extra Traits ── */}
        {displayExtraTraits.length > 0 && (
          <>
            <div className="traits-section-header">Extra Traits</div>
            {displayExtraTraits.map((name, i) => {
              const [title, ...rest] = name.split(': ')
              return (
                <div key={`extra-${i}`} className="trait-card">
                  <div className="trait-title-row">
                    <span className="trait-name">{title}</span>
                  </div>
                  {rest.length > 0 && <div className="trait-desc">{rest.join(': ')}</div>}
                </div>
              )
            })}
          </>
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
