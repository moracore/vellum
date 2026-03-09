import { useState, useRef, useEffect } from 'react'
import { useCharacter } from '../context/CharacterContext'
import type { Currency } from '../types'

const CURRENCY_KEYS: { key: keyof Currency; label: string; color: string }[] = [
  { key: 'gp', label: 'GP', color: '#ffd700' },
  { key: 'sp', label: 'SP', color: '#aaaaaa' },
  { key: 'cp', label: 'CP', color: '#b87333' },
]

export default function Items() {
  const { state, updateCurrency, updateItems } = useCharacter()
  const [editingCurrency, setEditingCurrency] = useState<keyof Currency | null>(null)
  const [currencyInput, setCurrencyInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [state?.items])

  if (!state) return null

  const commitCurrency = (key: keyof Currency) => {
    const val = parseInt(currencyInput)
    if (!isNaN(val) && val >= 0) {
      updateCurrency({ ...state.currency, [key]: val })
    }
    setEditingCurrency(null)
    setCurrencyInput('')
  }

  const handleCurrencyKey = (e: React.KeyboardEvent, key: keyof Currency) => {
    if (e.key === 'Enter') commitCurrency(key)
    if (e.key === 'Escape') { setEditingCurrency(null); setCurrencyInput('') }
  }

  return (
    <div className="page-content">
      {/* Currency */}
      <div className="section">
        <h3 className="section-title">Currency</h3>
        <div className="currency-row">
          {CURRENCY_KEYS.map(({ key, label, color }) => (
            <div
              key={key}
              className={`currency-coin ${editingCurrency === key ? 'active' : ''}`}
              onClick={() => {
                setEditingCurrency(key)
                setCurrencyInput(String(state.currency[key]))
              }}
            >
              <span className="coin-symbol" style={{ color }}>◈</span>
              {editingCurrency === key ? (
                <input
                  className="coin-input"
                  type="number"
                  min={0}
                  value={currencyInput}
                  autoFocus
                  onChange={(e) => setCurrencyInput(e.target.value)}
                  onBlur={() => commitCurrency(key)}
                  onKeyDown={(e) => handleCurrencyKey(e, key)}
                />
              ) : (
                <span className="coin-value">{state.currency[key]}</span>
              )}
              <span className="coin-label">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="section items-section">
        <h3 className="section-title">Items & Equipment</h3>
        <textarea
          ref={textareaRef}
          className="items-textarea"
          value={state.items}
          onChange={(e) => updateItems(e.target.value)}
          placeholder="List your items, equipment, and gear here..."
          rows={10}
        />
      </div>
    </div>
  )
}
