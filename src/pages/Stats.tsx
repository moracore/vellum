import { useState, useRef, useMemo } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { useCharacter } from '../context/CharacterContext'
import { db } from '../lib/database'
import type { Ability } from '../types'

const DM_SEQ: Ability[] = ['wis', 'wis', 'wis', 'cha', 'cha', 'int']
const REST_SEQ = ['str', 'race', 'str', 'race', 'str', 'race']

const ABILITIES: { key: Ability; short: string }[] = [
  { key: 'str', short: 'STR' },
  { key: 'dex', short: 'DEX' },
  { key: 'con', short: 'CON' },
  { key: 'int', short: 'INT' },
  { key: 'wis', short: 'WIS' },
  { key: 'cha', short: 'CHA' },
]

// Ability ID mapping: 1=STR, 2=DEX, 3=CON, 4=INT, 5=WIS, 6=CHA
const ABILITY_KEY_TO_ID: Record<Ability, number> = {
  str: 1, dex: 2, con: 3, int: 4, wis: 5, cha: 6,
}

const SAVES: { key: Ability; label: string }[] = [
  { key: 'str', label: 'Strength' },
  { key: 'dex', label: 'Dexterity' },
  { key: 'con', label: 'Constitution' },
  { key: 'int', label: 'Intelligence' },
  { key: 'wis', label: 'Wisdom' },
  { key: 'cha', label: 'Charisma' },
]

const SKILLS_DEF: { name: string; label: string; ability: Ability }[] = [
  { name: 'Acrobatics', label: 'Acrobatics', ability: 'dex' },
  { name: 'Animal Handling', label: 'Animal Handling', ability: 'wis' },
  { name: 'Arcana', label: 'Arcana', ability: 'int' },
  { name: 'Athletics', label: 'Athletics', ability: 'str' },
  { name: 'Deception', label: 'Deception', ability: 'cha' },
  { name: 'History', label: 'History', ability: 'int' },
  { name: 'Insight', label: 'Insight', ability: 'wis' },
  { name: 'Intimidation', label: 'Intimidation', ability: 'cha' },
  { name: 'Investigation', label: 'Investigation', ability: 'int' },
  { name: 'Medicine', label: 'Medicine', ability: 'wis' },
  { name: 'Nature', label: 'Nature', ability: 'int' },
  { name: 'Perception', label: 'Perception', ability: 'wis' },
  { name: 'Performance', label: 'Performance', ability: 'cha' },
  { name: 'Persuasion', label: 'Persuasion', ability: 'cha' },
  { name: 'Religion', label: 'Religion', ability: 'int' },
  { name: 'Sleight of Hand', label: 'Sleight of Hand', ability: 'dex' },
  { name: 'Stealth', label: 'Stealth', ability: 'dex' },
  { name: 'Survival', label: 'Survival', ability: 'wis' },
]

const SKILLS_LEFT = SKILLS_DEF.slice(0, 9)
const SKILLS_RIGHT = SKILLS_DEF.slice(9)

function mod(score: number) { return Math.floor((score - 10) / 2) }
function fmt(n: number) { return n >= 0 ? `+${n}` : `${n}` }

interface Props {
  onOpenSettings?: () => void
  onDying?: () => void
}

