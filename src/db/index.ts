import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AppSettings } from '../types'

// ─── Schema ───────────────────────────────────────────────────────────────────

export interface CharacterRecord {
  id: string
  markdown: string
  updatedAt: string           // ISO 8601 UTC
  synced: boolean             // false = local edits not yet confirmed by worker
  /** Set when a pull detected the server has a newer version of an unsynced record. */
  conflictServerMarkdown?:  string
  conflictServerUpdatedAt?: string
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
}

// ─── DB instance ──────────────────────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase<VellumDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<VellumDB>('vellum', 6, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' as never })
        }
        // Recreate characters store with the new schema (adds updatedAt, synced)
        if (db.objectStoreNames.contains('characters')) {
          db.deleteObjectStore('characters')
        }
        db.createObjectStore('characters', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const db  = await getDB()
  const row = await db.get('settings', 'app')
  return row ?? { theme: 'dark', accentColor: '#c9a84c' }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db       = await getDB()
  const existing = await db.get('settings', 'app') ?? { id: 'app', theme: 'dark', accentColor: '#c9a84c' }
  await db.put('settings', { ...existing, ...settings, id: 'app' } as never)
}

export async function getLastPullAt(): Promise<string | null> {
  const db = await getDB()
  return (await db.get('settings', 'app'))?.lastPullAt ?? null
}

export async function saveLastPullAt(ts: string): Promise<void> {
  const db       = await getDB()
  const existing = await db.get('settings', 'app') ?? { id: 'app', theme: 'dark', accentColor: '#c9a84c' }
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
