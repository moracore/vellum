# Character Creation Wizard — Implementation Plan

## Wizard Flow
1. **Class** — pick class
2. **Race/Species** — pick species
3. **Ability Scores** — assign standard array (15, 14, 13, 12, 10, 8) to STR/DEX/CON/INT/WIS/CHA
4. **Class Setup** — choose skill proficiencies, cantrips (if caster), starting spells (if caster)
5. **Background** — pick background (grants +2/+1 ASI, origin feat, 2 skills, starting equipment)
6. **Name** — character name + player name
7. **Review** — full summary, then confirm → character created and loaded

---

## Files to Create

### `src/data/classes5e.ts`
Interface:
```ts
export interface Class5e {
  name: string
  flavor: string          // one-line tagline
  description: string     // 3–4 sentence full description
  hitDie: number          // 6 | 8 | 10 | 12
  primaryAbility: string  // display string e.g. "Strength"
  savingThrows: string[]  // 2 ability keys e.g. ['str', 'con']
  armorProf: string
  weaponProf: string
  toolProf?: string
  skillCount: number
  skillOptions: string[]  // camelCase keys matching Skills type
  spellcasting?: {
    ability: 'int' | 'wis' | 'cha'
    cantripsAtL1: number
    spellsAtL1: number     // spells known OR spellbook entries (Wizard = 6)
    slotsAtL1: number      // number of level-1 slots
    slotType: 'normal' | 'pact'
    preparedCaster: boolean // true = prepares from full list; false = learns fixed list
  }
  startingEquipment: string  // human-readable paragraph
  features: Array<{ name: string; description: string }>  // level-1 features only
  subclasses: Array<{ name: string; description: string }>
  acType: 'none' | 'light' | 'medium' | 'heavy' | 'unarmored_con' | 'unarmored_wis'
  // used to calculate starting AC:
  //   none           → 10 + DEX mod
  //   light          → 11 + DEX mod (leather)
  //   medium         → 13 + min(DEX mod, 2) (scale mail)
  //   heavy          → 16 (chain mail)
  //   unarmored_con  → 10 + DEX mod + CON mod (Barbarian)
  //   unarmored_wis  → 10 + DEX mod + WIS mod (Monk)
}
```

All 12 classes (2024 PHB):
| Class | d | Primary | Saves | AC Type | Cantrips | Spells@L1 | Slots@L1 |
|-------|---|---------|-------|---------|----------|-----------|----------|
| Barbarian | 12 | STR | STR+CON | unarmored_con | — | — | — |
| Bard | 8 | CHA | DEX+CHA | light | 2 | 4 known | 2 |
| Cleric | 8 | WIS | WIS+CHA | heavy | 3 | WIS mod+1 prep | 2 |
| Druid | 8 | WIS | INT+WIS | medium | 2 | WIS mod+1 prep | 2 |
| Fighter | 10 | STR/DEX | STR+CON | heavy | — | — | — |
| Monk | 8 | STR/DEX | STR+DEX | unarmored_wis | — | — | — |
| Paladin | 10 | STR+CHA | WIS+CHA | heavy | 0 | CHA mod+1 prep | 2 |
| Ranger | 10 | DEX+WIS | STR+DEX | medium | 0 | 2 known | 2 |
| Rogue | 8 | DEX | DEX+INT | light | — | — | — |
| Sorcerer | 6 | CHA | CON+CHA | none | 4 | 2 known | 2 |
| Warlock | 8 | CHA | WIS+CHA | light | 2 | 2 known | 1 pact |
| Wizard | 6 | INT | INT+WIS | none | 3 | 6 in spellbook (prepares INT mod+1) | 2 |

Skill options per class:
- **Barbarian** (pick 2): Animal Handling, Athletics, Intimidation, Nature, Perception, Survival
- **Bard** (pick 3): Any skill
- **Cleric** (pick 2): History, Insight, Medicine, Persuasion, Religion
- **Druid** (pick 2): Arcana, Animal Handling, Insight, Medicine, Nature, Perception, Religion, Survival
- **Fighter** (pick 2): Acrobatics, Animal Handling, Athletics, History, Insight, Intimidation, Perception, Survival
- **Monk** (pick 2): Acrobatics, Athletics, History, Insight, Religion, Stealth
- **Paladin** (pick 2): Athletics, Insight, Intimidation, Medicine, Persuasion, Religion
- **Ranger** (pick 3): Animal Handling, Athletics, Insight, Investigation, Nature, Perception, Stealth, Survival
- **Rogue** (pick 4): Acrobatics, Athletics, Deception, Insight, Intimidation, Investigation, Perception, Performance, Persuasion, Sleight of Hand, Stealth
- **Sorcerer** (pick 2): Arcana, Deception, Insight, Intimidation, Persuasion, Religion
- **Warlock** (pick 2): Arcana, Deception, History, Intimidation, Investigation, Nature, Religion
- **Wizard** (pick 2): Arcana, History, Insight, Investigation, Medicine, Religion

