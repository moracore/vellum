import { useState } from 'react'
import { useCharacter } from '../context/CharacterContext'
import CharacterHeader from '../components/CharacterHeader'
import ResourceTracker from '../components/ResourceTracker'
import AsiClaimModal from '../components/AsiClaimModal'
import { db } from '../lib/database'
import type { TraitRow } from '../lib/database'
import { CHOICE_DESCRIPTIONS } from '../data/choiceDescriptions'

const FIGHTING_STYLE_NAMES = new Set([
  'Archery', 'Defense', 'Dueling', 'Great Weapon Fighting', 'Protection',
  'Two-Weapon Fighting', 'Blind Fighting', 'Interception', 'Superior Technique',
  'Thrown Weapon Fighting', 'Unarmed Fighting', 'Blessed Warrior', 'Druidic Warrior',
])

interface ResolvedTrait {
  key: string
  name: string
  description: string
  type: 'P' | 'A' | 'R'
  traitId: number | null
  grantedSpells: { name: string; level: number; usesPerRest: number | null }[]
}

export default function Traits({ hideHeader }: { hideHeader?: boolean } = {}) {
  const { character, useResource, gainResource } = useCharacter()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [asiClaimLevel, setAsiClaimLevel] = useState<number | null>(null)

  if (!character) return null

  // ── Resolve class/race IDs from names ──
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

  const raceRow = db.loaded
    ? db.races.find(r => r.name.toLowerCase() === character.race.toLowerCase())
    : undefined

  // ── Detect unclaimed ASI levels ──
  const unclaimedAsiLevels: number[] = []
  if (db.loaded && classId !== null) {
    const asiLevels = db.getAsiLevels(classId, subclassId, character.level)
    for (const lv of asiLevels) {
      const hasFeat = character.choices[`feat_${lv}`]
      const hasAsi  = character.choices[`asi_${lv}`]
      if (!hasFeat && !hasAsi) unclaimedAsiLevels.push(lv)
    }
  }

  // ── Helper: resolve granted spells for a trait ──
  const resolveTraitSpells = (traitId: number): ResolvedTrait['grantedSpells'] => {
    const grants = db.getTraitSpells(traitId, character.level)
    return grants.map(ts => {
      const spell = db.spells.get(ts.spell_id)
      return {
        name: spell?.name ?? `Spell #${ts.spell_id}`,
        level: spell?.level ?? 0,
        usesPerRest: ts.uses_per_rest,
      }
    })
  }

  // ── Helper: convert TraitRow to ResolvedTrait ──
  const toResolved = (trait: TraitRow, source: string): ResolvedTrait => {
    const typeMap: Record<string, 'P' | 'A' | 'R'> = {
      passive: 'P', active: 'A', resource: 'R',
    }
    return {
      key: `${source}-${trait.trait_id}`,
      name: trait.name,
      description: trait.description,
      type: typeMap[trait.feature_type] ?? 'P',
      traitId: trait.trait_id,
      grantedSpells: resolveTraitSpells(trait.trait_id),
    }
  }

  // ── Traits to hide: meta/informational, not real features ──
  const isMetaTrait = (t: TraitRow) =>
    t.feature_type === 'choice' ||
    /^Cantrips Known\b/.test(t.name) ||
    /^Sorcery Points Upgrade\b/.test(t.name) ||
    /^Spells Known\b/.test(t.name)

  // ── Gather traits from DB, split by class vs subclass ──
  const coreClassTraits: ResolvedTrait[] = []
  const subclassTraits: ResolvedTrait[] = []
  let raceTraits: ResolvedTrait[] = []
  const seenTraitIds = new Set<number>()

  if (db.loaded && classId !== null) {
    for (let lv = 1; lv <= character.level; lv++) {
      const rows = db.getProgressionAtLevel(classId, subclassId, lv)
      for (const r of rows) {
        const traits = r.feature_ids
          .map(id => db.getTrait(id))
          .filter((t): t is TraitRow => t !== undefined)
          .filter(t => !isMetaTrait(t))
          .filter(t => !seenTraitIds.has(t.trait_id))
        for (const t of traits) {
          seenTraitIds.add(t.trait_id)
          const resolved = toResolved(t, r.subclass_id !== null ? 'subclass' : 'class')
          if (r.subclass_id !== null) {
            subclassTraits.push(resolved)
          } else {
            coreClassTraits.push(resolved)
          }
        }
      }
    }
  }

  if (db.loaded && raceRow) {
    raceTraits = raceRow.trait_ids
      .map(id => db.getTrait(id))
      .filter((t): t is TraitRow => t !== undefined)
      .map(t => toResolved(t, 'race'))
  }

  // ── Extract feats, epic boons, and fighting styles from choices ──
  const feats: ResolvedTrait[] = []
  const epicBoons: ResolvedTrait[] = []
  const fightingStyles: ResolvedTrait[] = []

  if (db.loaded && character.choices) {
    for (const [key, val] of Object.entries(character.choices)) {
      if (!val) continue

      if (/^feat_\d+$/.test(key)) {
        const epicBoon = db.epicBoonFeats.find(f => f.name.toLowerCase() === val.toLowerCase())
        if (epicBoon) {
          epicBoons.push({
            key: `boon-${key}`, name: epicBoon.name, description: epicBoon.description,
            type: 'P', traitId: null, grantedSpells: [],
          })
        } else {
          const generalFeat = db.generalFeats.find(f => f.name.toLowerCase() === val.toLowerCase())
          feats.push({
            key: `feat-${key}`, name: val,
            description: generalFeat?.description ?? CHOICE_DESCRIPTIONS[val] ?? '',
            type: 'P', traitId: null, grantedSpells: [],
          })
        }
        continue
      }

      if (FIGHTING_STYLE_NAMES.has(val)) {
        const fsFeat = db.generalFeats.find(f => f.name.toLowerCase() === val.toLowerCase())
        fightingStyles.push({
          key: `fstyle-${key}`, name: val,
          description: fsFeat?.description ?? CHOICE_DESCRIPTIONS[val] ?? '',
          type: 'P', traitId: null, grantedSpells: [],
        })
        continue
      }
    }
  }

  // ── Ensure resource entries exist for resource traits ──
  const allTraits = [...coreClassTraits, ...subclassTraits, ...raceTraits]
  for (const rt of allTraits) {
    if (rt.type === 'R' && rt.traitId !== null && !(rt.traitId in character.resources)) {
      const maxVal = db.getFeatureBonus(rt.traitId, character.level, 'uses')
        ?? db.getFeatureBonus(rt.traitId, character.level, `${rt.name.toLowerCase().replace(/\s+/g, '_')}_uses`)
        ?? 0
      if (maxVal > 0) {
        character.resources[rt.traitId] = { current: maxVal, max: maxVal }
      }
    }
  }

  // ── Extra traits (resolved from IDs) ──
  const extraTraitsResolved: ResolvedTrait[] = db.loaded
    ? (character.traits ?? [])
        .map(id => db.getTrait(id))
        .filter((t): t is TraitRow => t !== undefined)
        .map(t => toResolved(t, 'extra'))
    : []

  const toggle = (id: string) => setExpanded(expanded === id ? null : id)

  const renderTraitCard = (trait: ResolvedTrait) => {
    const isExpanded = expanded === trait.key
    const resource = trait.traitId !== null ? character.resources[trait.traitId] : undefined
    const hasDetail = trait.description || (trait.type === 'R' && resource) || trait.grantedSpells.length > 0

    return (
      <div key={trait.key} className="trait-card">
        <div className="trait-header" onClick={() => hasDetail && toggle(trait.key)}>
          <div className="trait-header-left">
            <span className={`trait-tag trait-tag--${trait.type.toLowerCase()}`}>{trait.type}</span>
            <span className="trait-name">{trait.name}</span>
          </div>
          <div className="trait-header-right">
            {hasDetail && <span className="trait-chevron">{isExpanded ? '▲' : '▼'}</span>}
          </div>
        </div>
        {isExpanded && hasDetail && (
          <div className="trait-detail">
            {trait.description && <p className="trait-desc">{trait.description}</p>}
            {trait.grantedSpells.length > 0 && (
              <div className="trait-spells">
                {trait.grantedSpells.map(gs => (
                  <span key={gs.name} className="trait-spell-badge">
                    {gs.name}
                    {gs.usesPerRest !== null && <span className="trait-spell-uses"> ({gs.usesPerRest}/rest)</span>}
                  </span>
                ))}
              </div>
            )}
            {trait.type === 'R' && resource && (
              <ResourceTracker
                current={resource.current}
                max={resource.max}
                onUse={() => useResource(trait.traitId!)}
                onGain={() => gainResource(trait.traitId!)}
              />
            )}
          </div>
        )}
      </div>
    )
  }

  const renderGroup = (heading: string, items: ResolvedTrait[]) => {
    if (items.length === 0) return null
    return (
      <div className="trait-level-group">
        <div className="traits-group-heading">{heading}</div>
        {items.map(renderTraitCard)}
      </div>
    )
  }

  return (
    <div className="traits-page">
      <div className="traits-sticky">
        {!hideHeader && <CharacterHeader />}
      </div>

      <div className="traits-scroll">
        {unclaimedAsiLevels.length > 0 && (
          <div className="asi-unclaimed-banner">
            <span className="asi-unclaimed-text">
              Unclaimed ASI / Feat at level{unclaimedAsiLevels.length > 1 ? 's' : ''}{' '}
              {unclaimedAsiLevels.join(', ')}
            </span>
            <div className="asi-unclaimed-btns">
              {unclaimedAsiLevels.map(lv => (
                <button key={lv} className="asi-unclaimed-btn" onClick={() => setAsiClaimLevel(lv)}>
                  Lv {lv}
                </button>
              ))}
            </div>
          </div>
        )}

        {asiClaimLevel !== null && (
          <AsiClaimModal level={asiClaimLevel} onDismiss={() => setAsiClaimLevel(null)} />
        )}

        <div className="trait-columns">
          {/* Left column: Class + Subclass traits */}
          <div className="trait-col trait-col--left">
            {db.loaded && coreClassTraits.length > 0 && renderGroup('Class Traits', coreClassTraits)}

            {db.loaded && coreClassTraits.length === 0 && (
              <div className="trait-level-group">
                <div className="traits-group-heading">Class Traits</div>
                <div className="traits-empty">{character.class ? `No features found for ${character.class}.` : 'No class set.'}</div>
              </div>
            )}

            {db.loaded && renderGroup(
              character.subclass ? `${character.subclass} Traits` : 'Subclass Traits',
              subclassTraits
            )}

            {!db.loaded && (
              <div className="trait-level-group">
                <div className="traits-group-heading">Class Traits</div>
                <div className="traits-empty">Loading game data...</div>
              </div>
            )}
          </div>

          {/* Right column: Race, Feats, Fighting Styles, etc. */}
          <div className="trait-col trait-col--right">
            {db.loaded && renderGroup('Race Traits', raceTraits)}
            {db.loaded && renderGroup('Fighting Styles', fightingStyles)}
            {db.loaded && renderGroup('Feats', feats)}
            {db.loaded && renderGroup('Epic Boons', epicBoons)}
            {db.loaded && renderGroup('Extra Traits', extraTraitsResolved)}
          </div>
        </div>
      </div>
    </div>
  )
}
