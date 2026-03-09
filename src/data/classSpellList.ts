// Spells available to each class, indexed by spell level.
// Only includes spells that exist in spells.ts.

export const CLASS_SPELL_LIST: Record<string, Record<number, string[]>> = {
  Sorcerer: {
    0: [
      'Acid Splash', 'Blade Ward', 'Booming Blade', 'Chill Touch',
      'Control Flames', 'Create Bonfire', 'Dancing Lights', 'Fire Bolt',
      'Friends', 'Frostbite', 'Green-Flame Blade', 'Gust', 'Infestation',
      'Light', 'Lightning Lure', 'Mage Hand', 'Message', 'Mind Sliver',
      'Minor Illusion', 'Mold Earth', 'Poison Spray', 'Prestidigitation',
      'Ray of Frost', 'Shape Water', 'Shocking Grasp', 'Thunderclap',
      'Toll the Dead', 'True Strike',
    ],
    1: [
      'Burning Hands', 'Catapult', 'Cause Fear', 'Charm Person',
      'Chromatic Orb', 'Color Spray', 'Comprehend Languages', 'Detect Magic',
      'Disguise Self', 'Expeditious Retreat', 'False Life', 'Feather Fall',
      'Fog Cloud', 'Ice Knife', 'Jump', 'Mage Armor', 'Magic Missile',
      'Ray of Sickness', 'Shield', 'Silent Image', 'Sleep', 'Thunderwave',
      'Witch Bolt',
    ],
    2: [
      'Alter Self', 'Blindness/Deafness', 'Blur', 'Cloud of Daggers',
      'Crown of Madness', 'Darkness', 'Darkvision', 'Detect Thoughts',
      "Dragon's Breath", 'Enhance Ability', 'Enlarge/Reduce', 'Gust of Wind',
      'Hold Person', 'Invisibility', 'Knock', 'Levitate', 'Mirror Image',
      'Misty Step', 'Phantasmal Force', 'Scorching Ray', 'See Invisibility',
      'Shatter', 'Spider Climb', 'Suggestion', 'Web',
    ],
    3: [
      'Blink', 'Clairvoyance', 'Counterspell', 'Daylight', 'Dispel Magic',
      'Fear', 'Fireball', 'Fly', 'Gaseous Form', 'Haste', 'Hypnotic Pattern',
      'Lightning Bolt', 'Major Image', 'Protection from Energy', 'Sleet Storm',
      'Slow', 'Stinking Cloud', 'Tongues', 'Water Breathing', 'Water Walk',
    ],
    4: [
      'Banishment', 'Blight', 'Confusion', 'Dimension Door',
      'Dominate Beast', 'Greater Invisibility', 'Ice Storm', 'Polymorph',
      'Stoneskin', 'Wall of Fire',
    ],
    5: [
      'Animate Objects', 'Bigby\'s Hand', 'Cloudkill', 'Cone of Cold',
      'Creation', 'Dominate Person', 'Hold Monster', 'Insect Plague',
      'Seeming', 'Telekinesis', 'Teleportation Circle', 'Wall of Stone',
    ],
  },

  Bard: {
    0: [
      'Blade Ward', 'Dancing Lights', 'Friends', 'Light', 'Mage Hand',
      'Mending', 'Message', 'Minor Illusion', 'Prestidigitation',
      'Thunderclap', 'True Strike', 'Vicious Mockery',
    ],
    1: [
      'Animal Friendship', 'Bane', 'Charm Person', 'Color Spray',
      'Command', 'Comprehend Languages', 'Cure Wounds', 'Detect Magic',
      'Disguise Self', 'Dissonant Whispers', 'Faerie Fire', 'Feather Fall',
      'Healing Word', 'Heroism', 'Identify', 'Illusory Script',
      'Longstrider', 'Silent Image', 'Sleep', "Tasha's Hideous Laughter",
      'Thunderwave', 'Unseen Servant',
    ],
    2: [
      'Animal Messenger', 'Blindness/Deafness', 'Calm Emotions',
      'Cloud of Daggers', 'Crown of Madness', 'Detect Thoughts',
      'Enhance Ability', 'Enthrall', 'Heat Metal', 'Hold Person',
      'Invisibility', 'Knock', 'Lesser Restoration', 'Locate Animals or Plants',
      'Locate Object', 'Magic Mouth', 'Mirror Image', 'Phantasmal Force',
      'Pyrotechnics', 'See Invisibility', 'Shatter', 'Silence', 'Suggestion',
      'Zone of Truth',
    ],
  },

  Warlock: {
    0: [
      'Blade Ward', 'Booming Blade', 'Chill Touch', 'Create Bonfire',
      'Eldritch Blast', 'Friends', 'Frostbite', 'Green-Flame Blade',
      'Infestation', 'Lightning Lure', 'Mage Hand', 'Mind Sliver',
      'Minor Illusion', 'Poison Spray', 'Prestidigitation', 'Thunderclap',
      'Toll the Dead', 'True Strike',
    ],
    1: [
      'Armor of Agathys', 'Arms of Hadar', 'Cause Fear', 'Charm Person',
      'Comprehend Languages', 'Expeditious Retreat', 'Hellish Rebuke',
      'Hex', 'Illusory Script', 'Protection from Evil and Good',
      'Unseen Servant', 'Witch Bolt',
    ],
    2: [
      'Cloud of Daggers', 'Crown of Madness', 'Darkness', 'Enthrall',
      'Hold Person', 'Invisibility', 'Mirror Image', 'Misty Step',
      'Ray of Enfeeblement', 'Shatter', 'Spider Climb', 'Suggestion',
    ],
  },

  Wizard: {
    0: [
      'Acid Splash', 'Blade Ward', 'Booming Blade', 'Chill Touch',
      'Control Flames', 'Create Bonfire', 'Dancing Lights', 'Fire Bolt',
      'Friends', 'Frostbite', 'Green-Flame Blade', 'Gust', 'Infestation',
      'Light', 'Lightning Lure', 'Mage Hand', 'Mending', 'Message',
      'Mind Sliver', 'Minor Illusion', 'Mold Earth', 'Poison Spray',
      'Prestidigitation', 'Ray of Frost', 'Shape Water', 'Shocking Grasp',
      'Thunderclap', 'Toll the Dead', 'True Strike',
    ],
    1: [
      'Absorb Elements', 'Alarm', 'Burning Hands', 'Catapult', 'Cause Fear',
      'Charm Person', 'Chromatic Orb', 'Color Spray', 'Comprehend Languages',
      'Detect Magic', 'Disguise Self', 'Expeditious Retreat', 'False Life',
      'Feather Fall', 'Find Familiar', 'Fog Cloud', 'Grease', 'Ice Knife',
      'Identify', 'Jump', 'Longstrider', 'Mage Armor', 'Magic Missile',
      'Protection from Evil and Good', 'Ray of Sickness', 'Shield',
      'Silent Image', 'Sleep', "Tasha's Hideous Laughter", 'Thunderwave',
      'Unseen Servant', 'Witch Bolt',
    ],
    2: [
      'Alter Self', 'Arcane Lock', 'Blindness/Deafness', 'Blur',
      'Cloud of Daggers', 'Crown of Madness', 'Darkness', 'Darkvision',
      'Detect Thoughts', "Dragon's Breath", 'Enhance Ability', 'Enlarge/Reduce',
      'Flaming Sphere', 'Gust of Wind', 'Hold Person', 'Invisibility',
      'Knock', 'Levitate', 'Magic Weapon', 'Mirror Image', 'Misty Step',
      'Phantasmal Force', 'Ray of Enfeeblement', 'Scorching Ray',
      'See Invisibility', 'Shatter', 'Spider Climb', 'Suggestion', 'Web',
    ],
  },

  Ranger: {
    1: [
      'Absorb Elements', 'Alarm', 'Animal Friendship', 'Cure Wounds',
      'Detect Magic', 'Detect Poison and Disease', 'Ensnaring Strike',
      'Fog Cloud', 'Goodberry', 'Hail of Thorns', 'Hunter\'s Mark',
      'Jump', 'Longstrider', 'Speak with Animals', 'Zephyr Strike',
    ],
    2: [
      'Animal Messenger', 'Barkskin', 'Darkvision', 'Find Traps',
      'Gust of Wind', 'Lesser Restoration', 'Locate Animals or Plants',
      'Locate Object', 'Pass without Trace', 'Protection from Poison',
      'Silence', 'Spike Growth',
    ],
  },
}
