import { useState } from 'react'
import { useCharacter } from '../context/CharacterContext'

interface Props {
  onClose: () => void
}

export default function DMEdit({ onClose }: Props) {
  const { rawMarkdown, sheet, applyMarkdown, setDmMode } = useCharacter()
  const [raw, setRaw] = useState(rawMarkdown ?? '')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    try {
      applyMarkdown(raw)
      setSaved(true)
      setError('')
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Could not parse markdown — check your edits.')
    }
  }

  const handleClose = () => {
    setDmMode(false)
    onClose()
  }

  return (
    <div className="dm-edit-overlay">
      <div className="dm-edit-header">
        <span className="dm-edit-title">DM Edit — {sheet?.characterName}</span>
        <div className="dm-edit-actions">
          {saved && <span className="dm-saved">Saved ✓</span>}
          <button className="btn-primary" onClick={handleSave}>Save</button>
          <button className="btn-secondary" onClick={handleClose}>Lock</button>
        </div>
      </div>
      {error && <p className="dm-error">{error}</p>}
      <textarea
        className="dm-textarea"
        value={raw}
        onChange={(e) => { setRaw(e.target.value); setError('') }}
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
      />
    </div>
  )
}
