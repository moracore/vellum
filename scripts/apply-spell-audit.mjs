#!/usr/bin/env node
/**
 * Apply spell audit results: add new spells to spells.csv and update class_spells.csv
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// ── New spells to add to spells.csv ──────────────────────────────────────────
const NEW_SPELLS = [
  [273, 'Starry Wisp', 0, 'Evocation'],
  [274, 'Thorn Whip', 0, 'Transmutation'],
  [275, 'Compelled Duel', 1, 'Enchantment'],
  [276, 'Create or Destroy Water', 1, 'Transmutation'],
  [277, 'Detect Poison and Disease', 1, 'Divination'],
  [278, 'Divine Smite', 1, 'Evocation'],
  [279, 'Ensnaring Strike', 1, 'Conjuration'],
  [280, 'Hail of Thorns', 1, 'Conjuration'],
  [281, 'Illusory Script', 1, 'Illusion'],
  [282, 'Purify Food and Drink', 1, 'Transmutation'],
  [283, 'Searing Smite', 1, 'Evocation'],
  [284, 'Speak with Animals', 1, 'Divination'],
  [285, "Tenser's Floating Disk", 1, 'Conjuration'],
  [286, 'Thunderous Smite', 1, 'Evocation'],
  [287, 'Unseen Servant', 1, 'Conjuration'],
  [288, 'Animal Messenger', 2, 'Enchantment'],
  [289, 'Arcane Vigor', 2, 'Abjuration'],
  [290, 'Beast Sense', 2, 'Divination'],
  [291, 'Continual Flame', 2, 'Evocation'],
  [292, 'Cordon of Arrows', 2, 'Transmutation'],
  [293, 'Find Steed', 2, 'Conjuration'],
  [294, 'Find Traps', 2, 'Divination'],
  [295, 'Flame Blade', 2, 'Evocation'],
  [296, 'Gentle Repose', 2, 'Necromancy'],
  [297, 'Locate Animals or Plants', 2, 'Divination'],
  [298, 'Locate Object', 2, 'Divination'],
  [299, 'Magic Mouth', 2, 'Illusion'],
  [300, "Melf's Acid Arrow", 2, 'Evocation'],
  [301, 'Mind Spike', 2, 'Divination'],
  [302, "Nystul's Magic Aura", 2, 'Illusion'],
  [303, 'Prayer of Healing', 2, 'Abjuration'],
  [304, 'Protection from Poison', 2, 'Abjuration'],
  [305, 'Ray of Enfeeblement', 2, 'Necromancy'],
  [306, 'Shining Smite', 2, 'Evocation'],
  [307, 'Summon Beast', 2, 'Conjuration'],
  [308, 'Zone of Truth', 2, 'Enchantment'],
  [309, 'Enthrall', 2, 'Enchantment'],
  [310, 'Aura of Vitality', 3, 'Abjuration'],
  [311, 'Blinding Smite', 3, 'Evocation'],
  [312, 'Conjure Barrage', 3, 'Conjuration'],
  [313, "Crusader's Mantle", 3, 'Evocation'],
  [314, 'Elemental Weapon', 3, 'Transmutation'],
  [315, 'Feign Death', 3, 'Necromancy'],
  [316, 'Glyph of Warding', 3, 'Abjuration'],
  [317, 'Lightning Arrow', 3, 'Transmutation'],
  [318, 'Magic Circle', 3, 'Abjuration'],
  [319, 'Meld into Stone', 3, 'Transmutation'],
  [320, 'Phantom Steed', 3, 'Illusion'],
  [321, 'Remove Curse', 3, 'Abjuration'],
  [322, 'Summon Fey', 3, 'Conjuration'],
  [323, 'Summon Undead', 3, 'Necromancy'],
  [324, 'Arcane Eye', 4, 'Divination'],
  [325, 'Aura of Life', 4, 'Abjuration'],
  [326, 'Aura of Purity', 4, 'Abjuration'],
  [327, 'Conjure Woodland Beings', 4, 'Conjuration'],
  [328, 'Control Water', 4, 'Transmutation'],
  [329, 'Fabricate', 4, 'Transmutation'],
  [330, 'Giant Insect', 4, 'Conjuration'],
  [331, "Leomund's Secret Chest", 4, 'Conjuration'],
  [332, 'Locate Creature', 4, 'Divination'],
  [333, "Mordenkainen's Faithful Hound", 4, 'Conjuration'],
  [334, "Mordenkainen's Private Sanctum", 4, 'Abjuration'],
  [335, "Otiluke's Resilient Sphere", 4, 'Evocation'],
  [336, 'Phantasmal Killer', 4, 'Illusion'],
  [337, 'Staggering Smite', 4, 'Enchantment'],
  [338, 'Stone Shape', 4, 'Transmutation'],
  [339, 'Summon Aberration', 4, 'Conjuration'],
  [340, 'Summon Construct', 4, 'Conjuration'],
  [341, 'Summon Elemental', 4, 'Conjuration'],
  [342, 'Antilife Shell', 5, 'Abjuration'],
  [343, 'Awaken', 5, 'Transmutation'],
  [344, 'Banishing Smite', 5, 'Evocation'],
  [345, 'Circle of Power', 5, 'Abjuration'],
  [346, 'Commune', 5, 'Divination'],
  [347, 'Commune with Nature', 5, 'Divination'],
  [348, 'Conjure Elemental', 5, 'Conjuration'],
  [349, 'Conjure Volley', 5, 'Conjuration'],
  [350, 'Contact Other Plane', 5, 'Divination'],
  [351, 'Contagion', 5, 'Necromancy'],
  [352, 'Destructive Wave', 5, 'Evocation'],
  [353, 'Dispel Evil and Good', 5, 'Abjuration'],
  [354, 'Flame Strike', 5, 'Evocation'],
  [355, 'Fount of Moonlight', 5, 'Evocation'],
  [356, 'Geas', 5, 'Enchantment'],
  [357, 'Hallow', 5, 'Abjuration'],
  [358, 'Insect Plague', 5, 'Conjuration'],
  [359, "Jallarzi's Storm of Radiance", 5, 'Evocation'],
  [360, 'Modify Memory', 5, 'Enchantment'],
  [361, 'Passwall', 5, 'Transmutation'],
  [362, 'Raise Dead', 5, 'Necromancy'],
  [363, "Rary's Telepathic Bond", 5, 'Divination'],
  [364, 'Reincarnate', 5, 'Necromancy'],
  [365, 'Summon Celestial', 5, 'Conjuration'],
  [366, 'Summon Dragon', 5, 'Conjuration'],
  [367, 'Swift Quiver', 5, 'Transmutation'],
  [368, "Yolande's Regal Presence", 5, 'Enchantment'],
  [369, 'Blade Barrier', 6, 'Evocation'],
  [370, 'Conjure Fey', 6, 'Conjuration'],
  [371, 'Contingency', 6, 'Abjuration'],
  [372, 'Create Undead', 6, 'Necromancy'],
  [373, "Drawmij's Instant Summons", 6, 'Conjuration'],
  [374, 'Find the Path', 6, 'Divination'],
  [375, 'Forbiddance', 6, 'Abjuration'],
  [376, 'Guards and Wards', 6, 'Abjuration'],
  [377, "Heroes' Feast", 6, 'Conjuration'],
  [378, 'Magic Jar', 6, 'Necromancy'],
  [379, "Otiluke's Freezing Sphere", 6, 'Evocation'],
  [380, 'Planar Ally', 6, 'Conjuration'],
  [381, 'Programmed Illusion', 6, 'Illusion'],
  [382, 'Summon Fiend', 6, 'Conjuration'],
  [383, "Tasha's Bubbling Cauldron", 6, 'Conjuration'],
  [384, 'Transport via Plants', 6, 'Conjuration'],
  [385, 'Wind Walk', 6, 'Transmutation'],
  [386, 'Word of Recall', 6, 'Conjuration'],
  [387, 'Conjure Celestial', 7, 'Conjuration'],
  [388, "Mordenkainen's Sword", 7, 'Evocation'],
  [389, 'Power Word Fortify', 7, 'Enchantment'],
  [390, 'Project Image', 7, 'Illusion'],
  [391, 'Regenerate', 7, 'Transmutation'],
  [392, 'Resurrection', 7, 'Necromancy'],
  [393, 'Simulacrum', 7, 'Illusion'],
  [394, 'Animal Shapes', 8, 'Transmutation'],
  [395, 'Befuddlement', 8, 'Enchantment'],
  [396, 'Clone', 8, 'Necromancy'],
  [397, 'Control Weather', 8, 'Transmutation'],
  [398, 'Glibness', 8, 'Enchantment'],
  [399, 'Holy Aura', 8, 'Abjuration'],
  [400, 'Maze', 8, 'Conjuration'],
  [401, 'Telepathy', 8, 'Divination'],
  [402, 'Tsunami', 8, 'Conjuration'],
  [403, 'Prismatic Wall', 9, 'Abjuration'],
]

// ── class_spells.csv changes ────────────────────────────────────────────────
// Format: { classId, level, add: [...ids], remove: [...ids] }
const CLASS_SPELL_CHANGES = [
  // A1 — Bard (class_id = 2)
  { classId: 2, level: 0, add: [273] },
  { classId: 2, level: 1, add: [284] },
  { classId: 2, level: 2, add: [288, 289, 298, 308, 309], remove: [196] },
  { classId: 2, level: 3, add: [315] },
  { classId: 2, level: 4, add: [332] },
  { classId: 2, level: 5, add: [355, 356, 360, 368] },
  { classId: 2, level: 6, add: [376] },
  { classId: 2, level: 7, add: [389, 390] },
  { classId: 2, level: 8, add: [395, 398] },

  // A2 — Cleric (class_id = 3)
  { classId: 3, level: 1, add: [276, 277, 282] },
  { classId: 3, level: 2, add: [291, 294, 296, 298, 303, 308] },
  { classId: 3, level: 3, add: [315, 316, 318, 319, 321] },
  { classId: 3, level: 4, add: [328, 332, 338] },
  { classId: 3, level: 5, add: [346, 351, 354, 356, 357, 358, 359, 362, 365] },
  { classId: 3, level: 6, add: [369, 372, 375, 377, 380, 386] },
  { classId: 3, level: 7, add: [387, 389, 391, 392] },
  { classId: 3, level: 8, add: [397, 399] },

  // A3 — Druid (class_id = 4)
  { classId: 4, level: 0, add: [273, 274] },
  { classId: 4, level: 1, add: [276, 277, 282, 284], remove: [66] },
  { classId: 4, level: 2, add: [288, 290, 295, 297, 304, 307], remove: [110] },
  { classId: 4, level: 3, add: [315, 319, 322] },
  { classId: 4, level: 4, add: [324, 327, 328, 330, 332, 338, 341], remove: [177] },
  { classId: 4, level: 5, add: [342, 343, 347, 348, 351, 355, 356, 358, 364], remove: [263] },
  { classId: 4, level: 6, add: [370, 374, 377, 384, 385] },
  { classId: 4, level: 7, add: [391], remove: [230] },
  { classId: 4, level: 8, add: [394, 397, 402] },

  // A4 — Paladin (class_id = 7)
  { classId: 7, level: 1, add: [275, 278, 282, 283, 286] },
  { classId: 7, level: 2, add: [293, 298, 304, 306, 308] },
  { classId: 7, level: 3, add: [310, 311, 313, 314, 318, 321] },
  { classId: 7, level: 4, add: [325, 326, 332, 337] },
  // Level 5 is a NEW row
  { classId: 7, level: 5, add: [344, 345, 352, 353, 356, 362, 365], newRow: true },

  // A5 — Ranger (class_id = 8)
  { classId: 8, level: 1, add: [277, 279, 280, 283, 284] },
  { classId: 8, level: 2, add: [290, 292, 294, 297, 298, 304, 307] },
  { classId: 8, level: 3, add: [312, 317, 322] },
  { classId: 8, level: 4, add: [332] },
  { classId: 8, level: 5, add: [349, 367], remove: [192] },

  // A6 — Warlock (class_id = 11)
  { classId: 11, level: 1, add: [287] },
  { classId: 11, level: 2, add: [301, 305, 309] },
  { classId: 11, level: 3, add: [318, 321, 322, 323] },
  { classId: 11, level: 4, add: [339] },
  { classId: 11, level: 5, add: [350] },
  { classId: 11, level: 6, add: [372, 382] },
  { classId: 11, level: 8, add: [398] },

  // A7 — Wizard (class_id = 12)
  { classId: 12, level: 0, add: [22] },
  { classId: 12, level: 1, add: [281, 285, 287] },
  { classId: 12, level: 2, add: [291, 296, 299, 300, 301, 302, 305] },
  { classId: 12, level: 3, add: [320, 322, 323] },
  { classId: 12, level: 4, add: [324, 328, 329, 331, 333, 334, 335, 336, 338, 339, 340, 341] },
  { classId: 12, level: 5, add: [206, 350, 356, 359, 360, 361, 363, 366, 368] },
  { classId: 12, level: 6, add: [371, 373, 376, 378, 379, 381, 382, 383], remove: [206] },
  { classId: 12, level: 7, add: [388, 390, 393] },
  { classId: 12, level: 8, add: [395, 396, 397, 400, 401] },
  { classId: 12, level: 9, add: [403] },
]

// ── Apply to spells.csv ──────────────────────────────────────────────────────
const spellsPath = resolve(root, 'Database/static/spells.csv')
let spellsCsv = readFileSync(spellsPath, 'utf8')

for (const [id, name, level, school] of NEW_SPELLS) {
  const escapedName = name.includes(',') ? `"${name}"` : name
  // spell_id,name,level,school,casting_time,range,components,duration,requires_concentration,is_ritual,description,damage_dice
  spellsCsv += `${id},${escapedName},${level},${school},,,,,,FALSE,FALSE,,\n`
}

writeFileSync(spellsPath, spellsCsv)
console.log(`Added ${NEW_SPELLS.length} new spells to spells.csv`)

// ── Apply to class_spells.csv ────────────────────────────────────────────────
const classSpellsPath = resolve(root, 'Database/relations/class_spells.csv')
let lines = readFileSync(classSpellsPath, 'utf8').split('\n')
const header = lines[0]
const rows = lines.slice(1).filter(l => l.trim())

function parseRow(line) {
  const [classId, subclassId, level, spellIds, isAlwaysPrepared] = line.split(',')
  return {
    classId: parseInt(classId),
    subclassId: subclassId || '',
    level: parseInt(level),
    spellIds: spellIds ? spellIds.split('|').map(Number) : [],
    isAlwaysPrepared: isAlwaysPrepared || 'FALSE',
    raw: line,
  }
}

function serializeRow(r) {
  return `${r.classId},${r.subclassId},${r.level},${r.spellIds.join('|')},${r.isAlwaysPrepared}`
}

const parsedRows = rows.map(parseRow)

for (const change of CLASS_SPELL_CHANGES) {
  const existing = parsedRows.find(r =>
    r.classId === change.classId &&
    r.subclassId === '' &&
    r.level === change.level
  )

  if (existing) {
    // Remove spells
    if (change.remove) {
      existing.spellIds = existing.spellIds.filter(id => !change.remove.includes(id))
    }
    // Add spells
    if (change.add) {
      for (const id of change.add) {
        if (!existing.spellIds.includes(id)) {
          existing.spellIds.push(id)
        }
      }
    }
    existing.spellIds.sort((a, b) => a - b)
  } else if (change.newRow) {
    parsedRows.push({
      classId: change.classId,
      subclassId: '',
      level: change.level,
      spellIds: [...change.add].sort((a, b) => a - b),
      isAlwaysPrepared: 'FALSE',
    })
  }
}

// Sort rows by classId, then subclassId, then level
parsedRows.sort((a, b) =>
  a.classId - b.classId ||
  a.subclassId.localeCompare(b.subclassId) ||
  a.level - b.level
)

const output = [header, ...parsedRows.map(serializeRow)].join('\n') + '\n'
writeFileSync(classSpellsPath, output)
console.log(`Updated class_spells.csv with ${CLASS_SPELL_CHANGES.length} changes`)
