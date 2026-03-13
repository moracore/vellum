import { useState, useRef } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { useCharacter } from '../context/CharacterContext'
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

const SAVES: { key: Ability; label: string }[] = [
  { key: 'str', label: 'Strength' },
  { key: 'dex', label: 'Dexterity' },
  { key: 'con', label: 'Constitution' },
  { key: 'int', label: 'Intelligence' },
  { key: 'wis', label: 'Wisdom' },
  { key: 'cha', label: 'Charisma' },
]

const SKILLS: { key: string; label: string; ability: Ability }[] = [
  { key: 'acrobatics', label: 'Acrobatics', ability: 'dex' },
  { key: 'animalHandling', label: 'Animal Handling', ability: 'wis' },
  { key: 'arcana', label: 'Arcana', ability: 'int' },
  { key: 'athletics', label: 'Athletics', ability: 'str' },
  { key: 'deception', label: 'Deception', ability: 'cha' },
  { key: 'history', label: 'History', ability: 'int' },
  { key: 'insight', label: 'Insight', ability: 'wis' },
  { key: 'intimidation', label: 'Intimidation', ability: 'cha' },
  { key: 'investigation', label: 'Investigation', ability: 'int' },
  { key: 'medicine', label: 'Medicine', ability: 'wis' },
  { key: 'nature', label: 'Nature', ability: 'int' },
  { key: 'perception', label: 'Perception', ability: 'wis' },
  { key: 'performance', label: 'Performance', ability: 'cha' },
  { key: 'persuasion', label: 'Persuasion', ability: 'cha' },
  { key: 'religion', label: 'Religion', ability: 'int' },
  { key: 'sleightOfHand', label: 'Sleight of Hand', ability: 'dex' },
  { key: 'stealth', label: 'Stealth', ability: 'dex' },
  { key: 'survival', label: 'Survival', ability: 'wis' },
]

function mod(score: number) { return Math.floor((score - 10) / 2) }
function fmt(n: number) { return n >= 0 ? `+${n}` : `${n}` }

interface Props {
  onOpenSettings?: () => void
  onDying?: () => void
}

