// All network I/O between the client and the Cloudflare Worker.
// No credentials, Sheet ID, or service account data lives here — those are Worker secrets.

import {
  getAllCharacterRecords,
  saveCharacterRecord,
  deleteCharacterRecord,
  saveLastPullAt,
} from '../db'

import type { CharacterData } from '../types'

const WORKER_URL = (import.meta.env.VITE_WORKER_URL as string | undefined) ?? ''

/** Treat local IDB cache as stale after this many ms. */
export const STALE_MS = 5 * 60 * 1000

/** Treat DB cache as stale after 24 hours. */
export const DB_CACHE_TTL = 24 * 60 * 60 * 1000

import type { RawDbTables } from '../db'

/** Fetch the entire 5e reference database from the worker. */
export async function fetchDb(): Promise<RawDbTables> {
  const res = await fetch(`${WORKER_URL}/db`)
  if (!res.ok) throw new Error(`DB fetch error ${res.status}: ${await res.text()}`)
  return res.json() as Promise<RawDbTables>
}

// ─── Payload types ────────────────────────────────────────────────────────────

/** One character as returned by GET /characters or GET /characters/:id */
export interface RemoteCharacter {
  data: CharacterData
  updated_at: string  // ISO 8601 UTC
}

/** Body sent on PUT /characters/:id */
export interface PushRequest {
  data: CharacterData
  local_updated_at: string
  force?: boolean
}

/** Worker response (HTTP 200) when the write succeeds */
export interface PushSuccess {
  ok: true
  updated_at: string
}

/** Worker response (HTTP 409) when the server copy is newer */
export interface PushConflict {
  conflict: true
  server_data: CharacterData
  server_updated_at: string
}

export type PushResult = PushSuccess | PushConflict

// ─── Low-level API calls ──────────────────────────────────────────────────────

/** Fetch every character.  Used on startup to seed / refresh local IDB. */
export async function fetchAllCharacters(): Promise<RemoteCharacter[]> {
  const res = await fetch(`${WORKER_URL}/characters`)
  if (!res.ok) throw new Error(`Sync error ${res.status}: ${await res.text()}`)
  return res.json() as Promise<RemoteCharacter[]>
}

/** Fetch a single character by id.  Fallback for a fresh client with empty IDB. */
export async function fetchCharacter(id: string): Promise<RemoteCharacter | null> {
  const res = await fetch(`${WORKER_URL}/characters/${encodeURIComponent(id)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Sync error ${res.status}: ${await res.text()}`)
  return res.json() as Promise<RemoteCharacter>
}

/** Push a character to the worker. */
export async function pushCharacter(
  id: string,
  data: CharacterData,
  localUpdatedAt: string,
  force = false,
): Promise<PushResult> {
  const body: PushRequest = { data, local_updated_at: localUpdatedAt }
  if (force) body.force = true

  const res = await fetch(`${WORKER_URL}/characters/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 409) return res.json() as Promise<PushConflict>
  if (!res.ok) throw new Error(`Sync error ${res.status}: ${await res.text()}`)
  return res.json() as Promise<PushSuccess>
}

// ─── High-level startup sync ──────────────────────────────────────────────────

/**
 * Pull all characters from the worker and merge into IDB.
 *
 * Merge rules:
 *  - No local copy           → save remote as-is
 *  - Local is synced, server newer → overwrite local
 *  - Local is unsynced, server newer → flag conflict; do NOT overwrite
 *  - Local is newer or at parity  → keep local (will be pushed on next save)
 */
export async function syncAllCharacters(): Promise<void> {
  const remotes = await fetchAllCharacters()
  const locals  = await getAllCharacterRecords()
  const localById = new Map(locals.map(r => [r.id, r]))

  for (const remote of remotes) {
    const local = localById.get(remote.data.id)

    if (!local) {
      await saveCharacterRecord({
        id: remote.data.id,
        data: remote.data,
        updatedAt: remote.updated_at,
        synced: true,
      })
      continue
    }

    const serverNewer = new Date(remote.updated_at) > new Date(local.updatedAt)

    if (local.synced && serverNewer) {
      await saveCharacterRecord({
        id: local.id,
        data: remote.data,
        updatedAt: remote.updated_at,
        synced: true,
      })
    } else if (!local.synced && serverNewer) {
      await saveCharacterRecord({
        ...local,
        conflictServerData:      remote.data,
        conflictServerUpdatedAt: remote.updated_at,
      })
    }
  }

  // Remove local records that no longer exist on the server (deleted remotely).
  const remoteIds = new Set(remotes.map(r => r.data.id))
  for (const local of locals) {
    if (!remoteIds.has(local.id) && local.synced) {
      await deleteCharacterRecord(local.id)
    }
  }

  await saveLastPullAt(new Date().toISOString())
}
