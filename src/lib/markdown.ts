import type { CharacterSheet, CharacterState, Currency, Spell, SpellSlots } from '../types'
import { findSpell } from '../data/spells'

// ── Serializer ────────────────────────────────────────────────────────────────

function skillStr(s: { proficient: boolean; expertise: boolean; bonus?: number }): string {
  if (s.expertise) return 'expertise'
  if (s.proficient) return 'proficient'
  if (s.bonus) return s.bonus >= 0 ? `+${s.bonus}` : `${s.bonus}`
  return 'none'
}

export function serializeCharacter(sheet: CharacterSheet, state: CharacterState): string {
  const L: string[] = []
  const line = (...s: string[]) => L.push(...s)

  line(`# ${sheet.characterName}`, '')
  line(`Id: ${state.id}`)
  line(`Player: ${sheet.playerName}`)
  line(`Class: ${sheet.class}`)
  if (sheet.subclass) line(`Subclass: ${sheet.subclass}`)
  line(`Level: ${sheet.level}`)
  line(`Race: ${sheet.race}`)
  line(`Alignment: ${sheet.alignment}`)
  if (sheet.deity) line(`Deity: ${sheet.deity}`)
  line(`Languages: ${sheet.languages.join(', ')}`)
  if (sheet.aliases.length) line(`Aliases: ${sheet.aliases.join(', ')}`)
  if (sheet.otherProficiencies) line(`Other Proficiencies: ${sheet.otherProficiencies}`)
  if (sheet.raceTraits.length) line(`Race Traits: ${sheet.raceTraits.join(' | ')}`)
  if (sheet.extraTraits.length) line(`Extra Traits: ${sheet.extraTraits.join(' | ')}`)

  line('', '## Ability Scores', '')
  const ab = sheet.abilityScores
  line(`STR: ${ab.str}`, `DEX: ${ab.dex}`, `CON: ${ab.con}`,
       `INT: ${ab.int}`, `WIS: ${ab.wis}`, `CHA: ${ab.cha}`)

  line('', '## Saving Throws', '')
  const sv = sheet.savingThrows
  line(`STR: ${sv.str}`, `DEX: ${sv.dex}`, `CON: ${sv.con}`,
       `INT: ${sv.int}`, `WIS: ${sv.wis}`, `CHA: ${sv.cha}`)

  line('', '## Skills', '')
  const sk = sheet.skills
  line(
    `Acrobatics: ${skillStr(sk.acrobatics)}`,
    `Animal Handling: ${skillStr(sk.animalHandling)}`,
    `Arcana: ${skillStr(sk.arcana)}`,
    `Athletics: ${skillStr(sk.athletics)}`,
    `Deception: ${skillStr(sk.deception)}`,
    `History: ${skillStr(sk.history)}`,
    `Insight: ${skillStr(sk.insight)}`,
    `Intimidation: ${skillStr(sk.intimidation)}`,
    `Investigation: ${skillStr(sk.investigation)}`,
    `Medicine: ${skillStr(sk.medicine)}`,
    `Nature: ${skillStr(sk.nature)}`,
    `Perception: ${skillStr(sk.perception)}`,
    `Performance: ${skillStr(sk.performance)}`,
    `Persuasion: ${skillStr(sk.persuasion)}`,
    `Religion: ${skillStr(sk.religion)}`,
    `Sleight of Hand: ${skillStr(sk.sleightOfHand)}`,
    `Stealth: ${skillStr(sk.stealth)}`,
    `Survival: ${skillStr(sk.survival)}`,
  )

  line('', '## Combat', '')
  line(
    `Max HP: ${sheet.maxHp}`,
    `Current HP: ${state.currentHp}`,
    `Temp HP: ${state.tempHp}`,
    `AC: ${sheet.ac}`,
    `Initiative: ${sheet.initiative}`,
    `Speed: ${sheet.speed}`,
    `Hit Dice: ${sheet.hitDice}`,
    `Proficiency Bonus: ${sheet.proficiencyBonus}`,
    `Death Save Successes: ${state.deathSaveSuccesses}`,
    `Death Save Failures: ${state.deathSaveFailures}`,
    `Conditions: ${state.conditions.join(', ')}`,
  )

  if (sheet.spellcastingAbility) {
    line('', '## Spellcasting', '')
    line(`Ability: ${sheet.spellcastingAbility}`)
    if (sheet.spellAttackBonus != null) line(`Attack Bonus: ${sheet.spellAttackBonus}`)
    if (sheet.spellSaveDc != null) line(`Save DC: ${sheet.spellSaveDc}`)
  }

  line('', '## Spell Slots', '')
  if (state.spellSlots.length === 0) {
    line('(none)')
  } else {
    state.spellSlots.forEach((s, i) => line(`${i + 1}: ${s.current}/${s.max}`))
  }

  line('', '## Spells', '')
  if (sheet.spells.length === 0) {
    line('(none)')
  } else {
    sheet.spells.forEach(spell => line(`${spell.name}: ${spell.prepared}`))
  }

  line('', '## Currency', '')
  line(`GP: ${state.currency.gp}`, `SP: ${state.currency.sp}`, `CP: ${state.currency.cp}`)

  line('', '## Items', '')
  line(state.items.trim() || '(none)')

  line('', '## Notes', '')
  line(state.notes.trim() || '(none)')

  line('', '## Description', '')
  line(state.description.trim() || '(none)')

  const choiceEntries = Object.entries(sheet.choices)
  if (choiceEntries.length > 0) {
    line('', '## Choices', '')
    choiceEntries.forEach(([k, v]) => line(`${k}: ${v}`))
  }

  return L.join('\n')
}

