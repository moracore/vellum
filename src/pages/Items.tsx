import { useState, useRef, useEffect } from 'react'
import { useCharacter } from '../context/CharacterContext'

const CURRENCY_KEYS: { idx: number; label: string; color: string }[] = [
  { idx: 0, label: 'GP', color: '#ffd700' },
  { idx: 1, label: 'SP', color: '#aaaaaa' },
  { idx: 2, label: 'CP', color: '#b87333' },
]

export default function Items() {
  const { character, updateCurrency, updateItems } = useCharacter()
  const [editingCurrency, setEditingCurrency] = useState<number | null>(null)
  const [currencyInput, setCurrencyInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const bagText = character?.bag.join('\n') ?? ''

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [bagText])

  if (!character) return null

  const commitCurrency = (idx: number) => {
    const val = parseInt(currencyInput)
    if (!isNaN(val) && val >= 0) {
      const next: [number, number, number] = [...character.currency]
      next[idx] = val
      updateCurrency(next)
    }
    setEditingCurrency(null)
    setCurrencyInput('')
  }

  const handleCurrencyKey = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Enter') commitCurrency(idx)
    if (e.key === 'Escape') { setEditingCurrency(null); setCurrencyInput('') }
  }

  return (
    <div className="page-content">
      {/* Currency */}
      <div className="section">
        <h3 className="section-title">Currency</h3>
        <div className="currency-row">
          {CURRENCY_KEYS.map(({ idx, label, color }) => (
            <div
              key={idx}
              className={`currency-coin ${editingCurrency === idx ? 'active' : ''}`}
              onClick={() => {
                setEditingCurrency(idx)
                setCurrencyInput(String(character.currency[idx]))
              }}
            >
              <span className="coin-symbol" style={{ color }}>◈</span>
              {editingCurrency === idx ? (
                <input
                  className="coin-input"
                  type="number"
                  min={0}
                  value={currencyInput}
                  autoFocus
                  onChange={(e) => setCurrencyInput(e.target.value)}
                  onBlur={() => commitCurrency(idx)}
                  onKeyDown={(e) => handleCurrencyKey(e, idx)}
                />
              ) : (
                <span className="coin-value">{character.currency[idx]}</span>
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
          value={bagText}
          onChange={(e) => updateItems(e.target.value)}
          placeholder="List your items, equipment, and gear here..."
          rows={10}
        />
      </div>
    </div>
  )
}
