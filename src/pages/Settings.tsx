import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useCharacter } from '../context/CharacterContext'
import { findCharacter } from '../data/characters'
import { getSettings, saveSettings } from '../db'

const ACCENT_PRESETS = [
  { name: 'Parchment',     value: '#c9a84c' },
  { name: 'Coral',         value: '#FF4444' },
  { name: 'Orange',        value: '#FF8800' },
  { name: 'Amber',         value: '#FFCC00' },
  { name: 'Emerald',       value: '#44BB66' },
  { name: 'Teal',          value: '#00BBCC' },
  { name: 'Electric Blue', value: '#0080FF' },
  { name: 'Purple',        value: '#AA44FF' },
  { name: 'Pink',          value: '#FF44AA' },
]

const THEME_LABELS: Record<string, string> = {
  dark: 'Dark Mode', light: 'Light Mode', woodland: 'Mora Woodland', axe: 'Axe Grey',
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, Math.round(l * 100)]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
    case g: h = ((b - r) / d + 2) / 6; break
    case b: h = ((r - g) / d + 4) / 6; break
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100, ln = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sn * Math.min(ln, 1 - ln)
  const f = (n: number) => {
    const v = ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return Math.round(v * 255).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

// Slider maps S/L to a narrower range so colors stay vivid
const sliderToS = (v: number) => 50 + v * 0.5
const sliderToL = (v: number) => 50 + v * 0.3
const sToSlider = (s: number) => Math.round(Math.max(0, Math.min(100, (s - 50) * 2)))
const lToSlider = (l: number) => Math.round(Math.max(0, Math.min(100, (l - 50) / 0.3)))

function slidersFromHex(hex: string): [number, number, number] {
  const [h, s, l] = hexToHsl(hex)
  return [h, sToSlider(s), lToSlider(l)]
}

function SliderRow({ label, value, min, max, gradient, onChange }: {
  label: string; value: number; min: number; max: number
  gradient: string; onChange: (v: number) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
        {label}
      </span>
      <input
        type="range"
        className="hsl-slider"
        min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ background: gradient }}
      />
    </div>
  )
}

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)
const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
  </svg>
)