Subclasses (for description only — chosen at level 3, not during creation):
- **Barbarian**: Berserker, Wild Heart, World Tree, Zealot
- **Bard**: Dance, Glamour, Lore, Valor
- **Cleric**: Life, Light, Trickery, War, Knowledge
- **Druid**: Land, Moon, Sea, Stars
- **Fighter**: Battle Master, Champion, Eldritch Knight, Psi Warrior
- **Monk**: Open Hand, Shadow, Elements, Mercy
- **Paladin**: Devotion, Ancients, Glory, Vengeance
- **Ranger**: Beast Master, Fey Wanderer, Gloom Stalker, Hunter
- **Rogue**: Arcane Trickster, Assassin, Phantom, Soulknife, Thief
- **Sorcerer**: Aberrant Mind, Clockwork Soul, Draconic Bloodline, Wild Magic
- **Warlock**: Archfey, Celestial, Fiend, Great Old One
- **Wizard**: Abjuration, Conjuration, Divination, Enchantment, Evocation, Illusion, Necromancy, Transmutation

---

### `src/data/races5e.ts`
Interface:
```ts
export interface Race5e {
  name: string
  flavor: string
  description: string
  size: 'Small' | 'Medium' | 'Small or Medium'
  speed: number
  darkvision?: number   // in feet
  languages: string[]  // default languages
  traits: Array<{ name: string; description: string }>
  subraces?: Array<{   // for Dragonborn (ancestry) and Elf/Gnome/Tiefling (lineage)
    name: string
    description: string
    traits: Array<{ name: string; description: string }>
  }>
}
```

All 10 species (2024 PHB):
| Species | Size | Speed | Darkvision | Key Traits |
|---------|------|-------|------------|------------|
| Aasimar | S or M | 30 | 60ft | Healing Hands, Light Bearer (Light cantrip), Necrotic/Radiant resist, Celestial Revelation (lvl 3) |
| Dragonborn | M | 30 | — | Draconic Ancestry (choose type → breath weapon + resistance) |
| Dwarf | S or M | 30 | 120ft | Dwarven Resilience (poison adv+resist), Stonecunning (Tremorsense 60ft), Tool Proficiency |
| Elf | S or M | 30 | 60ft | Fey Ancestry (charm/sleep immunity), Keen Senses (Perception prof), Trance, Elven Lineage (choose High/Wood/Drow) |
| Gnome | Small | 30 | 60ft | Gnomish Cunning (adv on INT/WIS/CHA vs magic), Gnomish Lineage (choose Forest/Rock/Deep) |
| Goliath | M | 35 | — | Giant Ancestry (1/LR natural weapon), Large Form (1 min, 1/LR), Powerful Build, Natural Athlete (Athletics prof) |
| Halfling | Small | 30 | — | Lucky (reroll 1s on d20), Brave (adv vs frightened), Halfling Nimbleness, Naturally Stealthy |
| Human | S or M | 30 | — | Resourceful (Heroic Inspiration after LR), Skillful (+1 skill), Versatile (Origin Feat) |
| Orc | M | 30 | 120ft | Adrenaline Rush (bonus Dash + temp HP = prof bonus, PB×/LR), Powerful Build, Relentless Endurance (1/LR → 1 HP) |
| Tiefling | S or M | 30 | 60ft | Otherworldly Presence (Thaumaturgy cantrip), Fire Resistance, Tiefling Lineage (choose Abyssal/Chthonic/Infernal → bonus spells) |

Dragonborn Ancestry options (for subrace selector):
Amethyst, Black, Blue, Brass, Bronze, Copper, Crystal, Gold, Green, Red, Silver, White
(each grants a different damage type for Breath Weapon + resistance)

---

