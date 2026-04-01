import { useState, useMemo } from 'react'
import { ArrowLeft, Check, Minus } from 'lucide-react'
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

  // Track additions and removals separately from the current known set
  const [toAdd, setToAdd] = useState<Set<number>>(new Set())
  const [toRemove, setToRemove] = useState<Set<number>>(new Set())

  if (!character) return null

  const classRow = db.classes.find(c => c.name.toLowerCase() === character.class.toLowerCase())
  if (!classRow || !db.loaded) return null

  const classId = classRow.class_id
  const isPreparedCaster = classRow.prepared_level_divisor != null

  const subclassRow = character.subclass
    ? db.getSubclassesForClass(classId).find(s => s.name.toLowerCase() === character.subclass!.toLowerCase())
    : undefined
  const subclassId = subclassRow?.subclass_id ?? null
  const { cantrips: neededCantrips, spells: neededSpells } = db.getKnownCounts(classId, subclassId, character.level)

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

  // ── Build the set of trait-granted spell IDs (not toggleable) ──
  const traitGrantedIds = useMemo(() => {
    const ids = new Set<number>()
    if (!db.loaded) return ids
    const allTraitIds: number[] = []
    const raceRow = db.races.find(r => r.name.toLowerCase() === character.race.toLowerCase())
    if (raceRow) allTraitIds.push(...raceRow.trait_ids)
    if (character.traits) allTraitIds.push(...character.traits)
    const cId = classRow?.class_id ?? null
    const subclassRow = db.loaded && cId && character.subclass
      ? db.getSubclassesForClass(cId).find(s => s.name.toLowerCase() === character.subclass!.toLowerCase())
      : undefined
    const subclassId = subclassRow?.subclass_id ?? null
    if (cId !== null) {
      for (let lv = 1; lv <= character.level; lv++) {
        const rows = db.getProgressionAtLevel(cId, subclassId, lv)
        for (const r of rows) allTraitIds.push(...r.feature_ids)
      }
    }
    for (const tid of allTraitIds) {
      for (const ts of db.getTraitSpells(tid, character.level)) {
        ids.add(ts.spell_id)
      }
    }
    return ids
  }, [character.race, character.traits, character.class, character.subclass, character.level, classRow?.class_id])

  const allClassSpells = db.getClassSpells(classId)

  // Current known spell IDs (before any changes)
  const baseKnownIds = new Set(character.spellsByLevel.flat())

  // "Effective" known state = (base + toAdd) - toRemove
  const effectiveKnownIds = new Set<number>()
  for (const id of baseKnownIds) {
    if (!toRemove.has(id)) effectiveKnownIds.add(id)
  }
  for (const id of toAdd) effectiveKnownIds.add(id)

  // Count effective known by category
  const effectiveCantrips = [...effectiveKnownIds].filter(id => {
    const s = db.spells.get(id)
    return s?.level === 0
  }).length
  const effectiveLeveled = effectiveKnownIds.size - effectiveCantrips

  // Slots remaining for known-spell casters
  const slotsCantrips = Math.max(0, neededCantrips - effectiveCantrips)
  const slotsSpells = isPreparedCaster ? Infinity : Math.max(0, neededSpells - effectiveLeveled)

  // Build full class spell list grouped by level
  const spellsByLevel: { level: number; spells: (SpellRow & { known: boolean; traitGranted: boolean })[] }[] = []
  for (let lvl = 0; lvl <= maxSlotLevel; lvl++) {
    const spells = allClassSpells
      .filter(s => s.level === lvl)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(s => ({
        ...s,
        known: effectiveKnownIds.has(s.spell_id),
        traitGranted: traitGrantedIds.has(s.spell_id),
      }))
    if (spells.length > 0) spellsByLevel.push({ level: lvl, spells })
  }

  const canToggleOn = (spell: SpellRow): boolean => {
    if (isPreparedCaster) return true
    // Spells pending removal can always be re-added (undo)
    if (toRemove.has(spell.spell_id)) return true
    if (spell.level === 0) return slotsCantrips > 0
    return slotsSpells > 0
  }

  const toggleSpell = (spellId: number) => {
    const isBaseKnown = baseKnownIds.has(spellId)
    const isPendingAdd = toAdd.has(spellId)
    const isPendingRemove = toRemove.has(spellId)

    if (isPendingRemove) {
      // Undo removal
      const next = new Set(toRemove)
      next.delete(spellId)
      setToRemove(next)
    } else if (isPendingAdd) {
      // Undo addition
      const next = new Set(toAdd)
      next.delete(spellId)
      setToAdd(next)
    } else if (isBaseKnown) {
      // Mark for removal
      const next = new Set(toRemove)
      next.add(spellId)
      setToRemove(next)
    } else {
      // Mark for addition
      const spell = allClassSpells.find(s => s.spell_id === spellId)
      if (spell && canToggleOn(spell)) {
        const next = new Set(toAdd)
        next.add(spellId)
        setToAdd(next)
      }
    }
  }

  const confirmChanges = () => {
    const newByLevel = character.spellsByLevel.map(ids => [...ids])

    // Remove spells
    for (const spellId of toRemove) {
      for (let lvl = 0; lvl <= 9; lvl++) {
        newByLevel[lvl] = newByLevel[lvl].filter(id => id !== spellId)
      }
    }

    // Add spells
    for (const spellId of toAdd) {
      const spell = allClassSpells.find(s => s.spell_id === spellId)
      if (!spell) continue
      if (!newByLevel[spell.level]) newByLevel[spell.level] = []
      newByLevel[spell.level].push(spellId)
    }

    // Clean up prepared spells: remove any that are no longer known
    const allKnown = new Set(newByLevel.flat())
    const newPrepared = character.preparedSpells.filter(id => allKnown.has(id))

    updateSpells(newByLevel, newPrepared)
    onClose()
  }

  const hasChanges = toAdd.size > 0 || toRemove.size > 0
  const addCount = toAdd.size
  const removeCount = toRemove.size

  return (
    <div className="chooser-page">

      {/* Header */}
      <div className="chooser-header">
        <button className="chooser-back" onClick={onClose}>
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="chooser-title">Manage Spells</div>
        <div className="chooser-counts">
          {!isPreparedCaster && (
            <>
              <span className={`chooser-count${slotsCantrips === 0 ? ' done' : ''}`}>
                {effectiveCantrips}/{neededCantrips} cantrips
              </span>
              <span className={`chooser-count${slotsSpells === 0 ? ' done' : ''}`}>
                {effectiveLeveled}/{neededSpells} spells
              </span>
            </>
          )}
        </div>
      </div>

      {/* Spell list */}
      <div className="chooser-scroll">
        {spellsByLevel.length === 0 ? (
          <div className="chooser-empty">No spells available for your class at this level.</div>
        ) : (
          spellsByLevel.map(({ level, spells }) => (
            <div key={level} className="chooser-group">
              <div className="chooser-group-heading">{LEVEL_LABELS[level]}</div>
              {spells.map(spell => {
                const isExpanded = expanded === spell.name
                const isTraitGranted = spell.traitGranted
                const isKnown = spell.known
                const isPendingAdd = toAdd.has(spell.spell_id)
                const isPendingRemove = toRemove.has(spell.spell_id)
                const canToggle = isKnown || isPendingRemove || isPendingAdd || canToggleOn(spell)
                const isDimmed = !canToggle
                return (
                  <div
                    key={spell.spell_id}
                    className={`chooser-card${isKnown ? ' selected' : ''}${isDimmed ? ' dim' : ''}${isPendingRemove ? ' chooser-card--removing' : ''}${isPendingAdd ? ' chooser-card--adding' : ''}`}
                  >
                    <div
                      className="chooser-card-row"
                      onClick={() => setExpanded(isExpanded ? null : spell.name)}
                    >
                      <div className="chooser-card-left">
                        {isTraitGranted ? (
                          <span className="chooser-pick-btn picked chooser-pick-btn--trait" title="Granted by trait">
                            <Check size={12} />
                          </span>
                        ) : (
                          <button
                            className={`chooser-pick-btn${isKnown ? ' picked' : ''}${isPendingRemove ? ' chooser-pick-btn--remove' : ''}`}
                            onClick={e => { e.stopPropagation(); toggleSpell(spell.spell_id) }}
                            disabled={!canToggle}
                          >
                            {isPendingRemove ? <Minus size={12} /> : isKnown ? <Check size={12} /> : '+'}
                          </button>
                        )}
                        <div className="chooser-card-info">
                          <span className="chooser-spell-name">{spell.name}</span>
                          <span className="chooser-spell-school">
                            {spell.school}
                            {isTraitGranted && ' · Trait'}
                          </span>
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
            {addCount > 0 && `+${addCount} added`}
            {addCount > 0 && removeCount > 0 && ', '}
            {removeCount > 0 && `−${removeCount} removed`}
          </span>
          <button className="chooser-confirm-btn" onClick={confirmChanges}>
            Save Changes
          </button>
        </div>
      )}

    </div>
  )
}
