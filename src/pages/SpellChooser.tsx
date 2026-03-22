import { useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { useCharacter } from '../context/CharacterContext'
import { db } from '../lib/database'
import type { SpellRow } from '../lib/database'

const LEVEL_LABELS = ['Cantrips', '1st Level', '2nd Level', '3rd Level', '4th Level', '5th Level',
  '6th Level', '7th Level', '8th Level', '9th Level']

interface Props {
  onClose: () => void
}

export default function SpellChooser({ onClose }: Props) {
  const { character, updateSpells } = useCharacter()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  if (!character) return null

  const classRow = db.classes.find(c => c.name.toLowerCase() === character.class.toLowerCase())
  if (!classRow || !db.loaded) return null

  const classId = classRow.class_id
  const isPreparedCaster = classRow.prepared_level_divisor != null
  const lvlRow = db.progression.find(r =>
    r.class_id === classId && r.level === character.level && r.subclass_id === null
  )
  const neededCantrips = lvlRow?.cantrips_known ?? 0
  const neededSpells = lvlRow?.spells_known ?? 0

  // Max usable spell slot level
  const dbSlots = db.getSpellSlots(classId, character.level)
  const slotCounts = dbSlots ? [
    dbSlots.slot_level_1, dbSlots.slot_level_2, dbSlots.slot_level_3,
    dbSlots.slot_level_4, dbSlots.slot_level_5, dbSlots.slot_level_6,
    dbSlots.slot_level_7, dbSlots.slot_level_8, dbSlots.slot_level_9,
  ] : []
  let maxSlotLevel = 0
  for (let i = slotCounts.length - 1; i >= 0; i--) {
    if (slotCounts[i] > 0) { maxSlotLevel = i + 1; break }
  }
  if (neededCantrips > 0 || isPreparedCaster) maxSlotLevel = Math.max(maxSlotLevel, 0)

  const allClassSpells = db.getClassSpells(classId)

  // Build set of already-known spell IDs
  const knownIds = new Set(character.spellsByLevel.flat())
  const knownCantrips = character.spellsByLevel[0]?.length ?? 0
  const knownLeveled = character.spellsByLevel.slice(1).reduce((sum, ids) => sum + ids.length, 0)

  const slotsCantrips = Math.max(0, neededCantrips - knownCantrips)
  const slotsSpells = isPreparedCaster ? Infinity : Math.max(0, neededSpells - knownLeveled)
  const totalSlots = isPreparedCaster ? Infinity : slotsCantrips + slotsSpells

  // Build available spell list grouped by level, excluding already known
  const available: { level: number; spells: SpellRow[] }[] = []
  for (let lvl = 0; lvl <= maxSlotLevel; lvl++) {
    const spells = allClassSpells
      .filter(s => s.level === lvl && !knownIds.has(s.spell_id))
      .sort((a, b) => a.name.localeCompare(b.name))
    if (spells.length > 0) available.push({ level: lvl, spells })
  }

  // For prepared casters, show already-known spells so they can be removed
  const removable: { level: number; spells: { id: number; name: string; level: number }[] }[] = []
  if (isPreparedCaster) {
    const byLevel: Record<number, { id: number; name: string; level: number }[]> = {}
    for (let lvl = 0; lvl <= 9; lvl++) {
      const ids = character.spellsByLevel[lvl] ?? []
      for (const id of ids) {
        const spell = db.spells.get(id)
        if (!spell) continue
        if (!byLevel[lvl]) byLevel[lvl] = []
        byLevel[lvl].push({ id, name: spell.name, level: lvl })
      }
    }
    for (const lvl of Object.keys(byLevel).map(Number).sort((a, b) => a - b)) {
      removable.push({ level: lvl, spells: byLevel[lvl].sort((a, b) => a.name.localeCompare(b.name)) })
    }
  }

  const [toRemove, setToRemove] = useState<Set<number>>(new Set())

  const selectedCantrips = [...selected].filter(id => {
    const s = allClassSpells.find(sp => sp.spell_id === id)
    return s?.level === 0
  }).length
  const selectedLeveled = selected.size - selectedCantrips

  const canSelect = (spell: SpellRow): boolean => {
    if (selected.has(spell.spell_id)) return true
    if (isPreparedCaster) return true
    if (spell.level === 0) return selectedCantrips < slotsCantrips
    return selectedLeveled < slotsSpells
  }

  const toggleSpell = (spell: SpellRow) => {
    const next = new Set(selected)
    if (next.has(spell.spell_id)) {
      next.delete(spell.spell_id)
    } else if (canSelect(spell)) {
      next.add(spell.spell_id)
    }
    setSelected(next)
  }


  const confirmLearn = () => {
    // Build new spellsByLevel: keep existing minus removed, add selected
    const newByLevel = character.spellsByLevel.map(ids => ids.filter(id => !toRemove.has(id)))

    // Add selected spells to their correct levels
    for (const spellId of selected) {
      const spell = allClassSpells.find(s => s.spell_id === spellId)
      if (!spell) continue
      if (!newByLevel[spell.level]) newByLevel[spell.level] = []
      newByLevel[spell.level].push(spellId)
    }

    // Update prepared spells: remove any that were removed from the list
    const newPrepared = character.preparedSpells.filter(id => !toRemove.has(id))

    updateSpells(newByLevel, newPrepared)
    onClose()
  }

  const remainingCantrips = slotsCantrips - selectedCantrips
  const remainingSpells = isPreparedCaster ? null : slotsSpells - selectedLeveled
  const hasChanges = selected.size > 0 || toRemove.size > 0

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
          {remainingSpells !== null && remainingSpells > 0 && (
            <span className="chooser-count">
              {remainingSpells} spell{remainingSpells !== 1 ? 's' : ''} left
            </span>
          )}
          {isPreparedCaster && (
            <span className="chooser-count">
              {selected.size > 0 ? `+${selected.size}` : ''}{toRemove.size > 0 ? ` −${toRemove.size}` : ''}
              {selected.size === 0 && toRemove.size === 0 ? 'Add or remove spells' : ''}
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
                const isSelected = selected.has(spell.spell_id)
                const isExpanded = expanded === spell.name
                const selectable = canSelect(spell)
                return (
                  <div
                    key={spell.spell_id}
                    className={`chooser-card ${isSelected ? 'selected' : ''} ${!selectable && !isSelected ? 'dim' : ''}`}
                  >
                    <div
                      className="chooser-card-row"
                      onClick={() => setExpanded(isExpanded ? null : spell.name)}
                    >
                      <div className="chooser-card-left">
                        <button
                          className={`chooser-pick-btn ${isSelected ? 'picked' : ''}`}
                          onClick={e => { e.stopPropagation(); toggleSpell(spell) }}
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
                          {spell.casting_time && <span><b>Cast</b> {spell.casting_time}</span>}
                          {spell.range        && <span><b>Range</b> {spell.range}</span>}
                          {spell.duration     && <span><b>Dur</b> {spell.duration}</span>}
                          {spell.components   && <span><b>Comp</b> {spell.components}</span>}
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
      {hasChanges && (
        <div className="chooser-confirm-bar">
          <span className="chooser-confirm-info">
            {selected.size} spell{selected.size !== 1 ? 's' : ''} selected
            {totalSlots !== Infinity && totalSlots > 0 && selected.size < totalSlots ? ` (${totalSlots - selected.size} more available)` : ''}
          </span>
          <button className="chooser-confirm-btn" onClick={confirmLearn}>
            Confirm
          </button>
        </div>
      )}

    </div>
  )
}