// ── Parser ────────────────────────────────────────────────────────────────────

function kv(lines: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const l of lines) {
    const idx = l.indexOf(':')
    if (idx < 1) continue
    out[l.slice(0, idx).trim()] = l.slice(idx + 1).trim()
  }
  return out
}

function num(s: string | undefined): number {
  if (!s) return 0
  const n = parseInt(s)
  return isNaN(n) ? 0 : n
}

function freeText(lines: string[]): string {
  const t = lines.join('\n').trim()
  return t === '(none)' ? '' : t
}

function parseSpells(lines: string[]): Spell[] {
  const spells: Spell[] = []
  for (const l of lines) {
    const idx = l.indexOf(':')
    if (idx < 1) continue
    const name = l.slice(0, idx).trim()
    const prepared = l.slice(idx + 1).trim() === 'true'
    const data = findSpell(name)
    if (!data) continue
    spells.push({
      name: data.name,
      level: data.level,
      school: data.school,
      castingTime: data.castingTime,
      range: data.range,
      components: data.components,
      duration: data.duration,
      description: data.description,
      prepared,
    })
  }
  return spells
}

export function parseCharacter(md: string): { sheet: CharacterSheet; state: CharacterState } {
  // Split into sections by ## headers
  const sections: Record<string, string[]> = { __header__: [] }
  let sec = '__header__'
  for (const l of md.split('\n')) {
    if (l.startsWith('## ')) { sec = l.slice(3).trim(); sections[sec] = [] }
    else sections[sec].push(l)
  }

  const hdr = sections['__header__'] ?? []
  const hKV = kv(hdr)
  const characterName = hdr.find(l => l.startsWith('# '))?.slice(2).trim() ?? 'Unknown'

  const abKV  = kv(sections['Ability Scores'] ?? [])
  const svKV  = kv(sections['Saving Throws']  ?? [])
  const skKV  = kv(sections['Skills']         ?? [])
  const cKV   = kv(sections['Combat']         ?? [])
  const spKV  = kv(sections['Spellcasting']   ?? [])
  const curKV = kv(sections['Currency']       ?? [])

  const parseSkill = (name: string) => {
    const v = skKV[name] ?? 'none'
    if (v === 'expertise') return { proficient: true, expertise: true }
    if (v === 'proficient') return { proficient: true, expertise: false }
    const n = parseInt(v)
    if (!isNaN(n)) return { proficient: false, expertise: false, bonus: n }
    return { proficient: false, expertise: false }
  }

  // Spell slots — "1: 2/2" format
  const slotSheetArr: SpellSlots[] = []
  const slotStateArr: SpellSlots[] = []
  for (const l of sections['Spell Slots'] ?? []) {
    const m = l.match(/^(\d+):\s*(\d+)\/(\d+)/)
    if (m) {
      slotSheetArr.push({ max: num(m[3]), current: num(m[3]) })
      slotStateArr.push({ max: num(m[3]), current: num(m[2]) })
    }
  }

  const currency: Currency = {
    gp: num(curKV['GP']),
    sp: num(curKV['SP']),
    cp: num(curKV['CP']),
  }

  const conditions = (cKV['Conditions'] ?? '')
    .split(',').map(c => c.trim()).filter(Boolean)

  const items       = freeText(sections['Items']       ?? [])
  const notes       = freeText(sections['Notes']       ?? [])
  const description = freeText(sections['Description'] ?? [])
  const spells = parseSpells(sections['Spells'] ?? [])
  const choices: Record<string, string> = kv(sections['Choices'] ?? [])

  const sheet: CharacterSheet = {
    playerName:        hKV['Player']              ?? '',
    characterName,
    class:             hKV['Class']               ?? '',
    subclass:          hKV['Subclass'],
    level:             num(hKV['Level']),
    race:              hKV['Race']                ?? '',
    alignment:         hKV['Alignment']           ?? '',
    deity:             hKV['Deity'],
    languages:         (hKV['Languages'] ?? '').split(',').map(l => l.trim()).filter(Boolean),
    otherProficiencies: hKV['Other Proficiencies'] ?? '',
    raceTraits:        (hKV['Race Traits'] ?? '').split('|').map(t => t.trim()).filter(Boolean),
    extraTraits:       (hKV['Extra Traits'] ?? '').split('|').map(t => t.trim()).filter(Boolean),
    aliases: (hKV['Aliases'] ?? '').split(',').map(a => a.trim()).filter(Boolean),

    abilityScores: {
      str: num(abKV['STR']), dex: num(abKV['DEX']), con: num(abKV['CON']),
      int: num(abKV['INT']), wis: num(abKV['WIS']), cha: num(abKV['CHA']),
    },
    savingThrows: {
      str: svKV['STR'] === 'true', dex: svKV['DEX'] === 'true', con: svKV['CON'] === 'true',
      int: svKV['INT'] === 'true', wis: svKV['WIS'] === 'true', cha: svKV['CHA'] === 'true',
    },
    skills: {
      acrobatics:     parseSkill('Acrobatics'),
      animalHandling: parseSkill('Animal Handling'),
      arcana:         parseSkill('Arcana'),
      athletics:      parseSkill('Athletics'),
      deception:      parseSkill('Deception'),
      history:        parseSkill('History'),
      insight:        parseSkill('Insight'),
      intimidation:   parseSkill('Intimidation'),
      investigation:  parseSkill('Investigation'),
      medicine:       parseSkill('Medicine'),
      nature:         parseSkill('Nature'),
      perception:     parseSkill('Perception'),
      performance:    parseSkill('Performance'),
      persuasion:     parseSkill('Persuasion'),
      religion:       parseSkill('Religion'),
      sleightOfHand:  parseSkill('Sleight of Hand'),
      stealth:        parseSkill('Stealth'),
      survival:       parseSkill('Survival'),
    },

    maxHp:              num(cKV['Max HP']),
    currentHp:          num(cKV['Current HP']),
    tempHp:             num(cKV['Temp HP']),
    ac:                 num(cKV['AC']),
    initiative:         num(cKV['Initiative']),
    speed:              num(cKV['Speed']),
    hitDice:            cKV['Hit Dice']            ?? '1d8',
    proficiencyBonus:   num(cKV['Proficiency Bonus']),
    deathSaveSuccesses: num(cKV['Death Save Successes']),
    deathSaveFailures:  num(cKV['Death Save Failures']),
    conditions,

    spellcastingAbility: spParsed(spKV['Ability']),
    spellAttackBonus:    spKV['Attack Bonus'] ? num(spKV['Attack Bonus']) : undefined,
    spellSaveDc:         spKV['Save DC']      ? num(spKV['Save DC'])      : undefined,
    spellSlots:          slotSheetArr,
    spells,

    currency,
    items,
    notes,
    choices,
  }

  const state: CharacterState = {
    id:                 hKV['Id'] || characterName.toLowerCase(),
    currentHp:          sheet.currentHp,
    tempHp:             sheet.tempHp,
    deathSaveSuccesses: sheet.deathSaveSuccesses,
    deathSaveFailures:  sheet.deathSaveFailures,
    conditions,
    spellSlots:         slotStateArr,
    currency,
    items,
    notes,
    description,
  }

  return { sheet, state }
}