### `src/data/backgrounds5e.ts`
Interface:
```ts
export interface Background5e {
  name: string
  flavor: string
  description: string
  abilityBonus: { primary: keyof AbilityScores; secondary: keyof AbilityScores }  // +2 / +1
  skills: [string, string]   // 2 camelCase skill keys
  feat: string
  featDescription: string
  toolProficiency?: string
  languages?: number         // number of extra languages to choose
  startingEquipment: string  // human-readable
}
```

All 16 backgrounds (2024 PHB):
| Background | +2 / +1 | Skills | Feat | Key Equipment |
|------------|---------|--------|------|---------------|
| Acolyte | INT / WIS | insight, religion | Magic Initiate (Cleric) | Holy symbol, prayer book, incense, vestments, 10gp |
| Artisan | STR / DEX | investigation, persuasion | Crafter | Artisan's tools (one type), 2 pouches, 50gp |
| Charlatan | DEX / CHA | deception, sleightOfHand | Skilled | Fine clothes, disguise kit, con tools, 15gp |
| Criminal | DEX / INT | deception, stealth | Alert | Crowbar, 2 daggers, thieves' tools, dark clothes, 50gp |
| Entertainer | STR / DEX | acrobatics, performance | Musician | Musical instrument (one type), costume, 15gp |
| Farmer | CON / WIS | animalHandling, nature | Tough | Pitchfork, iron pot, shovel, rope (50ft), traveler's clothes, 30gp |
| Guard | STR / INT | athletics, perception | Alert | Spear, light crossbow + 20 bolts, manacles, uniform, 10gp |
| Guide | DEX / WIS | stealth, survival | Magic Initiate (Druid) | Shortbow + 20 arrows, cartographer's tools, tent, traveler's clothes, 50gp |
| Hermit | CON / WIS | medicine, religion | Healer | Herbalism kit, scroll case, 5 sheets paper, traveler's clothes, 10gp |
| Merchant | CON / INT | animalHandling, persuasion | Lucky | Mule, cart, letters of introduction, traveler's clothes, 100gp |
| Noble | INT / CHA | history, persuasion | Skilled | Signet ring, fine clothes, scroll of pedigree, 25gp |
| Sage | CON / INT | arcana, history | Magic Initiate (Wizard) | Quarterstaff, ink + pen, 10 sheets paper, small knife, 10gp |
| Sailor | STR / DEX | athletics, perception | Tavern Brawler | Belaying pin (club), silk rope (50ft), sailor's clothes, lucky charm, 10gp |
| Scribe | DEX / INT | investigation, perception | Skilled | Calligrapher's supplies, fine clothes, ink + pen, 10 sheets parchment, small knife, 10gp |
| Soldier | STR / CON | athletics, intimidation | Savage Attacker | Spear, shortbow + 20 arrows, rank insignia, traveler's clothes, 10gp |
| Wayfarer | DEX / WIS | insight, stealth | Lucky | 2 daggers, thieves' tools, gaming set, bedroll, traveler's clothes, 16gp |

---

## Files to Modify

### `src/context/CharacterContext.tsx`
Add one new method:
```ts
createCharacterFull(sheet: CharacterSheet, state: CharacterState): Promise<void>
```
- Serialize sheet + state → markdown via `serializeCharacter(sheet, state)`
- Save to IDB (`saveCharacterRecord`)
- Fire-and-forget push to worker
- Set active sheet/state/markdown in context (same as createCharacter does)
- Do NOT open DM mode (character is fully built)

### `src/pages/CharacterSelect.tsx`
- When `mode === 'create'`, render `<CharacterCreator onComplete={onLoaded} />` instead of the inline form
- Keep the Find Character tab unchanged

---

## New File: `src/pages/CharacterCreator.tsx`

### State Shape
```ts
type WizardStep = 'class' | 'race' | 'classSetup' | 'background' | 'abilities' | 'name' | 'review'

interface WizardState {
  step: WizardStep
  selectedClass: string | null
  selectedRace: string | null
  dragonbornAncestry: string | null   // only for Dragonborn
  elfLineage: string | null           // only for Elf
  gnomeLineage: string | null         // only for Gnome
  tieflingLineage: string | null      // only for Tiefling
  abilityAssignments: Partial<Record<keyof AbilityScores, number>>  // stat → score from array
  selectedSkills: string[]            // camelCase skill keys
  selectedCantrips: string[]
  selectedSpells: string[]
  selectedBackground: string | null
  characterName: string
  playerName: string
}
```

