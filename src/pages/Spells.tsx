import { useState } from 'react'
import { useCharacter } from '../context/CharacterContext'
import CharacterHeader from '../components/CharacterHeader'
import SpellChooser from './SpellChooser'
import { CLASS_PROGRESSION } from '../data/classProgression'
import type { Spell } from '../types'

function fmt(n: number) { return n >= 0 ? `+${n}` : `${n}` }

const LEVEL_LABELS = [
  'Cantrips', '1st', '2nd', '3rd', '4th',
  '5th', '6th', '7th', '8th', '9th',
]

export default function Spells({ hideHeader }: { hideHeader?: boolean } = {}) {
  const { sheet, state, useSpellSlot, updateSpells } = useCharacter()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showChooser, setShowChooser] = useState(false)

  if (!sheet || !state) return null

  if (showChooser) return <SpellChooser onClose={() => setShowChooser(false)} />

  const progression = CLASS_PROGRESSION[sheet.class]
  const lvlIdx = sheet.level - 1
  const slotsCantrips = progression
    ? Math.max(0, (progression.cantripsKnown[lvlIdx] ?? 0) - sheet.spells.filter(s => s.level === 0).length)
    : 0
  const slotsSpells = progression
    ? Math.max(0, (progression.spellsKnown[lvlIdx] ?? 0) - sheet.spells.filter(s => s.level > 0).length)
    : 0
  const spellsToLearn = slotsCantrips + slotsSpells

  const togglePrepared = (spellName: string) => {
    const updated = sheet.spells.map(s =>
      s.name === spellName ? { ...s, prepared: !s.prepared } : s
    )
    updateSpells(updated)
  }

  const spellsByLevel: Record<number, Spell[]> = {}
  for (const spell of sheet.spells) {
    if (!spellsByLevel[spell.level]) spellsByLevel[spell.level] = []
    spellsByLevel[spell.level].push(spell)
  }
  const levels = Object.keys(spellsByLevel).map(Number).sort((a, b) => a - b)

  const hasSpellcasting = !!sheet.spellcastingAbility
  const hasSlots = state.spellSlots.length > 0

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

        {(hasSpellcasting || hasSlots) && (
          <div className="spells-cast-bar">
            {/* Spell slots — left half */}
            {hasSlots && (
              <div className="spells-slots-row">
                {state.spellSlots.map((slot, i) => (
                  <div key={i} className="spells-slot-group">
                    <span className="spells-slot-lv">{i + 1}</span>
                    <div className="spells-slot-pips">
                      {Array.from({ length: slot.max }).map((_, j) => (
                        <button
                          key={j}
                          className={`spells-slot-pip ${j < slot.current ? 'filled' : 'used'}`}
                          onClick={() => j < slot.current && useSpellSlot(i + 1)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Spellcasting stats — right half */}
            {hasSpellcasting && (
              <div className="spells-cast-stats">
                <div className="spells-cast-stat">
                  <span className="spells-cast-val">{sheet.spellcastingAbility!.toUpperCase()}</span>
                  <span className="spells-cast-lbl">Ability</span>
                </div>
                {sheet.spellAttackBonus != null && (
                  <div className="spells-cast-stat">
                    <span className="spells-cast-val">{fmt(sheet.spellAttackBonus)}</span>
                    <span className="spells-cast-lbl">Attack</span>
                  </div>
                )}
                {sheet.spellSaveDc != null && (
                  <div className="spells-cast-stat">
                    <span className="spells-cast-val">{sheet.spellSaveDc}</span>
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
        {levels.length === 0 ? (
          <div className="spells-empty">No spells recorded.</div>
        ) : (
          <div className="spell-columns">
            {levels.map(level => (
              <div key={level} className="spell-level-group">
                <div className="spell-level-heading">{LEVEL_LABELS[level]}</div>
                {spellsByLevel[level].map(spell => (
                  <div key={spell.name} className="spell-card">
                    <div
                      className="spell-header"
                      onClick={() => setExpanded(expanded === spell.name ? null : spell.name)}
                    >
                      <div className="spell-header-left">
                        {level > 0 && (
                          <button
                            className={`prepare-dot ${spell.prepared ? 'prepared' : ''}`}
                            onClick={e => { e.stopPropagation(); togglePrepared(spell.name) }}
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
                          {spell.castingTime && <span><b>Cast</b> {spell.castingTime}</span>}
                          {spell.range      && <span><b>Range</b> {spell.range}</span>}
                          {spell.duration   && <span><b>Dur</b> {spell.duration}</span>}
                          {spell.components && <span><b>Comp</b> {spell.components}</span>}
                        </div>
                        {spell.description && <p className="spell-desc">{spell.description}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
