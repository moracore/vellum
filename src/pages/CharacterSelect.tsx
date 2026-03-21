import { useState } from 'react'
import { findCharacter } from '../data/characters'
import { useCharacter } from '../context/CharacterContext'
import { getSettings, saveSettings } from '../db'
import CharacterCreator from './CharacterCreator'

interface Props {
  onLoaded: () => void
}

export default function CharacterSelect({ onLoaded }: Props) {
  const { loadCharacter } = useCharacter()
  const [mode, setMode]     = useState<'find' | 'create'>('find')
  const [charName, setCharName]   = useState('')
  const [playerName, setPlayerName] = useState('')
  const [passkey, setPasskey]       = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const clearError = () => setError('')

  const handleFind = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!charName.trim() || !playerName.trim() || !passkey.trim()) {
      setError('All three fields are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await findCharacter(charName.trim(), playerName.trim(), passkey.trim())
      if (!result) {
        setError('No character found. Check your details and try again.')
        return
      }
      await loadCharacter(result.id)
      const s = await getSettings()
      await saveSettings({ ...s, playerName: playerName.trim() })
      onLoaded()
    } catch {
      setError('Failed to load character. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'create') {
    return <CharacterCreator onComplete={onLoaded} onBack={() => setMode('find')} />
  }

  return (
    <div className="select-screen">
      <div className="select-card">
        <div className="select-scroll" />
        <h1 className="select-title">Vellum</h1>

        <div className="select-tabs">
          <button
            className="select-tab select-tab--active"
            type="button"
          >
            Sign In
          </button>
          <button
            className="select-tab"
            onClick={() => setMode('create')}
            type="button"
          >
            New Character
          </button>
        </div>

        <p className="select-subtitle">Enter your character name, player name, and passkey</p>
        <form onSubmit={handleFind} className="select-form">
          <input
            className="select-input"
            type="text"
            value={charName}
            onChange={(e) => { setCharName(e.target.value); clearError() }}
            placeholder="Character name"
            autoFocus
            disabled={loading}
          />
          <input
            className="select-input"
            type="text"
            value={playerName}
            onChange={(e) => { setPlayerName(e.target.value); clearError() }}
            placeholder="Player name"
            disabled={loading}
          />
          <input
            className="select-input"
            type="text"
            value={passkey}
            onChange={(e) => { setPasskey(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 5)); clearError() }}
            placeholder="Passkey (5 letters)"
            maxLength={5}
            disabled={loading}
            style={{ textTransform: 'lowercase' }}
          />
          {error && <p className="select-error">{error}</p>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Loading…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
