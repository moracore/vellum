import { useCharacter } from '../context/CharacterContext'

export default function CharacterHeader() {
  const { character } = useCharacter()
  if (!character) return null

  return (
    <div className="sheet-header">
      <div className="sheet-header-names">
        <div className="sheet-header-charname">{character.name}</div>
        <div className="sheet-header-playername">{character.player}</div>
      </div>
      <div className="sheet-header-fields">
        <div className="sheet-hfield">
          <span className="sheet-hfield-val">{character.level || '—'}</span>
          <span className="sheet-hfield-lbl">Level</span>
        </div>
        <div className="sheet-hfield">
          <span className="sheet-hfield-val">
            {[character.class, character.subclass].filter(Boolean).join(' · ') || '—'}
          </span>
          <span className="sheet-hfield-lbl">Class</span>
        </div>
        <div className="sheet-hfield">
          <span className="sheet-hfield-val">{character.race || '—'}</span>
          <span className="sheet-hfield-lbl">Race</span>
        </div>
      </div>
    </div>
  )
}
