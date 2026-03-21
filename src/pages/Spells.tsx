import { useState } from 'react'
import { useCharacter } from '../context/CharacterContext'
import CharacterHeader from '../components/CharacterHeader'
import SpellChooser from './SpellChooser'
import { db } from '../lib/database'
import type { SpellRow } from '../lib/database'

function fmt(n: number) { return n >= 0 ? `+${n}` : `${n}` }

const LEVEL_LABELS = [
  'Cantrips', '1st', '2nd', '3rd', '4th',
  '5th', '6th', '7th', '8th', '9th',
]

const ABILITY_NAMES: Record<number, string> = {
  1: 'STR', 2: 'DEX', 3: 'CON', 4: 'INT', 5: 'WIS', 6: 'CHA',
}

export default function Spells({ hideHeader }: { hideHeader?: boolean } = {}) {
  const { character, useSpellSlot, restoreSpellSlot, updateSpells, longRest } = useCharacter()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showChooser, setShowChooser] = useState(false)

  if (!character) return null

  if (showChooser) return <SpellChooser onClose={() => setShowChooser(false)} />

  // ── DB-driven learn counts ──
  const classRow = db.loaded
    ? db.classes.find(c => c.name.toLowerCase() === character.class.toLowerCase())
    : undefined
  const classId = classRow?.class_id ?? null

  const progressionRows = db.loaded && classId !== null
    ? db.progression.filter(r =>
        r.class_id === classId &&
        r.subclass_id === null &&
        r.level === character.level
      )
    : []
  const progRow = progressionRows[0]

  const cantripsKnown = progRow?.cantrips_known ?? null
  const spellsKnown = progRow?.spells_known ?? null

  const isPreparedCaster = classRow?.prepared_level_divisor != null
  const isCaster = classRow ? classRow.spellcasting_type !== '3' : false

  // Count known spells from the character's spell data
  const knownCantrips = character.spellsByLevel[0]?.length ?? 0
  const knownLeveled = character.spellsByLevel.slice(1).reduce((sum, ids) => sum + ids.length, 0)

  const slotsCantrips = cantripsKnown !== null
    ? Math.max(0, cantripsKnown - knownCantrips)
    : 0
  const slotsSpells = spellsKnown !== null
    ? Math.max(0, spellsKnown - knownLeveled)
    : 0
  const spellsToLearn = slotsCantrips + slotsSpells

  const togglePrepared = (spellId: number) => {
    const next = character.preparedSpells.includes(spellId)
      ? character.preparedSpells.filter(id => id !== spellId)
      : [...character.preparedSpells, spellId]
    updateSpells(character.spellsByLevel, next)
  }

  // ── Resolve spell IDs to SpellRow objects, grouped by level ──
  const resolvedByLevel: { level: number; spells: (SpellRow & { id: number })[] }[] = []
  for (let lvl = 0; lvl <= 9; lvl++) {
    const ids = character.spellsByLevel[lvl] ?? []
    if (ids.length === 0) continue
    const spells = ids
      .map(id => {
        const row = db.spells.get(id)
        return row ? { ...row, id } : null
      })
      .filter((s): s is SpellRow & { id: number } => s !== null)
    if (spells.length > 0) resolvedByLevel.push({ level: lvl, spells })
  }

  const hasSpellcasting = character.spellAbility !== null
  const hasSlots = character.spellSlotsMax.some(n => n > 0)

  const isWarlock = character.class.toLowerCase() === 'warlock'

  return (
    <div className="spells-page">

      {/* ── Sticky header ── */}
      <div className="spells-sticky">
        {!hideHeader && <CharacterHeader />}
        {spellsToLearn > 0 && (
          <button className="spells-learn-banner" onClick={() => setShowChooser(true)}>
            ✦ You can learn {slotsSpells > 0 ? `${slotsSpells} spell${slotsSpells !== 1 ? 's' : ''}` : ''}
            {slotsSpells > 0 && slotsCantrips > 0 ? ' and ' : ''}
            {slotsCantrips > 0 ? `${slotsCantrips} cantrip${slotsCantrips !== 1 ? 's' : ''}` : ''} — Tap to choose
          </button>
        )}
        {spellsToLearn === 0 && isCaster && (
          <button className="spells-learn-banner" onClick={() => setShowChooser(true)}>
            {isPreparedCaster ? '✦ Manage Prepared Spells' : '✦ Browse Class Spells'}
          </button>
        )}

        {(hasSpellcasting || hasSlots) && (
          <div className="spells-cast-bar">
            {hasSlots && (
              <div className="spells-slots-section">
                {isWarlock && (
                  <div className="spells-pact-label">Pact Slots (Level {character.spellSlotsMax.filter(n => n > 0).length})</div>
                )}
                <div className="spells-slots-row">
                  {character.spellSlotsMax.map((max, i) => {
                    if (max === 0) return null
                    return (
                      <div key={i} className="spells-slot-group">
                        <span className="spells-slot-lv">{isWarlock ? '' : i + 1}</span>
                        <div className="spells-slot-pips">
                          {Array.from({ length: max }).map((_, j) => (
                            <button
                              key={j}
                              className={`spells-slot-dot ${j < character.spellSlots[i] ? 'filled' : 'used'}`}
                              onClick={() => {
                                if (j < character.spellSlots[i]) useSpellSlot(i + 1)
                                else restoreSpellSlot(i + 1)
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {hasSpellcasting && (
              <div className="spells-cast-stats">
                <div className="spells-cast-stat">
                  <span className="spells-cast-val">{ABILITY_NAMES[character.spellAbility!] ?? '—'}</span>
                  <span className="spells-cast-lbl">Ability</span>
                </div>
                {character.spellAttackBonus != null && (
                  <div className="spells-cast-stat">
                    <span className="spells-cast-val">{fmt(character.spellAttackBonus)}</span>
                    <span className="spells-cast-lbl">Attack</span>
                  </div>
                )}
                {character.spellSaveDc != null && (
                  <div className="spells-cast-stat">
                    <span className="spells-cast-val">{character.spellSaveDc}</span>
                    <span className="spells-cast-lbl">Save DC</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Spell columns ── */}
      <div className="spells-scroll">
        {resolvedByLevel.length === 0 ? (
          <div className="spells-empty">No spells recorded.</div>
        ) : (
          <div className="spell-columns">
            {resolvedByLevel.map(({ level, spells }) => (
              <div key={level} className="spell-level-group">
                <div className="spell-level-heading">{LEVEL_LABELS[level]}</div>
                {spells.map(spell => {
                  const isPrepared = character.preparedSpells.includes(spell.spell_id)
                  return (
                    <div key={spell.spell_id} className="spell-card">
                      <div
                        className="spell-header"
                        onClick={() => setExpanded(expanded === spell.name ? null : spell.name)}
                      >
                        <div className="spell-header-left">
                          {level > 0 && (
                            <button
                              className={`prepare-dot ${isPrepared ? 'prepared' : ''}`}
                              onClick={e => { e.stopPropagation(); togglePrepared(spell.spell_id) }}
                            />
                          )}
                          <span className="spell-name">{spell.name}</span>
                        </div>
                        <div className="spell-header-right">
                          <span className="spell-school">{spell.school}</span>
                          <span className="spell-chevron">{expanded === spell.name ? '▲' : '▼'}</span>
                        </div>
                      </div>
                      {expanded === spell.name && (
                        <div className="spell-detail">
                          <div className="spell-meta">
                            {spell.casting_time && <span><b>Cast</b> {spell.casting_time}</span>}
                            {spell.range        && <span><b>Range</b> {spell.range}</span>}
                            {spell.duration     && <span><b>Dur</b> {spell.duration}</span>}
                            {spell.components   && <span><b>Comp</b> {spell.components}</span>}
                          </div>
                          {spell.description && <p className="spell-desc">{spell.description}</p>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {hasSlots && (
          <button className="spells-long-rest-btn" onClick={longRest}>
            Long Rest — Restore All
          </button>
        )}
      </div>
    </div>
  )
}
