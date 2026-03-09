// Descriptions for selectable options, keyed by option name.
// Used in the Traits page to explain what each choice gives you.
export const CHOICE_DESCRIPTIONS: Record<string, string> = {

  // ── Sorcerer Origins ────────────────────────────────────────────────────────
  'Draconic Bloodline':
    'Your magic stems from draconic blood. Gain natural armor (AC 13 + DEX mod without armor), learn extra draconic spells, and eventually sprout wings and become resistant to your chosen dragon\'s damage type.',
  'Wild Magic':
    'Your power comes from raw chaotic magic. Gain Tides of Chaos (advantage on one attack/check/save, then DM may trigger a Wild Magic Surge). Level 14 grants Controlled Chaos and Spell Bombardment.',
  'Divine Soul':
    'Blessed by a god, you access cleric spells in addition to sorcerer spells. Gain an extra spell and later Divine Magic, Empowered Healing, Otherworldly Wings, and Unearthly Recovery.',
  'Shadow Magic':
    'Power from the Shadowfell. Gain Darkvision 120 ft, Eyes of the Dark (cast Darkness using sorcery points), Strength of the Grave (cheat death once per long rest), and later a Hound of Ill Omen.',
  'Storm Sorcery':
    'Born during a storm, your magic carries thunder and lightning. Gain Wind Speaker, Tempestuous Magic (fly 10 ft as bonus action when casting), Heart of the Storm, and Storm Guide.',
  'Aberrant Mind':
    'Touched by a psionic entity, you gain telepathy and extra psionic spells at each level. Features include Psionic Spells, Telepathic Speech, Psionic Sorcery, Psychic Defenses, and Revelation in Flesh.',
  'Clockwork Soul':
    'Connected to Mechanus, the plane of law. Gain extra spells of order and restoration, Restore Balance (cancel advantage/disadvantage), Bastion of Law (ward against damage), and Trance of Order.',

  // ── Barbarian Paths ──────────────────────────────────────────────────────────
  'Berserker':
    'The most combat-focused path. Gain Frenzy (make an extra melee attack each turn during rage but gain exhaustion), Mindless Rage (immune to charm/frighten while raging), Intimidating Presence, and Retaliation.',
  'Totem Warrior':
    'Forge a spiritual bond with an animal totem. Pick a totem for 3rd-, 6th-, and 14th-level features from Bear, Eagle, or Wolf. Bear gives resistance to all damage; Eagle gives flying movement; Wolf helps allies hit.',
  'Ancestral Guardian':
    'Your rage calls upon ancestor spirits to protect allies. Ancestral Protectors imposes disadvantage on enemies that don\'t target you, Consult the Spirits grants divination, and Vengeful Ancestors retaliates for you.',
  'Storm Herald':
    'Your rage channels the storm. Choose an aura (Desert = fire, Sea = lightning/thunder, Tundra = cold) that damages or affects creatures around you. Higher levels grant elemental resistance and storm flight.',
  'Zealot':
    'A divine warrior touched by a god. Rage deals bonus radiant/necrotic damage, you can\'t die while raging, gain advantage on saving throws while raging, and eventually become immune to one damage type.',
  'Beast':
    'Channel the beast within, growing natural weapons. Gain a Bestial Soul (claws, bite, or tail) that scales with level, Beast Senses, Infectious Fury (frighten or impose disadvantage), and Call the Hunt.',
  'Wild Magic Barbarian':
    'Wild magic surges when you rage. Roll on the Wild Surge table each time you rage, gain Magic Awareness, Bolstering Magic (help allies), Unstable Backlash, and Wild Surge improvements.',

  // ── Bard Colleges ────────────────────────────────────────────────────────────
  'College of Lore':
    'Master of all knowledge. Gain 3 extra skill proficiencies, Cutting Words (subtract from enemy rolls using Bardic Inspiration), bonus Magical Secrets at level 6, and Peerless Skill.',
  'College of Valor':
    'A warrior-bard. Gain medium armor + shields + martial weapons, Combat Inspiration (add die to AC or weapon damage), Extra Attack, and Battle Magic (cast a spell then make a weapon attack).',
  'College of Glamour':
    'Backed by fey magic. Mantle of Inspiration (give temp HP and movement to several allies at once), Enthralling Performance (charm creatures), Mantle of Majesty (command creatures), and Unbreakable Majesty.',
  'College of Swords':
    'Fighting bard. Gain a Fighting Style (Dueling or Two-Weapon), Blade Flourish (spend Bardic Inspiration on flashy combat maneuvers), Extra Attack, and Master\'s Flourish.',
  'College of Whispers':
    'A spy and manipulator. Psychic Blades (bonus psychic damage with Bardic Inspiration), Words of Terror (frighten someone with a conversation), Mantle of Whispers (steal a dead creature\'s identity), and Shadow Lore.',
  'College of Creation':
    'Your music shapes reality. Mote of Potential (Bardic Inspiration has extra effects depending on use), Performance of Creation (conjure a medium or smaller object), Animating Performance (animate an object), and Creative Crescendo.',
  'College of Eloquence':
    'The ideal orator. Silvery Words (improve failed Persuasion/Deception), Unsettling Words (subtract Bardic Inspiration die from target\'s save), Unfailing Inspiration (die is not lost on a failed roll), Universal Speech, and Infectious Inspiration.',

  // ── Cleric Domains ───────────────────────────────────────────────────────────
  'Knowledge':
    'Gain two skill proficiencies plus expertise in two of them. Channel Divinity lets you instantly gain proficiency in a skill or tool for 10 minutes. Later gain telepathy-like Read Thoughts.',
  'Life':
    'Heavy armor proficiency, Disciple of Life (healing spells restore extra HP), Preserve Life (Channel Divinity heals nearby creatures), Blessed Healer, and Supreme Healing (roll max dice on heals).',
  'Light':
    'Gain the Light cantrip and Warding Flare (impose disadvantage on an attacker). Channel Divinity radiates blinding light. Later Corona of Light floods an area with sunlight.',
  'Nature':
    'Gain heavy armor and a druid cantrip. Acolyte of Nature links you to a terrain or creature type. Channel Divinity charms beasts and plants. Dampen Elements and Master of Nature round out the subclass.',
  'Tempest':
    'Heavy armor, martial weapons, and Wrath of the Storm (reaction lightning/thunder damage). Channel Divinity maximizes thunder/lightning damage. Thunderbolt Strike pushes enemies and Stormborn grants flying speed.',
  'Trickery':
    'Blessing of the Trickster (grant advantage on Stealth), Shadow Step (teleport between shadows), Channel Divinity creates a decoy duplicate, Cloak of Shadows grants invisibility, and Divine Strike adds poison damage.',
  'War':
    'Heavy armor, martial weapons, War Priest (extra attacks as bonus action). Channel Divinity grants +10 to an attack roll. Avatar of Battle gives resistance to nonmagical weapon damage.',
  'Arcana':
    'Access to wizard spells on your list. Arcane Initiate gives two wizard cantrips. Channel Divinity dispels magic and boosts spell slots. Spell Breaker protects allies from spells. Arcane Mastery copies six high-level wizard spells.',
  'Death':
    'Proficiency with martial weapons. Reaper (cantrips affect two targets). Channel Divinity maximizes necrotic damage. Inescapable Destruction ignores necrotic resistance. Divine Strike adds necrotic damage. Improved Reaper upcasts single-target necrotic spells for free.',
  'Forge':
    'Heavy armor, Blessing of the Forge (+1 to a weapon or armor overnight), Channel Divinity imbues magic into a weapon. Soul of the Forge gives resistance and +1 AC in heavy armor. Divine Strike adds fire damage.',
  'Grave':
    'Eyes of the Grave detects undead. Circle of Mortality makes healing maximised on 0 HP targets. Sentinel at Death\'s Door cancels critical hits. Potent Spellcasting boosts cantrip damage. Keeper of Souls siphons HP from dying creatures.',
  'Order':
    'Bonus cleric spells of law and compulsion. Voice of Authority lets an ally attack when you cast a spell on them. Channel Divinity compels obedience. Embodiment of the Law casts enchantment spells as a bonus action.',
  'Peace':
    'Emboldening Bond links allies so they can add d4 to rolls when near each other. Channel Divinity provides temporary HP and removes conditions. Protective Bond lets linked allies take damage for each other. Expansive Bond increases range.',
  'Twilight':
    'Heavy armor, martial weapons, Darkvision 300 ft. Eyes of Night grants darkvision to nearby allies. Vigilant Blessing grants advantage on Initiative. Channel Divinity creates a Twilight Sanctuary protecting allies in a sphere.',

  // ── Druid Circles ─────────────────────────────────────────────────────────────
  'Circle of the Land':
    'Tied to a specific terrain (Arctic, Coast, Desert, Forest, Grassland, Mountain, Swamp, or Underdark). Gain extra terrain spells always prepared, Natural Recovery (restore spell slots on short rest), and later pass without trace through terrain.',
  'Circle of the Moon':
    'Wild Shape into more powerful beasts (up to CR 1 at level 2, CR equal to level/3 at higher levels). Can Wild Shape into elementals at level 10. Combat Wild Shape lets you shift as a bonus action.',
  'Circle of Dreams':
    'Connected to the fey dream world. Balm of the Summer Court heals allies with a pool of d6 HP. Hearth of Moonlight and Shadow creates a magical campsite. Hidden Paths teleports you short distances, and Walker in Dreams reaches the Ethereal Plane.',
  'Circle of the Shepherd':
    'Bond with beasts and fey. Spirit Totem summons a spirit aura (Bear heals, Hawk grants advantage, Unicorn helps healing spells). Mighty Summoner makes summoned creatures tougher. Guardian Soul and Faithful Summons further enhance your connections.',
  'Circle of Spores':
    'Harness fungal decay. Halo of Spores deals necrotic damage as a reaction. Symbiotic Entity (using Wild Shape charges) boosts HP and melee damage. Fungal Infestation animates humanoid corpses. Spreading Spores extends your aura.',
  'Circle of Stars':
    'Draw power from constellations. Star Map gives free Guidance cantrip and Guiding Bolt uses. Starry Form (using Wild Shape) gives you a constellation form with three modes: Archer (bonus radiant damage), Chalice (heal on healing spells), Dragon (advantage on concentration). Twinkling Constellations and Full of Stars improve further.',
  'Circle of Wildfire':
    'Wield fire and rebirth. A Wildfire Spirit is your companion. Enhanced Bond boosts fire/healing spells. Cauterizing Flames conjures healing flames when creatures die nearby. Blazing Revival brings you back from 0 HP once per long rest.',

  // ── Fighter Archetypes ────────────────────────────────────────────────────────
  'Champion':
    'Simple but deadly. Improved Critical (crit on 19-20), Remarkable Athlete (+half proficiency to STR/DEX/CON checks), extra Fighting Style at level 10, and Superior Critical (crit on 18-20) at level 15.',
  'Battle Master':
    'A tactical fighter using maneuvers. Gain 4 Combat Maneuvers (from 30 options) and Superiority Dice (d8). Maneuvers include Disarming Attack, Trip Attack, Riposte, Commanding Strike, and many more.',
  'Eldritch Knight':
    'A fighter who learns magic. Spellcasting (Abjuration/Evocation focus), Weapon Bond (teleport your weapon to your hand), War Magic (attack after cantrip), Eldritch Strike (impose disadvantage on saves), and Arcane Charge (Action Surge + teleport).',
  'Arcane Archer':
    'Infuse arrows with magical effects. Choose 2 of 8 Arcane Shot options (Banishing Arrow, Grasping Arrow, Shadow Arrow, etc.). Gain Curving Shot to redirect a missed arrow, and Every Arrow is Magical at level 15.',
  'Cavalier':
    'A mounted warrior. Bonus proficiencies, Unwavering Mark (mark a target and get a bonus attack if it attacks others), Warding Maneuver (protect your mount), Hold the Line (stop fleeing enemies), Ferocious Charger, and Vigilant Defender.',
  'Samurai':
    'An honourable warrior of endurance. Fighting Spirit (advantage and temp HP as bonus action 3/long rest), Elegant Courtier (add WIS to Persuasion, bonus save proficiency), Tireless Spirit (restore Fighting Spirit after Initiative), Rapid Strike (trade advantage for extra attack), and Strength Before Death.',

  // ── Monk Traditions ───────────────────────────────────────────────────────────
  'Way of the Open Hand':
    'Master of unarmed combat. Open Hand Technique adds effects to Flurry of Blows (knock prone, push 15 ft, or prevent reactions). Wholeness of Body heals you, Tranquility grants Sanctuary, Quivering Palm can instantly slay targets.',
  'Way of Shadow':
    'A ninja-like monk. Shadow Arts (cast Darkness, Darkvision, Pass Without Trace, Silence using ki), Shadow Step (teleport between shadows), Cloak of Shadows (become invisible in dim light), and Opportunist (attack creature hit by ally).',
  'Way of the Four Elements':
    'Bend the elements using ki. Learn Elemental Disciplines like Fangs of the Fire Snake, Fist of Four Thunders, Gong of the Summit, Ride the Wind, Water Whip, and more. More ki-intensive but highly versatile.',
  'Way of the Drunken Master':
    'Fight with unpredictable stumbling movements. Bonus Proficiencies (Performance, brewer\'s supplies), Drunken Technique (Disengage + 10 ft move with Flurry), Tipsy Sway (redirect attacks), Drunkard\'s Luck (remove disadvantage), Intoxicated Frenzy (up to 3 bonus Flurry attacks).',
  'Way of the Kensei':
    'Turn weapons into extensions of your body. Choose Kensei weapons (ranged + melee). Kensei\'s Shot adds to ranged damage, One with the Blade adds to melee damage, Sharpen the Blade boosts a weapon temporarily, Unerring Accuracy rerolls misses.',
  'Way of the Sun Soul':
    'Channel ki as radiant blasts. Radiant Sun Bolt (ranged ki attack), Searing Arc Strike (burning hands with ki), Searing Sunburst (fireball with ki), and Sun Shield (radiant aura that damages attackers).',
  'Way of the Astral Self':
    'Manifest your astral form. Arms of the Astral Self (use WIS for attacks, extra attacks), Visage of the Astral Self (darkvision, understanding languages, intimidation), Complete Astral Self (full astral body, extra attacks, resistance).',
  'Way of Mercy':
    'A healer and destroyer. Hand of Healing (spend ki to heal + remove a condition), Hand of Harm (spend ki to deal extra necrotic damage + potentially poison), Implements of Mercy (mask and herbalism kit proficiency), Noxious Aura, Healing Technique, Hand of Ultimate Mercy (revive a recently dead creature).',

  // ── Paladin Oaths ─────────────────────────────────────────────────────────────
  'Oath of Devotion':
    'The classic holy warrior. Sacred Weapon (Channel Divinity adds CHA to attacks), Turn the Unholy (turn fiends and undead), Aura of Devotion (you and allies immune to charm), Purity of Spirit (Protection from Evil always active), Holy Nimbus (sunlight aura that damages undead).',
  'Oath of the Ancients':
    'A nature-sworn guardian of light. Nature\'s Wrath (restrain enemies with vines), Turn the Faithless (turn fey and fiends), Aura of Warding (resistance to spells), Undying Sentinel (don\'t drop to 0 HP once per long rest), Elder Champion (transform into nature avatar).',
  'Oath of Vengeance':
    'A relentless pursuer of evil. Abjure Enemy (frighten or restrain a foe), Vow of Enmity (advantage on attacks against one creature), Relentless Avenger (move after opportunity attack), Soul of Vengeance (attack when Vow target attacks), Avenging Angel (fly + aura of fear).',
  'Oath of Conquest':
    'Rule through fear and power. Conquering Presence (Channel: frighten enemies), Guided Strike (Channel: +10 to an attack), Aura of Conquest (frightened creatures are paralyzed near you), Scornful Rebuke (deal psychic damage when hit), Invincible Conqueror (invulnerability mode).',
  'Oath of Redemption':
    'Persuade before punishing. Emissary of Peace (+5 to Persuasion), Rebuke the Violent (punish those who hurt allies), Aura of the Guardian (take damage for allies), Protective Spirit (regain HP on your turn at low HP), Emissary of Redemption (reflect damage back on attackers).',
  'Oath of Glory':
    'Inspire greatness. Inspiring Smite (Channel: distribute temp HP to allies), Peerless Athlete (bonus to Athletics/Acrobatics), Aura of Alacrity (+10 ft speed for allies near you), Glorious Defense (deflect attacks to counter), Living Legend (advantage + rerolls for 1 min).',
  'Oath of the Watchers':
    'Guard against extraplanar threats. Watcher\'s Will (Channel: grant advantage to allies on INT/WIS/CHA saves vs aberrations/celestials/elementals/fey/fiends), Abjure the Extraplanar (turn aberrations/celestials/elementals/fey/fiends), Aura of the Sentinel (initiative bonus to allies), Vigilant Rebuke (deal force damage when allies succeed a save), Mortal Bulwark (truesight + banish extraplanars).',
  'Oathbreaker':
    'A paladin who broke their vows. Channel Divinity options: Control Undead and Dreadful Aspect (frighten nearby creatures). Aura of Hate gives CHA to weapon damage for you and nearby fiends/undead. Supernatural Resistance and Dread Lord add necrotic damage and fear effects.',

  // ── Ranger Archetypes ─────────────────────────────────────────────────────────
  'Hunter':
    'A versatile combatant against many foes. Hunter\'s Prey (choose Colossus Slayer, Giant Killer, or Horde Breaker for bonus damage/attacks vs specific targets). Defensive Tactics at level 7. Multiattack at level 11.',
  'Beast Master':
    'Bond with an animal companion. Ranger\'s Companion lets you command a beast in combat. Exceptional Training improves its actions. Bestial Fury allows two attacks. Share Spells extends your spells to your companion.',
  'Gloom Stalker':
    'A predator of the dark. Dread Ambusher (extra attack + extra damage on first round), Umbral Sight (invisible in darkness to creatures with darkvision), Iron Mind (proficiency in WIS saves), Stalker\'s Flurry (bonus attack on a miss), and Shadowy Dodge.',
  'Horizon Walker':
    'A guardian of planar boundaries. Detect Portal, Planar Warrior (bonus force damage), Ethereal Step (step into the Ethereal Plane), Distant Strike (teleport between attacks), Spectral Defense (resistance to one damage type per attack).',
  'Monster Slayer':
    'Specialist against supernatural threats. Hunter\'s Sense (know immunities/resistances), Slayer\'s Prey (mark a target for bonus damage + reaction attack), Supernatural Defense (add d6 to saves vs the marked creature), Magic-User\'s Nemesis, Slayer\'s Counter.',
  'Fey Wanderer':
    'A bridge between the mortal world and the Feywild. Dreadful Strikes (psychic damage), Otherworldly Glamour (+CHA to social skills), Beguiling Twist (redirect charm/frighten), Fey Reinforcements (summon fey), Misty Wanderer (Misty Step + bring an ally).',
  'Swarmkeeper':
    'Surrounded by a swarm of nature spirits. Gathered Swarm (bonus damage + push/move with attacks), Writhing Tide (fly with your swarm), Mighty Swarm (stronger swarm effects), Swarming Dispersal (teleport when hit).',

  // ── Roguish Archetypes ────────────────────────────────────────────────────────
  'Thief':
    'A nimble burglar. Fast Hands (bonus action: sleight of hand, use an object, or use thieves\' tools), Second-Story Work (climb faster, jump farther), Supreme Sneak (advantage on Stealth checks when moving ≤ half speed), Use Magic Device, Thief\'s Reflexes (two turns in first combat round).',
  'Assassin':
    'Master of ambush. Bonus Proficiencies (disguise kit + poisoner\'s kit), Assassinate (advantage + auto-crit on surprised creatures + crit vs creatures that haven\'t acted), Infiltration Expertise (forge identities), Impostor (perfectly mimic someone), Death Strike (double damage on surprised creatures).',
  'Arcane Trickster':
    'A spellcasting rogue. Learn 3 cantrips and spells from the wizard list (Enchantment/Illusion focus). Mage Hand Legerdemain enhances the cantrip. Magical Ambush imposes disadvantage on saves when hidden. Versatile Trickster grants advantage using Mage Hand. Spell Thief steals spells.',
  'Inquisitive':
    'An expert investigator. Ear for Deceit (minimum 8 on Insight checks), Eye for Detail (bonus action Perception/Investigation), Insightful Fighting (Sneak Attack without advantage after reading target), Steady Eye (bonus to Perception/Investigation when using full movement), Unerring Eye (detect illusions/shapechangers), Eye for Weakness (more Sneak Attack dice vs Insightful Fighting target).',
  'Mastermind':
    'A social manipulator. Bonus Proficiencies (gaming sets, disguise kit, forgery kit, two languages), Master of Intrigue (mimic accents), Master of Tactics (Help as bonus action at 30 ft range), Insightful Manipulator (learn creature\'s stats), Misdirection (redirect attacks onto another creature), Soul of Deceit (prevent magical truth detection).',
  'Scout':
    'A wilderness expert. Skirmisher (move without opportunity attacks as reaction), Survivalist (proficiency + expertise in Nature and Survival), Superior Mobility (+10 ft speed), Ambush Master (advantage on Initiative, allies gain advantage vs creatures you attack in first round), Sudden Strike (Sneak Attack a second creature).',
  'Swashbuckler':
    'A charming duelist. Fancy Footwork (no opportunity attacks from creatures you attack in melee), Rakish Audacity (CHA to Initiative, Sneak Attack without needing an ally if 1v1), Panache (charm or impose disadvantage on enemies), Elegant Maneuver (bonus action Acrobatics/Athletics check), Master Duelist (reroll a miss with advantage once per rest).',
  'Phantom':
    'Connected to death. Whispers of the Dead (gain a skill/tool proficiency from a nearby soul), Wails from the Grave (bonus necrotic damage to a second target on Sneak Attack), Tokens of the Departed (store soul trinkets for proficiency bonuses and info from the dead), Ghost Walk (spectral form with hover and phasing), Death\'s Friend (see invisible creatures and maximize Soul Trinkets).',
  'Soulknife':
    'A psychic knife-wielder. Psionic Power (pool of d6 psychic dice), Psychic Blades (materialize blades of psychic force as bonus attack), Soul Blades (additional uses of psionic power), Psychic Veil (invisibility), Rend Mind (stun a creature with your psychic blades).',

  // ── Warlock Patrons ───────────────────────────────────────────────────────────
  'The Archfey':
    'A lord of the Feywild. Fey Presence (Channel: charm or frighten creatures in a 10 ft cube), Misty Escape (reaction to turn invisible and teleport when hit), Beguiling Defenses (immune to charm, reflect it back), Dark Delirium (send one creature into a waking dream).',
  'The Fiend':
    'A devil or demon. Dark One\'s Blessing (gain temp HP when you kill), Dark One\'s Own Luck (add d10 to any check or save), Fiendish Resilience (resistance to one damage type per short rest), Hurl Through Hell (banish target to briefly experience the lower planes for 10d10 psychic damage).',
  'The Great Old One':
    'A cosmic entity beyond comprehension. Awakened Mind (telepathy 30 ft), Entropic Ward (impose disadvantage on an attack against you, then gain advantage on next attack), Thought Shield (resistance to psychic + no mind reading), Create Thrall (charm a creature permanently with a touch).',
  'The Hexblade':
    'A shadow weapon entity. Hexblade\'s Curse (bonus to damage + crit range vs one target), Hex Warrior (CHA for one weapon\'s attacks), Accursed Specter (raise a slain humanoid as a specter), Armor of Hexes (50% chance to redirect attacks back at a cursed target), Master of Hexes (move curse without expending it).',
  'The Undying':
    'Power from a deathless being. Among the Dead (Spare the Dying cantrip, undead leave you alone unless provoked), Defy Death (regain HP on a successful death save), Undying Nature (no need for breath, food, sleep; age slowly), Indestructible Life (regain HP and reattach body parts as a bonus action).',
  'The Celestial':
    'A radiant being of the upper planes. Healing Light (pool of d6s to heal yourself or others as a bonus action), Radiant Soul (bonus radiant/fire damage on spells), Celestial Resilience (temp HP on short/long rest), Searing Vengeance (return from 0 HP with radiant damage burst).',
  'The Fathomless':
    'A power from the deep ocean. Tentacle of the Deeps (summon a tentacle that attacks and slows), Gift of the Sea (30 ft swim speed, breathe underwater), Oceanic Soul (resistance to cold + communication with aquatic creatures), Guardian Coil (tentacle reduces damage), Grasping Tentacles (mass entangle spell), Fathomless Plunge (teleport group through water).',
  'The Genie':
    'Bound to a noble genie (choose Dao/Djinni/Efreeti/Marid). Genie\'s Vessel (extra spells + tiny sanctuary inside your vessel), Elemental Gift (resistance + flying speed), Sanctuary Vessel (invite allies inside, short rest in 1 min), Limited Wish (cast a 6th-level or lower spell once per long rest).',
  'The Undead':
    'Power from an undead overlord. Form of Dread (frighten creatures, gain temp HP, become immune to fright), Grave Touched (ignore concentration requirements for one spell, add necrotic damage), Necrotic Husk (resistance to necrotic damage and once-per-long-rest resistance to all damage), Spirit Projection (send out your soul as an astral form).',

  // ── Wizard Traditions ─────────────────────────────────────────────────────────
  'School of Abjuration':
    'A specialist in protective magic. Abjuration Savant (half cost to copy abjuration spells), Arcane Ward (absorb damage with a magical barrier that recharges when you cast abjuration spells), Projected Ward (extend it to allies), Improved Abjuration (add proficiency bonus to counterspell/dispel checks), Spell Resistance (advantage on saves vs spells, resistance to spell damage).',
  'School of Conjuration':
    'Master of summoning and teleportation. Conjuration Savant (half cost for conjuration spells), Minor Conjuration (create simple objects from nothing), Benign Transposition (teleport or swap places with a creature), Focused Conjuration (concentration can\'t be broken while summoning), Durable Summons (summoned creatures get 30 temp HP).',
  'School of Divination':
    'See past, present, and future. Divination Savant (half cost for divination spells), Portent (replace any roll with one of two pre-rolled dice per long rest), Expert Divination (regain spell slot when using divination), Third Eye (darkvision, ethereal sight, or read any language), Greater Portent (three portent dice instead of two).',
  'School of Enchantment':
    'Bend minds to your will. Enchantment Savant (half cost for enchantment spells), Hypnotic Gaze (incapacitate a creature with your eyes as an action), Instinctive Charm (redirect attacks to another nearby creature), Split Enchantment (target two creatures with single-target enchantment), Alter Memories (erase up to 1 hour of memory per CHA mod hours).',
  'School of Evocation':
    'Raw magical power. Evocation Savant (half cost for evocation spells), Sculpt Spells (protect allies in area spells), Potent Cantrip (half damage on saved cantrips), Empowered Evocation (add INT mod to one damage roll of evocation spells), Overchannel (maximize damage of low-level evocations but take necrotic damage yourself).',
  'School of Illusion':
    'Master of deception. Illusion Savant (half cost for illusion spells), Improved Minor Illusion (create sound AND image with one casting), Malleable Illusions (alter illusions mid-cast using an action), Illusory Self (create a decoy to avoid one attack per short rest), Illusory Reality (make one part of an illusion real for 1 minute per long rest).',
  'School of Necromancy':
    'Harness the power of death. Necromancy Savant (half cost for necromancy spells), Grim Harvest (regain HP when you kill with a spell), Undead Thralls (Animate Dead affects one more, undead are stronger), Inured to Undeath (resistance to necrotic, max HP can\'t be reduced), Command Undead (control a powerful undead creature).',
  'School of Transmutation':
    'Transform matter and creatures. Transmutation Savant (half cost for transmutation spells), Minor Alchemy (change material type of small objects), Transmuter\'s Stone (craft a magic stone granting a benefit like darkvision or extra speed), Shapechanger (Polymorph into yourself as a bonus action), Master Transmuter (major magical effects once per long rest).',
  'Bladesinging':
    'An elven tradition blending swordplay with magic. Training in Light Armor + one-handed weapons, Bladesong (bonus to AC + speed + concentration saves + Acrobatics using INT mod), Extra Attack, Song of Defense (use spell slots to reduce damage), Song of Victory (add INT to weapon damage).',
  'War Magic':
    'A battle-hardened mage. Arcane Deflection (add +2 AC or +4 saves as a reaction, but only cantrips next turn), Tactical Wit (add INT to Initiative), Power Surge (store magic from counterspell to boost a spell\'s damage), Durable Magic (bonus to AC and saves while concentrating), Deflecting Shroud (Arcane Deflection damages nearby enemies).',
  'Order of Scribes':
    'An academic wizard who bonds with their spellbook. Wizardly Quill (magical quill that copies spells for free), Awakened Spellbook (use the book as a spellcasting focus, swap a spell\'s damage type), Manifest Mind (a spectral scribe that can cast spells remotely), Master Scrivener (create one-use scroll of a high-level spell overnight), One with the Word (your soul is stored in the book, near-death protection).',

  // ── Fighting Styles ───────────────────────────────────────────────────────────
  'Archery':          '+2 bonus to attack rolls with ranged weapons.',
  'Defense':          '+1 bonus to AC while wearing armor.',
  'Dueling':          '+2 to damage rolls when holding a melee weapon in one hand and nothing in the other.',
  'Great Weapon Fighting': 'Reroll 1s and 2s on damage dice when using a two-handed or versatile weapon (must keep the new result).',
  'Protection':       'When a creature you can see attacks a target other than you within 5 ft, use your reaction to impose disadvantage on the attack roll (requires a shield).',
  'Two-Weapon Fighting': 'When two-weapon fighting, add your ability modifier to the damage of the off-hand attack.',
  'Blind Fighting':   'You have blindsight with a range of 10 ft, letting you see anything that isn\'t behind total cover — including invisible creatures.',
  'Interception':     'When a creature you can see hits a target other than you within 5 ft, reduce the damage by 1d10 + proficiency bonus (requires a weapon or shield).',
  'Superior Technique': 'Learn one maneuver from the Battle Master list and gain one Superiority Die (d6).',
  'Thrown Weapon Fighting': '+2 to damage rolls with thrown weapons. Drawing a weapon with the Thrown property is part of the attack.',
  'Unarmed Fighting': 'Unarmed strikes deal 1d6 (or 1d8 if your hands are free). At the start of your turn, you can deal 1d4 bludgeoning damage to a creature you\'re grappling.',
  'Blessed Warrior':  'Learn two cleric cantrips that count as paladin spells for you (use CHA).',
  'Druidic Warrior':  'Learn two druid cantrips that count as ranger spells for you (use WIS).',

  // ── Metamagic Options ─────────────────────────────────────────────────────────
  'Careful Spell':    'Spend 1 sorcery point — up to CHA modifier creatures you choose automatically succeed on the spell\'s saving throw.',
  'Distant Spell':    'Spend 1 sorcery point — double the range of a spell (touch becomes 30 ft).',
  'Empowered Spell':  'Spend 1 sorcery point — reroll up to CHA modifier damage dice; you must use the new rolls.',
  'Extended Spell':   'Spend 1 sorcery point — double a spell\'s duration (max 24 hours).',
  'Heightened Spell': 'Spend 3 sorcery points — one target of a spell has disadvantage on its first saving throw.',
  'Quickened Spell':  'Spend 2 sorcery points — cast a spell with a casting time of 1 action as a bonus action instead.',
  'Subtle Spell':     'Spend 1 sorcery point — cast a spell without verbal or somatic components (undetectable).',
  'Twinned Spell':    'Spend sorcery points equal to the spell\'s level (minimum 1) — target a second creature with a single-target spell that can\'t normally target multiple.',
  'Seeking Spell':    'Spend 2 sorcery points — reroll a missed spell attack. You must use the second result.',
  'Transmuted Spell': 'Spend 1 sorcery point — change the damage type of a spell from acid/cold/fire/lightning/poison/thunder to any other type in that list.',

  // ── Pact Boons ────────────────────────────────────────────────────────────────
  'Pact of the Blade':  'Summon a pact weapon of any melee type as an action (it counts as magical). You can use it as your spellcasting focus. Bond with any existing magical weapon to make it your pact weapon.',
  'Pact of the Chain':  'Cast Find Familiar (as a ritual). Your familiar can be an imp, pseudodragon, quasit, or sprite. When you take the Attack action you can forgo one attack to let your familiar attack instead.',
  'Pact of the Tome':   'Your patron gives you a Book of Shadows containing three cantrips of your choice from any class spell list. On your travels you can add ritual spells to it.',
  'Pact of the Talisman': 'Your patron gives you a talisman. The wearer can add a d4 to a failed ability check once per long rest. You can give it to others.',
}
