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
 *   Row 1: headers
 *   Row 2+: one row per character
 *   Columns A–BN (66 columns) — see charToRow/rowToChar for the full mapping.
 */

import type { CharacterData } from '../src/types'

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

// ─── Google auth ──────────────────────────────────────────────────────────────

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

// ─── Column ↔ CharacterData mapping ──────────────────────────────────────────

/**
 * Column layout (A=0 … BM=64):
 *
 * A=id, B=name, C=player, D=passkey, E=class, F=level, G=race,
 * H=ability_scores{}, I=saving_throws[], J=skills[],
 * K=max_hp, L=current_hp, M=temp_hp, N=ac, O=initiative, P=speed,
 * Q=hit_dice, R=hit_dice_current, S=proficiency_bonus,
 * T=death_saves[], U=conditions[],
 * V=spell_ability, W=spell_attack_bonus, X=spell_save_dc,
 * Y=spell_slots[], Z=spell_slots_max[],
 * AA–AJ=spells_lv0…lv9[], AK=prepared_spells[],
 * AL=currency[], AM=equipment[], AN=on_person[], AO=bag[],
 * AP–AS=bag2…5[], AT–AX=sack1…5[],
 * AY=notes, AZ=description, BA=choices{}, BB=traits[], BC=race_traits[],
 * BD=resources{}, BE=languages[], BF=other_proficiencies, BG=aliases[],
 * BH=alignment, BI=deity, BJ=subclass, BK=skill_details{},
 * BL=bag_of_holding[], BM=container_names{}, BN=updated_at
 *
 * Encoding: scalars as plain values, arrays/objects as JSON strings.
 */

const NUM_COLS = 66  // A(0) through BN(65)

function charToRow(char: CharacterData, updatedAt: string): string[] {
  const j = (v: unknown) => JSON.stringify(v)
  const nullable = (v: string | number | null) => v === null ? '' : String(v)

  return [
    char.id,                          // A  (0)
    char.name,                        // B  (1)
    char.player,                      // C  (2)
    char.passkey,                     // D  (3)
    char.class,                       // E  (4)
    String(char.level),               // F  (5)
    char.race,                        // G  (6)
    j(char.abilityScores),            // H  (7)
    j(char.savingThrows),             // I  (8)
    j(char.skills),                   // J  (9)
    String(char.maxHp),               // K  (10)
    String(char.currentHp),           // L  (11)
    String(char.tempHp),              // M  (12)
    String(char.ac),                  // N  (13)
    String(char.initiative),          // O  (14)
    String(char.speed),               // P  (15)
    char.hitDice,                     // Q  (16)
    String(char.hitDiceCurrent),      // R  (17)
    String(char.proficiencyBonus),    // S  (18)
    j(char.deathSaves),               // T  (19)
    j(char.conditions),               // U  (20)
    nullable(char.spellAbility),      // V  (21)
    nullable(char.spellAttackBonus),  // W  (22)
    nullable(char.spellSaveDc),       // X  (23)
    j(char.spellSlots),               // Y  (24)
    j(char.spellSlotsMax),            // Z  (25)
    ...char.spellsByLevel.map(j),     // AA–AJ (26–35)
    j(char.preparedSpells),           // AK (36)
    j(char.currency),                 // AL (37)
    j(char.equipment),                // AM (38)
    j(char.onPerson),                 // AN (39)
    j(char.bag),                      // AO (40)
    j(char.bag2),                     // AP (41)
    j(char.bag3),                     // AQ (42)
    j(char.bag4),                     // AR (43)
    j(char.bag5),                     // AS (44)
    j(char.sack1),                    // AT (45)
    j(char.sack2),                    // AU (46)
    j(char.sack3),                    // AV (47)
    j(char.sack4),                    // AW (48)
    j(char.sack5),                    // AX (49)
    char.notes,                       // AY (50)
    char.description,                 // AZ (51)
    j(char.choices),                  // BA (52)
    j(char.traits),                   // BB (53)
    j(char.raceTraits),               // BC (54)
    j(char.resources),                // BD (55)
    j(char.languages),                // BE (56)
    char.otherProficiencies,          // BF (57)
    j(char.aliases),                  // BG (58)
    char.alignment,                   // BH (59)
    nullable(char.deity),             // BI (60)
    nullable(char.subclass),          // BJ (61)
    j(char.skillDetails),             // BK (62)
    j(char.bagOfHolding),             // BL (63)
    j(char.containerNames),           // BM (64)
    updatedAt,                        // BN (65)
  ]
}

