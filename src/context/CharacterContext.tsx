import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'
import type { CharacterData, AbilityScores } from '../types'
import { getCharacterRecord, saveCharacterRecord } from '../db'
import { pushCharacter, fetchCharacter, type PushSuccess } from '../lib/sync'
import ConflictModal from '../components/ConflictModal'
import { db } from '../lib/database'

/** Derive AC from equipped armor + ability scores + class (for unarmored defense). */
function deriveAC(armorName: string | null, abilityScores: AbilityScores, className: string): number {
  const dexMod = Math.floor((abilityScores.dex - 10) / 2)

  if (!armorName) {
    const classRow = db.loaded
      ? db.classes.find(c => c.name.toLowerCase() === className.toLowerCase())
      : undefined
    if (classRow?.unarmored_defense_base != null) {
      const abilityMap: Record<string, keyof AbilityScores> = {
        STR: 'str', DEX: 'dex', CON: 'con', INT: 'int', WIS: 'wis', CHA: 'cha',
      }
      const ab1 = abilityMap[classRow.unarmored_defense_ability_1] ?? 'dex'
      const ab2 = abilityMap[classRow.unarmored_defense_ability_2]
      const mod1 = Math.floor((abilityScores[ab1] - 10) / 2)
      const mod2 = ab2 ? Math.floor((abilityScores[ab2] - 10) / 2) : 0
      return classRow.unarmored_defense_base + mod1 + mod2
    }
    return 10 + dexMod
  }

  const armourRow = db.loaded
    ? [...db.armour.values()].find(a => a.name.toLowerCase() === armorName.toLowerCase())
    : undefined
  if (!armourRow) return 10 + dexMod

  const { base_ac, dex_bonus_limit } = armourRow
  if (dex_bonus_limit === 0) return base_ac
  if (dex_bonus_limit > 0) return base_ac + Math.min(dexMod, dex_bonus_limit)
  return base_ac + dexMod
}

/** Build spell slot arrays from DB for a given class+level, preserving current values. */
function buildSlotsFromDb(
  className: string,
  level: number,
  existingSlots: number[],
  existingMax: number[],
): { slots: number[]; slotsMax: number[] } {
  const classRow = db.classes.find(c => c.name.toLowerCase() === className.toLowerCase())
  if (!classRow || !db.loaded) return { slots: existingSlots, slotsMax: existingMax }
  const dbSlots = db.getSpellSlots(classRow.class_id, level)
  if (!dbSlots) return { slots: existingSlots, slotsMax: existingMax }
  const max = [
    dbSlots.slot_level_1, dbSlots.slot_level_2, dbSlots.slot_level_3,
    dbSlots.slot_level_4, dbSlots.slot_level_5, dbSlots.slot_level_6,
    dbSlots.slot_level_7, dbSlots.slot_level_8, dbSlots.slot_level_9,
  ]
  const current = max.map((m, i) => Math.min(existingSlots[i] ?? m, m))
  return { slots: current, slotsMax: max }
}

// ─── Conflict state ───────────────────────────────────────────────────────────

export interface ConflictState {
  characterId: string
  serverData: CharacterData
  serverUpdatedAt: string
  localUpdatedAt: string
}

// ─── Context shape ────────────────────────────────────────────────────────────

