// Spell progression for "spells known" classes.
// Array index = character level - 1 (so index 0 = level 1, index 9 = level 10)

export interface SpellProgression {
  cantripsKnown: number[]
  spellsKnown: number[]
  maxSpellLevel: number[]
}

export const CLASS_PROGRESSION: Record<string, SpellProgression> = {
  Sorcerer: {
    cantripsKnown: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6],
    spellsKnown:   [2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    maxSpellLevel: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
  },
  Bard: {
    cantripsKnown: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4],
    spellsKnown:   [4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    maxSpellLevel: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
  },
  Warlock: {
    cantripsKnown: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4],
    spellsKnown:   [2, 3, 4, 5, 6, 7, 8, 9, 10, 10],
    maxSpellLevel: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
  },
  Wizard: {
    cantripsKnown: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5],
    spellsKnown:   [6, 8, 10, 12, 14, 16, 18, 20, 22, 24],
    maxSpellLevel: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
  },
  Ranger: {
    cantripsKnown: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    spellsKnown:   [0, 2, 3, 3, 4, 4, 4, 5, 5, 6],
    maxSpellLevel: [0, 1, 1, 1, 2, 2, 2, 3, 3, 3],
  },
}