export function generateBlankMarkdown(id: string, characterName: string, playerName: string): string {
  return `# ${characterName}

Id: ${id}
Player: ${playerName}
Class:
Level: 1
Race:
Alignment:
Languages: Common

## Ability Scores

STR: 10
DEX: 10
CON: 10
INT: 10
WIS: 10
CHA: 10

## Saving Throws

STR: false
DEX: false
CON: false
INT: false
WIS: false
CHA: false

## Skills

Acrobatics: none
Animal Handling: none
Arcana: none
Athletics: none
Deception: none
History: none
Insight: none
Intimidation: none
Investigation: none
Medicine: none
Nature: none
Perception: none
Performance: none
Persuasion: none
Religion: none
Sleight of Hand: none
Stealth: none
Survival: none

## Combat

Max HP: 0
Current HP: 0
Temp HP: 0
AC: 10
Initiative: 0
Speed: 30
Hit Dice: 1d8
Proficiency Bonus: 2
Death Save Successes: 0
Death Save Failures: 0
Conditions:

## Spell Slots

(none)

## Spells

(none)

## Currency

GP: 0
SP: 0
CP: 0

## Items

(none)

## Notes

(none)

## Description

(none)`
}

function spParsed(v: string | undefined) {
  if (!v) return undefined
  const valid = ['str','dex','con','int','wis','cha']
  return valid.includes(v) ? v as CharacterSheet['spellcastingAbility'] : undefined
}
