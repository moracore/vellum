import fidoMd    from './fido.md?raw'
import olafMd    from './olaf.md?raw'
import manglerMd from './mangler.md?raw'
import slorfMd   from './slorf.md?raw'

const ALL: string[] = [fidoMd, olafMd, manglerMd, slorfMd]

// Match by player name or character name, case-insensitive
export function findCharacter(query: string): string | null {
  const q = query.trim().toLowerCase().replace(/\s+/g, '')
  return ALL.find(md => {
    const lines = md.split('\n')
    const charName = lines.find(l => l.startsWith('# '))?.slice(2).trim().toLowerCase().replace(/\s+/g, '') ?? ''
    const playerName = lines.find(l => l.startsWith('Player:'))?.slice(7).trim().toLowerCase().replace(/\s+/g, '') ?? ''
    const aliases = (lines.find(l => l.startsWith('Aliases:'))?.slice(8).trim() ?? '')
      .split(',').map(a => a.trim().toLowerCase().replace(/\s+/g, '')).filter(Boolean)
    return charName === q || playerName === q || aliases.includes(q)
  }) ?? null
}
