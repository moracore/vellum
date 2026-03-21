import { getAllCharacterRecords } from '../../db'

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '')
}

/**
 * Sign-in: find a character by the triple (characterName, playerName, passkey).
 * All comparisons are case-insensitive and whitespace-collapsed.
 */
export async function findCharacter(
  characterName: string,
  playerName: string,
  passkey: string,
): Promise<{ id: string } | null> {
  const qChar = norm(characterName)
  const qPlayer = norm(playerName)
  const qKey = norm(passkey)

  const records = await getAllCharacterRecords()

  const found = records.find(({ data }) => {
    return norm(data.name) === qChar
      && norm(data.player) === qPlayer
      && norm(data.passkey) === qKey
  })

  return found ? { id: found.id } : null
}

/**
 * Check if a (characterName, playerName, passkey) triple is already taken.
 */
export async function isPasskeyTaken(
  characterName: string,
  playerName: string,
  passkey: string,
): Promise<boolean> {
  const result = await findCharacter(characterName, playerName, passkey)
  return result !== null
}
