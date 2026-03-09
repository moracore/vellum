/**
 * Vellum Sync Worker
 *
 * Cloudflare Worker that proxies reads/writes between the Vellum client and a
 * private Google Sheet.  No credentials or the Sheet ID are exposed to clients.
 *
 * Required secrets (set via `wrangler secret put`):
 *   GOOGLE_SERVICE_ACCOUNT  — full JSON of a GCP service account with Sheets editor access
 *   SHEET_ID                — the Google Sheets spreadsheet ID (from the URL)
 *
 * Required vars (in wrangler.toml [vars] or via `wrangler secret put`):
 *   ALLOWED_ORIGIN          — the app's origin, e.g. "https://yourname.github.io"
 *
 * Sheet layout ("Characters" tab):
 *   Row 1: headers  →  id | name | markdown | updated_at
 *   Row 2+: one row per character
 */

export interface Env {
  GOOGLE_SERVICE_ACCOUNT: string   // raw JSON string of the service account file
  SHEET_ID: string
  ALLOWED_ORIGIN: string           // e.g. "https://yourname.github.io"
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceAccount {
  client_email: string
  private_key: string
}

interface RemoteCharacter {
  id: string
  name: string
  markdown: string
  updated_at: string   // ISO 8601 UTC
}

// ─── Google auth ──────────────────────────────────────────────────────────────

// Module-level cache so we don't re-fetch a token on every request within the
// same Worker isolate lifetime.
let tokenCache: { token: string; expiresAt: number } | null = null

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token
  }

  const now = Math.floor(Date.now() / 1000)

  const b64url = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')

  const header  = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss:   sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  }

  const signingInput = `${b64url(header)}.${b64url(payload)}`

  // Strip PEM envelope and decode the key
  const pemKey   = sa.private_key.replace(/\\n/g, '\n')
  const b64key   = pemKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const keyBytes = Uint8Array.from(atob(b64key), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const sigBytes = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  )

  const b64sig = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  const jwt = `${signingInput}.${b64sig}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    throw new Error(`Token exchange failed: ${err}`)
  }

  const { access_token, expires_in } = await tokenRes.json() as {
    access_token: string
    expires_in: number
  }

  tokenCache = { token: access_token, expiresAt: Date.now() + expires_in * 1000 }
  return access_token
}

// ─── Sheets API helpers ───────────────────────────────────────────────────────

const TAB   = 'Characters'
const RANGE = `${TAB}!A2:D`   // A2:D = skip header row, all columns

async function readAllRows(token: string, sheetId: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(RANGE)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Sheets read error ${res.status}: ${await res.text()}`)
  const data = await res.json() as { values?: string[][] }
  return data.values ?? []
}

function rowToChar(row: string[]): RemoteCharacter {
  return { id: row[0] ?? '', name: row[1] ?? '', markdown: row[2] ?? '', updated_at: row[3] ?? '' }
}

function nameFromMarkdown(md: string, fallback: string): string {
  return md.match(/^# (.+)/m)?.[1]?.trim() ?? fallback
}

/**
 * Update an existing row in-place.
 * `sheetRow` is the 1-based sheet row number (header = 1, first data row = 2).
 */
async function updateRow(token: string, sheetId: string, sheetRow: number, char: RemoteCharacter): Promise<void> {
  const range = `${TAB}!A${sheetRow}:D${sheetRow}`
  const url   = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: [[char.id, char.name, char.markdown, char.updated_at]],
    }),
  })
  if (!res.ok) throw new Error(`Sheets update error ${res.status}: ${await res.text()}`)
}

/** Append a new row at the bottom of the data range. */
async function appendRow(token: string, sheetId: string, char: RemoteCharacter): Promise<void> {
  const range = `${TAB}!A:D`
  const url   = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: [[char.id, char.name, char.markdown, char.updated_at]],
    }),
  })
  if (!res.ok) throw new Error(`Sheets append error ${res.status}: ${await res.text()}`)
}

// ─── CORS / response helpers ──────────────────────────────────────────────────

function corsHeaders(origin: string, allowed: string): Record<string, string> {
  // Only echo the origin back if it matches; otherwise use the configured value.
  const effectiveOrigin = origin === allowed ? origin : allowed
  return {
    'Access-Control-Allow-Origin':  effectiveOrigin,
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(data: unknown, status = 200, cors: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  })
}

// ─── Request handler ──────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url    = new URL(request.url)
    const origin = request.headers.get('Origin') ?? ''
    const cors   = corsHeaders(origin, env.ALLOWED_ORIGIN)

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    // Auth
    let token: string
    try {
      const sa: ServiceAccount = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT)
      token = await getAccessToken(sa)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return json({ error: `Auth failed: ${msg}` }, 500, cors)
    }

    const path      = url.pathname
    const charMatch = path.match(/^\/characters\/([^/]+)$/)

    try {
      // ── GET /characters ────────────────────────────────────────────────────
      if (request.method === 'GET' && path === '/characters') {
        const rows = await readAllRows(token, env.SHEET_ID)
        return json(rows.map(rowToChar), 200, cors)
      }

      // ── GET /characters/:id ────────────────────────────────────────────────
      if (request.method === 'GET' && charMatch) {
        const id   = decodeURIComponent(charMatch[1])
        const rows = await readAllRows(token, env.SHEET_ID)
        const idx  = rows.findIndex(r => r[0] === id)
        if (idx === -1) return json({ error: 'Not found' }, 404, cors)
        return json(rowToChar(rows[idx]), 200, cors)
      }

      // ── PUT /characters/:id ────────────────────────────────────────────────
      if (request.method === 'PUT' && charMatch) {
        const id   = decodeURIComponent(charMatch[1])
        const body = await request.json() as {
          markdown: string
          local_updated_at: string
          force?: boolean
        }

        const rows            = await readAllRows(token, env.SHEET_ID)
        const idx             = rows.findIndex(r => r[0] === id)
        const serverUpdatedAt = idx !== -1 ? rows[idx][3] : null
        const serverMarkdown  = idx !== -1 ? rows[idx][2] : null

        // Conflict check: server is strictly newer and caller did not set force
        if (
          !body.force &&
          serverUpdatedAt &&
          new Date(serverUpdatedAt) > new Date(body.local_updated_at)
        ) {
          return json(
            { conflict: true, server_markdown: serverMarkdown, server_updated_at: serverUpdatedAt },
            409,
            cors,
          )
        }

        const now  = new Date().toISOString()
        const name = (idx !== -1 ? rows[idx][1] : null) ?? nameFromMarkdown(body.markdown, id)
        const record: RemoteCharacter = { id, name, markdown: body.markdown, updated_at: now }

        if (idx === -1) {
          await appendRow(token, env.SHEET_ID, record)
        } else {
          // rows[idx] corresponds to sheet row (idx + 2): header is row 1, data starts at row 2
          await updateRow(token, env.SHEET_ID, idx + 2, record)
        }

        return json({ ok: true, updated_at: now }, 200, cors)
      }

      return json({ error: 'Not found' }, 404, cors)

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return json({ error: msg }, 500, cors)
    }
  },
}
