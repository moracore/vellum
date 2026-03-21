import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useCharacter } from '../context/CharacterContext'
import { getSettings, saveSettings } from '../db'
import type { ThemeName } from '../types'
import DBAdmin from './DBAdmin'

const PALETTES: { name: ThemeName; label: string; preview: [string, string, string] }[] = [
  { name: 'arcane',    label: 'Arcane',    preview: ['#141320', '#d4a84b', '#5c5975'] },
  { name: 'ember',     label: 'Ember',     preview: ['#1c1612', '#e8843a', '#6e6058'] },
  { name: 'verdant',   label: 'Verdant',   preview: ['#121c16', '#48c878', '#5a7568'] },
  { name: 'frost',     label: 'Frost',     preview: ['#131a22', '#4aacf0', '#506878'] },
  { name: 'crimson',   label: 'Crimson',   preview: ['#1c1316', '#d64558', '#6e5560'] },
  { name: 'parchment', label: 'Parchment', preview: ['#faf6f0', '#7a5c2e', '#998670'] },
]

export default function Settings({ onClose }: { onClose?: () => void }) {
  const { theme, setTheme } = useTheme()
  const { character, signOut } = useCharacter()

  const [, setSecretSeq] = useState<string[]>([])
  const [showAdmin, setShowAdmin] = useState(false)

  const logSecret = (label: string) => {
    setSecretSeq(prev => {
      const next = [...prev, label].slice(-8)
      if (
        next.length === 8 &&
        next.every((v, i) => i === 0 || v !== next[i - 1])
      ) {
        setShowAdmin(true)
      }
      return next
    })
  }

  const handleSignOut = async () => {
    const s = await getSettings()
    await saveSettings({ ...s, playerName: undefined })
    signOut()
  }

  if (showAdmin) {
    return <DBAdmin onClose={() => { setShowAdmin(false); setSecretSeq([]) }} />
  }

  return (
    <div className="settings-page">
      {onClose && (
        <button onClick={onClose} className="settings-back-btn">
          ← Back
        </button>
      )}

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p className="section-title" onClick={() => logSecret('character')}>Character</p>
        <div className="row-between">
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{character?.name ?? '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {character ? `Played by ${character.player}` : 'No character loaded'}
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleSignOut}
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p className="section-title" onClick={() => logSecret('palette')}>Palette</p>
        <div className="palette-grid">
          {PALETTES.map((p) => (
            <button
              key={p.name}
              className={`palette-swatch${theme === p.name ? ' active' : ''}`}
              onClick={() => setTheme(p.name)}
            >
              <div className="palette-preview" style={{ background: p.preview[0] }}>
                <div className="palette-accent-bar" style={{ background: p.preview[1] }} />
                <div className="palette-text-sample" style={{ color: p.preview[2] }}>Aa</div>
              </div>
              <span className="palette-label">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', paddingBottom: 8 }}>
        Vellum · D&D 5e Character Sheet
      </div>

    </div>
  )
}