interface CharacterContextValue {
  character: CharacterData | null
  dmMode: boolean
  levelUpMsg: string | null
  conflict: ConflictState | null
  syncError: string | null
  loadCharacter: (id: string) => Promise<void>
  createCharacterFull: (char: CharacterData) => Promise<void>
  updateCharacter: (patch: Partial<CharacterData>) => void
  updateHp: (current: number, temp: number) => void
  useSpellSlot: (level: number) => void
  restoreSpellSlot: (level: number) => void
  toggleDeathSave: (type: 'success' | 'failure') => void
  recordDeathSave: (type: 'success' | 'failure') => void
  stabilize: () => void
  longRest: () => void
  shortRest: (diceSpent: number, hpGained: number) => void
  useResource: (traitId: number) => void
  gainResource: (traitId: number) => void
  updateMaxHp: (newMax: number) => void
  updateAbilityScores: (scores: AbilityScores) => void
  updateEquipment: (armor: string | null, weapons: [string | null, string | null]) => void
  updateCurrency: (currency: [number, number, number]) => void
  updateItems: (text: string) => void
  updateBagOfHolding: (text: string) => void
  updateNotes: (notes: string) => void
  updateDescription: (description: string) => void
  updateSpells: (spellsByLevel: number[][], preparedSpells: number[]) => void
  updateChoices: (choices: Record<string, string>) => void
  updateExtraTraits: (traits: number[]) => void
  setDmMode: (val: boolean) => void
  triggerLevelUp: () => void
  clearLevelUp: () => void
  resolveConflict: (choice: 'local' | 'server') => Promise<void>
  dismissSyncError: () => void
  saveNotesLocal: (notes: string) => Promise<void>
  saveNotesCloud: (notes: string) => Promise<boolean>
  signOut: () => void
}