export default function Settings({ onClose }: { onClose?: () => void }) {
  const { theme, accentColor, cycleTheme, setAccentColor } = useTheme()
  const { sheet, loadCharacter } = useCharacter()
  const woodlandLocked = theme === 'woodland'

  const [hSlider, setHSlider] = useState(() => slidersFromHex(accentColor)[0])
  const [sSlider, setSSlider] = useState(() => slidersFromHex(accentColor)[1])
  const [lSlider, setLSlider] = useState(() => slidersFromHex(accentColor)[2])

  const [nameInput, setNameInput] = useState('')
  const [nameEditing, setNameEditing] = useState(false)
  const [nameError, setNameError] = useState('')

  const previewHex = hslToHex(hSlider, sliderToS(sSlider), sliderToL(lSlider))
  const actualS = Math.round(sliderToS(sSlider))
  const actualL = Math.round(sliderToL(lSlider))

  const applySliders = (h: number, sv: number, lv: number) => {
    setHSlider(h); setSSlider(sv); setLSlider(lv)
    setAccentColor(hslToHex(h, sliderToS(sv), sliderToL(lv)))
  }

  const handlePreset = (hex: string) => {
    const [h, sv, lv] = slidersFromHex(hex)
    setHSlider(h); setSSlider(sv); setLSlider(lv)
    setAccentColor(hex)
  }

  const handleNameSave = async () => {
    const md = findCharacter(nameInput)
    if (!md) { setNameError('No character found for that name.'); return }
    await loadCharacter(md)
    const s = await getSettings()
    await saveSettings({ ...s, playerName: nameInput.trim() })
    setNameEditing(false)
    setNameInput('')
    setNameError('')
  }

  return (
    <div className="settings-page">
      {onClose && (
        <button onClick={onClose} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--accent)', fontSize: 14, fontWeight: 600, padding: '0 0 4px', cursor: 'pointer' }}>
          ← Back
        </button>
      )}

      {/* Character */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p className="section-title">Character</p>
        <div className="row-between">
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{sheet?.characterName ?? '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {sheet ? `Played by ${sheet.playerName}` : 'No character loaded'}
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { setNameEditing(e => !e); setNameError('') }}
          >
            Change
          </button>
        </div>
        {nameEditing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="settings-input"
                type="text"
                placeholder="Your name or character name"
                value={nameInput}
                autoFocus
                onChange={e => { setNameInput(e.target.value); setNameError('') }}
                onKeyDown={e => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setNameEditing(false) }}
              />
              <button className="btn btn-primary btn-sm" onClick={handleNameSave}>Save</button>
            </div>
            {nameError && <p style={{ fontSize: 12, color: 'var(--danger)' }}>{nameError}</p>}
          </div>
        )}
      </div>

      {/* Appearance */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p className="section-title">Appearance</p>
        <div className="row-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {theme === 'dark' || theme === 'woodland' ? <MoonIcon /> : <SunIcon />}
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{THEME_LABELS[theme]}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Toggle app theme</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={cycleTheme}>Cycle</button>
        </div>
      </div>

      {/* Accent color */}
      <div
        className="card"
        style={{
          display: 'flex', flexDirection: 'column', gap: 14,
          opacity: woodlandLocked ? 0.5 : 1,
          pointerEvents: woodlandLocked ? 'none' : 'auto',
        }}
      >
        <div className="row-between">
          <p className="section-title">
            Accent Color{woodlandLocked && <span style={{ textTransform: 'none', fontWeight: 400, fontSize: 11 }}> (locked by theme)</span>}
          </p>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: previewHex,
            border: '2px solid var(--text-primary)',
            boxShadow: `0 0 0 2px var(--bg-secondary), 0 0 10px ${previewHex}66`,
            transition: 'background 80ms ease',
          }} />
        </div>

        {/* Preset swatches */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {ACCENT_PRESETS.map(({ name, value }) => (
            <button
              key={value}
              title={name}
              onClick={() => handlePreset(value)}
              style={{
                width: 32, height: 32, borderRadius: '50%', background: value,
                border: accentColor.toLowerCase() === value.toLowerCase()
                  ? '3px solid var(--text-primary)' : '3px solid transparent',
                boxShadow: accentColor.toLowerCase() === value.toLowerCase()
                  ? '0 0 0 2px var(--bg-secondary)' : 'none',
                cursor: 'pointer', padding: 0, outline: 'none',
                transition: 'all 150ms ease',
              }}
            />
          ))}
        </div>

        {/* HSL sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SliderRow
            label="Hue" value={hSlider} min={0} max={360}
            gradient="linear-gradient(to right, hsl(0,80%,65%), hsl(30,80%,65%), hsl(60,80%,65%), hsl(90,80%,65%), hsl(120,80%,65%), hsl(150,80%,65%), hsl(180,80%,65%), hsl(210,80%,65%), hsl(240,80%,65%), hsl(270,80%,65%), hsl(300,80%,65%), hsl(330,80%,65%), hsl(360,80%,65%))"
            onChange={v => applySliders(v, sSlider, lSlider)}
          />
          <SliderRow
            label="Saturation" value={sSlider} min={0} max={100}
            gradient={`linear-gradient(to right, hsl(${hSlider},50%,${actualL}%), hsl(${hSlider},100%,${actualL}%))`}
            onChange={v => applySliders(hSlider, v, lSlider)}
          />
          <SliderRow
            label="Lightness" value={lSlider} min={0} max={100}
            gradient={`linear-gradient(to right, hsl(${hSlider},${actualS}%,50%), hsl(${hSlider},${actualS}%,80%))`}
            onChange={v => applySliders(hSlider, sSlider, v)}
          />
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', paddingBottom: 8 }}>
        Vellum · D&D 5e Character Sheet
      </div>

    </div>
  )
}
