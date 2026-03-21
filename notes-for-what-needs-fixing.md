# Vellum — Fix List & Progress

## Work Order

### Phase 1: New Character Storage System
- [x] **1A. Trait storage** — raceTraits/extraTraits now store IDs not strings
- [ ] **1B. Define CharacterData type** — merge CharacterSheet + CharacterState into one type, spells as IDs, skills as IDs, everything structured
- [ ] **1C. Update IDB schema** — CharacterRecord stores `data: CharacterData` not `markdown: string`
- [ ] **1D. Update worker** — individual columns A:BM, new read/write/API payloads
- [ ] **1E. Update sync.ts** — new payload types, push/pull sends CharacterData not markdown
- [ ] **1F. Rewrite CharacterContext** — single `character` state, delete sheet/state split, update all mutators
- [ ] **1G. Delete markdown.ts** — no more serialize/parse
- [ ] **1H. Update all pages** — read from `character` instead of `sheet`/`state`
- [ ] **1I. Update DM Edit** — structured form replacing raw markdown textarea
- [ ] **1J. Update ConflictModal** — use CharacterData not markdown

### Phase 2: New Inventory System
- [ ] Slot-based containers (On Person 5, Bag 20, Sack 3, BoH infinite)
- [ ] Currency auto-parse from bag text
- [ ] Currency vertical G/S/C squares
- [ ] Equipment left, currency right layout

### Phase 3: Visual Fixes
- [ ] Spell slots UI rethink (numbers in grid, sorc points)
- [ ] Spells page: always show known spells, prepared toggle, class-aware limits
- [ ] Traits layout: class traits fixed left, others stacked right
- [ ] Top bar consistency across all screens
- [ ] Inventory visual polish

---

## Sheet Column Layout (Characters tab)

A=id, B=name, C=player, D=passkey, E=class, F=level, G=race,
H=ability_scores [6], I=saving_throws [IDs], J=skills [IDs],
K=max_hp, L=current_hp, M=temp_hp, N=ac, O=initiative, P=speed,
Q=hit_dice, R=hit_dice_current, S=proficiency_bonus,
T=death_saves [2], U=conditions [],
V=spell_ability, W=spell_attack_bonus, X=spell_save_dc,
Y=spell_slots [9 current], Z=spell_slots_max [9],
AA-AJ=spells_lv0..lv9 [IDs each], AK=prepared_spells [IDs],
AL=currency [3], AM=equipment [3],
AN=on_person [5], AO=bag [20], AP-AS=bag_2..5, AT-AX=sack_1..5,
AY=notes, AZ=description, BA=choices {}, BB=traits [IDs],
BC=race_traits [IDs], BD=resources {}, BE=languages [],
BF=other_proficiencies, BG=aliases [], BH=alignment, BI=deity,
BJ=subclass, BK=skill_details {}, BL=bag_of_holding [], BM=updated_at

---

## Raw Notes (original user feedback)

Spells tab is confusing — able to prepare all spells, can't remove them
Spell slots UI rethink — numbers in grid, sorc points
Top bar consistency across screens
Traits layout — class left, others stacked right
Inventory redesign — slot-based containers, currency squares
Currency auto-parse from bag text
Draconic Flight showing at level 2 (fixed by trait ID storage)
Traits should store IDs not descriptions (done)
