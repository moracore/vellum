export interface RaceTrait {
  name: string
  description: string
  minLevel?: number
  grantsSpell?: { name: string; ability: 'str'|'dex'|'con'|'int'|'wis'|'cha' }
  grantsSkill?: string
  isSubraceChoice?: boolean  // placeholder trait — suppressed once a subrace is chosen
}

export interface Subrace5e {
  name: string
  description: string
  speedOverride?: number
  darkvisionOverride?: number
  traits: RaceTrait[]
}

export interface Race5e {
  name: string
  flavor: string
  description: string
  size: 'Small' | 'Medium' | 'Small or Medium'
  speed: number
  darkvision?: number
  languages: string[]
  traits: RaceTrait[]
  subraces?: Subrace5e[]
}

export const RACES: Race5e[] = [
  {
    name: 'Aasimar',
    flavor: 'Touched by the divine, marked by celestial purpose.',
    description: 'Aasimar carry a spark of divine light within them — a blessing (and burden) passed down through bloodlines touched by angels, gods, or celestial planes. They may not always know their heritage, but others often sense something otherworldly about them: an uncanny calm, eyes that catch light strangely, or a warmth that makes the wounded recover faster in their presence.',
    size: 'Small or Medium',
    speed: 30,
    darkvision: 60,
    languages: ['Common', 'one language of your choice'],
    traits: [
      { name: 'Celestial Resistance', description: 'You have Resistance to Necrotic damage and Radiant damage.' },
      { name: 'Healing Hands', description: 'As a Magic action, touch a creature and roll a number of d4s equal to your Proficiency Bonus, restoring that many hit points. Once used, you can\'t do so again until you finish a Long Rest.' },
      { name: 'Light Bearer', description: 'You know the Light cantrip. Charisma is your spellcasting ability for it.', grantsSpell: { name: 'Light', ability: 'cha' } },
      { name: 'Celestial Revelation', description: 'When you reach level 3, choose one form to manifest as a Bonus Action once per Long Rest: Heavenly Wings (fly speed, bonus Radiant damage), Inner Radiance (creatures within 10 ft take Radiant damage), or Necrotic Shroud (creatures within 10 ft may be Frightened, bonus Necrotic damage).', minLevel: 3 },
    ],
  },
  {
    name: 'Dragonborn',
    flavor: 'Draconic blood runs hot — and it doesn\'t stay quiet.',
    description: 'Dragonborn are proud, strong-willed beings who carry the literal blood of dragons. They bear unmistakeable dragon traits: scales, clawed hands, and a Breath Weapon that reflects the elemental power of their ancestral dragon. Dragonborn culture prizes honour, self-reliance, and excellence in one\'s chosen path.',
    size: 'Medium',
    speed: 30,
    languages: ['Common', 'Draconic'],
    traits: [
      { name: 'Draconic Ancestry', description: 'Choose one dragon type. This determines your Breath Weapon\'s damage type and your Damage Resistance.', isSubraceChoice: true },
      { name: 'Breath Weapon', description: 'As a Bonus Action, exhale destructive energy. Creatures in the area must make a saving throw against DC = 8 + proficiency + CON modifier. On a failed save, a creature takes 1d10 damage (of your ancestry\'s type), or half on a success. Increases to 2d10 at level 5, 3d10 at level 11, and 4d10 at level 17. Usable a number of times equal to your Proficiency Bonus per Long Rest.' },
      { name: 'Damage Resistance', description: 'You have Resistance to the damage type of your Draconic Ancestry.' },
    ],
    subraces: [
      { name: 'Amethyst', description: 'Force damage, Line breath (5×60 ft)', traits: [{ name: 'Draconic Ancestry: Amethyst', description: 'Breath Weapon deals Force damage in a 5×60 ft Line. DEX save.' }] },
      { name: 'Black', description: 'Acid damage, Line breath (5×60 ft)', traits: [{ name: 'Draconic Ancestry: Black', description: 'Breath Weapon deals Acid damage in a 5×60 ft Line. DEX save.' }] },
      { name: 'Blue', description: 'Lightning damage, Line breath (5×60 ft)', traits: [{ name: 'Draconic Ancestry: Blue', description: 'Breath Weapon deals Lightning damage in a 5×60 ft Line. DEX save.' }] },
      { name: 'Brass', description: 'Fire damage, Line breath (5×60 ft)', traits: [{ name: 'Draconic Ancestry: Brass', description: 'Breath Weapon deals Fire damage in a 5×60 ft Line. DEX save.' }] },
      { name: 'Bronze', description: 'Lightning damage, Line breath (5×60 ft)', traits: [{ name: 'Draconic Ancestry: Bronze', description: 'Breath Weapon deals Lightning damage in a 5×60 ft Line. DEX save.' }] },
      { name: 'Copper', description: 'Acid damage, Line breath (5×60 ft)', traits: [{ name: 'Draconic Ancestry: Copper', description: 'Breath Weapon deals Acid damage in a 5×60 ft Line. DEX save.' }] },
      { name: 'Crystal', description: 'Radiant damage, Cone breath (15 ft)', traits: [{ name: 'Draconic Ancestry: Crystal', description: 'Breath Weapon deals Radiant damage in a 15 ft Cone. CON save.' }] },
      { name: 'Gold', description: 'Fire damage, Cone breath (15 ft)', traits: [{ name: 'Draconic Ancestry: Gold', description: 'Breath Weapon deals Fire damage in a 15 ft Cone. CON save.' }] },
      { name: 'Green', description: 'Poison damage, Cone breath (15 ft)', traits: [{ name: 'Draconic Ancestry: Green', description: 'Breath Weapon deals Poison damage in a 15 ft Cone. CON save.' }] },
      { name: 'Red', description: 'Fire damage, Cone breath (15 ft)', traits: [{ name: 'Draconic Ancestry: Red', description: 'Breath Weapon deals Fire damage in a 15 ft Cone. CON save.' }] },
      { name: 'Silver', description: 'Cold damage, Cone breath (15 ft)', traits: [{ name: 'Draconic Ancestry: Silver', description: 'Breath Weapon deals Cold damage in a 15 ft Cone. CON save.' }] },
      { name: 'White', description: 'Cold damage, Cone breath (15 ft)', traits: [{ name: 'Draconic Ancestry: White', description: 'Breath Weapon deals Cold damage in a 15 ft Cone. CON save.' }] },
    ],
  },
  {
    name: 'Dwarf',
    flavor: 'Stone remembers. So do I.',
    description: 'Dwarves are a proud, ancient people forged by the stone itself — short in stature but immense in endurance, determination, and craftsmanship. Their civilisations have stood for thousands of years, their racial memory is long and unforgiving, and their mystical connection to stone and metal makes them unparalleled artisans and miners.',
    size: 'Small or Medium',
    speed: 30,
    darkvision: 120,
    languages: ['Common', 'Dwarvish'],
    traits: [
      { name: 'Dwarven Resilience', description: 'You have Resistance to Poison damage and Advantage on saving throws made to avoid or end the Poisoned condition.' },
      { name: 'Stonecunning', description: 'As a Bonus Action, you gain Tremorsense 60 ft for 10 minutes while standing on or touching a stone surface. Usable a number of times equal to your Proficiency Bonus per Long Rest.' },
      { name: 'Tool Proficiency', description: 'You gain proficiency with one of the following artisan\'s tools of your choice: Smith\'s Tools, Brewer\'s Supplies, or Mason\'s Tools.' },
    ],
  },
  {
    name: 'Elf',
    flavor: 'Centuries pass like seasons. The world changes; we endure.',
    description: 'Elves are ancient, graceful beings whose lifespans can stretch for centuries. They emerged from the Feywild long ago and have never fully shed its dreamlike influence — their Trance replaces sleep with a meditative waking rest, and they are immune to the magical sleep that so easily claims humans.',
    size: 'Small or Medium',
    speed: 30,
    darkvision: 60,
    languages: ['Common', 'Elvish'],
    traits: [
      { name: 'Fey Ancestry', description: 'You have Advantage on saving throws to avoid or end the Charmed condition. Magic cannot put you to sleep.' },
      { name: 'Keen Senses', description: 'You gain proficiency in the Perception skill.', grantsSkill: 'perception' },
      { name: 'Trance', description: 'You don\'t need to sleep. Instead, you meditate deeply for 4 hours a day (the elven Trance), which counts as a full 8-hour Long Rest for you.' },
      { name: 'Elven Lineage', description: 'Choose a lineage: High Elf (Prestidigitation cantrip + Detect Magic at level 3 + Misty Step at level 5), Wood Elf (speed 35 ft, Druidcraft cantrip + Longstrider at level 3 + Pass Without Trace at level 5), or Drow (Darkvision 120 ft, Dancing Lights cantrip + Faerie Fire at level 3 + Darkness at level 5, Sunlight Sensitivity).', isSubraceChoice: true },
    ],
    subraces: [
      {
        name: 'High Elf',
        description: 'The arcane scholars, courtiers, and mages. Gain Prestidigitation cantrip, Detect Magic at level 3, and Misty Step at level 5.',
        traits: [
          { name: 'High Elf Lineage', description: 'You know the Prestidigitation cantrip (INT spellcasting ability). At level 3, learn Detect Magic (1/LR without slot). At level 5, learn Misty Step (1/LR without slot).', grantsSpell: { name: 'Prestidigitation', ability: 'int' } },
        ],
      },
      {
        name: 'Wood Elf',
        description: 'The swift hunters and guardians of ancient forests. Speed 35 ft, Druidcraft cantrip, Longstrider at level 3, Pass Without Trace at level 5.',
        speedOverride: 35,
        traits: [
          { name: 'Wood Elf Lineage', description: 'Your walking speed increases to 35 ft. You know the Druidcraft cantrip (WIS spellcasting ability). At level 3, learn Longstrider (1/LR without slot). At level 5, learn Pass Without Trace (1/LR without slot).', grantsSpell: { name: 'Druidcraft', ability: 'wis' } },
        ],
      },
      {
        name: 'Drow',
        description: 'Born of the Underdark, shaped by darkness and politics. Darkvision 120 ft, Dancing Lights cantrip, Faerie Fire at level 3, Darkness at level 5. Sunlight Sensitivity.',
        darkvisionOverride: 120,
        traits: [
          { name: 'Drow Lineage', description: 'Darkvision increases to 120 ft. You know the Dancing Lights cantrip (CHA spellcasting ability). At level 3, learn Faerie Fire (1/LR without slot). At level 5, learn Darkness (1/LR without slot). You have Disadvantage on attack rolls while in direct sunlight (Sunlight Sensitivity).', grantsSpell: { name: 'Dancing Lights', ability: 'cha' } },
          { name: 'Sunlight Sensitivity', description: 'You have Disadvantage on attack rolls while you or your target is in direct sunlight.' },
        ],
      },
    ],
  },
  {
    name: 'Gnome',
    flavor: 'The world is full of mysteries. Fortunately, so am I.',
    description: 'Gnomes are small, curious, and endlessly inventive — brimming with energy and enthusiasm for knowledge, tinkering, and magic. Their natural magical resistance makes them surprisingly durable despite their size, and their lineage determines whether they lean toward arcane invention, psychic abilities, or the ancient magic of the deep forest.',
    size: 'Small',
    speed: 30,
    darkvision: 60,
    languages: ['Common', 'Gnomish'],
    traits: [
      { name: 'Gnomish Cunning', description: 'You have Advantage on Intelligence, Wisdom, and Charisma saving throws against magic.' },
      { name: 'Gnomish Lineage', description: 'Choose a lineage: Forest Gnome (Minor Illusion cantrip + Speak with Animals 1/LR), Rock Gnome (Tinker\'s Tools proficiency + create small clockwork devices), or Deep Gnome (Darkvision 120 ft, Blindness/Deafness cantrip + Disguise Self 1/LR).', isSubraceChoice: true },
    ],
    subraces: [
      {
        name: 'Forest Gnome',
        description: 'Tricksters and friends of small animals. Minor Illusion cantrip and Speak with Animals.',
        traits: [
          { name: 'Forest Gnome Lineage', description: 'You know the Minor Illusion cantrip (INT spellcasting ability). You can cast Speak with Animals once per Long Rest using this trait.', grantsSpell: { name: 'Minor Illusion', ability: 'int' } },
        ],
      },
      {
        name: 'Rock Gnome',
        description: 'Tinkerers and inventors of clever mechanisms. Tinker\'s Tools proficiency and clockwork device creation.',
        traits: [
          { name: 'Rock Gnome Lineage', description: 'You gain proficiency with Tinker\'s Tools. Using those tools, you can spend 1 hour and 10gp of materials to create a Tiny clockwork device (a mechanical toy, fire starter, or music box). Up to 3 can exist at once.' },
        ],
      },
      {
        name: 'Deep Gnome',
        description: 'Survivors of the Underdark, masters of camouflage. Darkvision 120 ft, Blindness/Deafness cantrip, Disguise Self.',
        darkvisionOverride: 120,
        traits: [
          { name: 'Deep Gnome Lineage', description: 'Darkvision increases to 120 ft. You know the Blindness/Deafness cantrip (INT spellcasting ability). You can cast Disguise Self once per Long Rest using this trait.', grantsSpell: { name: 'Blindness/Deafness', ability: 'int' } },
        ],
      },
    ],
  },
  {
    name: 'Goliath',
    flavor: 'The mountain does not move. Nor do I.',
    description: 'Goliaths are enormous humanoids descended from the ancient giant bloodlines — standing well over 7 feet tall and built like granite cliffs. They hail from remote mountain peaks and frozen tundras where only the strongest survive. Their physical power and durability is extraordinary, and they carry an innate connection to the magic of giants.',
    size: 'Medium',
    speed: 35,
    languages: ['Common', 'Giant'],
    traits: [
      { name: 'Giant Ancestry', description: 'Choose one Giant Ancestry: Cloud Giant (reaction to impose Disadvantage on an attack against you), Fire Giant (extra fire damage = Proficiency Bonus on hits), Frost Giant (target speed reduced to 0 on hits, CON save), Hill Giant (gain temp HP equal to twice Proficiency Bonus when reduced to 0 HP), Stone Giant (throw a rock as 1d10+STR improvised weapon, 60 ft, knock prone), or Storm Giant (swim speed = walking speed, cast Lightning Bolt 1/LR). Each use: Proficiency Bonus per Long Rest.' },
      { name: 'Large Form', description: 'Starting at level 5, as a Bonus Action you can become Large for 10 minutes once per Long Rest. While Large, your reach increases by 5 ft and you deal 1d4 extra damage on Strength-based attacks.', minLevel: 5 },
      { name: 'Powerful Build', description: 'You count as one size larger when determining carrying capacity and the weight you can push, drag, or lift.' },
      { name: 'Natural Athlete', description: 'You have proficiency in the Athletics skill.', grantsSkill: 'athletics' },
    ],
  },
  {
    name: 'Halfling',
    flavor: 'Small doesn\'t mean helpless. It means overlooked — and that\'s an advantage.',
    description: 'Halflings are small, cheerful folk who have made a virtue of being underestimated. Their Lucky trait makes them statistically harder to hit with bad luck than almost any other race — rerolling 1s on attack rolls, ability checks, and saving throws. They\'re nimble enough to slip through gaps in crowds and courageous enough to stand their ground when it counts.',
    size: 'Small',
    speed: 30,
    languages: ['Common', 'one language of your choice'],
    traits: [
      { name: 'Brave', description: 'You have Advantage on saving throws to avoid or end the Frightened condition.' },
      { name: 'Halfling Nimbleness', description: 'You can move through the space of any creature that is a size larger than you.' },
      { name: 'Lucky', description: 'When you roll a 1 on a d20 Test (attack roll, ability check, or saving throw), you can reroll the die and must use the new result.' },
      { name: 'Naturally Stealthy', description: 'You can take the Hide action when you are obscured by a creature that is at least one size larger than you.' },
    ],
  },
  {
    name: 'Human',
    flavor: 'No heritage, no magic — just unlimited potential.',
    description: 'Humans are the most widespread and adaptable species in most worlds. They lack the centuries-long memories of elves, the draconic power of Dragonborn, or the innate magic of Gnomes — but what they lack in specialised gifts they make up for in raw versatility. Humans progress faster, adapt to any culture, and can pick up skills and feats that other races simply don\'t start with.',
    size: 'Small or Medium',
    speed: 30,
    languages: ['Common', 'one language of your choice'],
    traits: [
      { name: 'Resourceful', description: 'At the end of each Long Rest, you gain Heroic Inspiration if you don\'t already have it. Heroic Inspiration can be spent to reroll any d20 Test once.' },
      { name: 'Skillful', description: 'You gain proficiency in one additional skill of your choice.' },
      { name: 'Versatile', description: 'You gain one Origin Feat of your choice. Origin Feats are those granted by Backgrounds (Alert, Lucky, Skilled, Magic Initiate, etc.).' },
    ],
  },
  {
    name: 'Orc',
    flavor: 'I have already survived what should have killed me. What could you possibly do?',
    description: 'Orcs are powerfully built warriors shaped by a history of conflict and survival in harsh environments. They combine raw physical power with supernatural toughness — Relentless Endurance lets them refuse death once per Long Rest, and Adrenaline Rush lets them sprint past danger and regenerate temporary hit points mid-battle.',
    size: 'Medium',
    speed: 30,
    darkvision: 120,
    languages: ['Common', 'Orc'],
    traits: [
      { name: 'Adrenaline Rush', description: 'You can take the Dash action as a Bonus Action. When you do, you gain a number of Temporary Hit Points equal to your Proficiency Bonus. Usable a number of times equal to your Proficiency Bonus, regained on a Short or Long Rest.' },
      { name: 'Powerful Build', description: 'You count as one size larger when determining carrying capacity and the weight you can push, drag, or lift.' },
      { name: 'Relentless Endurance', description: 'When you are reduced to 0 Hit Points but not killed outright, you can drop to 1 HP instead. Once used, you can\'t do so again until you finish a Long Rest.' },
    ],
  },
  {
    name: 'Tiefling',
    flavor: 'They see the horns. They don\'t see what I\'ve built despite them.',
    description: 'Tieflings carry infernal, abyssal, or chthonic bloodlines that manifest in physical form — horns, tails, unusual skin colours, and eyes that glow in darkness. They are often feared or distrusted, which has shaped Tiefling culture into one of fierce self-reliance and resilience. Their Lineage reflects their specific planar heritage.',
    size: 'Small or Medium',
    speed: 30,
    darkvision: 60,
    languages: ['Common', 'one language of your choice'],
    traits: [
      { name: 'Otherworldly Presence', description: 'You know the Thaumaturgy cantrip. Charisma is your spellcasting ability for it.', grantsSpell: { name: 'Thaumaturgy', ability: 'cha' } },
      { name: 'Tiefling Lineage', description: 'Choose a lineage: Abyssal (Poison resistance, Poison Spray cantrip, Ray of Sickness at level 3, Hold Person at level 5), Chthonic (Necrotic resistance, Chill Touch cantrip, False Life at level 3, Ray of Enfeeblement at level 5), or Infernal (Fire resistance, Fire Bolt cantrip, Hellish Rebuke at level 3, Darkness at level 5).', isSubraceChoice: true },
    ],
    subraces: [
      {
        name: 'Abyssal',
        description: 'Connected to the chaotic demons of the Abyss. Poison resistance, Poison Spray cantrip, Ray of Sickness at level 3, Hold Person at level 5.',
        traits: [
          { name: 'Abyssal Lineage', description: 'You have Resistance to Poison damage. You know Poison Spray cantrip (CHA spellcasting ability). At level 3: Cast Ray of Sickness 1/LR without a slot. At level 5: Cast Hold Person 1/LR without a slot.', grantsSpell: { name: 'Poison Spray', ability: 'cha' } },
        ],
      },
      {
        name: 'Chthonic',
        description: 'Connected to the ancient powers of the underworld — death and shadow. Necrotic resistance, Chill Touch cantrip, False Life at level 3, Ray of Enfeeblement at level 5.',
        traits: [
          { name: 'Chthonic Lineage', description: 'You have Resistance to Necrotic damage. You know Chill Touch cantrip (CHA spellcasting ability). At level 3: Cast False Life 1/LR without a slot. At level 5: Cast Ray of Enfeeblement 1/LR without a slot.', grantsSpell: { name: 'Chill Touch', ability: 'cha' } },
        ],
      },
      {
        name: 'Infernal',
        description: 'The classic Tiefling — descended from devils and the Nine Hells. Fire resistance, Fire Bolt cantrip, Hellish Rebuke at level 3, Darkness at level 5.',
        traits: [
          { name: 'Infernal Lineage', description: 'You have Resistance to Fire damage. You know Fire Bolt cantrip (CHA spellcasting ability). At level 3: Cast Hellish Rebuke 1/LR without a slot (as a 2nd-level spell). At level 5: Cast Darkness 1/LR without a slot.', grantsSpell: { name: 'Fire Bolt', ability: 'cha' } },
        ],
      },
    ],
  },
]
