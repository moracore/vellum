// All network I/O between the client and the Cloudflare Worker.
// No credentials, Sheet ID, or service account data lives here — those are Worker secrets.

import {
  getAllCharacterRecords,
  saveCharacterRecord,
  saveLastPullAt,
} from '../db'

const WORKER_URL = (import.meta.env.VITE_WORKER_URL as string | undefined) ?? ''

/** Treat local IDB cache as stale after this many ms. */
export const STALE_MS = 5 * 60 * 1000

// ─── Payload types ────────────────────────────────────────────────────────────

/** One character row as returned by GET /characters or GET /characters/:id */
export interface RemoteCharacter {
  id: string          // e.g. "fido"
  name: string        // e.g. "Fido"  (human-readable label in the sheet)
  markdown: string
  updated_at: string  // ISO 8601 UTC — e.g. "2025-03-09T14:00:00.000Z"
}

/**
 * Body sent on PUT /characters/:id
 *
 * `force: true` bypasses the conflict check.  The client sets this when the
 * user explicitly chooses to overwrite the server version after a conflict.
 */
export interface PushRequest {
  markdown: string
  local_updated_at: string  // client's current timestamp for this record
  force?: boolean
}

/** Worker response (HTTP 200) when the write succeeds */
export interface PushSuccess {
  ok: true
  updated_at: string  // canonical UTC timestamp the worker wrote to the sheet
}

/**
 * Worker response (HTTP 409) when the server copy is newer than local_updated_at
 * and `force` was not set.  The client must surface conflict resolution UI.
 */
export interface PushConflict {
  conflict: true
  server_markdown: string
  server_updated_at: string
}

export type PushResult = PushSuccess | PushConflict

// ─── Low-level API calls ──────────────────────────────────────────────────────

/** Fetch every character row.  Used on startup to seed / refresh local IDB. */
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

/**
 * Push a character to the worker.
 *
 * Returns PushConflict (HTTP 409) if the server has a newer version and
 * `force` is false.  Throws on network / server errors.
 */
export async function pushCharacter(
  id: string,
  markdown: string,
  localUpdatedAt: string,
  force = false,
): Promise<PushResult> {
  const body: PushRequest = { markdown, local_updated_at: localUpdatedAt }
  if (force) body.force = true

  const res = await fetch(`${WORKER_URL}/characters/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  // 409 is an expected application-level response, not an error
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
    const local = localById.get(remote.id)

    if (!local) {
      await saveCharacterRecord({
        id: remote.id,
        markdown: remote.markdown,
        updatedAt: remote.updated_at,
        synced: true,
      })
      continue
    }

    const serverNewer = new Date(remote.updated_at) > new Date(local.updatedAt)

    if (local.synced && serverNewer) {
      // Safe to overwrite — local has no pending changes
      await saveCharacterRecord({
        id: local.id,
        markdown: remote.markdown,
        updatedAt: remote.updated_at,
        synced: true,
      })
    } else if (!local.synced && serverNewer) {
      // Conflict: unsynced local changes AND server is ahead.
      // Store server data alongside local so the user can resolve it.
      await saveCharacterRecord({
        ...local,
        conflictServerMarkdown:  remote.markdown,
        conflictServerUpdatedAt: remote.updated_at,
      })
    }
    // else: local is equal or newer — keep as-is; will push on next save.
  }

  await saveLastPullAt(new Date().toISOString())
}
