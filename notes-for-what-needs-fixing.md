# Vellum — Fix List & Progress

## Work Order

### Phase 1: New Character Storage System
- [x] **1A. Trait storage** — raceTraits/extraTraits now store IDs not strings
- [x] **1B. Define CharacterData type** — merged CharacterSheet + CharacterState into single CharacterData type; spells as IDs, skills as IDs, saving throws as IDs, currency/equipment as tuples
- [x] **1C. Update IDB schema** — CharacterRecord stores `data: CharacterData`, bumped to v8; conflictServerMarkdown → conflictServerData
- [x] **1D. Update worker** — 65 columns A:BM, charToRow/rowToChar, PUT/GET use CharacterData payloads
- [x] **1E. Update sync.ts** — RemoteCharacter/PushRequest/PushConflict updated; pushCharacter(id, data, updatedAt, force)
- [x] **1F. Rewrite CharacterContext** — single `character: CharacterData` state, all mutators updated, doUpdate pattern
- [x] **1G. Delete markdown.ts** — deleted; no markdown anywhere in codebase
- [x] **1H. Update all pages** — Stats, Spells, SpellChooser, Traits, Items, Inventory, Notes, Dying, Settings, CharacterSelect, CharacterCreator, DBAdmin, LevelUpModal, ShortRestModal, CharacterHeader all updated
- [x] **1I. Update DM Edit** — JSON editor (textarea with JSON.stringify/parse, saves via updateCharacter)
- [x] **1J. Update ConflictModal** — uses CharacterData, serverData.name for display

### Phase 2: New Inventory System
- [x] Slot-based containers — On Person (5), Backpack (20), Bag 2-5 (20 each), Pouch 1-5 (3 each), Bag of Holding (unlimited); tabbed UI, per-container slot counts
- [x] Equipment dropdowns — armor, weapon 1, weapon 2; equip/unequip moves items to/from bag
- [x] Move items between containers
- [ ] Currency auto-parse from bag text — not implemented
- [ ] Currency vertical G/S/C squares — still horizontal pill layout (not changed from original design)
- [ ] Equipment left, currency right layout — not implemented

### Phase 3: Visual Fixes
- [x] Spell slots UI rethink — number grid cells (level / current / max), tap current to use, tap max to restore
- [x] Sorcery points — "Sorc" cell alongside spell slots for Sorcerer, tracked in resources[185], restores on long rest
- [x] Spells page: prepared toggle, class-aware limits — prepared casters see count/limit, limit enforced (can't over-prepare), Forget Spell button, All/Prepared filter
- [x] Traits layout — class + subclass traits in left column, race/feats/fighting styles/extras in right column; flexbox not CSS columns
- [x] Top bar consistency — all pages (Spells, Traits, Inventory, Notes) use sticky header with same pattern
- [x] Inventory visual polish — hover states on tabs, items, action buttons, move options

### Remaining / Not Implemented
- [x] Currency auto-parse from bag text — typing "50 gp" / "12 sp" / "4 cp" in the add-item field adds to currency instead of bag
- [x] Currency layout: vertical squares (G/S/C stacked column on right side)
- [x] Equipment/currency side-by-side layout — equipment dropdowns left, currency squares right

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

Spells tab is confusing — able to prepare all spells, can't remove them ✅ fixed
Spell slots UI rethink — numbers in grid, sorc points ✅ fixed
Top bar consistency across screens ✅ fixed
Traits layout — class left, others stacked right ✅ fixed
Inventory redesign — slot-based containers, currency squares ✅ partially (containers done, currency squares not yet)
Currency auto-parse from bag text ⬜ not implemented
Draconic Flight showing at level 2 (fixed by trait ID storage) ✅ fixed
Traits should store IDs not descriptions ✅ fixed
