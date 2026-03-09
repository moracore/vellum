import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { ThemeName } from '../types'
import { getSettings, saveSettings } from '../db'

const THEMES: ThemeName[] = ['dark', 'light', 'woodland', 'axe']
const WOODLAND_ACCENT = '#56a882'

interface ThemeContextValue {
  theme: ThemeName
  accentColor: string
  cycleTheme: () => void
  setAccentColor: (hex: string) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

function applyTheme(theme: ThemeName, accent: string) {
  document.documentElement.setAttribute('data-theme', theme)
  const effectiveAccent = theme === 'woodland' ? WOODLAND_ACCENT : accent
  document.documentElement.style.setProperty('--accent', effectiveAccent)
  document.documentElement.style.setProperty('--accent-rgb', hexToRgb(effectiveAccent))
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>('dark')
  const [accentColor, setAccentColorState] = useState('#c9a84c')

  useEffect(() => {
    getSettings().then((s) => {
      setTheme(s.theme)
      setAccentColorState(s.accentColor)
      applyTheme(s.theme, s.accentColor)
    })
  }, [])

  const cycleTheme = () => {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]
    setTheme(next)
    applyTheme(next, accentColor)
    saveSettings({ theme: next, accentColor })
  }

  const setAccentColor = (hex: string) => {
    if (theme === 'woodland') return
    setAccentColorState(hex)
    applyTheme(theme, hex)
    saveSettings({ theme, accentColor: hex })
  }

  return (
    <ThemeContext.Provider value={{ theme, accentColor, cycleTheme, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
