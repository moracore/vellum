import { useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { useCharacter } from '../context/CharacterContext'
import { findSpell, type SpellData } from '../data/spells'
import { CLASS_SPELL_LIST } from '../data/classSpellList'
import { CLASS_PROGRESSION } from '../data/classProgression'

const LEVEL_LABELS = ['Cantrips', '1st Level', '2nd Level', '3rd Level', '4th Level', '5th Level']

interface Props {
  onClose: () => void
}

export default function SpellChooser({ onClose }: Props) {
  const { sheet, updateSpells } = useCharacter()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  if (!sheet) return null

  const progression = CLASS_PROGRESSION[sheet.class]
  if (!progression) return null

  const classSpells = CLASS_SPELL_LIST[sheet.class] ?? {}
  const lvlIdx = sheet.level - 1
  const maxSlotLevel = progression.maxSpellLevel[lvlIdx] ?? 0
  const neededCantrips = progression.cantripsKnown[lvlIdx] ?? 0
  const neededSpells = progression.spellsKnown[lvlIdx] ?? 0

  const knownNames = new Set(sheet.spells.map(s => s.name.toLowerCase()))
  const knownCantrips = sheet.spells.filter(s => s.level === 0).length
  const knownSpells = sheet.spells.filter(s => s.level > 0).length

  const slotsCantrips = Math.max(0, neededCantrips - knownCantrips)
  const slotsSpells = Math.max(0, neededSpells - knownSpells)
  const totalSlots = slotsCantrips + slotsSpells

  // Build available spell list grouped by level, excluding already known
  const available: { level: number; spells: SpellData[] }[] = []
  for (let lvl = 0; lvl <= maxSlotLevel; lvl++) {
    const names = classSpells[lvl] ?? []
    const spells = names
      .filter(n => !knownNames.has(n.toLowerCase()))
      .map(n => findSpell(n))
      .filter((s): s is SpellData => s != null)
    if (spells.length > 0) available.push({ level: lvl, spells })
  }

  // Count how many of selected are cantrips vs levelled
  const selectedCantrips = [...selected].filter(n => {
    const s = findSpell(n)
    return s?.level === 0
  }).length
  const selectedSpells = selected.size - selectedCantrips

  const canSelect = (spell: SpellData): boolean => {
    if (selected.has(spell.name)) return true
    if (spell.level === 0) return selectedCantrips < slotsCantrips
    return selectedSpells < slotsSpells
  }

  const toggleSpell = (name: string) => {
    const s = findSpell(name)
    if (!s) return
    const next = new Set(selected)
    if (next.has(name)) {
      next.delete(name)
    } else if (canSelect(s)) {
      next.add(name)
    }
    setSelected(next)
  }

  const confirmLearn = () => {
    const newSpells = [...selected]
      .map(n => findSpell(n))
      .filter((s): s is SpellData => s != null)
      .map(s => ({ ...s, prepared: false }))
    updateSpells([...sheet.spells, ...newSpells])
    onClose()
  }

  const remainingCantrips = slotsCantrips - selectedCantrips
  const remainingSpells = slotsSpells - selectedSpells

  return (
    <div className="chooser-page">

      {/* Header */}
      <div className="chooser-header">
        <button className="chooser-back" onClick={onClose}>
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="chooser-title">Learn Spells</div>
        <div className="chooser-counts">
          {slotsCantrips > 0 && (
            <span className={remainingCantrips === 0 ? 'chooser-count done' : 'chooser-count'}>
              {remainingCantrips > 0 ? `${remainingCantrips} cantrip${remainingCantrips !== 1 ? 's' : ''} left` : 'Cantrips ✓'}
            </span>
          )}
          {slotsSpells > 0 && (
            <span className={remainingSpells === 0 ? 'chooser-count done' : 'chooser-count'}>
              {remainingSpells > 0 ? `${remainingSpells} spell${remainingSpells !== 1 ? 's' : ''} left` : 'Spells ✓'}
            </span>
          )}
        </div>
      </div>

      {/* Spell list */}
      <div className="chooser-scroll">
        {available.length === 0 ? (
          <div className="chooser-empty">No new spells available at this level.</div>
        ) : (
          available.map(({ level, spells }) => (
            <div key={level} className="chooser-group">
              <div className="chooser-group-heading">{LEVEL_LABELS[level]}</div>
              {spells.map(spell => {
                const isSelected = selected.has(spell.name)
                const isExpanded = expanded === spell.name
                const selectable = canSelect(spell)
                return (
                  <div
                    key={spell.name}
                    className={`chooser-card ${isSelected ? 'selected' : ''} ${!selectable && !isSelected ? 'dim' : ''}`}
                  >
                    <div
                      className="chooser-card-row"
                      onClick={() => setExpanded(isExpanded ? null : spell.name)}
                    >
                      <div className="chooser-card-left">
                        <button
                          className={`chooser-pick-btn ${isSelected ? 'picked' : ''}`}
                          onClick={e => { e.stopPropagation(); toggleSpell(spell.name) }}
                          disabled={!selectable && !isSelected}
                        >
                          {isSelected ? <Check size={12} /> : '+'}
                        </button>
                        <div className="chooser-card-info">
                          <span className="chooser-spell-name">{spell.name}</span>
                          <span className="chooser-spell-school">{spell.school}</span>
                        </div>
                      </div>
                      <span className="chooser-chevron">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                    {isExpanded && (
                      <div className="chooser-detail">
                        <div className="chooser-meta">
                          {spell.castingTime && <span><b>Cast</b> {spell.castingTime}</span>}
                          {spell.range       && <span><b>Range</b> {spell.range}</span>}
                          {spell.duration    && <span><b>Dur</b> {spell.duration}</span>}
                          {spell.components  && <span><b>Comp</b> {spell.components}</span>}
                        </div>
                        <p className="chooser-desc">{spell.description}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      {/* Confirm bar */}
      {selected.size > 0 && (
        <div className="chooser-confirm-bar">
          <span className="chooser-confirm-info">
            {selected.size} spell{selected.size !== 1 ? 's' : ''} selected
            {totalSlots > 0 && selected.size < totalSlots ? ` (${totalSlots - selected.size} more available)` : ''}
          </span>
          <button className="chooser-confirm-btn" onClick={confirmLearn}>
            Learn Selected
          </button>
        </div>
      )}

    </div>
  )
}