export default function Stats({ onOpenSettings, onDying }: Props) {
  const { character, updateHp, longRest, setDmMode, triggerLevelUp } = useCharacter()
  const [hpEdit, setHpEdit] = useState<'cur' | 'tmp' | null>(null)
  const [hpInput, setHpInput] = useState('')
  const [dmPos, setDmPos] = useState(0)
  const lvlTapCount = useRef(0)
  const lvlTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [restPos, setRestPos] = useState(0)
  const [showZeroModal, setShowZeroModal] = useState(false)
  const [restToast, setRestToast] = useState(false)

  // Build skill ID→name lookup from DB
  const skillIdToName = useMemo(() => {
    if (!db.loaded) return new Map<number, string>()
    return new Map(db.skills.map(s => [s.skill_id, s.name]))
  }, [])

  const skillNameToId = useMemo(() => {
    if (!db.loaded) return new Map<string, number>()
    return new Map(db.skills.map(s => [s.name, s.skill_id]))
  }, [])

  const advanceDm = (key: Ability) => {
    if (DM_SEQ[dmPos] === key) {
      const next = dmPos + 1
      if (next === DM_SEQ.length) { setDmMode(true); setDmPos(0) }
      else setDmPos(next)
    } else {
      setDmPos(DM_SEQ[0] === key ? 1 : 0)
    }
  }

  const advanceRest = (key: string) => {
    if (REST_SEQ[restPos] === key) {
      const next = restPos + 1
      if (next === REST_SEQ.length) {
        setRestPos(0)
        longRest()
        setRestToast(true)
        setTimeout(() => setRestToast(false), 2500)
      } else setRestPos(next)
    } else {
      setRestPos(REST_SEQ[0] === key ? 1 : 0)
    }
  }

  const handleAbilityTap = (key: Ability) => {
    advanceDm(key)
    if (key === 'str') {
      advanceRest('str')
      lvlTapCount.current += 1
      if (lvlTapTimer.current) clearTimeout(lvlTapTimer.current)
      if (lvlTapCount.current >= 30) {
        lvlTapCount.current = 0
        triggerLevelUp()
      } else {
        lvlTapTimer.current = setTimeout(() => { lvlTapCount.current = 0 }, 3000)
      }
    } else if (REST_SEQ[restPos] === 'str') {
      setRestPos(0)
    }
  }

  if (!character) return null

  const { abilityScores: ab, proficiencyBonus: prof } = character
  const saveSet = new Set(character.savingThrows) // set of ability IDs with proficiency
  const skillSet = new Set(character.skills)       // set of skill IDs with proficiency

  const skillVal = (name: string, ability: Ability) => {
    const sid = skillNameToId.get(name)
    const base = mod(ab[ability])
    const proficient = sid !== undefined && skillSet.has(sid)
    const detail = sid !== undefined ? character.skillDetails[String(sid)] : undefined
    const expertise = detail === 'expertise'
    const bonusStr = detail && detail !== 'expertise' ? detail.replace('+', '') : undefined
    const bonus = bonusStr ? parseInt(bonusStr) || 0 : 0
    const profPart = expertise ? prof * 2 : proficient ? prof : 0
    return base + profPart + bonus
  }

  const isSkillProficient = (name: string) => {
    const sid = skillNameToId.get(name)
    return sid !== undefined && skillSet.has(sid)
  }

  const isSkillExpertise = (name: string) => {
    const sid = skillNameToId.get(name)
    if (sid === undefined) return false
    return character.skillDetails[String(sid)] === 'expertise'
  }

  const hasSkillBonus = (name: string) => {
    const sid = skillNameToId.get(name)
    if (sid === undefined) return false
    const d = character.skillDetails[String(sid)]
    return d !== undefined && d !== 'expertise'
  }

  const saveVal = (a: Ability) => mod(ab[a]) + (saveSet.has(ABILITY_KEY_TO_ID[a]) ? prof : 0)

  const applyHp = () => {
    const v = parseInt(hpInput)
    if (!isNaN(v)) {
      if (hpEdit === 'cur') {
        const clamped = Math.max(0, Math.min(v, character.maxHp))
        updateHp(clamped, character.tempHp)
        if (clamped === 0) setShowZeroModal(true)
      } else {
        updateHp(character.currentHp, Math.max(0, v))
      }
    }
    setHpEdit(null)
    setHpInput('')
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') applyHp()
    if (e.key === 'Escape') { setHpEdit(null); setHpInput('') }
  }

  const hpPct = Math.max(0, Math.min(100, (character.currentHp / character.maxHp) * 100))

  const lowHpOpacity = character.currentHp === 1 ? 0.12
    : character.currentHp === 2 ? 0.07
      : character.currentHp === 3 ? 0.04
        : 0
  const lowHpStyle = lowHpOpacity > 0
    ? { backgroundImage: `linear-gradient(rgba(200,0,0,${lowHpOpacity}), rgba(200,0,0,${lowHpOpacity}))` }
    : undefined

  const hitDieMatch = character.hitDice.match(/\d*d(\d+)/)
  const hitDieSize = hitDieMatch ? hitDieMatch[1] : '?'

  const renderSkillRow = ({ name, label, ability }: { name: string; label: string; ability: Ability }) => {
    const proficient = isSkillProficient(name)
    const expertise = isSkillExpertise(name)
    const bonus = hasSkillBonus(name)
    return (
      <div className="sheet-row" key={`skill-${name}`}>
        <span className={`sheet-dot ${expertise ? 'expertise' : proficient ? 'filled' : bonus ? 'bonus' : ''}`} />
        <span className="sheet-row-val">{fmt(skillVal(name, ability))}</span>
        <span className="sheet-row-lbl">{label}</span>
      </div>
    )
  }

  return (
    <div className="sheet" style={lowHpStyle}>

      {/* ── Header ── */}
      <div className="sheet-header">
        <div className="sheet-header-top">
          <div className="sheet-header-names">
            <span className="sheet-header-charname">{character.name}</span>
            <span className="sheet-header-dot"> · </span>
            <span className="sheet-header-playername">{character.player}</span>
          </div>
          <button className="sheet-header-settings" onClick={onOpenSettings} title="Settings">
            <SettingsIcon size={18} />
          </button>
        </div>
        <div className="sheet-header-fields">
          <div className="sheet-hfield">
            <span className="sheet-hfield-val">{character.level || '—'}</span>
            <span className="sheet-hfield-lbl">Level</span>
          </div>
          <div className="sheet-hfield">
            <span className="sheet-hfield-val">{[character.class, character.subclass].filter(Boolean).join(' · ') || '—'}</span>
            <span className="sheet-hfield-lbl">Class</span>
          </div>
          <div className="sheet-hfield" onClick={() => advanceRest('race')} style={{ cursor: 'default' }}>
            <span className="sheet-hfield-val">{character.race || '—'}</span>
            <span className="sheet-hfield-lbl">Race</span>
          </div>
        </div>
      </div>

      {/* ── Combat strip ── */}
      <div className="combat-strip">
        <div className="combat-hp">
          <div
            className={`combat-hp-edit ${hpEdit === 'cur' ? 'active' : ''}`}
            onClick={() => { setHpEdit('cur'); setHpInput(String(character.currentHp)) }}
          >
            {hpEdit === 'cur'
              ? <input className="combat-hp-input" type="number" value={hpInput} autoFocus
                  onChange={e => setHpInput(e.target.value)} onBlur={applyHp} onKeyDown={onKey} />
              : <span className="combat-hp-cur">{character.currentHp}</span>}
            <span className="combat-hp-max">/ {character.maxHp}</span>
            <span className="combat-hp-label">HP</span>
          </div>
          <div className="combat-hp-track">
            <div className="combat-hp-fill" style={{ width: `${hpPct}%` }} />
          </div>
          {character.tempHp > 0 && (
            <div
              className="combat-tmp-hp"
              onClick={() => { setHpEdit('tmp'); setHpInput(String(character.tempHp)) }}
            >
              {hpEdit === 'tmp'
                ? <input className="combat-hp-input combat-hp-input--sm" type="number" value={hpInput} autoFocus
                    onChange={e => setHpInput(e.target.value)} onBlur={applyHp} onKeyDown={onKey} />
                : <span>+{character.tempHp} tmp</span>}
            </div>
          )}
        </div>
        <div className="combat-stat">
          <span className="combat-stat-val">{character.ac}</span>
          <span className="combat-stat-lbl">AC</span>
        </div>
        <div className="combat-stat">
          <span className="combat-stat-val">{fmt(character.initiative)}</span>
          <span className="combat-stat-lbl">Init</span>
        </div>
      </div>

      {/* ── Ability squares (left) + Saves (right) ── */}
      <div className="saves-abilities-row">
        <div className="ability-grid-block">
          {ABILITIES.map(({ key, short }) => (
            <div className="ability-square" key={key} onClick={() => handleAbilityTap(key)}>
              <span className="ability-square-label">{short}</span>
              <span className="ability-square-mod">{fmt(mod(ab[key]))}</span>
              <span className="ability-square-score">{ab[key]}</span>
            </div>
          ))}
        </div>
        <div className="saves-col">
          <div className="sheet-col-label">Saving Throws</div>
          {SAVES.map(({ key, label }) => (
            <div className="sheet-row" key={`save-${key}`}>
              <span className={`sheet-dot ${saveSet.has(ABILITY_KEY_TO_ID[key]) ? 'filled' : ''}`} />
              <span className="sheet-row-val">{fmt(saveVal(key))}</span>
              <span className="sheet-row-lbl">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Skills 2-column ── */}
      <div className="skills-grid">
        <div className="skills-col">
          <div className="sheet-col-label">Skills</div>
          {SKILLS_LEFT.map(renderSkillRow)}
        </div>
        <div className="skills-col">
          <div className="sheet-col-label">&nbsp;</div>
          {SKILLS_RIGHT.map(renderSkillRow)}
        </div>
      </div>

      {/* ── Footnote strip ── */}
      <div className="sheet-footnote">
        <span>Speed {character.speed}ft</span>
        <span className="sheet-footnote-sep">·</span>
        <span>Prof {fmt(prof)}</span>
        <span className="sheet-footnote-sep">·</span>
        <span>Hit Dice {character.hitDiceCurrent}/{character.level}d{hitDieSize}</span>
        <span className="sheet-footnote-sep">·</span>
        <span>Perc {10 + skillVal('Perception', 'wis')}</span>
        {character.conditions.length > 0 && (
          <>
            <span className="sheet-footnote-sep">·</span>
            {character.conditions.map(c => (
              <span key={c} className="sheet-footnote-condition">{c}</span>
            ))}
          </>
        )}
      </div>

      {/* ── 0 HP confirmation modal ── */}
      {showZeroModal && (
        <div className="zero-hp-overlay" onClick={() => setShowZeroModal(false)}>
          <div className="zero-hp-card" onClick={e => e.stopPropagation()}>
            <p className="zero-hp-question">Your character has hit 0 HP.<br />Are you down?</p>
            <div className="zero-hp-btns">
              <button className="zero-hp-btn zero-hp-btn--yes" onClick={() => {
                setShowZeroModal(false)
                onDying?.()
              }}>Yes, I'm down</button>
              <button className="zero-hp-btn zero-hp-btn--no" onClick={() => setShowZeroModal(false)}>
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rest toast ── */}
      {restToast && (
        <div className="rest-toast">Long Rest Complete — HP & spell slots restored!</div>
      )}

    </div>
  )
}
