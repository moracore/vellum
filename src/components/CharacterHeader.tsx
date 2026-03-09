import { useCharacter } from '../context/CharacterContext'

export default function CharacterHeader() {
  const { sheet } = useCharacter()
  if (!sheet) return null

  return (
    <div className="sheet-header">
      <div className="sheet-header-names">
        <div className="sheet-header-charname">{sheet.characterName}</div>
        <div className="sheet-header-playername">{sheet.playerName}</div>
      </div>
      <div className="sheet-header-fields">
        <div className="sheet-hfield">
          <span className="sheet-hfield-val">{sheet.level || '—'}</span>
          <span className="sheet-hfield-lbl">Level</span>
        </div>
        <div className="sheet-hfield">
          <span className="sheet-hfield-val">
            {[sheet.class, sheet.subclass].filter(Boolean).join(' · ') || '—'}
          </span>
          <span className="sheet-hfield-lbl">Class</span>
        </div>
        <div className="sheet-hfield">
          <span className="sheet-hfield-val">{sheet.race || '—'}</span>
          <span className="sheet-hfield-lbl">Race</span>
        </div>
      </div>
    </div>
  )
}
