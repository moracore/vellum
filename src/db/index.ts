import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AppSettings, CharacterData } from '../types'

// ─── Schema ───────────────────────────────────────────────────────────────────

export interface CharacterRecord {
  id: string
  data: CharacterData
  updatedAt: string           // ISO 8601 UTC
  synced: boolean             // false = local edits not yet confirmed by worker
  /** Set when a pull detected the server has a newer version of an unsynced record. */
  conflictServerData?:      CharacterData
  conflictServerUpdatedAt?: string
}

/** The raw JSON blob returned by GET /db — all values are strings from the sheet. */
export interface RawDbTables {
  classes:              Record<string, string>[]
  subclasses:           Record<string, string>[]
  traits:               Record<string, string>[]
  choices:              Record<string, string>[]
  choices_recurring:    Record<string, string>[]
  progression:          Record<string, string>[]
  spell_slots:          Record<string, string>[]
  feature_bonuses:      Record<string, string>[]
  character_levels:     Record<string, string>[]
  spells:               Record<string, string>[]
  class_spells:         Record<string, string>[]
  class_saving_throws:  Record<string, string>[]
  class_weapon_profs:   Record<string, string>[]
  class_armour_profs:   Record<string, string>[]
  weapons:              Record<string, string>[]
  armour:               Record<string, string>[]
  skills:               Record<string, string>[]
  backgrounds:          Record<string, string>[]
  races:                Record<string, string>[]
  starting_equipment:   Record<string, string>[]
  general_feats:        Record<string, string>[]
  epic_boon_feats:      Record<string, string>[]
  trait_spells:         Record<string, string>[]
}

export interface DbSnapshot {
  fetchedAt: string   // ISO timestamp
  data: RawDbTables   // the JSON blob from GET /db
}

type SettingsRow = AppSettings & { id: string; lastPullAt?: string }

interface VellumDB extends DBSchema {
  settings: {
    key: string
    value: SettingsRow
  }
  characters: {
    key: string
    value: CharacterRecord
  }
  db_cache: {
    key: string
    value: DbSnapshot
  }
}

// ─── DB instance ──────────────────────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase<VellumDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<VellumDB>('vellum', 8, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' as never })
        }
        // Always recreate characters store on upgrade to ensure clean schema
        if (db.objectStoreNames.contains('characters')) {
          db.deleteObjectStore('characters')
        }
        db.createObjectStore('characters', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('db_cache')) {
          db.createObjectStore('db_cache')
        }
      },
    })
  }
  return dbPromise
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const db  = await getDB()
  const row = await db.get('settings', 'app')
  return row ?? { theme: 'arcane' as const }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db       = await getDB()
  const existing = await db.get('settings', 'app') ?? { id: 'app', theme: 'arcane' as const }
  await db.put('settings', { ...existing, ...settings, id: 'app' } as never)
}

export async function getLastPullAt(): Promise<string | null> {
  const db = await getDB()
  return (await db.get('settings', 'app'))?.lastPullAt ?? null
}

export async function saveLastPullAt(ts: string): Promise<void> {
  const db       = await getDB()
  const existing = await db.get('settings', 'app') ?? { id: 'app', theme: 'arcane' as const }
  await db.put('settings', { ...existing, lastPullAt: ts } as never)
}

// ─── Characters ───────────────────────────────────────────────────────────────

export async function getCharacterRecord(id: string): Promise<CharacterRecord | null> {
  const db = await getDB()
  return (await db.get('characters', id)) ?? null
}

export async function getAllCharacterRecords(): Promise<CharacterRecord[]> {
  const db = await getDB()
  return db.getAll('characters')
}

export async function saveCharacterRecord(record: CharacterRecord): Promise<void> {
  const db = await getDB()
  await db.put('characters', record)
}

export async function deleteCharacterRecord(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('characters', id)
}

// ─── DB Cache ─────────────────────────────────────────────────────────────────

export async function getDbSnapshot(): Promise<DbSnapshot | undefined> {
  const db = await getDB()
  return db.get('db_cache', 'data')
}

export async function saveDbSnapshot(snapshot: DbSnapshot): Promise<void> {
  const db = await getDB()
  await db.put('db_cache', snapshot, 'data')
}