function rowToChar(row: string[]): { data: CharacterData; updated_at: string } {
  const str = (i: number) => row[i] ?? ''
  const num = (i: number) => Number(row[i]) || 0
  const nullNum = (i: number): number | null => row[i] ? Number(row[i]) : null
  const nullStr = (i: number): string | null => row[i] || null
  const json = <T>(i: number, fallback: T): T => {
    try { return row[i] ? JSON.parse(row[i]) : fallback }
    catch { return fallback }
  }

  const data: CharacterData = {
    id:                str(0),
    name:              str(1),
    player:            str(2),
    passkey:           str(3),
    class:             str(4),
    level:             num(5),
    race:              str(6),
    abilityScores:     json(7, { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }),
    savingThrows:      json(8, []),
    skills:            json(9, []),
    maxHp:             num(10),
    currentHp:         num(11),
    tempHp:            num(12),
    ac:                num(13),
    initiative:        num(14),
    speed:             num(15),
    hitDice:           str(16),
    hitDiceCurrent:    num(17),
    proficiencyBonus:  num(18),
    deathSaves:        json(19, [0, 0] as [number, number]),
    conditions:        json(20, []),
    spellAbility:      nullNum(21),
    spellAttackBonus:  nullNum(22),
    spellSaveDc:       nullNum(23),
    spellSlots:        json(24, [0, 0, 0, 0, 0, 0, 0, 0, 0]),
    spellSlotsMax:     json(25, [0, 0, 0, 0, 0, 0, 0, 0, 0]),
    spellsByLevel:     Array.from({ length: 10 }, (_, k) => json<number[]>(26 + k, [])),
    preparedSpells:    json(36, []),
    currency:          json(37, [0, 0, 0] as [number, number, number]),
    equipment:         json(38, [null, null, null] as [string | null, string | null, string | null]),
    onPerson:          json(39, []),
    bag:               json(40, []),
    bag2:              json(41, []),
    bag3:              json(42, []),
    bag4:              json(43, []),
    bag5:              json(44, []),
    sack1:             json(45, []),
    sack2:             json(46, []),
    sack3:             json(47, []),
    sack4:             json(48, []),
    sack5:             json(49, []),
    notes:             str(50),
    description:       str(51),
    choices:           json(52, {}),
    traits:            json(53, []),
    raceTraits:        json(54, []),
    resources:         json(55, {}),
    languages:         json(56, []),
    otherProficiencies: str(57),
    aliases:           json(58, []),
    alignment:         str(59),
    deity:             nullStr(60),
    subclass:          nullStr(61),
    skillDetails:      json(62, {}),
    bagOfHolding:      json(63, []),
    containerNames:    json(64, {}),
  }

  // Migrate cname_/citem_ from choices → containerNames
  const cn = data.containerNames
  const ch = data.choices
  let migrated = false
  for (const key of Object.keys(ch)) {
    if (key.startsWith('cname_') || key.startsWith('citem_')) {
      cn[key] = ch[key]
      delete ch[key]
      migrated = true
    }
  }
  if (migrated) {
    data.containerNames = cn
    data.choices = ch
  }

  return { data, updated_at: str(65) }
}

// ─── Sheets API helpers ───────────────────────────────────────────────────────

const TAB   = 'Characters'
const RANGE = `${TAB}!A2:BN`   // skip header row, all 65 columns

