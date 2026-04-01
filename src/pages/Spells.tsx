import { useState, useEffect } from 'react'
import { useCharacter } from '../context/CharacterContext'
import CharacterHeader from '../components/CharacterHeader'
import SpellChooser from './SpellChooser'
import { db } from '../lib/database'
import type { SpellRow } from '../lib/database'

function fmt(n: number) { return n >= 0 ? `+${n}` : `${n}` }

const LEVEL_LABELS = ['Cantrips', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']
const ABILITY_NAMES: Record<number, string> = { 1: 'STR', 2: 'DEX', 3: 'CON', 4: 'INT', 5: 'WIS', 6: 'CHA' }
const SORC_TRAIT_ID = 185

export default function Spells({ hideHeader }: { hideHeader?: boolean } = {}) {
  const { character, useSpellSlot, restoreSpellSlot, updateCharacter } = useCharacter()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showChooser, setShowChooser] = useState(false)

  // Init sorcery points resource if missing
  useEffect(() => {
    if (!character || character.class.toLowerCase() !== 'sorcerer') return
    if (character.resources[SORC_TRAIT_ID] !== undefined) return
    const classRow = db.loaded ? db.classes.find(c => c.name.toLowerCase() === 'sorcerer') : undefined
    if (!classRow) return
    const slotsRow = db.getSpellSlots(classRow.class_id, character.level)
    const max = slotsRow?.sorcery_points ?? 0
    if (max > 0) {
      updateCharacter({ resources: { ...character.resources, [SORC_TRAIT_ID]: { current: max, max } } })
    }
  }, [character?.class, character?.level]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!character) return null
  if (showChooser) return <SpellChooser onClose={() => setShowChooser(false)} />

  // ── Class info from DB ──
  const classRow = db.loaded
    ? db.classes.find(c => c.name.toLowerCase() === character.class.toLowerCase())
    : undefined
  const classId = classRow?.class_id ?? null

  const subclassRow = db.loaded && classId && character.subclass
    ? db.getSubclassesForClass(classId).find(
        s => s.name.toLowerCase() === character.subclass!.toLowerCase()
      )
    : undefined
  const subclassId = subclassRow?.subclass_id ?? null

  const { cantrips: cantripsKnown, spells: spellsKnown } = db.loaded && classId !== null
    ? db.getKnownCounts(classId, subclassId, character.level)
    : { cantrips: 0, spells: 0 }
  const isCaster       = classRow ? classRow.spellcasting_type !== '3' : false
  const isWarlock      = character.class.toLowerCase() === 'warlock'
  const isSorcerer     = character.class.toLowerCase() === 'sorcerer'

  // ── Learn counts ──
  const knownCantrips  = character.spellsByLevel[0]?.length ?? 0
  const knownLeveled   = character.spellsByLevel.slice(1).reduce((sum, ids) => sum + ids.length, 0)
  const slotsCantrips  = Math.max(0, cantripsKnown - knownCantrips)
  const slotsSpells    = Math.max(0, spellsKnown - knownLeveled)
  const spellsToLearn  = slotsCantrips + slotsSpells

  // ── Sorcery points ──
  const slotsRow       = classId !== null ? db.getSpellSlots(classId, character.level) : null
  const sorceryMax     = slotsRow?.sorcery_points ?? 0
  const sorceryCurrent = character.resources[SORC_TRAIT_ID]?.current ?? sorceryMax

  const useSorcPoint  = () => {
    if (sorceryCurrent <= 0) return
    updateCharacter({ resources: { ...character.resources, [SORC_TRAIT_ID]: { current: sorceryCurrent - 1, max: sorceryMax } } })
  }
  const gainSorcPoint = () => {
    if (sorceryCurrent >= sorceryMax) return
    updateCharacter({ resources: { ...character.resources, [SORC_TRAIT_ID]: { current: sorceryCurrent + 1, max: sorceryMax } } })
  }

  // ── Collect trait-granted spell IDs from all sources ──
  const traitGrantedIds = new Set<number>()
  if (db.loaded) {
    const allTraitIds: number[] = []

    // 1. Race traits
    const raceRow = db.races.find(r => r.name.toLowerCase() === character.race.toLowerCase())
    if (raceRow) allTraitIds.push(...raceRow.trait_ids)

    // 2. Character extra traits
    if (character.traits) allTraitIds.push(...character.traits)

    // 3. Class/subclass progression traits (e.g. Psionic Spells grants Mind Sliver)
    if (classId !== null) {
      for (let lv = 1; lv <= character.level; lv++) {
        const rows = db.getProgressionAtLevel(classId, subclassId, lv)
        for (const r of rows) allTraitIds.push(...r.feature_ids)
      }
    }

    for (const tid of allTraitIds) {
      for (const ts of db.getTraitSpells(tid, character.level)) {
        traitGrantedIds.add(ts.spell_id)
      }
    }
  }

  // ── Resolve spell IDs → SpellRow (class spells + trait-granted) ──
  const resolvedByLevel: { level: number; spells: (SpellRow & { id: number; traitGranted?: boolean })[] }[] = []
  const seenIds = new Set<number>()

  // First pass: class spells from spellsByLevel
  for (let lvl = 0; lvl <= 9; lvl++) {
    const ids = character.spellsByLevel[lvl] ?? []
    for (const id of ids) seenIds.add(id)
  }

  // Build merged list per level
  for (let lvl = 0; lvl <= 9; lvl++) {
    const classIds = character.spellsByLevel[lvl] ?? []
    const classSpells = classIds
      .map(id => { const row = db.spells.get(id); return row ? { ...row, id, traitGranted: traitGrantedIds.has(id) } : null })
      .filter((s): s is SpellRow & { id: number; traitGranted: boolean } => s !== null)

    // Add trait-granted spells not already in spellsByLevel
    const traitSpells: (SpellRow & { id: number; traitGranted: boolean })[] = []
    for (const spellId of traitGrantedIds) {
      if (seenIds.has(spellId)) continue
      const row = db.spells.get(spellId)
      if (row && row.level === lvl) {
        traitSpells.push({ ...row, id: spellId, traitGranted: true })
        seenIds.add(spellId)
      }
    }

    const allSpells = [...classSpells, ...traitSpells]
    if (allSpells.length > 0) resolvedByLevel.push({ level: lvl, spells: allSpells })
  }

  const hasSpellcasting = character.spellAbility !== null
  const hasSlots        = character.spellSlotsMax.some(n => n > 0)

  return (
    <div className="spells-page">

      {/* ── Sticky header ── */}
      <div className="spells-sticky">
        {!hideHeader && <CharacterHeader />}

        {/* Manage spells banner */}
        {isCaster && (
          <button className="spells-learn-banner" onClick={() => setShowChooser(true)}>
            {spellsToLearn > 0 ? (
              <>
                You can learn
                {slotsSpells > 0 ? ` ${slotsSpells} spell${slotsSpells !== 1 ? 's' : ''}` : ''}
                {slotsSpells > 0 && slotsCantrips > 0 ? ' and' : ''}
                {slotsCantrips > 0 ? ` ${slotsCantrips} cantrip${slotsCantrips !== 1 ? 's' : ''}` : ''}
                {' '}— Manage Spells
              </>
            ) : (
              'Manage Spells'
            )}
          </button>
        )}

        {/* Spellcasting stats + spell slot grid (4×3 layout) */}
        {(hasSpellcasting || hasSlots) && (
          <>
            {hasSlots && (
              <div className="spells-top-grid">
                {isWarlock && <div className="spells-pact-label">Pact Magic</div>}
                {character.spellSlotsMax.map((max, i) => {
                  if (max === 0) return null
                  const cur = character.spellSlots[i]
                  return (
                    <div
                      key={i}
                      className={`spell-tile spell-slot-square${cur === 0 ? ' spell-slot-square--empty' : ''}`}
                    >
                      <button
                        className="spell-tile-btn spell-tile-btn--minus"
                        onClick={() => cur > 0 && useSpellSlot(i + 1)}
                        disabled={cur === 0}
                      >−</button>
                      <div className="spell-tile-body">
                        <span className="spell-tile-label">{isWarlock ? 'Pact' : LEVEL_LABELS[i + 1]}</span>
                        <span className="spell-tile-val">{cur}<span className="spell-tile-max">/{max}</span></span>
                      </div>
                      <button
                        className="spell-tile-btn spell-tile-btn--plus"
                        onClick={() => cur < max && restoreSpellSlot(i + 1)}
                        disabled={cur >= max}
                      >+</button>
                    </div>
                  )
                })}
              </div>
            )}

            {hasSpellcasting && (
              <div className="spells-stats-row">
                <div className="spell-tile">
                  <div className="spell-tile-body">
                    <span className="spell-tile-label">Ability</span>
                    <span className="spell-tile-val">{ABILITY_NAMES[character.spellAbility!] ?? '—'}</span>
                  </div>
                </div>
                {character.spellAttackBonus != null && (
                  <div className="spell-tile">
                    <div className="spell-tile-body">
                      <span className="spell-tile-label">Attack</span>
                      <span className="spell-tile-val">{fmt(character.spellAttackBonus)}</span>
                    </div>
                  </div>
                )}
                {character.spellSaveDc != null && (
                  <div className="spell-tile">
                    <div className="spell-tile-body">
                      <span className="spell-tile-label">DC</span>
                      <span className="spell-tile-val">{character.spellSaveDc}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isSorcerer && sorceryMax > 0 && (
              <div className="spells-extra-row">
                <div className="spell-tile spell-tile--resource">
                  <button
                    className="spell-tile-btn spell-tile-btn--minus"
                    onClick={useSorcPoint}
                    disabled={sorceryCurrent <= 0}
                  >−</button>
                  <div className="spell-tile-body">
                    <span className="spell-tile-label">Sorc Pts</span>
                    <span className="spell-tile-val">{sorceryCurrent}<span className="spell-tile-max">/{sorceryMax}</span></span>
                  </div>
                  <button
                    className="spell-tile-btn spell-tile-btn--plus"
                    onClick={gainSorcPoint}
                    disabled={sorceryCurrent >= sorceryMax}
                  >+</button>
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* ── Spell list ── */}
      <div className="spells-scroll">
        {resolvedByLevel.length === 0 ? (
          <div className="spells-empty">No spells recorded.</div>
        ) : (
          <div className="spell-columns">
            {resolvedByLevel.map(({ level, spells }) => (
              <div key={level} className="spell-level-group">
                <div className="spell-level-heading">{LEVEL_LABELS[level]}</div>
                {spells.map(spell => {
                  const key = String(spell.spell_id)
                  return (
                    <div
                      key={key}
                      className="spell-card"
                    >
                      <div
                        className="spell-header"
                        onClick={() => setExpanded(expanded === key ? null : key)}
                      >
                        <div className="spell-header-left">
                          <span className="spell-name">{spell.name}</span>
                          {spell.traitGranted && <span className="spell-trait-badge">Trait</span>}
                        </div>
                        <div className="spell-header-right">
                          <span className="spell-school">{spell.school}</span>
                          <span className="spell-chevron">{expanded === key ? '▲' : '▼'}</span>
                        </div>
                      </div>
                      {expanded === key && (
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

      </div>
    </div>
  )
}
