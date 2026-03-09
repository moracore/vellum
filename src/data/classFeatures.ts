export interface FeatureChoice {
  key: string;
  label: string;
  options: string[];
}

export interface ClassFeature {
  level: number;
  name: string;
  description: string;
  linkedChoice?: string;
  choice?: FeatureChoice;
}

const EXPERTISE_SKILLS: string[] = [
  "Acrobatics",
  "Animal Handling",
  "Arcana",
  "Athletics",
  "Deception",
  "History",
  "Insight",
  "Intimidation",
  "Investigation",
  "Medicine",
  "Nature",
  "Perception",
  "Performance",
  "Persuasion",
  "Religion",
  "Sleight of Hand",
  "Stealth",
  "Survival",
  "Thieves' Tools",
];

const METAMAGIC_OPTIONS: string[] = [
  "Careful Spell",
  "Distant Spell",
  "Empowered Spell",
  "Extended Spell",
  "Heightened Spell",
  "Quickened Spell",
  "Subtle Spell",
  "Twinned Spell",
  "Seeking Spell",
  "Transmuted Spell",
];

const ELDRITCH_INVOCATIONS: string[] = [
  "Agonizing Blast",
  "Armor of Shadows",
  "Beast Speech",
  "Beguiling Influence",
  "Devil's Sight",
  "Eldritch Mind",
  "Eldritch Sight",
  "Eyes of the Rune Keeper",
  "Fiendish Vigor",
  "Gaze of Two Minds",
  "Lance of Lethargy",
  "Mask of Many Faces",
  "Misty Visions",
  "Repelling Blast",
  "Thief of Five Fates",
  "Voice of the Chain Master",
];

