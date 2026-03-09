import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'
import type { CharacterSheet, CharacterState, Currency } from '../types'
import { parseCharacter, serializeCharacter } from '../lib/markdown'
import { getCharacterMarkdown, saveCharacterMarkdown } from '../db'

interface CharacterContextValue {
  sheet: CharacterSheet | null
  state: CharacterState | null
  rawMarkdown: string | null
  dmMode: boolean
  levelUpMsg: string | null
  loadCharacter: (initialMarkdown: string) => Promise<void>
  updateHp: (current: number, temp: number) => void
  useSpellSlot: (level: number) => void
  toggleDeathSave: (type: 'success' | 'failure') => void
  updateCurrency: (currency: Currency) => void
  updateItems: (items: string) => void
  updateNotes: (notes: string) => void
  updateSpells: (spells: CharacterSheet['spells']) => void
  updateChoices: (choices: Record<string, string>) => void
  updateDescription: (description: string) => void
  recordDeathSave: (type: 'success' | 'failure') => void
  stabilize: () => void
  longRest: () => void
  applyMarkdown: (md: string) => void
  setDmMode: (val: boolean) => void
  clearLevelUp: () => void
}

const CharacterContext = createContext<CharacterContextValue | null>(null)

export function CharacterProvider({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<CharacterSheet | null>(null)
  const [state, setState] = useState<CharacterState | null>(null)
  const [rawMarkdown, setRawMarkdown] = useState<string | null>(null)
  const [dmMode, setDmMode] = useState(false)
  const [levelUpMsg, setLevelUpMsg] = useState<string | null>(null)
  const clearLevelUp = useCallback(() => setLevelUpMsg(null), [])

  // Refs so update callbacks always have the latest values without stale closures
  const sheetRef = useRef<CharacterSheet | null>(null)
  const stateRef = useRef<CharacterState | null>(null)

  const syncSheet = (s: CharacterSheet | null) => { sheetRef.current = s; setSheet(s) }
  const syncState = (st: CharacterState | null) => { stateRef.current = st; setState(st) }

  const persist = useCallback((s: CharacterSheet, st: CharacterState) => {
    const md = serializeCharacter(s, st)
    setRawMarkdown(md)
    saveCharacterMarkdown(st.id, md)
  }, [])

  const loadCharacter = useCallback(async (initialMarkdown: string) => {
    const { state: initial } = parseCharacter(initialMarkdown)
    const saved = await getCharacterMarkdown(initial.id)
    const md = saved ?? initialMarkdown
    const { sheet: s, state: st } = parseCharacter(md)
    syncSheet(s)
    syncState(st)
    setRawMarkdown(md)
    if (!saved) saveCharacterMarkdown(initial.id, initialMarkdown)
  }, [])

  const updateHp = useCallback((current: number, temp: number) => {
    const prev = stateRef.current
    if (!prev || !sheetRef.current) return
    const next = { ...prev, currentHp: current, tempHp: temp }
    syncState(next)
    persist(sheetRef.current, next)
  }, [persist])

  const useSpellSlot = useCallback((level: number) => {
    const prev = stateRef.current
    if (!prev || !sheetRef.current) return
    const slots = prev.spellSlots.map((s, i) =>
      i === level - 1 && s.current > 0 ? { ...s, current: s.current - 1 } : s
    )
    const next = { ...prev, spellSlots: slots }
    syncState(next)
    persist(sheetRef.current, next)
  }, [persist])

  const toggleDeathSave = useCallback((type: 'success' | 'failure') => {
    const prev = stateRef.current
    if (!prev || !sheetRef.current) return
    const key = type === 'success' ? 'deathSaveSuccesses' : 'deathSaveFailures'
    const next = { ...prev, [key]: prev[key] >= 3 ? 0 : prev[key] + 1 }
    syncState(next)
    persist(sheetRef.current, next)
  }, [persist])

  const updateCurrency = useCallback((currency: Currency) => {
    const prev = stateRef.current
    if (!prev || !sheetRef.current) return
    const next = { ...prev, currency }
    syncState(next)
    persist(sheetRef.current, next)
  }, [persist])

  const updateItems = useCallback((items: string) => {
    const prev = stateRef.current
    if (!prev || !sheetRef.current) return
    const next = { ...prev, items }
    syncState(next)
    persist(sheetRef.current, next)
  }, [persist])

  const updateNotes = useCallback((notes: string) => {
    const prev = stateRef.current
    if (!prev || !sheetRef.current) return
    const next = { ...prev, notes }
    syncState(next)
    persist(sheetRef.current, next)
  }, [persist])

  const updateSpells = useCallback((spells: CharacterSheet['spells']) => {
    const prev = sheetRef.current
    if (!prev || !stateRef.current) return
    const next = { ...prev, spells }
    syncSheet(next)
    persist(next, stateRef.current)
  }, [persist])

  const updateChoices = useCallback((choices: Record<string, string>) => {
    const prev = sheetRef.current
    if (!prev || !stateRef.current) return
    const next = { ...prev, choices }
    syncSheet(next)
    persist(next, stateRef.current)
  }, [persist])

  const updateDescription = useCallback((description: string) => {
    const prev = stateRef.current
    if (!prev || !sheetRef.current) return
    const next = { ...prev, description }
    syncState(next)
    persist(sheetRef.current, next)
  }, [persist])

  const recordDeathSave = useCallback((type: 'success' | 'failure') => {
    const prev = stateRef.current
    if (!prev || !sheetRef.current) return
    const key = type === 'success' ? 'deathSaveSuccesses' : 'deathSaveFailures'
    if (prev[key] >= 3) return
    const next = { ...prev, [key]: prev[key] + 1 }
    syncState(next)
    persist(sheetRef.current, next)
  }, [persist])

  const stabilize = useCallback(() => {
    const prev = stateRef.current
    const s = sheetRef.current
    if (!prev || !s) return
    const next = { ...prev, currentHp: 1, deathSaveSuccesses: 0, deathSaveFailures: 0 }
    syncState(next)
    persist(s, next)
  }, [persist])

  const longRest = useCallback(() => {
    const prev = stateRef.current
    const s = sheetRef.current
    if (!prev || !s) return
    const next = {
      ...prev,
      currentHp: s.maxHp,
      tempHp: 0,
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
      spellSlots: prev.spellSlots.map(sl => ({ ...sl, current: sl.max })),
    }
    syncState(next)
    persist(s, next)
  }, [persist])

  const applyMarkdown = useCallback((md: string) => {
    const prevLevel = sheetRef.current?.level ?? 0
    const { sheet: s, state: st } = parseCharacter(md)
    syncSheet(s)
    syncState(st)
    setRawMarkdown(md)
    saveCharacterMarkdown(st.id, md)
    if (s.level > prevLevel) {
      setLevelUpMsg(`Congratulations! You have levelled up to LVL ${s.level}!`)
    }
  }, [])

  return (
    <CharacterContext.Provider value={{
      sheet, state, rawMarkdown, dmMode, levelUpMsg,
      loadCharacter, updateHp, useSpellSlot, toggleDeathSave,
      updateCurrency, updateItems, updateNotes, updateSpells, updateChoices,
      updateDescription, recordDeathSave, stabilize, longRest,
      applyMarkdown, setDmMode, clearLevelUp,
    }}>
      {children}
    </CharacterContext.Provider>
  )
}

export function useCharacter() {
  const ctx = useContext(CharacterContext)
  if (!ctx) throw new Error('useCharacter must be used within CharacterProvider')
  return ctx
}
