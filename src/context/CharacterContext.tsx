import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'
import type { CharacterSheet, CharacterState, Currency } from '../types'
import { parseCharacter, serializeCharacter, generateBlankMarkdown } from '../lib/markdown'
import { getCharacterRecord, saveCharacterRecord } from '../db'
import { pushCharacter, fetchCharacter, type PushSuccess } from '../lib/sync'
import ConflictModal from '../components/ConflictModal'
import { CLASS_FEATURES } from '../data/classFeatures'
import { getSpellSlotsForLevel } from '../data/spellSlotTable'

// ─── Conflict state ───────────────────────────────────────────────────────────

export interface ConflictState {
  characterId: string
  serverMarkdown: string
  serverUpdatedAt: string
  localUpdatedAt: string
}

// ─── Context shape ────────────────────────────────────────────────────────────

interface CharacterContextValue {
  sheet: CharacterSheet | null
  state: CharacterState | null
  rawMarkdown: string | null
  dmMode: boolean
  levelUpMsg: string | null
  conflict: ConflictState | null
  syncError: string | null
  loadCharacter: (id: string) => Promise<void>
  createCharacter: (characterName: string, playerName: string) => Promise<void>
  createCharacterFull: (sheet: CharacterSheet, state: CharacterState) => Promise<void>
  updateHp: (current: number, temp: number) => void
  useSpellSlot: (level: number) => void
  toggleDeathSave: (type: 'success' | 'failure') => void
  updateCurrency: (currency: Currency) => void
  updateItems: (items: string) => void
  updateNotes: (notes: string) => void
  updateSpells: (spells: CharacterSheet['spells']) => void
  updateChoices: (choices: Record<string, string>) => void
  updateExtraTraits: (traits: string[]) => void
  updateDescription: (description: string) => void
  recordDeathSave: (type: 'success' | 'failure') => void
  stabilize: () => void
  longRest: () => void
  applyMarkdown: (md: string) => void
  setDmMode: (val: boolean) => void
  triggerLevelUp: () => void
  clearLevelUp: () => void
  updateMaxHp: (newMax: number) => void
  updateAbilityScores: (scores: import('../types').AbilityScores) => void
  resolveConflict: (choice: 'local' | 'server') => Promise<void>
  dismissSyncError: () => void
  saveNotesLocal: (notes: string) => Promise<void>
  saveNotesCloud: (notes: string) => Promise<boolean>
}