export const CLASS_FEATURES: Record<string, ClassFeature[]> = {
  Barbarian: [
    {
      level: 1,
      name: "Rage",
      description:
        "Enter a rage as a bonus action, gaining advantage on Strength checks and saving throws, a bonus to melee damage, and resistance to bludgeoning, piercing, and slashing damage. Lasts 1 minute; you start with 2 rages per long rest.",
    },
    {
      level: 1,
      name: "Unarmored Defense",
      description:
        "While not wearing armor, your AC equals 10 + your Dexterity modifier + your Constitution modifier.",
    },
    {
      level: 2,
      name: "Reckless Attack",
      description:
        "When you make your first attack on your turn, you can choose to attack recklessly, gaining advantage on all melee weapon attack rolls using Strength this turn, but attack rolls against you also have advantage until your next turn.",
    },
    {
      level: 2,
      name: "Danger Sense",
      description:
        "You have advantage on Dexterity saving throws against effects you can see (such as traps and spells), provided you are not blinded, deafened, or incapacitated.",
    },
    {
      level: 3,
      name: "Primal Path",
      description: "You choose a Primal Path that shapes the nature of your rage.",
      choice: {
        key: "subclass",
        label: "Primal Path",
        options: [
          "Berserker",
          "Totem Warrior",
          "Ancestral Guardian",
          "Storm Herald",
          "Zealot",
          "Beast",
          "Wild Magic Barbarian",
        ],
      },
    },
    {
      level: 3,
      name: "Frenzy (Berserker) / Path Feature",
      description:
        "You gain the first feature of your chosen Primal Path at level 3.",
      linkedChoice: 'subclass',
    },
    {
      level: 4,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 5,
      name: "Extra Attack",
      description:
        "You can attack twice, instead of once, whenever you take the Attack action on your turn.",
    },
    {
      level: 5,
      name: "Fast Movement",
      description:
        "Your speed increases by 10 feet while you are not wearing heavy armor.",
    },
    {
      level: 6,
      name: "Path Feature",
      description: "You gain an additional feature from your chosen Primal Path.",
      linkedChoice: 'subclass',
    },
    {
      level: 7,
      name: "Feral Instinct",
      description:
        "Your instincts are so honed that you have advantage on initiative rolls. Additionally, if you are surprised at the beginning of combat, you can still act on your first turn if you enter your rage before doing anything else.",
    },
    {
      level: 8,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 9,
      name: "Brutal Critical",
      description:
        "You can roll one additional weapon damage die when determining the extra damage for a critical hit with a melee attack.",
    },
    {
      level: 10,
      name: "Path Feature",
      description: "You gain an additional feature from your chosen Primal Path.",
      linkedChoice: 'subclass',
    },
  ],

  Bard: [
    {
      level: 1,
      name: "Bardic Inspiration",
      description:
        "As a bonus action, grant a creature other than yourself a Bardic Inspiration die (d6) they can add to one ability check, attack roll, or saving throw within 10 minutes. You have a number of uses equal to your Charisma modifier (minimum 1), refreshed on a long rest.",
    },
    {
      level: 1,
      name: "Spellcasting",
      description:
        "You can cast bard spells using Charisma as your spellcasting ability. You know a number of cantrips and spells and have spell slots that refresh on a long rest.",
    },
    {
      level: 2,
      name: "Jack of All Trades",
      description:
        "You can add half your proficiency bonus (rounded down) to any ability check that doesn't already include your proficiency bonus.",
    },
    {
      level: 2,
      name: "Song of Rest",
      description:
        "During a short rest, you can perform a soothing song; any friendly creatures who hear it and spend Hit Dice regain extra hit points (1d6 at this level).",
    },
    {
      level: 3,
      name: "Bard College",
      description: "You delve into the advanced techniques of a Bard College.",
      choice: {
        key: "subclass",
        label: "Bard College",
        options: [
          "College of Lore",
          "College of Valor",
          "College of Glamour",
          "College of Swords",
          "College of Whispers",
          "College of Creation",
          "College of Eloquence",
        ],
      },
    },
    {
      level: 3,
      name: "Expertise (1 & 2)",
      description:
        "Choose two skills or tools you are proficient with; your proficiency bonus is doubled for those.",
      choice: {
        key: "bardExpertise1",
        label: "Expertise: First Skill",
        options: EXPERTISE_SKILLS,
      },
    },
    {
      level: 3,
      name: "Expertise (2nd choice)",
      description: "Choose your second Expertise skill or tool.",
      choice: {
        key: "bardExpertise2",
        label: "Expertise: Second Skill",
        options: EXPERTISE_SKILLS,
      },
    },
    {
      level: 4,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 5,
      name: "Bardic Inspiration (d8)",
      description:
        "Your Bardic Inspiration die increases to a d8. You also regain all expended uses of Bardic Inspiration when you finish a short or long rest (Font of Inspiration).",
    },
    {
      level: 5,
      name: "Font of Inspiration",
      description:
        "You regain all of your expended uses of Bardic Inspiration when you finish a short or long rest.",
    },
    {
      level: 6,
      name: "Countercharm",
      description:
        "As an action, you can start a performance to grant yourself and friendly creatures within 30 feet advantage on saving throws against being frightened or charmed, lasting until the end of your next turn.",
    },
    {
      level: 6,
      name: "Bard College Feature",
      description: "You gain an additional feature from your Bard College.",
      linkedChoice: 'subclass',
    },
    {
      level: 8,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 10,
      name: "Bardic Inspiration (d10)",
      description: "Your Bardic Inspiration die increases to a d10.",
    },
    {
      level: 10,
      name: "Expertise (3rd & 4th)",
      description: "Choose two more skills or tools to gain double proficiency.",
      choice: {
        key: "bardExpertise3",
        label: "Expertise: Third Skill",
        options: EXPERTISE_SKILLS,
      },
    },
    {
      level: 10,
      name: "Expertise (4th choice)",
      description: "Choose your fourth Expertise skill or tool.",
      choice: {
        key: "bardExpertise4",
        label: "Expertise: Fourth Skill",
        options: EXPERTISE_SKILLS,
      },
    },
    {
      level: 10,
      name: "Magical Secrets",
      description:
        "Choose two spells from any class spell list; they count as bard spells for you.",
    },
  ],

  Cleric: [
    {
      level: 1,
      name: "Spellcasting",
      description:
        "You can cast cleric spells using Wisdom as your spellcasting ability. You prepare a list of cleric spells each day from all cleric spells, with spell slots that refresh on a long rest.",
    },
    {
      level: 1,
      name: "Divine Domain",
      description: "Choose a Divine Domain, which grants domain spells and features.",
      choice: {
        key: "subclass",
        label: "Divine Domain",
        options: [
          "Knowledge",
          "Life",
          "Light",
          "Nature",
          "Tempest",
          "Trickery",
          "War",
          "Arcana",
          "Death",
          "Forge",
          "Grave",
          "Order",
          "Peace",
          "Twilight",
        ],
      },
    },
    {
      level: 1,
      name: "Domain Feature",
      description:
        "You gain the first feature of your chosen Divine Domain at level 1.",
      linkedChoice: 'subclass',
    },
    {
      level: 2,
      name: "Channel Divinity (1/rest)",
      description:
        "You gain the ability to channel divine energy directly from your deity; you start with Turn Undead and one additional option granted by your domain.",
    },
    {
      level: 2,
      name: "Turn Undead",
      description:
        "As an action, present your holy symbol and speak a prayer; each undead that can see or hear you within 30 feet must make a Wisdom saving throw or be turned for 1 minute.",
    },
    {
      level: 2,
      name: "Domain Channel Divinity",
      description: "You gain a Channel Divinity option specific to your Divine Domain.",
    },
    {
      level: 3,
      name: "Domain Spells",
      description:
        "Your Divine Domain grants you domain spells at 1st, 3rd, 5th, 7th, and 9th cleric levels; these are always prepared and don't count against your prepared spell limit.",
    },
    {
      level: 4,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 5,
      name: "Destroy Undead (CR 1/2)",
      description:
        "When an undead fails its saving throw against your Turn Undead feature, the undead is instantly destroyed if its challenge rating is 1/2 or lower.",
    },
    {
      level: 6,
      name: "Channel Divinity (2/rest)",
      description:
        "You can use your Channel Divinity twice between rests.",
    },
    {
      level: 6,
      name: "Domain Feature",
      description: "You gain a second feature from your chosen Divine Domain.",
      linkedChoice: 'subclass',
    },
    {
      level: 7,
      name: "Domain Spells (4th level)",
      description:
        "Your Domain Spells expand; you now always have the 4th-level domain spells prepared.",
    },
    {
      level: 8,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 8,
      name: "Destroy Undead (CR 1)",
      description:
        "Your Turn Undead now destroys undead of CR 1 or lower.",
    },
    {
      level: 8,
      name: "Divine Strike / Potent Spellcasting",
      description:
        "At 8th level, your domain grants either Divine Strike (add 1d8 damage of a domain type to weapon hits once per turn) or Potent Spellcasting (add Wisdom modifier to damage of cleric cantrips), depending on the domain.",
    },
    {
      level: 9,
      name: "Domain Spells (5th level)",
      description:
        "Your Domain Spells expand; you now always have the 5th-level domain spells prepared.",
    },
    {
      level: 10,
      name: "Divine Intervention",
      description:
        "You can implore your deity to intervene on your behalf. Roll percentile dice; if you roll equal to or lower than your cleric level, your deity intervenes (DM's choice of effect). If the intervention succeeds, you can't use this feature again for 7 days; otherwise, you can use it again after a long rest.",
    },
  ],

  Druid: [
    {
      level: 1,
      name: "Druidic",
      description:
        "You know Druidic, the secret language of druids. You can speak the language and use it to leave hidden messages.",
    },
    {
      level: 1,
      name: "Spellcasting",
      description:
        "You can cast druid spells using Wisdom as your spellcasting ability. You prepare spells each day from the full druid spell list; spell slots refresh on a long rest.",
    },
    {
      level: 2,
      name: "Wild Shape",
      description:
        "As an action, magically assume the shape of a beast you have seen before. At level 2, you can transform into CR 1/4 beasts with no flying or swimming speed. Usable twice per short rest.",
    },
    {
      level: 2,
      name: "Druid Circle",
      description: "Choose a Druid Circle, which grants circle spells and features.",
      choice: {
        key: "subclass",
        label: "Druid Circle",
        options: [
          "Circle of the Land",
          "Circle of the Moon",
          "Circle of Dreams",
          "Circle of the Shepherd",
          "Circle of Spores",
          "Circle of Stars",
          "Circle of Wildfire",
        ],
      },
    },
    {
      level: 2,
      name: "Circle Feature",
      description: "You gain the first feature of your chosen Druid Circle.",
      linkedChoice: 'subclass',
    },
    {
      level: 3,
      name: "Wild Shape Improvement",
      description:
        "You can now transform into beasts of CR 1/2, including those with a swimming speed.",
    },
    {
      level: 4,
      name: "Wild Shape Improvement",
      description:
        "You can now transform into beasts of CR 1, including those with a flying speed.",
    },
    {
      level: 4,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 5,
      name: "Wild Shape (CR 1 beasts / flying)",
      description:
        "Your Wild Shape now allows CR 1 beasts without restriction; flying speed still requires your DM's approval until level 8.",
    },
    {
      level: 6,
      name: "Circle Feature",
      description: "You gain an additional feature from your Druid Circle.",
      linkedChoice: 'subclass',
    },
    {
      level: 7,
      name: "Wild Shape (CR 2)",
      description:
        "You can now use Wild Shape to transform into beasts of CR 2 or lower.",
    },
    {
      level: 8,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 8,
      name: "Wild Shape (CR 2 / flying)",
      description:
        "You can now transform into CR 2 beasts, and beasts with a flying speed are no longer restricted.",
    },
    {
      level: 9,
      name: "Wild Shape (CR 3)",
      description:
        "You can now transform into beasts of CR 3 or lower.",
    },
    {
      level: 10,
      name: "Circle Feature",
      description: "You gain an additional feature from your Druid Circle.",
      linkedChoice: 'subclass',
    },
    {
      level: 10,
      name: "Wild Shape (CR 3 / swimming)",
      description:
        "Your Wild Shape allows CR 3 beasts with any movement type.",
    },
  ],

  Fighter: [
    {
      level: 1,
      name: "Fighting Style",
      description:
        "Choose a Fighting Style that specializes your combat approach.",
      choice: {
        key: "fightingStyle",
        label: "Fighting Style",
        options: [
          "Archery",
          "Defense",
          "Dueling",
          "Great Weapon Fighting",
          "Protection",
          "Two-Weapon Fighting",
          "Blind Fighting",
          "Interception",
          "Superior Technique",
          "Thrown Weapon Fighting",
          "Unarmed Fighting",
        ],
      },
    },
    {
      level: 1,
      name: "Second Wind",
      description:
        "As a bonus action, regain hit points equal to 1d10 + your fighter level. You can use this feature once per short or long rest.",
    },
    {
      level: 2,
      name: "Action Surge (1/rest)",
      description:
        "On your turn, you can push yourself beyond your normal limits, taking one additional action. Once per short or long rest.",
    },
    {
      level: 3,
      name: "Martial Archetype",
      description: "Choose a Martial Archetype that defines your fighting style.",
      choice: {
        key: "subclass",
        label: "Martial Archetype",
        options: [
          "Champion",
          "Battle Master",
          "Eldritch Knight",
          "Arcane Archer",
          "Cavalier",
          "Samurai",
        ],
      },
    },
    {
      level: 3,
      name: "Archetype Feature",
      description: "You gain the first feature of your chosen Martial Archetype.",
      linkedChoice: 'subclass',
    },
    {
      level: 4,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 5,
      name: "Extra Attack",
      description:
        "You can attack twice, instead of once, whenever you take the Attack action on your turn.",
    },
    {
      level: 6,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 7,
      name: "Archetype Feature",
      description: "You gain an additional feature from your Martial Archetype.",
      linkedChoice: 'subclass',
    },
    {
      level: 8,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 9,
      name: "Indomitable (1/long rest)",
      description:
        "You can reroll a saving throw that you fail. If you do so, you must use the new roll. Once per long rest.",
    },
    {
      level: 10,
      name: "Archetype Feature",
      description: "You gain an additional feature from your Martial Archetype.",
      linkedChoice: 'subclass',
    },
  ],

  Monk: [
    {
      level: 1,
      name: "Unarmored Defense",
      description:
        "While wearing no armor and not wielding a shield, your AC equals 10 + your Dexterity modifier + your Wisdom modifier.",
    },
    {
      level: 1,
      name: "Martial Arts",
      description:
        "Your unarmed strikes and monk weapons use a Martial Arts die (d4 at levels 1–4). You can use Dexterity instead of Strength for attack and damage rolls, and you can make one unarmed strike as a bonus action when you take the Attack action.",
    },
    {
      level: 2,
      name: "Ki",
      description:
        "You can spend ki points (equal to your monk level) to fuel various ki features: Flurry of Blows, Patient Defense, and Step of the Wind. Ki points refresh on a short or long rest.",
    },
    {
      level: 2,
      name: "Unarmored Movement",
      description:
        "Your speed increases by 10 feet while you are not wearing armor or wielding a shield. This bonus increases as you gain monk levels.",
    },
    {
      level: 3,
      name: "Monastic Tradition",
      description: "Choose a Monastic Tradition that shapes your ki and fighting techniques.",
      choice: {
        key: "subclass",
        label: "Monastic Tradition",
        options: [
          "Way of the Open Hand",
          "Way of Shadow",
          "Way of the Four Elements",
          "Way of the Drunken Master",
          "Way of the Kensei",
          "Way of the Sun Soul",
          "Way of the Astral Self",
          "Way of Mercy",
        ],
      },
    },
    {
      level: 3,
      name: "Tradition Feature",
      description: "You gain the first feature of your chosen Monastic Tradition.",
      linkedChoice: 'subclass',
    },
    {
      level: 3,
      name: "Deflect Missiles",
      description:
        "As a reaction, you can deflect or catch ranged weapon attacks. The damage is reduced by 1d10 + your Dexterity modifier + your monk level. If reduced to 0, you can catch and throw the missile back as part of the same reaction.",
    },
    {
      level: 4,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 4,
      name: "Slow Fall",
      description:
        "As a reaction, reduce any falling damage you take by an amount equal to five times your monk level.",
    },
    {
      level: 5,
      name: "Extra Attack",
      description:
        "You can attack twice, instead of once, whenever you take the Attack action on your turn.",
    },
    {
      level: 5,
      name: "Stunning Strike",
      description:
        "When you hit another creature with a melee weapon attack, you can spend 1 ki point to attempt a stunning strike. The target must succeed on a Constitution saving throw or be stunned until the end of your next turn.",
    },
    {
      level: 6,
      name: "Ki-Empowered Strikes",
      description:
        "Your unarmed strikes count as magical for the purpose of overcoming resistance and immunity to nonmagical attacks and damage.",
    },
    {
      level: 6,
      name: "Tradition Feature",
      description: "You gain an additional feature from your Monastic Tradition.",
      linkedChoice: 'subclass',
    },
    {
      level: 7,
      name: "Evasion",
      description:
        "When you are subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage on a success and half on a failure.",
    },
    {
      level: 7,
      name: "Stillness of Mind",
      description:
        "As an action, end one effect on yourself that is causing you to be charmed or frightened.",
    },
    {
      level: 8,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 9,
      name: "Unarmored Movement Improvement",
      description:
        "You gain the ability to move along vertical surfaces and across liquids on your turn without falling during the move.",
    },
    {
      level: 10,
      name: "Purity of Body",
      description:
        "Your mastery of ki has made you immune to disease and poison.",
    },
    {
      level: 10,
      name: "Tradition Feature",
      description: "You gain an additional feature from your Monastic Tradition.",
      linkedChoice: 'subclass',
    },
  ],

  Paladin: [
    {
      level: 1,
      name: "Divine Sense",
      description:
        "As an action, you sense the presence of celestials, fiends, and undead within 60 feet that are not behind total cover. You can use this feature a number of times equal to 1 + your Charisma modifier per long rest.",
    },
    {
      level: 1,
      name: "Lay on Hands",
      description:
        "You have a pool of healing power with a total of 5 × your paladin level hit points. As an action, touch a creature and restore any number of HP from the pool, or expend 5 HP to cure a disease or neutralize a poison.",
    },
    {
      level: 2,
      name: "Fighting Style",
      description:
        "Choose a Fighting Style that specializes your combat approach.",
      choice: {
        key: "fightingStyle",
        label: "Fighting Style",
        options: [
          "Defense",
          "Dueling",
          "Great Weapon Fighting",
          "Protection",
          "Blessed Warrior",
          "Blind Fighting",
          "Interception",
        ],
      },
    },
    {
      level: 2,
      name: "Spellcasting",
      description:
        "You can cast paladin spells using Charisma as your spellcasting ability. You prepare spells from the paladin spell list each day; spell slots refresh on a long rest.",
    },
    {
      level: 2,
      name: "Divine Smite",
      description:
        "When you hit with a melee weapon attack, you can expend one spell slot to deal radiant damage in addition to the weapon's damage: 2d8 for a 1st-level slot, +1d8 per slot level above 1st (max 5d8). An extra 1d8 is added against undead or fiends.",
    },
    {
      level: 3,
      name: "Divine Health",
      description:
        "The divine magic flowing through you makes you immune to disease.",
    },
    {
      level: 3,
      name: "Sacred Oath",
      description: "Choose a Sacred Oath, gaining oath spells and Channel Divinity options.",
      choice: {
        key: "subclass",
        label: "Sacred Oath",
        options: [
          "Oath of Devotion",
          "Oath of the Ancients",
          "Oath of Vengeance",
          "Oath of Conquest",
          "Oath of Redemption",
          "Oath of Glory",
          "Oath of the Watchers",
          "Oathbreaker",
        ],
      },
    },
    {
      level: 3,
      name: "Channel Divinity (1/rest)",
      description:
        "You can channel divine energy twice; your oath grants you two Channel Divinity options. You can use Channel Divinity once between rests.",
    },
    {
      level: 4,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 5,
      name: "Extra Attack",
      description:
        "You can attack twice, instead of once, whenever you take the Attack action on your turn.",
    },
    {
      level: 6,
      name: "Aura of Protection",
      description:
        "Whenever you or a friendly creature within 10 feet of you must make a saving throw, the creature gains a bonus equal to your Charisma modifier (minimum +1) to the saving throw, as long as you are conscious.",
    },
    {
      level: 7,
      name: "Sacred Oath Feature",
      description: "You gain an additional feature from your Sacred Oath.",
      linkedChoice: 'subclass',
    },
    {
      level: 8,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 9,
      name: "Oath Spells (5th level)",
      description:
        "Your Sacred Oath adds two more spells (5th-level tier) to your always-prepared list.",
    },
    {
      level: 10,
      name: "Aura of Courage",
      description:
        "You and friendly creatures within 10 feet of you can't be frightened while you are conscious.",
    },
  ],

  Ranger: [
    {
      level: 1,
      name: "Favored Enemy",
      description:
        "Choose a type of favored enemy. You have advantage on Wisdom (Survival) checks to track them and on Intelligence checks to recall information about them. You also learn one language spoken by your favored enemy.",
      choice: {
        key: "favoredEnemy",
        label: "Favored Enemy",
        options: [
          "Aberrations",
          "Beasts",
          "Celestials",
          "Constructs",
          "Dragons",
          "Elementals",
          "Fey",
          "Fiends",
          "Giants",
          "Monstrosities",
          "Oozes",
          "Plants",
          "Undead",
        ],
      },
    },
    {
      level: 1,
      name: "Natural Explorer",
      description:
        "Choose a favored terrain type. When you make an Intelligence or Wisdom check related to your favored terrain, you add double your proficiency bonus. While traveling in your favored terrain, you gain several exploration benefits.",
      choice: {
        key: "naturalExplorer",
        label: "Natural Explorer: Favored Terrain",
        options: [
          "Arctic",
          "Coast",
          "Desert",
          "Forest",
          "Grassland",
          "Mountain",
          "Swamp",
          "Underdark",
        ],
      },
    },
    {
      level: 2,
      name: "Fighting Style",
      description:
        "Choose a Fighting Style that specializes your combat approach.",
      choice: {
        key: "fightingStyle",
        label: "Fighting Style",
        options: [
          "Archery",
          "Defense",
          "Dueling",
          "Two-Weapon Fighting",
          "Blind Fighting",
          "Druidic Warrior",
          "Thrown Weapon Fighting",
        ],
      },
    },
    {
      level: 2,
      name: "Spellcasting",
      description:
        "You can cast ranger spells using Wisdom as your spellcasting ability. You know a number of spells and have half-caster spell slots that refresh on a long rest.",
    },
    {
      level: 3,
      name: "Primeval Awareness",
      description:
        "As an action, expend one ranger spell slot to focus your awareness for 1 minute per spell slot level. You sense whether any aberrations, celestials, dragons, elementals, fey, fiends, or undead are within 1 mile (or 6 miles in your favored terrain).",
    },
    {
      level: 3,
      name: "Ranger Archetype",
      description: "Choose an archetype that focuses your ranger training.",
      choice: {
        key: "subclass",
        label: "Ranger Archetype",
        options: [
          "Hunter",
          "Beast Master",
          "Gloom Stalker",
          "Horizon Walker",
          "Monster Slayer",
          "Fey Wanderer",
          "Swarmkeeper",
        ],
      },
    },
    {
      level: 3,
      name: "Archetype Feature",
      description: "You gain the first feature of your chosen Ranger Archetype.",
      linkedChoice: 'subclass',
    },
    {
      level: 4,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 5,
      name: "Extra Attack",
      description:
        "You can attack twice, instead of once, whenever you take the Attack action on your turn.",
    },
    {
      level: 6,
      name: "Favored Enemy (2nd)",
      description: "Choose a second type of favored enemy.",
      choice: {
        key: "favoredEnemy2",
        label: "Favored Enemy (2nd)",
        options: [
          "Aberrations",
          "Beasts",
          "Celestials",
          "Constructs",
          "Dragons",
          "Elementals",
          "Fey",
          "Fiends",
          "Giants",
          "Monstrosities",
          "Oozes",
          "Plants",
          "Undead",
        ],
      },
    },
    {
      level: 6,
      name: "Natural Explorer (2nd)",
      description: "Choose a second favored terrain type.",
      choice: {
        key: "naturalExplorer2",
        label: "Natural Explorer: Second Terrain",
        options: [
          "Arctic",
          "Coast",
          "Desert",
          "Forest",
          "Grassland",
          "Mountain",
          "Swamp",
          "Underdark",
        ],
      },
    },
    {
      level: 7,
      name: "Archetype Feature",
      description: "You gain an additional feature from your Ranger Archetype.",
      linkedChoice: 'subclass',
    },
    {
      level: 8,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 8,
      name: "Land's Stride",
      description:
        "Moving through nonmagical difficult terrain costs you no extra movement. You can also pass through nonmagical plants without being slowed or taking damage. You have advantage on saving throws against plants that are magically created or manipulated.",
    },
    {
      level: 9,
      name: "Archetype Feature",
      description: "You gain an additional feature from your Ranger Archetype.",
      linkedChoice: 'subclass',
    },
    {
      level: 10,
      name: "Natural Explorer (3rd)",
      description:
        "Choose a third favored terrain, and you gain the Hide in Plain Sight feature.",
    },
    {
      level: 10,
      name: "Hide in Plain Sight",
      description:
        "Spend 1 minute creating camouflage for yourself; until you move, you have a +10 bonus to Dexterity (Stealth) checks while you remain there and are not moving.",
    },
  ],

  Rogue: [
    {
      level: 1,
      name: "Sneak Attack",
      description:
        "Once per turn, deal extra damage (1d6 at level 1, increasing by 1d6 every odd level) to one creature you hit if you have advantage on the attack roll, or if an ally is adjacent to the target and you don't have disadvantage.",
    },
    {
      level: 1,
      name: "Thieves' Cant",
      description:
        "You have learned Thieves' Cant, a secret mix of dialect and code that allows you to hide messages in seemingly normal conversation.",
    },
    {
      level: 2,
      name: "Cunning Action",
      description:
        "Your quick thinking and agility let you move and act quickly. You can take a bonus action on each of your turns to Dash, Disengage, or Hide.",
    },
    {
      level: 3,
      name: "Roguish Archetype",
      description: "Choose a Roguish Archetype that further refines your skills.",
      choice: {
        key: "subclass",
        label: "Roguish Archetype",
        options: [
          "Thief",
          "Assassin",
          "Arcane Trickster",
          "Inquisitive",
          "Mastermind",
          "Scout",
          "Swashbuckler",
          "Phantom",
          "Soulknife",
        ],
      },
    },
    {
      level: 3,
      name: "Archetype Feature",
      description: "You gain the first feature of your chosen Roguish Archetype.",
      linkedChoice: 'subclass',
    },
    {
      level: 4,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 5,
      name: "Uncanny Dodge",
      description:
        "When an attacker that you can see hits you with an attack, you can use your reaction to halve the attack's damage against you.",
    },
    {
      level: 6,
      name: "Expertise (3rd & 4th)",
      description: "Choose two more skills or tools to gain double proficiency.",
      choice: {
        key: "rogueExpertise3",
        label: "Expertise: Third Skill",
        options: EXPERTISE_SKILLS,
      },
    },
    {
      level: 6,
      name: "Expertise (4th choice)",
      description: "Choose your fourth Expertise skill or tool.",
      choice: {
        key: "rogueExpertise4",
        label: "Expertise: Fourth Skill",
        options: EXPERTISE_SKILLS,
      },
    },
    {
      level: 7,
      name: "Evasion",
      description:
        "When subjected to an effect allowing a Dexterity saving throw for half damage, you take no damage on a success and half on a failure.",
    },
    {
      level: 8,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 9,
      name: "Archetype Feature",
      description: "You gain an additional feature from your Roguish Archetype.",
      linkedChoice: 'subclass',
    },
    {
      level: 10,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
  ],

  Sorcerer: [
    {
      level: 1,
      name: "Spellcasting",
      description:
        "You can cast sorcerer spells using Charisma as your spellcasting ability. You know a fixed number of spells and have spell slots that refresh on a long rest.",
    },
    {
      level: 1,
      name: "Sorcerous Origin",
      description:
        "Choose a sorcerous origin, which grants additional spells and features.",
      choice: {
        key: "subclass",
        label: "Sorcerous Origin",
        options: [
          "Draconic Bloodline",
          "Wild Magic",
          "Divine Soul",
          "Shadow Magic",
          "Storm Sorcery",
          "Aberrant Mind",
          "Clockwork Soul",
        ],
      },
    },
    {
      level: 1,
      name: "Origin Feature",
      description: "You gain the first feature of your chosen Sorcerous Origin.",
      linkedChoice: 'subclass',
    },
    {
      level: 2,
      name: "Font of Magic",
      description:
        "You tap into a deep wellspring of magic within yourself: sorcery points equal to your sorcerer level, refreshed on a long rest. You can convert spell slots to sorcery points and vice versa.",
    },
    {
      level: 3,
      name: "Metamagic (choice 1)",
      description:
        "You gain the ability to twist your spells to suit your needs. Choose your first Metamagic option.",
      choice: {
        key: "metamagic1",
        label: "Metamagic: First Choice",
        options: METAMAGIC_OPTIONS,
      },
    },
    {
      level: 3,
      name: "Metamagic (choice 2)",
      description: "Choose your second Metamagic option.",
      choice: {
        key: "metamagic2",
        label: "Metamagic: Second Choice",
        options: METAMAGIC_OPTIONS,
      },
    },
    {
      level: 4,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 5,
      name: "Sorcerous Origin Feature",
      description: "You gain an additional feature from your Sorcerous Origin.",
      linkedChoice: 'subclass',
    },
    {
      level: 6,
      name: "Sorcerous Origin Feature",
      description: "You gain an additional feature from your Sorcerous Origin.",
      linkedChoice: 'subclass',
    },
    {
      level: 8,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 10,
      name: "Metamagic (choice 3)",
      description: "Choose an additional third Metamagic option.",
      choice: {
        key: "metamagic3",
        label: "Metamagic: Third Choice",
        options: METAMAGIC_OPTIONS,
      },
    },
    {
      level: 10,
      name: "Sorcerous Origin Feature",
      description: "You gain an additional feature from your Sorcerous Origin.",
      linkedChoice: 'subclass',
    },
  ],

  Warlock: [
    {
      level: 1,
      name: "Otherworldly Patron",
      description:
        "You have struck a bargain with an otherworldly being, granting you expanded spell lists and patron features.",
      choice: {
        key: "subclass",
        label: "Otherworldly Patron",
        options: [
          "The Archfey",
          "The Fiend",
          "The Great Old One",
          "The Hexblade",
          "The Undying",
          "The Celestial",
          "The Fathomless",
          "The Genie",
          "The Undead",
        ],
      },
    },
    {
      level: 1,
      name: "Pact Magic",
      description:
        "You can cast warlock spells using Charisma as your spellcasting ability. Your spell slots are all the same level (determined by your warlock level) and you regain all expended slots on a short or long rest.",
    },
    {
      level: 1,
      name: "Patron Feature",
      description: "You gain the first feature of your chosen Otherworldly Patron.",
      linkedChoice: 'subclass',
    },
    {
      level: 2,
      name: "Eldritch Invocations (1 & 2)",
      description:
        "You unlock magical eldritch invocations that augment your abilities. You gain two invocations at level 2.",
      choice: {
        key: "invocation1",
        label: "Eldritch Invocation 1",
        options: ELDRITCH_INVOCATIONS,
      },
    },
    {
      level: 2,
      name: "Eldritch Invocation 2",
      description: "Choose your second Eldritch Invocation.",
      choice: {
        key: "invocation2",
        label: "Eldritch Invocation 2",
        options: ELDRITCH_INVOCATIONS,
      },
    },
    {
      level: 3,
      name: "Pact Boon",
      description:
        "Your otherworldly patron bestows a gift upon you for your loyal service.",
      choice: {
        key: "pactBoon",
        label: "Pact Boon",
        options: [
          "Pact of the Blade",
          "Pact of the Chain",
          "Pact of the Tome",
          "Pact of the Talisman",
        ],
      },
    },
    {
      level: 3,
      name: "Eldritch Invocation 3",
      description: "Gain one additional Eldritch Invocation.",
      choice: {
        key: "invocation3",
        label: "Eldritch Invocation 3",
        options: ELDRITCH_INVOCATIONS,
      },
    },
    {
      level: 4,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 4,
      name: "Eldritch Invocation 4",
      description: "Gain one additional Eldritch Invocation.",
      choice: {
        key: "invocation4",
        label: "Eldritch Invocation 4",
        options: ELDRITCH_INVOCATIONS,
      },
    },
    {
      level: 5,
      name: "Mystic Arcanum (6th level)",
      description:
        "Your patron bestows upon you a magical secret called an arcanum. Choose one 6th-level spell from the warlock spell list; you can cast it once per long rest without expending a spell slot.",
    },
    {
      level: 6,
      name: "Patron Feature",
      description: "You gain an additional feature from your Otherworldly Patron.",
      linkedChoice: 'subclass',
    },
    {
      level: 8,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 9,
      name: "Mystic Arcanum (7th level)",
      description:
        "Choose one 7th-level warlock spell; you can cast it once per long rest without expending a spell slot.",
    },
    {
      level: 10,
      name: "Patron Feature",
      description: "You gain an additional feature from your Otherworldly Patron.",
      linkedChoice: 'subclass',
    },
  ],

  Wizard: [
    {
      level: 1,
      name: "Spellcasting",
      description:
        "You can cast wizard spells using Intelligence as your spellcasting ability. You have a spellbook containing your known spells; you prepare spells each day and have spell slots that refresh on a long rest.",
    },
    {
      level: 1,
      name: "Arcane Recovery",
      description:
        "Once per day during a short rest, you can recover spell slots whose combined level is no greater than half your wizard level (rounded up) and none of which can be 6th level or higher.",
    },
    {
      level: 2,
      name: "Arcane Tradition",
      description: "Choose an Arcane Tradition that masters a specific school of magic.",
      choice: {
        key: "subclass",
        label: "Arcane Tradition",
        options: [
          "School of Abjuration",
          "School of Conjuration",
          "School of Divination",
          "School of Enchantment",
          "School of Evocation",
          "School of Illusion",
          "School of Necromancy",
          "School of Transmutation",
          "Bladesinging",
          "War Magic",
          "Order of Scribes",
        ],
      },
    },
    {
      level: 2,
      name: "Tradition Feature",
      description: "You gain the first feature of your chosen Arcane Tradition.",
      linkedChoice: 'subclass',
    },
    {
      level: 4,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 5,
      name: "Tradition Feature",
      description: "You gain an additional feature from your Arcane Tradition.",
      linkedChoice: 'subclass',
    },
    {
      level: 6,
      name: "Tradition Feature",
      description: "You gain an additional feature from your Arcane Tradition.",
      linkedChoice: 'subclass',
    },
    {
      level: 8,
      name: "Ability Score Improvement",
      description:
        "+2 to one ability score, or +1 to two. Alternatively, take a feat.",
    },
    {
      level: 9,
      name: "Tradition Feature",
      description: "You gain an additional feature from your Arcane Tradition.",
      linkedChoice: 'subclass',
    },
    {
      level: 10,
      name: "Spell Mastery",
      description:
        "You have achieved such mastery over certain spells that you can cast them at will. Choose a 1st-level wizard spell and a 2nd-level wizard spell in your spellbook; you can cast each of those spells at their lowest level without expending a spell slot.",
    },
    {
      level: 10,
      name: "Tradition Feature",
      description: "You gain an additional feature from your Arcane Tradition.",
      linkedChoice: 'subclass',
    },
  ],
};