### Step UIs

**Class step**
- 2-column card grid (or 3 on wider screens)
- Each card: class name, flavor tagline, `d{n}` hit die badge, primary ability
- Clicking a card: selects it + expands a detail panel below showing full description, armor/weapon profs, features list, subclasses list
- Next button enabled once a class is selected

**Race step**
- Same card grid pattern
- Detail panel shows traits list with full descriptions
- For Dragonborn: inline subrow to pick Draconic Ancestry (12 options) after selecting
- For Elf/Gnome/Tiefling: inline subrow to pick lineage

**Ability Scores step**
- Standard array: 15, 14, 13, 12, 10, 8
- 6 stat rows (STR, DEX, CON, INT, WIS, CHA) each with a dropdown showing unassigned values
- Once all 6 assigned, show ability modifiers inline
- Note below: "Your background will add +2 to one and +1 to another"

**Class Setup step**
- Section 1 — Skill proficiencies: show class skill list as toggleable chips; must select exactly `skillCount` of them
- Section 2 (if caster with cantrips) — Cantrips: chips from CLASS_SPELL_LIST[class][0]; select exactly `cantripsAtL1`
- Section 3 (if caster with spells) — Starting spells: chips from CLASS_SPELL_LIST[class][1]; select exactly `spellsAtL1`
  - For Wizard: labeled "Spellbook (choose 6)"
  - For prepared casters (Cleric/Druid/Paladin): skip spell selection (they prepare from full list at the table)

**Background step**
- Same card grid
- Detail panel: full description, feat name + description, 2 skills, +2/+1 ASI shown, starting equipment
- Background skills shown as "(already granted — no action needed)"

**Name step**
- Character name input (required)
- Player name input (optional)

**Review step**
- Card showing every choice with final calculated values:
  - Class, Race, Background
  - Final ability scores (standard array + background ASI, with modifiers shown)
  - All proficient skills (class + background combined, deduped)
  - HP, AC, Speed, Initiative, Proficiency Bonus
  - Spells/cantrips if applicable
  - Starting equipment (from class + background)
  - Origin feat
- Confirm button → calls `createCharacterFull(sheet, state)` → `onComplete()`

---

## Calculation Logic (Review → CharacterSheet)

```
mod(score) = Math.floor((score - 10) / 2)

abilityScores = abilityAssignments + background ASI (+2 primary, +1 secondary)

hp = class.hitDie + mod(CON)   // max at level 1
initiative = mod(DEX)
speed = race.speed
proficiencyBonus = 2

// AC based on acType:
none           → 10 + mod(DEX)
light          → 11 + mod(DEX)
medium         → 13 + min(mod(DEX), 2)
heavy          → 16
unarmored_con  → 10 + mod(DEX) + mod(CON)
unarmored_wis  → 10 + mod(DEX) + mod(WIS)

savingThrows = class.savingThrows mapped to { str/dex/..: true/false }

skills = {
  every skill: { proficient: false, expertise: false }
  class skill choices: { proficient: true }
  background skills: { proficient: true }
}

languages = race.languages (+ any background language grants)
extraTraits = race.traits.map(t => t.name + ': ' + t.description)
             + class level-1 features
items = class.startingEquipment + '\n' + background.startingEquipment
choices = { 'Origin Feat': background.feat }
spellcastingAbility = class.spellcasting?.ability
spellSlots = class has spells ? [{ max: slotsAtL1, current: slotsAtL1 }] : []
spells = selectedSpells mapped via findSpell()
```

---

## CSS Notes
- Use existing `.card`, `.section-title`, `.btn`, `.btn-primary`, `.btn-secondary` classes
- Wizard has a sticky header (step title + back button) and sticky footer (Next/Back buttons)
- Step progress shown as `Step X of 7` in the header
- Card grid: `display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px`
- Selected card: border changes to `var(--accent)` with accent glow
- Chip toggles: small pill buttons, active = accent background

---

## What This Does NOT Do (out of scope)
- No subclass selection (happens at level 3 at the table)
- No fighting style selection (Fighter/Paladin/Ranger — add as a class setup step later)
- No tool proficiency choices where applicable
- No language selection beyond race defaults
- No alignment/deity fields (can edit via DM mode after creation)
- No custom ability score methods (point buy, manual roll) — standard array only