async function readAllRows(token: string, sheetId: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(RANGE)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Sheets read error ${res.status}: ${await res.text()}`)
  const data = await res.json() as { values?: string[][] }
  return data.values ?? []
}

async function updateRow(
  token: string,
  sheetId: string,
  sheetRow: number,
  values: string[],
): Promise<void> {
  const range = `${TAB}!A${sheetRow}:BN${sheetRow}`
  const url   = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ range, majorDimension: 'ROWS', values: [values] }),
  })
  if (!res.ok) throw new Error(`Sheets update error ${res.status}: ${await res.text()}`)
}

async function appendRow(
  token: string,
  sheetId: string,
  values: string[],
): Promise<void> {
  const range = `${TAB}!A:BN`
  const url   = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ range, majorDimension: 'ROWS', values: [values] }),
  })
  if (!res.ok) throw new Error(`Sheets append error ${res.status}: ${await res.text()}`)
}

// ─── DB (reference data) helpers ──────────────────────────────────────────────

const DB_TABLES = [
  'classes', 'subclasses', 'traits', 'choices', 'choices_recurring',
  'progression', 'spell_slots', 'feature_bonuses', 'character_levels',
  'spells', 'class_spells', 'class_saving_throws', 'class_weapon_profs',
  'class_armour_profs', 'weapons', 'armour', 'skills',
  'backgrounds', 'races', 'starting_equipment',
  'general_feats', 'epic_boon_feats', 'trait_spells',
] as const

async function readSheetTab(
  sheetId: string,
  tabName: string,
  token: string,
): Promise<Record<string, string>[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tabName)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`DB tab "${tabName}" read error ${res.status}: ${await res.text()}`)
  const data = await res.json() as { values?: string[][] }
  const [headers, ...rows] = data.values ?? []
  if (!headers) return []
  return rows.map(row =>
    Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
  )
}

async function handleGetDb(token: string, env: Env, cors: Record<string, string>): Promise<Response> {
  const results = await Promise.all(
    DB_TABLES.map(tab => readSheetTab(env.SHEET_ID, tab, token))
  )

  const db: Record<string, Record<string, string>[]> = {}
  DB_TABLES.forEach((tab, i) => { db[tab] = results[i] })

  return new Response(JSON.stringify(db), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      ...cors,
    },
  })
}

// ─── CORS / response helpers ──────────────────────────────────────────────────

function corsHeaders(origin: string, allowed: string): Record<string, string> {
  const isLocalhost = /^https?:\/\/localhost(:\d+)?$/.test(origin)
  const effectiveOrigin = (origin === allowed || isLocalhost) ? origin : allowed
  return {
    'Access-Control-Allow-Origin':  effectiveOrigin,
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(data: unknown, status = 200, cors: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...cors,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
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
      // ── GET /db ─────────────────────────────────────────────────────────────
      if (request.method === 'GET' && path === '/db') {
        return handleGetDb(token, env, cors)
      }

      // ── GET /characters ────────────────────────────────────────────────────
      if (request.method === 'GET' && path === '/characters') {
        const rows = await readAllRows(token, env.SHEET_ID)
        const chars = rows.map(r => {
          const { data, updated_at } = rowToChar(r)
          return { data, updated_at }
        })
        return json(chars, 200, cors)
      }

      // ── GET /characters/:id ────────────────────────────────────────────────
      if (request.method === 'GET' && charMatch) {
        const id   = decodeURIComponent(charMatch[1])
        const rows = await readAllRows(token, env.SHEET_ID)
        const idx  = rows.findIndex(r => r[0] === id)
        if (idx === -1) return json({ error: 'Not found' }, 404, cors)
        const { data, updated_at } = rowToChar(rows[idx])
        return json({ data, updated_at }, 200, cors)
      }

      // ── PUT /characters/:id ────────────────────────────────────────────────
      if (request.method === 'PUT' && charMatch) {
        const id   = decodeURIComponent(charMatch[1])
        const body = await request.json() as {
          data: CharacterData
          local_updated_at: string
          force?: boolean
        }

        const rows            = await readAllRows(token, env.SHEET_ID)
        const idx             = rows.findIndex(r => r[0] === id)
        const serverUpdatedAt = idx !== -1 ? (rows[idx][65] ?? '') : null
        const serverData      = idx !== -1 ? rowToChar(rows[idx]).data : null

        // Conflict check: server is strictly newer and caller did not set force
        if (
          !body.force &&
          serverUpdatedAt &&
          new Date(serverUpdatedAt) > new Date(body.local_updated_at)
        ) {
          return json(
            { conflict: true, server_data: serverData, server_updated_at: serverUpdatedAt },
            409,
            cors,
          )
        }

        const now = new Date().toISOString()
        // Ensure the data has the correct id
        const charData = { ...body.data, id }
        const rowValues = charToRow(charData, now)

        if (idx === -1) {
          await appendRow(token, env.SHEET_ID, rowValues)
        } else {
          await updateRow(token, env.SHEET_ID, idx + 2, rowValues)
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
