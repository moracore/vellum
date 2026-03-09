import { getAllCharacterRecords } from '../../db'

// The static .md files in this directory are kept for DM reference / initial
// Sheet seeding only.  At runtime the app reads exclusively from IndexedDB,
// which is populated by the startup pull from the Cloudflare Worker.

/**
 * Search IndexedDB for a character matching the given player name, character
 * name, or alias (all case-insensitive, whitespace-collapsed).
 *
 * Returns { id, markdown } or null if no match is found.
 */
export async function findCharacter(query: string): Promise<{ id: string; markdown: string } | null> {
  const q       = query.trim().toLowerCase().replace(/\s+/g, '')
  const records = await getAllCharacterRecords()

  const found = records.find(({ markdown }) => {
    const lines      = markdown.split('\n')
    const charName   = lines.find(l => l.startsWith('# '))?.slice(2).trim().toLowerCase().replace(/\s+/g, '') ?? ''
    const playerName = lines.find(l => l.startsWith('Player:'))?.slice(7).trim().toLowerCase().replace(/\s+/g, '') ?? ''
    const aliases    = (lines.find(l => l.startsWith('Aliases:'))?.slice(8).trim() ?? '')
      .split(',').map(a => a.trim().toLowerCase().replace(/\s+/g, '')).filter(Boolean)

    return charName === q || playerName === q || aliases.includes(q)
  })

  return found ? { id: found.id, markdown: found.markdown } : null
}
