import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { ThemeName } from '../types'
import { getSettings, saveSettings } from '../db'

const PALETTES: ThemeName[] = ['arcane', 'ember', 'verdant', 'frost', 'crimson', 'parchment']

interface ThemeContextValue {
  theme: ThemeName
  setTheme: (name: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyTheme(theme: ThemeName) {
  document.documentElement.setAttribute('data-theme', theme)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('arcane')

  useEffect(() => {
    getSettings().then((s) => {
      const valid: ThemeName = PALETTES.includes(s.theme as ThemeName) ? s.theme as ThemeName : 'arcane'
      setThemeState(valid)
      applyTheme(valid)
    })
  }, [])

  const setTheme = (name: ThemeName) => {
    setThemeState(name)
    applyTheme(name)
    saveSettings({ theme: name })
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
