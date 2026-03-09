import { useState } from 'react'
import { findCharacter } from '../data/characters'
import { useCharacter } from '../context/CharacterContext'

interface Props {
  onLoaded: () => void
}

export default function CharacterSelect({ onLoaded }: Props) {
  const { loadCharacter } = useCharacter()
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const markdown = findCharacter(query)
    if (!markdown) {
      setError('No character found. Check your name and try again.')
      return
    }
    await loadCharacter(markdown)
    onLoaded()
  }

  return (
    <div className="select-screen">
      <div className="select-card">
        <div className="select-scroll" />
        <h1 className="select-title">Vellum</h1>
        <p className="select-subtitle">Enter your name or character name</p>
        <form onSubmit={handleSubmit} className="select-form">
          <input
            className="select-input"
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setError('') }}
            placeholder="e.g. Lucas or Fido"
            autoFocus
          />
          {error && <p className="select-error">{error}</p>}
          <button className="btn-primary" type="submit">Open Sheet</button>
        </form>
      </div>
    </div>
  )
}