const CharacterContext = createContext<CharacterContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CharacterProvider({ children }: { children: ReactNode }) {
  const [character, setCharacter] = useState<CharacterData | null>(null)
  const [dmMode, setDmMode]         = useState(false)
  const [levelUpMsg, setLevelUpMsg] = useState<string | null>(null)
  const [conflict, setConflict]     = useState<ConflictState | null>(null)
  const [syncError, setSyncError]   = useState<string | null>(null)

  const clearLevelUp     = useCallback(() => setLevelUpMsg(null), [])
  const dismissSyncError = useCallback(() => setSyncError(null), [])
  const signOut = useCallback(() => {
    setCharacter(null)
    setDmMode(false)
    setConflict(null)
    setSyncError(null)
  }, [])

  const charRef     = useRef<CharacterData | null>(null)
  const conflictRef = useRef<ConflictState | null>(null)

  const syncChar     = (c: CharacterData | null) => {
    // Migrate cname_/citem_ from choices → containerNames
    if (c) {
      if (!c.containerNames) c.containerNames = {}
      let migrated = false
      for (const key of Object.keys(c.choices)) {
        if (key.startsWith('cname_') || key.startsWith('citem_')) {
          c.containerNames[key] = c.choices[key]
          delete c.choices[key]
          migrated = true
        }
      }
      if (migrated) c = { ...c }
    }
    charRef.current = c; setCharacter(c)
  }
  const syncConflict = (c: ConflictState | null) => { conflictRef.current = c; setConflict(c) }

  // ── Debounced push: IDB write is immediate, worker push is debounced ──

  const pushTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pushInFlightRef = useRef(false)
  const pendingPushRef  = useRef<{ id: string; data: CharacterData; updatedAt: string } | null>(null)

  const doPush = useCallback(async (id: string, data: CharacterData, updatedAt: string) => {
    if (pushInFlightRef.current) {
      pendingPushRef.current = { id, data, updatedAt }
      return
    }
    pushInFlightRef.current = true
    try {
      const result = await pushCharacter(id, data, updatedAt)

      if ('conflict' in result) {
        await saveCharacterRecord({
          id, data, updatedAt, synced: false,
          conflictServerData:      result.server_data,
          conflictServerUpdatedAt: result.server_updated_at,
        })
        syncConflict({
          characterId:     id,
          serverData:      result.server_data,
          serverUpdatedAt: result.server_updated_at,
          localUpdatedAt:  updatedAt,
        })
      } else {
        const serverTs = (result as PushSuccess).updated_at
        await saveCharacterRecord({ id, data, updatedAt: serverTs, synced: true })
        setSyncError(null)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[push failed]', msg)
      setSyncError(`Sync failed: ${msg}`)
    } finally {
      pushInFlightRef.current = false
      const pending = pendingPushRef.current
      if (pending) {
        pendingPushRef.current = null
        void doPush(pending.id, pending.data, pending.updatedAt)
      }
    }
  }, [])

  const PUSH_DEBOUNCE_MS = 1500

  const persist = useCallback((char: CharacterData) => {
    const now = new Date().toISOString()
    void saveCharacterRecord({ id: char.id, data: char, updatedAt: now, synced: false })
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(() => {
      void doPush(char.id, char, now)
    }, PUSH_DEBOUNCE_MS)
  }, [doPush])

  // ── Generic updater ──

  const doUpdate = useCallback((patch: Partial<CharacterData>) => {
    const prev = charRef.current
    if (!prev) return
    const next = { ...prev, ...patch }
    syncChar(next)
    persist(next)
  }, [persist])

  // ── Load character by ID ──

  const loadCharacter = useCallback(async (id: string) => {
    let record = await getCharacterRecord(id)

    if (!record) {
      const remote = await fetchCharacter(id)
      if (!remote) throw new Error(`Character "${id}" not found`)
      record = { id, data: remote.data, updatedAt: remote.updated_at, synced: true }
      await saveCharacterRecord(record)
    }

    syncChar(record.data)

    if (record.conflictServerData && record.conflictServerUpdatedAt) {
      syncConflict({
        characterId:     id,
        serverData:      record.conflictServerData,
        serverUpdatedAt: record.conflictServerUpdatedAt,
        localUpdatedAt:  record.updatedAt,
      })
    }
  }, [])

  // ── Create a fully built character ──

  const createCharacterFull = useCallback(async (char: CharacterData) => {
    const now = new Date().toISOString()
    await saveCharacterRecord({ id: char.id, data: char, updatedAt: now, synced: false })
    syncChar(char)
    void pushCharacter(char.id, char, now).catch(() => {})
  }, [])

  // ── Conflict resolution ──

  const resolveConflict = useCallback(async (choice: 'local' | 'server') => {
    const c = conflictRef.current
    if (!c) return

    if (choice === 'server') {
      await saveCharacterRecord({
        id: c.characterId, data: c.serverData, updatedAt: c.serverUpdatedAt, synced: true,
      })
      syncChar(c.serverData)
    } else {
      const record = await getCharacterRecord(c.characterId)
      if (!record) return
      try {
        const result = await pushCharacter(c.characterId, record.data, record.updatedAt, true)
        await saveCharacterRecord({
          id: c.characterId, data: record.data,
          updatedAt: (result as PushSuccess).updated_at ?? record.updatedAt,
          synced: true,
        })
      } catch {
        setSyncError('Sync failed during conflict resolution — local version kept.')
      }
    }

    syncConflict(null)
  }, [])

  // ── Notes save functions ──

  const saveNotesLocal = useCallback(async (notes: string): Promise<void> => {
    const prev = charRef.current
    if (!prev) return
    const next = { ...prev, notes }
    syncChar(next)
    const now = new Date().toISOString()
    await saveCharacterRecord({ id: next.id, data: next, updatedAt: now, synced: false })
  }, [])

  const saveNotesCloud = useCallback(async (notes: string): Promise<boolean> => {
    const prev = charRef.current
    if (!prev) return false
    const next = { ...prev, notes }
    syncChar(next)
    const now = new Date().toISOString()
    await saveCharacterRecord({ id: next.id, data: next, updatedAt: now, synced: false })
    try {
      const result = await pushCharacter(next.id, next, now)
      if ('conflict' in result) {
        await saveCharacterRecord({
          id: next.id, data: next, updatedAt: now, synced: false,
          conflictServerData:      result.server_data,
          conflictServerUpdatedAt: result.server_updated_at,
        })
        syncConflict({
          characterId:     next.id,
          serverData:      result.server_data,
          serverUpdatedAt: result.server_updated_at,
          localUpdatedAt:  now,
        })
        return false
      }
      await saveCharacterRecord({ id: next.id, data: next, updatedAt: (result as PushSuccess).updated_at, synced: true })
      setSyncError(null)
      return true
    } catch {
      setSyncError('Sync failed — changes saved locally.')
      return false
    }
  }, [])

  // ── Mutation helpers ──

  const updateHp = useCallback((current: number, temp: number) => {
    doUpdate({ currentHp: current, tempHp: temp })
  }, [doUpdate])

  const useSpellSlot = useCallback((level: number) => {
    const prev = charRef.current
    if (!prev) return
    const slots = [...prev.spellSlots]
    if (slots[level - 1] > 0) slots[level - 1]--
    doUpdate({ spellSlots: slots })
  }, [doUpdate])

  const restoreSpellSlot = useCallback((level: number) => {
    const prev = charRef.current
    if (!prev) return
    const slots = [...prev.spellSlots]
    if (slots[level - 1] < prev.spellSlotsMax[level - 1]) slots[level - 1]++
    doUpdate({ spellSlots: slots })
  }, [doUpdate])

  const toggleDeathSave = useCallback((type: 'success' | 'failure') => {
    const prev = charRef.current
    if (!prev) return
    const ds: [number, number] = [...prev.deathSaves]
    const idx = type === 'success' ? 0 : 1
    ds[idx] = ds[idx] >= 3 ? 0 : ds[idx] + 1
    doUpdate({ deathSaves: ds })
  }, [doUpdate])

  const recordDeathSave = useCallback((type: 'success' | 'failure') => {
    const prev = charRef.current
    if (!prev) return
    const ds: [number, number] = [...prev.deathSaves]
    const idx = type === 'success' ? 0 : 1
    if (ds[idx] >= 3) return
    ds[idx]++
    doUpdate({ deathSaves: ds })
  }, [doUpdate])

  const stabilize = useCallback(() => {
    doUpdate({ currentHp: 1, deathSaves: [0, 0] })
  }, [doUpdate])

  const longRest = useCallback(() => {
    const prev = charRef.current
    if (!prev) return
    const hdRestored = Math.max(1, Math.floor(prev.level / 2))
    const newHitDiceCurrent = Math.min(prev.level, prev.hitDiceCurrent + hdRestored)
    const resetResources: typeof prev.resources = {}
    for (const [id, entry] of Object.entries(prev.resources)) {
      resetResources[Number(id)] = { ...entry, current: entry.max }
    }
    doUpdate({
      currentHp: prev.maxHp,
      tempHp: 0,
      deathSaves: [0, 0],
      spellSlots: [...prev.spellSlotsMax],
      resources: resetResources,
      hitDiceCurrent: newHitDiceCurrent,
    })
  }, [doUpdate])

  const shortRest = useCallback((diceSpent: number, hpGained: number) => {
    const prev = charRef.current
    if (!prev) return

    const SHORT_REST_ALL = new Set([62, 82, 86, 120, 144, 280])
    const SHORT_REST_ONE = new Set([108, 110, 295])

    const resetResources: typeof prev.resources = {}
    for (const [id, entry] of Object.entries(prev.resources)) {
      const tid = Number(id)
      if (SHORT_REST_ALL.has(tid)) {
        resetResources[tid] = { ...entry, current: entry.max }
      } else if (SHORT_REST_ONE.has(tid)) {
        resetResources[tid] = { ...entry, current: Math.min(entry.max, entry.current + 1) }
      } else {
        resetResources[tid] = entry
      }
    }

    const isWarlock = prev.class.toLowerCase() === 'warlock'
    const spellSlots = isWarlock ? [...prev.spellSlotsMax] : prev.spellSlots

    doUpdate({
      currentHp: Math.min(prev.maxHp, prev.currentHp + hpGained),
      hitDiceCurrent: Math.max(0, prev.hitDiceCurrent - diceSpent),
      resources: resetResources,
      spellSlots,
    })
  }, [doUpdate])

  const useResource = useCallback((traitId: number) => {
    const prev = charRef.current
    if (!prev) return
    const entry = prev.resources[traitId]
    if (!entry || entry.current <= 0) return
    doUpdate({
      resources: { ...prev.resources, [traitId]: { ...entry, current: entry.current - 1 } },
    })
  }, [doUpdate])

  const gainResource = useCallback((traitId: number) => {
    const prev = charRef.current
    if (!prev) return
    const entry = prev.resources[traitId]
    if (!entry || entry.current >= entry.max) return
    doUpdate({
      resources: { ...prev.resources, [traitId]: { ...entry, current: entry.current + 1 } },
    })
  }, [doUpdate])

  const updateMaxHp = useCallback((newMax: number) => {
    doUpdate({ maxHp: newMax })
  }, [doUpdate])

  const updateAbilityScores = useCallback((scores: AbilityScores) => {
    const prev = charRef.current
    if (!prev) return
    let ac = deriveAC(prev.equipment[0], scores, prev.class)
    // Add shield bonus from weapon slots
    for (const w of [prev.equipment[1], prev.equipment[2]]) {
      if (!w) continue
      const row = db.loaded ? [...db.armour.values()].find(a => a.name.toLowerCase() === w.toLowerCase()) : undefined
      if (row?.armour_category === 'shield') ac += row.bonus_ac
    }
    doUpdate({ abilityScores: scores, ac })
  }, [doUpdate])

  const updateEquipment = useCallback((armor: string | null, weapons: [string | null, string | null]) => {
    const prev = charRef.current
    if (!prev) return
    const equipment: [string | null, string | null, string | null] = [armor, weapons[0], weapons[1]]
    let ac = deriveAC(armor, prev.abilityScores, prev.class)
    // Add shield bonus if a shield is in either weapon slot
    for (const w of weapons) {
      if (!w) continue
      const row = db.loaded ? [...db.armour.values()].find(a => a.name.toLowerCase() === w.toLowerCase()) : undefined
      if (row?.armour_category === 'shield') ac += row.bonus_ac
    }
    doUpdate({ equipment, ac })
  }, [doUpdate])

  const updateCurrency = useCallback((currency: [number, number, number]) => {
    doUpdate({ currency })
  }, [doUpdate])

  const updateItems = useCallback((text: string) => {
    doUpdate({ bag: text.split('\n').filter(Boolean) })
  }, [doUpdate])

  const updateBagOfHolding = useCallback((text: string) => {
    if (!text) {
      doUpdate({ bagOfHolding: [] })
    } else {
      doUpdate({ bagOfHolding: text.split('\n').filter(Boolean) })
    }
  }, [doUpdate])

  const updateNotes = useCallback((notes: string) => {
    doUpdate({ notes })
  }, [doUpdate])

  const updateDescription = useCallback((description: string) => {
    doUpdate({ description })
  }, [doUpdate])

  const updateSpells = useCallback((spellsByLevel: number[][], preparedSpells: number[]) => {
    doUpdate({ spellsByLevel, preparedSpells })
  }, [doUpdate])

  const updateChoices = useCallback((choices: Record<string, string>) => {
    doUpdate({ choices })
  }, [doUpdate])

  const updateExtraTraits = useCallback((traits: number[]) => {
    doUpdate({ traits })
  }, [doUpdate])

  const triggerLevelUp = useCallback(() => {
    const prev = charRef.current
    if (!prev || prev.level >= 20) return
    const newLevel = prev.level + 1
    const { slots, slotsMax } = buildSlotsFromDb(prev.class, newLevel, prev.spellSlots, prev.spellSlotsMax)
    doUpdate({ level: newLevel, spellSlots: slots, spellSlotsMax: slotsMax })
    setLevelUpMsg(`You have reached level ${newLevel}!`)
  }, [doUpdate])

  const updateCharacter = useCallback((patch: Partial<CharacterData>) => {
    doUpdate(patch)
  }, [doUpdate])

  return (
    <CharacterContext.Provider value={{
      character, dmMode, levelUpMsg, conflict, syncError,
      loadCharacter, createCharacterFull, updateCharacter,
      updateHp, useSpellSlot, restoreSpellSlot, toggleDeathSave, recordDeathSave,
      stabilize, longRest, shortRest, useResource, gainResource,
      updateMaxHp, updateAbilityScores, updateEquipment,
      updateCurrency, updateItems, updateBagOfHolding,
      updateNotes, updateDescription, updateSpells, updateChoices, updateExtraTraits,
      setDmMode, triggerLevelUp, clearLevelUp,
      resolveConflict, dismissSyncError, saveNotesLocal, saveNotesCloud, signOut,
    }}>
      {children}
      {conflict && (
        <ConflictModal
          conflict={conflict}
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
