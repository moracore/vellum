import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AppSettings } from '../types'

interface VellumDB extends DBSchema {
  settings: {
    key: string
    value: AppSettings
  }
  characters: {
    key: string
    value: { id: string; markdown: string }
  }
}

let dbPromise: Promise<IDBPDatabase<VellumDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<VellumDB>('vellum', 5, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' as never })
        }
        if (db.objectStoreNames.contains('characters')) {
          db.deleteObjectStore('characters')
        }
        db.createObjectStore('characters', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB()
  const settings = await db.get('settings', 'app')
  return settings ?? { theme: 'dark', accentColor: '#c9a84c' }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB()
  await db.put('settings', { ...settings, id: 'app' } as never)
}

export async function getCharacterMarkdown(id: string): Promise<string | null> {
  const db = await getDB()
  const record = await db.get('characters', id)
  return record?.markdown ?? null
}

export async function saveCharacterMarkdown(id: string, markdown: string): Promise<void> {
  const db = await getDB()
  await db.put('characters', { id, markdown })
}
