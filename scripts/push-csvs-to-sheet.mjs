#!/usr/bin/env node
/**
 * One-time script: push all Database/*.csv files to a Google Sheet as separate tabs.
 *
 * Usage:
 *   node scripts/push-csvs-to-sheet.mjs <path-to-service-account.json> <SHEET_ID>
 *
 * This adds new tabs alongside your existing "Characters" tab.
 * The Characters tab is NOT touched.
 *
 * What it does:
 *   1. Reads every CSV from Database/
 *   2. For each CSV, creates a tab (or clears it if it already exists)
 *   3. Writes all rows into that tab
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, basename, resolve } from 'path'
import { webcrypto as crypto } from 'crypto'

// ─── Config ───────────────────────────────────────────────────────────────────

const CSV_MAP = [
  // [tab_name, relative_path_from_Database/]
  ['classes',              'core/classes.csv'],
  ['subclasses',           'core/subclasses.csv'],
  ['traits',               'core/traits.csv'],
  ['choices',              'core/choices.csv'],
  ['choices_recurring',    'core/choices_recurring.csv'],
  ['progression',          'progression/progression.csv'],
  ['spell_slots',          'progression/spell_slots_progression.csv'],
  ['feature_bonuses',      'progression/feature_bonuses.csv'],
  ['character_levels',     'progression/character_levels.csv'],
  ['spells',               'static/spells.csv'],
  ['class_spells',         'relations/class_spells.csv'],
  ['class_saving_throws',  'relations/class_saving_throws.csv'],
  ['class_weapon_profs',   'relations/class_weapon_proficiencies.csv'],
  ['class_armour_profs',   'relations/class_armour_proficiencies.csv'],
  ['weapons',              'static/weapons.csv'],
  ['armour',               'static/armour.csv'],
  ['skills',               'static/skills.csv'],
  ['backgrounds',          'core/backgrounds.csv'],
  ['races',                'core/races.csv'],
  ['starting_equipment',   'static/starting_equipment_options.csv'],
  ['general_feats',        'core/general_feats.csv'],
  ['epic_boon_feats',      'core/epic_boon_feats.csv'],
  ['trait_spells',         'relations/trait_spells.csv'],
]

// ─── Args ─────────────────────────────────────────────────────────────────────

const [saPath, sheetId] = process.argv.slice(2)
if (!saPath || !sheetId) {
  console.error('Usage: node scripts/push-csvs-to-sheet.mjs <service-account.json> <SHEET_ID>')
  process.exit(1)
}

const DATABASE_DIR = resolve(import.meta.dirname, '..', 'Database')
const sa = JSON.parse(readFileSync(resolve(saPath), 'utf-8'))

// ─── Google Auth (same JWT pattern as the worker) ─────────────────────────────

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000)

  const b64url = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')

  const header  = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss:   sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  }

  const signingInput = `${b64url(header)}.${b64url(payload)}`

  // Import the private key
  const pemKey = sa.private_key.replace(/\\n/g, '\n')
  const b64key = pemKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const keyBytes = Buffer.from(b64key, 'base64')

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

  const b64sig = Buffer.from(sigBytes).toString('base64url')
  const jwt = `${signingInput}.${b64sig}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!tokenRes.ok) {
    throw new Error(`Token exchange failed: ${await tokenRes.text()}`)
  }

  const { access_token } = await tokenRes.json()
  return access_token
}

// ─── CSV parsing ──────────────────────────────────────────────────────────────

/**
 * Simple CSV parser that handles quoted fields with commas and newlines.
 */
function parseCSV(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"'
          i++ // skip escaped quote
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        row.push(field)
        field = ''
      } else if (ch === '\n') {
        row.push(field)
        field = ''
        if (row.length > 0) rows.push(row)
        row = []
      } else if (ch === '\r') {
        // skip \r (handle \r\n)
      } else {
        field += ch
      }
    }
  }

  // Last field/row
  if (field || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

// ─── Sheets API helpers ───────────────────────────────────────────────────────

async function getExistingSheets(token, sheetId) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Failed to get sheet info: ${await res.text()}`)
  const data = await res.json()
  return data.sheets.map(s => ({
    title: s.properties.title,
    sheetId: s.properties.sheetId,
  }))
}

async function batchUpdate(token, spreadsheetId, requests) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  })
  if (!res.ok) throw new Error(`batchUpdate failed: ${await res.text()}`)
  return res.json()
}

async function writeValues(token, spreadsheetId, range, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
  })
  if (!res.ok) throw new Error(`Write to "${range}" failed: ${await res.text()}`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔑 Authenticating with Google...')
  const token = await getAccessToken(sa)

  console.log('📋 Reading existing sheet tabs...')
  const existingSheets = await getExistingSheets(token, sheetId)
  const existingNames = new Set(existingSheets.map(s => s.title))

  // Determine which tabs need to be created
  const tabsToCreate = CSV_MAP.filter(([tabName]) => !existingNames.has(tabName))

  if (tabsToCreate.length > 0) {
    console.log(`📝 Creating ${tabsToCreate.length} new tab(s): ${tabsToCreate.map(t => t[0]).join(', ')}`)
    const requests = tabsToCreate.map(([tabName]) => ({
      addSheet: { properties: { title: tabName } },
    }))
    await batchUpdate(token, sheetId, requests)
  }

  // Process each CSV
  for (const [tabName, csvPath] of CSV_MAP) {
    const fullPath = join(DATABASE_DIR, csvPath)
    console.log(`  📄 ${tabName} ← ${csvPath}`)

    const raw = readFileSync(fullPath, 'utf-8')
    const rows = parseCSV(raw)

    if (rows.length === 0) {
      console.log(`     ⚠️  Empty CSV, skipping`)
      continue
    }

    // Clear existing data first (in case tab existed already)
    if (existingNames.has(tabName)) {
      const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tabName)}:clear`
      const clearRes = await fetch(clearUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (!clearRes.ok) {
        console.error(`     ⚠️  Clear failed for "${tabName}": ${await clearRes.text()}`)
        console.error(`     Skipping this tab to avoid stale data`)
        continue
      }
    }

    // Write all rows
    const range = `${tabName}!A1`
    await writeValues(token, sheetId, range, rows)
    console.log(`     ✅ ${rows.length} rows (incl. header)`)
  }

  console.log('\n🎉 Done! All CSVs pushed to the sheet.')
  console.log(`   Sheet ID: ${sheetId}`)
}

main().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