const CharacterContext = createContext<CharacterContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CharacterProvider({ children }: { children: ReactNode }) {
  const [sheet, setSheet]           = useState<CharacterSheet | null>(null)
  const [state, setState]           = useState<CharacterState | null>(null)
  const [rawMarkdown, setRawMarkdown] = useState<string | null>(null)
  const [dmMode, setDmMode]         = useState(false)
  const [levelUpMsg, setLevelUpMsg] = useState<string | null>(null)
  const [conflict, setConflict]     = useState<ConflictState | null>(null)
  const [syncError, setSyncError]   = useState<string | null>(null)

  const clearLevelUp    = useCallback(() => setLevelUpMsg(null), [])
  const dismissSyncError = useCallback(() => setSyncError(null), [])

  // Refs so update callbacks always have the latest values without stale closures
  const sheetRef    = useRef<CharacterSheet | null>(null)
  const stateRef    = useRef<CharacterState | null>(null)
  const conflictRef = useRef<ConflictState | null>(null)

  const syncSheet    = (s: CharacterSheet | null) => { sheetRef.current = s;  setSheet(s) }
  const syncState    = (st: CharacterState | null) => { stateRef.current = st; setState(st) }
  const syncConflict = (c: ConflictState | null)   => { conflictRef.current = c; setConflict(c) }

  // ── Core persist: IDB write (immediate) + Worker push (async, fire-and-forget)

  const persist = useCallback((s: CharacterSheet, st: CharacterState) => {
    const md  = serializeCharacter(s, st)
    const now = new Date().toISOString()
    setRawMarkdown(md)

    void (async () => {
      // 1. Save to IDB immediately, marked unsynced
      await saveCharacterRecord({ id: st.id, markdown: md, updatedAt: now, synced: false })

      // 2. Push to worker
      try {
        const result = await pushCharacter(st.id, md, now)

        if ('conflict' in result) {
          // Server has a newer version — store it and surface conflict UI
          await saveCharacterRecord({
            id: st.id,
            markdown: md,
            updatedAt: now,
            synced: false,
            conflictServerMarkdown:  result.server_markdown,
            conflictServerUpdatedAt: result.server_updated_at,
          })
          syncConflict({
            characterId:     st.id,
            serverMarkdown:  result.server_markdown,
            serverUpdatedAt: result.server_updated_at,
            localUpdatedAt:  now,
          })
        } else {
          // Success — update IDB with the canonical server timestamp
          await saveCharacterRecord({ id: st.id, markdown: md, updatedAt: (result as PushSuccess).updated_at, synced: true })
          setSyncError(null)
        }
      } catch {
        // Network / worker error — changes are safe in IDB, will retry on next save
        setSyncError('Sync failed — changes saved locally.')
      }
    })()
  }, [])

  // ── Load character by ID (reads IDB, falls back to worker if IDB is empty)

  const loadCharacter = useCallback(async (id: string) => {
    let record = await getCharacterRecord(id)

    if (!record) {
      // IDB is empty for this character — fetch directly (new client joining session)
      const remote = await fetchCharacter(id)
      if (!remote) throw new Error(`Character "${id}" not found`)
      record = { id, markdown: remote.markdown, updatedAt: remote.updated_at, synced: true }
      await saveCharacterRecord(record)
    }

    const { sheet: s, state: st } = parseCharacter(record.markdown)
    syncSheet(s)
    syncState(st)
    setRawMarkdown(record.markdown)

    // Surface any conflict that was flagged during the last syncAllCharacters()
    if (record.conflictServerMarkdown && record.conflictServerUpdatedAt) {
      syncConflict({
        characterId:     id,
        serverMarkdown:  record.conflictServerMarkdown,
        serverUpdatedAt: record.conflictServerUpdatedAt,
        localUpdatedAt:  record.updatedAt,
      })
    }
  }, [])

  // ── Create a new blank character (opens in DM mode for editing)

  const createCharacter = useCallback(async (characterName: string, playerName: string) => {
    const id  = Date.now().toString()
    const md  = generateBlankMarkdown(id, characterName, playerName)
    const now = new Date().toISOString()
    await saveCharacterRecord({ id, markdown: md, updatedAt: now, synced: false })
    const { sheet: s, state: st } = parseCharacter(md)
    syncSheet(s)
    syncState(st)
    setRawMarkdown(md)
    setDmMode(true)
  }, [])

  // ── Create a fully built character (wizard flow — no DM mode)

  const createCharacterFull = useCallback(async (s: CharacterSheet, st: CharacterState) => {
    const md  = serializeCharacter(s, st)
    const now = new Date().toISOString()
    await saveCharacterRecord({ id: st.id, markdown: md, updatedAt: now, synced: false })
    syncSheet(s)
    syncState(st)
    setRawMarkdown(md)
    void pushCharacter(st.id, md, now).catch(() => {})
  }, [])

  // ── Conflict resolution

  const resolveConflict = useCallback(async (choice: 'local' | 'server') => {
    const c = conflictRef.current
    if (!c) return

    if (choice === 'server') {
      // Accept server version: save it to IDB and apply to UI
      await saveCharacterRecord({
        id: c.characterId, markdown: c.serverMarkdown, updatedAt: c.serverUpdatedAt, synced: true,
      })
      const { sheet: s, state: st } = parseCharacter(c.serverMarkdown)
      syncSheet(s)
      syncState(st)
      setRawMarkdown(c.serverMarkdown)
    } else {
      // Keep local: force-push, bypassing the server's conflict check
      const record = await getCharacterRecord(c.characterId)
      if (!record) return
      try {
        const result = await pushCharacter(c.characterId, record.markdown, record.updatedAt, true)
        await saveCharacterRecord({
          id: c.characterId, markdown: record.markdown,
          updatedAt: (result as PushSuccess).updated_at ?? record.updatedAt,
          synced: true,
        })
      } catch {
        // Force push failed — leave as unsynced, user can retry on next edit
        setSyncError('Sync failed during conflict resolution — local version kept.')
      }
    }

    syncConflict(null)
  }, [])

  // ── Notes-specific save functions ─────────────────────────────────────────────

  const saveNotesLocal = useCallback(async (notes: string): Promise<void> => {
    const prev = stateRef.current
    const s    = sheetRef.current
    if (!prev || !s) return
    const next = { ...prev, notes }
    syncState(next)
    const md  = serializeCharacter(s, next)
    const now = new Date().toISOString()
    setRawMarkdown(md)
    await saveCharacterRecord({ id: next.id, markdown: md, updatedAt: now, synced: false })
  }, [])

  const saveNotesCloud = useCallback(async (notes: string): Promise<boolean> => {
    const prev = stateRef.current
    const s    = sheetRef.current
    if (!prev || !s) return false
    const next = { ...prev, notes }
    syncState(next)
    const md  = serializeCharacter(s, next)
    const now = new Date().toISOString()
    setRawMarkdown(md)
    await saveCharacterRecord({ id: next.id, markdown: md, updatedAt: now, synced: false })
    try {
      const result = await pushCharacter(next.id, md, now)
      if ('conflict' in result) {
        await saveCharacterRecord({
          id: next.id, markdown: md, updatedAt: now, synced: false,
          conflictServerMarkdown:  result.server_markdown,
          conflictServerUpdatedAt: result.server_updated_at,
        })
        syncConflict({
          characterId:     next.id,
          serverMarkdown:  result.server_markdown,
          serverUpdatedAt: result.server_updated_at,
          localUpdatedAt:  now,
        })
        return false
      }
      await saveCharacterRecord({ id: next.id, markdown: md, updatedAt: (result as PushSuccess).updated_at, synced: true })
      setSyncError(null)
      return true
    } catch {
      setSyncError('Sync failed — changes saved locally.')
      return false
    }
  }, [])

  // ── Mutation helpers (all call persist) ──────────────────────────────────────

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
    const key  = type === 'success' ? 'deathSaveSuccesses' : 'deathSaveFailures'
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

  const updateExtraTraits = useCallback((traits: string[]) => {
    const prev = sheetRef.current
    if (!prev || !stateRef.current) return
    const next = { ...prev, extraTraits: traits }
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
    const s    = sheetRef.current
    if (!prev || !s) return
    const next = { ...prev, currentHp: 1, deathSaveSuccesses: 0, deathSaveFailures: 0 }
    syncState(next)
    persist(s, next)
  }, [persist])

  const longRest = useCallback(() => {
    const prev = stateRef.current
    const s    = sheetRef.current
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

  const updateMaxHp = useCallback((newMax: number) => {
    const s = sheetRef.current
    const st = stateRef.current
    if (!s || !st) return
    const next = { ...s, maxHp: newMax }
    syncSheet(next)
    persist(next, st)
  }, [persist])

  const updateAbilityScores = useCallback((scores: import('../types').AbilityScores) => {
    const s = sheetRef.current
    const st = stateRef.current
    if (!s || !st) return
    const next = { ...s, abilityScores: scores }
    syncSheet(next)
    persist(next, st)
  }, [persist])

  const triggerLevelUp = useCallback(() => {
    const s = sheetRef.current
    const st = stateRef.current
    if (!s || !st || s.level >= 20) return
    const newLevel = s.level + 1
    const newSlots = getSpellSlotsForLevel(s.class, newLevel, st.spellSlots)
    const nextSheet = { ...s, level: newLevel }
    const nextState = { ...st, spellSlots: newSlots }
    syncSheet(nextSheet)
    syncState(nextState)
    persist(nextSheet, nextState)
    setLevelUpMsg(`You have reached level ${newLevel}!`)
  }, [persist])

  // applyMarkdown is called by DM Edit — re-parses a full markdown string
  const applyMarkdown = useCallback((md: string) => {
    const prevLevel = sheetRef.current?.level ?? 0
    let { sheet: s, state: st } = parseCharacter(md)

    if (s.level < prevLevel) {
      // Level decreased — strip features and choices added at levels > s.level
      const classKey = Object.keys(CLASS_FEATURES).find(k => k.toLowerCase() === s.class.toLowerCase())
      const allClassFeatures = classKey ? CLASS_FEATURES[classKey] : []

      // Feature names added at levels above new level (exclude level 1, those are baked in at creation)
      const removedFeatureNames = new Set(
        allClassFeatures
          .filter(f => f.level > s.level && f.level > 1 && !f.linkedChoice)
          .map(f => f.name)
      )

      // Choice keys belonging to levels above new level (exclude level 1)
      const removedChoiceKeys = new Set(
        allClassFeatures
          .filter(f => f.level > s.level && f.level > 1 && f.choice)
          .map(f => f.choice!.key)
      )

      s = {
        ...s,
        extraTraits: s.extraTraits.filter(t => !removedFeatureNames.has(t.split(':')[0].trim())),
        choices: Object.fromEntries(
          Object.entries(s.choices).filter(([k]) => !removedChoiceKeys.has(k))
        ),
      }
    }

    // Always recompute spell slots from the table so DM level edits stay correct
    const correctedSlots = getSpellSlotsForLevel(s.class, s.level, st.spellSlots)
    const stCorrected = { ...st, spellSlots: correctedSlots }

    syncSheet(s)
    syncState(stCorrected)
    setRawMarkdown(md)
    persist(s, stCorrected)
    if (s.level > prevLevel) {
      setLevelUpMsg(`You have reached level ${s.level}!`)
    }
  }, [persist])

  return (
    <CharacterContext.Provider value={{
      sheet, state, rawMarkdown, dmMode, levelUpMsg, conflict, syncError,
      loadCharacter, createCharacter, createCharacterFull, updateHp, useSpellSlot, toggleDeathSave,
      updateCurrency, updateItems, updateNotes, updateSpells, updateChoices,
      updateExtraTraits, updateDescription, recordDeathSave, stabilize, longRest,
      applyMarkdown, setDmMode, triggerLevelUp, clearLevelUp,
      updateMaxHp, updateAbilityScores,
      resolveConflict, dismissSyncError, saveNotesLocal, saveNotesCloud,
    }}>
      {children}
      {conflict && (
        <ConflictModal
          conflict={conflict}
          localMarkdown={rawMarkdown ?? ''}
          onResolve={resolveConflict}
        />
      )}
    </CharacterContext.Provider>
  )
}

export function useCharacter() {
  const ctx = useContext(CharacterContext)
  if (!ctx) throw new Error('useCharacter must be used within CharacterProvider')
  return ctx
}