export default function Stats({ onOpenSettings, onDying }: Props) {
  const { sheet, state, updateHp, updateDescription, longRest, setDmMode, triggerLevelUp } = useCharacter()
  const [hpEdit, setHpEdit] = useState<'cur' | 'tmp' | null>(null)
  const [hpInput, setHpInput] = useState('')
  const [dmPos, setDmPos] = useState(0)
  const lvlTapCount = useRef(0)
  const lvlTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [restPos, setRestPos] = useState(0)
  const [showZeroModal, setShowZeroModal] = useState(false)
  const [restToast, setRestToast] = useState(false)

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
      setRestPos(0) // wrong key, reset rest
    }
  }

  if (!sheet || !state) return null

  const { abilityScores: ab, savingThrows: saves, skills, proficiencyBonus: prof } = sheet

  const skillVal = (key: string, ability: Ability) => {
    const s = skills[key as keyof typeof skills]
    const base = mod(ab[ability])
    const profPart = s.expertise ? prof * 2 : s.proficient ? prof : 0
    return base + profPart + (s.bonus ?? 0)
  }

  const saveVal = (a: Ability) => mod(ab[a]) + (saves[a] ? prof : 0)

  const applyHp = () => {
    const v = parseInt(hpInput)
    if (!isNaN(v)) {
      if (hpEdit === 'cur') {
        const clamped = Math.max(0, Math.min(v, sheet.maxHp))
        updateHp(clamped, state.tempHp)
        if (clamped === 0) setShowZeroModal(true)
      } else {
        updateHp(state.currentHp, Math.max(0, v))
      }
    }
    setHpEdit(null)
    setHpInput('')
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') applyHp()
    if (e.key === 'Escape') { setHpEdit(null); setHpInput('') }
  }

  const hpPct = Math.max(0, Math.min(100, (state.currentHp / sheet.maxHp) * 100))

  // Low HP tint: 1hp=stronger, 2hp=medium, 3hp=subtle
  const lowHpOpacity = state.currentHp === 1 ? 0.12
    : state.currentHp === 2 ? 0.07
      : state.currentHp === 3 ? 0.04
        : 0
  const lowHpStyle = lowHpOpacity > 0
    ? { backgroundImage: `linear-gradient(rgba(200,0,0,${lowHpOpacity}), rgba(200,0,0,${lowHpOpacity}))` }
    : undefined

  return (
    <div className="sheet" style={lowHpStyle}>
      <div className="sheet-top-section">
        {/* ── Top header ── */}
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
              <span className="sheet-hfield-val">{[sheet.class, sheet.subclass].filter(Boolean).join(' · ') || '—'}</span>
              <span className="sheet-hfield-lbl">Class</span>
            </div>
            <div className="sheet-hfield" onClick={() => advanceRest('race')} style={{ cursor: 'default' }}>
              <span className="sheet-hfield-val">{sheet.race || '—'}</span>
              <span className="sheet-hfield-lbl">Race</span>
            </div>
          </div>
        </div>

        {/* ── Three columns ── */}
        <div className="sheet-columns">

          {/* Col 1 — Ability scores */}
          <div className="sheet-col sheet-col--abilities">
            <div className="sheet-col-label">Abilities</div>
            <div className="sheet-abilities-grid">
              {ABILITIES.map(({ key, short }) => (
                <div className="sheet-ab" key={key} onClick={() => handleAbilityTap(key)}>
                  <span className="sheet-ab-short">{short}</span>
                  <span className="sheet-ab-mod">{fmt(mod(ab[key]))}</span>
                  <span className="sheet-ab-score">{ab[key]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Col 2 — Saving throws + Skills */}
          <div className="sheet-col sheet-col--saves-skills">
            <div className="sheet-col-label">Saving Throws</div>
            {SAVES.map(({ key, label }) => (
              <div className="sheet-row" key={`save-${key}`}>
                <span className={`sheet-dot ${saves[key] ? 'filled' : ''}`} />
                <span className="sheet-row-val">{fmt(saveVal(key))}</span>
                <span className="sheet-row-lbl">{label}</span>
              </div>
            ))}

            <div className="sheet-divider" />
            <div className="sheet-col-label">Skills</div>

            {SKILLS.map(({ key, label, ability }) => {
              const s = skills[key as keyof typeof skills]
              return (
                <div className="sheet-row" key={`skill-${key}`}>
                  <span className={`sheet-dot ${s.expertise ? 'expertise' : s.proficient ? 'filled' : s.bonus ? 'bonus' : ''}`} />
                  <span className="sheet-row-val">{fmt(skillVal(key, ability))}</span>
                  <span className="sheet-row-lbl">
                    {label} <span className="sheet-row-lbl-ab">({ability.charAt(0).toUpperCase() + ability.slice(1)})</span>
                  </span>
                </div>
              )
            })}
          </div>

          {/* Col 3 — HP + Combat + Languages + Description */}
          <div className="sheet-col sheet-col--combat">

            <div className="sheet-col-label">Hit Points</div>
            <div
              className={`sheet-hp-edit ${hpEdit === 'cur' ? 'active' : ''}`}
              onClick={() => { setHpEdit('cur'); setHpInput(String(state.currentHp)) }}
            >
              {hpEdit === 'cur'
                ? <input className="sheet-hp-input" type="number" value={hpInput} autoFocus
                  onChange={e => setHpInput(e.target.value)} onBlur={applyHp} onKeyDown={onKey} />
                : <span className="sheet-hp-cur">{state.currentHp}</span>}
              <span className="sheet-hp-max">/ {sheet.maxHp}</span>
            </div>
            <div className="sheet-hp-track">
              <div className="sheet-hp-fill" style={{ width: `${hpPct}%` }} />
            </div>
            {state.tempHp > 0 && (
              <div
                className={`sheet-stat-row ${hpEdit === 'tmp' ? 'active' : ''}`}
                onClick={() => { setHpEdit('tmp'); setHpInput(String(state.tempHp)) }}
                style={{ cursor: 'pointer' }}
              >
                <span className="sheet-stat-key">Temp HP</span>
                {hpEdit === 'tmp'
                  ? <input className="sheet-inline-input" type="number" value={hpInput} autoFocus
                    onChange={e => setHpInput(e.target.value)} onBlur={applyHp} onKeyDown={onKey} />
                  : <span className="sheet-stat-val">{state.tempHp}</span>}
              </div>
            )}

            <div className="sheet-divider" />

            <div className="sheet-stat-row"><span className="sheet-stat-key">AC</span><span className="sheet-stat-val">{sheet.ac}</span></div>
            <div className="sheet-stat-row"><span className="sheet-stat-key">Initiative</span><span className="sheet-stat-val">{fmt(sheet.initiative)}</span></div>
            <div className="sheet-stat-row"><span className="sheet-stat-key">Speed</span><span className="sheet-stat-val">{sheet.speed} ft</span></div>
            <div className="sheet-stat-row"><span className="sheet-stat-key">Hit Dice</span><span className="sheet-stat-val">{sheet.hitDice}</span></div>
            <div className="sheet-stat-row"><span className="sheet-stat-key">Prof. Bonus</span><span className="sheet-stat-val">{fmt(prof)}</span></div>
            <div className="sheet-stat-row" style={{ borderBottom: 'none', paddingBottom: 6 }}><span className="sheet-stat-key">Passive Perc.</span><span className="sheet-stat-val">{10 + skillVal('perception', 'wis')}</span></div>

            {/* Character description — fills remaining space */}
            <textarea
              className="sheet-desc-textarea"
              style={{ marginBottom: 6 }}
              value={state.description}
              onChange={e => updateDescription(e.target.value)}
              placeholder="Character description..."
            />

            <div className="sheet-lang-box">
              <span className="sheet-lang-lbl">Languages</span>
              <span className="sheet-lang-value">
                {sheet.languages.length > 0 ? sheet.languages.join(', ') : '—'}
              </span>
            </div>

          </div>
        </div>
      </div>

      <div className="sheet-bottom-section">
        <button className="stats-settings-btn" onClick={onOpenSettings}>
          <SettingsIcon size={18} />
          Settings
        </button>
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
