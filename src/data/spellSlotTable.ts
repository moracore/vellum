interface SpellSlots { max: number; current: number }

// Each row: index = level-1 (0-based). Each inner array = [l1, l2, l3, l4, l5, l6, l7, l8, l9] slot counts.

const FULL_CASTER: number[][] = [
  [2, 0, 0, 0, 0, 0, 0, 0, 0], // 1
  [3, 0, 0, 0, 0, 0, 0, 0, 0], // 2
  [4, 2, 0, 0, 0, 0, 0, 0, 0], // 3
  [4, 3, 0, 0, 0, 0, 0, 0, 0], // 4
  [4, 3, 2, 0, 0, 0, 0, 0, 0], // 5
  [4, 3, 3, 0, 0, 0, 0, 0, 0], // 6
  [4, 3, 3, 1, 0, 0, 0, 0, 0], // 7
  [4, 3, 3, 2, 0, 0, 0, 0, 0], // 8
  [4, 3, 3, 3, 1, 0, 0, 0, 0], // 9
  [4, 3, 3, 3, 2, 0, 0, 0, 0], // 10
  [4, 3, 3, 3, 2, 1, 0, 0, 0], // 11
  [4, 3, 3, 3, 2, 1, 0, 0, 0], // 12
  [4, 3, 3, 3, 2, 1, 1, 0, 0], // 13
  [4, 3, 3, 3, 2, 1, 1, 0, 0], // 14
  [4, 3, 3, 3, 2, 1, 1, 1, 0], // 15
  [4, 3, 3, 3, 2, 1, 1, 1, 0], // 16
  [4, 3, 3, 3, 2, 1, 1, 1, 1], // 17
  [4, 3, 3, 3, 3, 1, 1, 1, 1], // 18
  [4, 3, 3, 3, 3, 2, 1, 1, 1], // 19
  [4, 3, 3, 3, 3, 2, 2, 1, 1], // 20
]

// Half-casters (Paladin, Ranger) — no slots at level 1
const HALF_CASTER: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0], // 1
  [2, 0, 0, 0, 0, 0, 0, 0, 0], // 2
  [3, 0, 0, 0, 0, 0, 0, 0, 0], // 3
  [3, 0, 0, 0, 0, 0, 0, 0, 0], // 4
  [4, 2, 0, 0, 0, 0, 0, 0, 0], // 5
  [4, 2, 0, 0, 0, 0, 0, 0, 0], // 6
  [4, 3, 0, 0, 0, 0, 0, 0, 0], // 7
  [4, 3, 0, 0, 0, 0, 0, 0, 0], // 8
  [4, 3, 2, 0, 0, 0, 0, 0, 0], // 9
  [4, 3, 2, 0, 0, 0, 0, 0, 0], // 10
  [4, 3, 3, 0, 0, 0, 0, 0, 0], // 11
  [4, 3, 3, 0, 0, 0, 0, 0, 0], // 12
  [4, 3, 3, 1, 0, 0, 0, 0, 0], // 13
  [4, 3, 3, 1, 0, 0, 0, 0, 0], // 14
  [4, 3, 3, 2, 0, 0, 0, 0, 0], // 15
  [4, 3, 3, 2, 0, 0, 0, 0, 0], // 16
  [4, 3, 3, 3, 1, 0, 0, 0, 0], // 17
  [4, 3, 3, 3, 1, 0, 0, 0, 0], // 18
  [4, 3, 3, 3, 2, 0, 0, 0, 0], // 19
  [4, 3, 3, 3, 2, 0, 0, 0, 0], // 20
]

// Warlock (Pact Magic) — all slots at the same level
// Stored as [count, slotLevel] pairs; we emit a single-entry array
const WARLOCK_PACT: Array<[number, number]> = [
  [1, 1], [2, 1], [2, 2], [2, 2], [2, 3],
  [2, 3], [2, 4], [2, 4], [2, 5], [2, 5],
  [3, 5], [3, 5], [3, 5], [3, 5], [3, 5],
  [3, 5], [4, 5], [4, 5], [4, 5], [4, 5],
]

const FULL_CASTER_CLASSES = new Set(['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard'])
const HALF_CASTER_CLASSES = new Set(['Paladin', 'Ranger'])

/**
 * Returns the SpellSlots[] array for a class at a given level.
 * currentSlots is the existing state array so we can preserve used slots.
 */
export function getSpellSlotsForLevel(
  className: string,
  level: number,
  currentSlots: SpellSlots[] = []
): SpellSlots[] {
  const idx = Math.min(Math.max(level, 1), 20) - 1

  if (className === 'Warlock') {
    const [count] = WARLOCK_PACT[idx]
    if (count === 0) return []
    // Warlock has one tier of slots — preserve current if same level
    const prev = currentSlots[0]
    const current = prev ? Math.min(prev.current, count) : count
    return [{ max: count, current }]
  }

  let table: number[][] | null = null
  if (FULL_CASTER_CLASSES.has(className)) table = FULL_CASTER
  else if (HALF_CASTER_CLASSES.has(className)) table = HALF_CASTER
  else return [] // non-caster

  const row = table[idx]
  const result: SpellSlots[] = []
  for (let i = 0; i < row.length; i++) {
    if (row[i] === 0) continue
    const prev = currentSlots[i]
    const current = prev ? Math.min(prev.current, row[i]) : row[i]
    result.push({ max: row[i], current })
  }
  return result
}
