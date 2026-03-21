import { useState, useMemo, useRef, useEffect } from 'react'
import { useCharacter } from '../context/CharacterContext'
import CharacterHeader from '../components/CharacterHeader'
import { db } from '../lib/database'
import type { CharacterData } from '../types'

// ── Container definitions ────────────────────────────────────────────────────

type ContainerKey =
  | 'onPerson' | 'bag' | 'bag2' | 'bag3' | 'bag4' | 'bag5'
  | 'sack1' | 'sack2' | 'sack3' | 'sack4' | 'sack5'
  | 'bagOfHolding'

interface ContainerDef {
  key: ContainerKey
  label: string
  shortLabel: string
  maxSlots: number  // Infinity = unlimited
}

const PRIMARY_CONTAINERS: ContainerDef[] = [
  { key: 'onPerson', label: 'On Person', shortLabel: 'Person', maxSlots: 5 },
  { key: 'bag',      label: 'Backpack',  shortLabel: 'Pack',   maxSlots: 20 },
]

const EXTRA_BAGS: ContainerDef[] = [
  { key: 'bag2', label: 'Bag 2', shortLabel: 'Bag 2', maxSlots: 20 },
  { key: 'bag3', label: 'Bag 3', shortLabel: 'Bag 3', maxSlots: 20 },
  { key: 'bag4', label: 'Bag 4', shortLabel: 'Bag 4', maxSlots: 20 },
  { key: 'bag5', label: 'Bag 5', shortLabel: 'Bag 5', maxSlots: 20 },
]

const SACKS: ContainerDef[] = [
  { key: 'sack1', label: 'Pouch 1', shortLabel: 'Pouch', maxSlots: 3 },
  { key: 'sack2', label: 'Pouch 2', shortLabel: 'Pouch 2', maxSlots: 3 },
  { key: 'sack3', label: 'Pouch 3', shortLabel: 'Pouch 3', maxSlots: 3 },
  { key: 'sack4', label: 'Pouch 4', shortLabel: 'Pouch 4', maxSlots: 3 },
  { key: 'sack5', label: 'Pouch 5', shortLabel: 'Pouch 5', maxSlots: 3 },
]

const BAG_OF_HOLDING: ContainerDef = {
  key: 'bagOfHolding', label: 'Bag of Holding', shortLabel: 'Holding', maxSlots: Infinity,
}

const ALL_CONTAINERS: ContainerDef[] = [
  ...PRIMARY_CONTAINERS,
  ...EXTRA_BAGS,
  ...SACKS,
  BAG_OF_HOLDING,
]

// ── Currency ─────────────────────────────────────────────────────────────────

const CURRENCY_KEYS: { idx: number; label: string; color: string }[] = [
  { idx: 0, label: 'GP', color: '#ffd700' },
  { idx: 1, label: 'SP', color: '#aaaaaa' },
  { idx: 2, label: 'CP', color: '#b87333' },
]

// ── Component ────────────────────────────────────────────────────────────────

export default function Inventory({ hideHeader }: { hideHeader?: boolean } = {}) {
  const { character, updateCharacter, updateCurrency, updateEquipment } = useCharacter()
  const [coinEdit, setCoinEdit] = useState<number | null>(null)
  const [coinInput, setCoinInput] = useState('')
  const [activeTab, setActiveTab] = useState<ContainerKey>('bag')
  const [addingItem, setAddingItem] = useState('')
  const [showAddMenu, setShowAddMenu] = useState(false)
  const addInputRef = useRef<HTMLInputElement>(null)

  if (!character) return null

  // ── Derive which containers are visible ──
  const visibleContainers = useMemo(() => {
    const visible: ContainerDef[] = [...PRIMARY_CONTAINERS]
    for (const c of [...EXTRA_BAGS, ...SACKS]) {
      if (character[c.key].length > 0) visible.push(c)
    }
    if (character.bagOfHolding.length > 0) visible.push(BAG_OF_HOLDING)
    return visible
  }, [
    character.onPerson, character.bag,
    character.bag2, character.bag3, character.bag4, character.bag5,
    character.sack1, character.sack2, character.sack3, character.sack4, character.sack5,
    character.bagOfHolding,
  ])

  // If active tab isn't visible, snap to 'bag'
  const activeDef = visibleContainers.find(c => c.key === activeTab)
    ?? visibleContainers.find(c => c.key === 'bag')
    ?? visibleContainers[0]
  const currentKey = activeDef.key

  const items: string[] = character[currentKey]
  const isFull = activeDef.maxSlots !== Infinity && items.length >= activeDef.maxSlots

  // ── Container mutations ──
  const setContainer = (key: ContainerKey, value: string[]) => {
    updateCharacter({ [key]: value } as Partial<CharacterData>)
  }

  const addItem = () => {
    const text = addingItem.trim()
    if (!text || isFull) return
    setContainer(currentKey, [...items, text])
    setAddingItem('')
    addInputRef.current?.focus()
  }

  const removeItem = (index: number) => {
    setContainer(currentKey, items.filter((_, i) => i !== index))
  }

  const moveItem = (index: number, targetKey: ContainerKey) => {
    const item = items[index]
    const targetItems = character[targetKey]
    const targetDef = ALL_CONTAINERS.find(c => c.key === targetKey)!
    if (targetDef.maxSlots !== Infinity && targetItems.length >= targetDef.maxSlots) return
    setContainer(currentKey, items.filter((_, i) => i !== index))
    // Need a second update for the target — merge into one patch
    updateCharacter({
      [currentKey]: items.filter((_, i) => i !== index),
      [targetKey]: [...targetItems, item],
    } as Partial<CharacterData>)
  }

  // ── Add new container ──
  const addableContainers = ALL_CONTAINERS.filter(c =>
    !visibleContainers.some(v => v.key === c.key)
  )

  const addContainer = (key: ContainerKey) => {
    setShowAddMenu(false)
    setActiveTab(key)
  }

  // ── Currency ──
  const commitCoin = (idx: number) => {
    const v = parseInt(coinInput)
    if (!isNaN(v) && v >= 0) {
      const next: [number, number, number] = [...character.currency]
      next[idx] = v
      updateCurrency(next)
    }
    setCoinEdit(null)
    setCoinInput('')
  }

  // ── Equipment ──
  const weaponNames = useMemo(() => {
    if (!db.loaded) return new Set<string>()
    return new Set([...db.weapons.values()].map(w => w.name.toLowerCase()))
  }, [])

  const armourNames = useMemo(() => {
    if (!db.loaded) return new Set<string>()
    return new Set([...db.armour.values()].map(a => a.name.toLowerCase()))
  }, [])

  // Gather all items across all containers for equipment matching
  const allItems = useMemo(() => {
    const keys: ContainerKey[] = ['onPerson', 'bag', 'bag2', 'bag3', 'bag4', 'bag5',
      'sack1', 'sack2', 'sack3', 'sack4', 'sack5', 'bagOfHolding']
    return keys.flatMap(k => character[k])
  }, [
    character.onPerson, character.bag,
    character.bag2, character.bag3, character.bag4, character.bag5,
    character.sack1, character.sack2, character.sack3, character.sack4, character.sack5,
    character.bagOfHolding,
  ])

  const armorOptions = useMemo(() =>
    allItems.filter(l => armourNames.has(l.toLowerCase())),
    [allItems, armourNames]
  )
  const weaponOptions = useMemo(() =>
    allItems.filter(l => weaponNames.has(l.toLowerCase()) || armourNames.has(l.toLowerCase())),
    [allItems, weaponNames, armourNames]
  )

  const equippedArmor = character.equipment[0]
  const equippedWeapons: [string | null, string | null] = [character.equipment[1], character.equipment[2]]

  const handleEquipArmor = (val: string) => {
    const newArmor = val || null
    // Unequip: return old armor to bag
    if (equippedArmor && equippedArmor !== newArmor) {
      const bagItems = [...character.bag, equippedArmor]
      updateCharacter({ bag: bagItems } as Partial<CharacterData>)
    }
    // Equip: remove from whichever container it's in
    if (newArmor) removeFromAnyContainer(newArmor)
    updateEquipment(newArmor, equippedWeapons)
  }

  const handleEquipWeapon = (slot: 0 | 1, val: string) => {
    const newWeapon = val || null
    const oldWeapon = equippedWeapons[slot]
    if (oldWeapon && oldWeapon !== newWeapon) {
      const bagItems = [...character.bag, oldWeapon]
      updateCharacter({ bag: bagItems } as Partial<CharacterData>)
    }
    if (newWeapon) removeFromAnyContainer(newWeapon)
    const newWeapons: [string | null, string | null] = [...equippedWeapons]
    newWeapons[slot] = newWeapon
    updateEquipment(equippedArmor, newWeapons)
  }

  const removeFromAnyContainer = (itemName: string) => {
    const keys: ContainerKey[] = ['onPerson', 'bag', 'bag2', 'bag3', 'bag4', 'bag5',
      'sack1', 'sack2', 'sack3', 'sack4', 'sack5', 'bagOfHolding']
    for (const key of keys) {
      const arr = character[key]
      const idx = arr.findIndex(l => l.toLowerCase() === itemName.toLowerCase())
      if (idx !== -1) {
        updateCharacter({ [key]: arr.filter((_, i) => i !== idx) } as Partial<CharacterData>)
        return
      }
    }
  }

  return (
    <div className="inv-page">
      {!hideHeader && (
        <div className="inv-sticky">
          <CharacterHeader />
        </div>
      )}

      <div className="inv-scroll">

        {/* ── Currency ── */}
        <div className="inv-section">
          <div className="inv-section-title">Currency</div>
          <div className="sheet-currency">
            {CURRENCY_KEYS.map(({ idx, label, color }) => (
              <div
                key={idx}
                className={`sheet-coin ${coinEdit === idx ? 'active' : ''}`}
                onClick={() => { setCoinEdit(idx); setCoinInput(String(character.currency[idx])) }}
              >
                <span className="sheet-coin-symbol" style={{ background: color }} />
                {coinEdit === idx
                  ? <input
                      className="sheet-coin-input"
                      type="text" inputMode="numeric" pattern="[0-9]*" value={coinInput} autoFocus
                      onChange={e => setCoinInput(e.target.value.replace(/\D/g, ''))}
                      onBlur={() => commitCoin(idx)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitCoin(idx)
                        if (e.key === 'Escape') { setCoinEdit(null); setCoinInput('') }
                      }}
                    />
                  : <span className="sheet-coin-val">{character.currency[idx]}</span>}
                <span className="sheet-coin-lbl">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Equipment ── */}
        <div className="inv-section">
          <div className="inv-section-title">Equipment</div>
          <div className="inv-slots">
            <div className="inv-slot-row">
              <span className="inv-slot-label">Armor</span>
              <select
                className="inv-slot-select"
                value={equippedArmor ?? ''}
                onChange={e => handleEquipArmor(e.target.value)}
              >
                <option value="">-- none --</option>
                {equippedArmor && !armorOptions.some(a => a.toLowerCase() === equippedArmor.toLowerCase()) && (
                  <option value={equippedArmor}>{equippedArmor}</option>
                )}
                {armorOptions.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            {[0, 1].map(slot => (
              <div className="inv-slot-row" key={slot}>
                <span className="inv-slot-label">Weapon {slot + 1}</span>
                <select
                  className="inv-slot-select"
                  value={equippedWeapons[slot as 0 | 1] ?? ''}
                  onChange={e => handleEquipWeapon(slot as 0 | 1, e.target.value)}
                >
                  <option value="">-- none --</option>
                  {equippedWeapons[slot as 0 | 1] && !weaponOptions.some(w =>
                    w.toLowerCase() === equippedWeapons[slot as 0 | 1]!.toLowerCase()
                  ) && (
                    <option value={equippedWeapons[slot as 0 | 1]!}>{equippedWeapons[slot as 0 | 1]}</option>
                  )}
                  {weaponOptions.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* ── Inventory Containers ── */}
        <div className="inv-section inv-section--containers">
          <div className="inv-section-title">Inventory</div>

          {/* Tab bar */}
          <div className="inv-tabs">
            <div className="inv-tabs-scroll">
              {visibleContainers.map(c => (
                <button
                  key={c.key}
                  className={`inv-tab ${currentKey === c.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(c.key)}
                >
                  <span className="inv-tab-label">{c.shortLabel}</span>
                  {c.maxSlots !== Infinity && (
                    <span className="inv-tab-count">{character[c.key].length}/{c.maxSlots}</span>
                  )}
                  {c.maxSlots === Infinity && character[c.key].length > 0 && (
                    <span className="inv-tab-count">{character[c.key].length}</span>
                  )}
                </button>
              ))}
              {addableContainers.length > 0 && (
                <div className="inv-tab-add-wrap">
                  <button className="inv-tab inv-tab--add" onClick={() => setShowAddMenu(!showAddMenu)}>
                    +
                  </button>
                  {showAddMenu && (
                    <div className="inv-add-menu">
                      {addableContainers.map(c => (
                        <button key={c.key} className="inv-add-menu-item" onClick={() => addContainer(c.key)}>
                          {c.label}
                          <span className="inv-add-menu-cap">
                            {c.maxSlots === Infinity ? 'unlimited' : `${c.maxSlots} slots`}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Container contents */}
          <div className="inv-container">
            {/* Slot counter */}
            <div className="inv-container-header">
              <span className="inv-container-name">{activeDef.label}</span>
              <span className="inv-container-slots">
                {activeDef.maxSlots === Infinity
                  ? `${items.length} items`
                  : `${items.length} / ${activeDef.maxSlots}`}
              </span>
            </div>

            {/* Item list */}
            <div className="inv-item-list">
              {items.length === 0 && (
                <div className="inv-empty">Empty</div>
              )}
              {items.map((item, i) => (
                <ItemRow
                  key={`${currentKey}-${i}`}
                  item={item}
                  index={i}
                  onRemove={removeItem}
                  onMove={moveItem}
                  containers={visibleContainers.filter(c => c.key !== currentKey)}
                  character={character}
                />
              ))}
            </div>

            {/* Add item */}
            {!isFull && (
              <div className="inv-add-row">
                <input
                  ref={addInputRef}
                  className="inv-add-input"
                  type="text"
                  value={addingItem}
                  onChange={e => setAddingItem(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addItem() }}
                  placeholder="Add item..."
                />
                <button
                  className="inv-add-btn"
                  onClick={addItem}
                  disabled={!addingItem.trim()}
                >
                  +
                </button>
              </div>
            )}
            {isFull && (
              <div className="inv-full-msg">Container full</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Item row with swipe-to-reveal actions ────────────────────────────────────

function ItemRow({
  item,
  index,
  onRemove,
  onMove,
  containers,
  character,
}: {
  item: string
  index: number
  onRemove: (i: number) => void
  onMove: (i: number, target: ContainerKey) => void
  containers: ContainerDef[]
  character: CharacterData
}) {
  const [showActions, setShowActions] = useState(false)
  const [showMoveMenu, setShowMoveMenu] = useState(false)

  return (
    <div className="inv-item">
      <div className="inv-item-main" onClick={() => setShowActions(!showActions)}>
        <span className="inv-item-name">{item}</span>
        <span className="inv-item-chevron">{showActions ? '...' : ''}</span>
      </div>
      {showActions && (
        <div className="inv-item-actions">
          <button className="inv-item-action inv-item-action--remove" onClick={() => onRemove(index)}>
            Drop
          </button>
          {containers.length > 0 && (
            <button
              className="inv-item-action inv-item-action--move"
              onClick={() => setShowMoveMenu(!showMoveMenu)}
            >
              Move
            </button>
          )}
          {showMoveMenu && (
            <div className="inv-move-menu">
              {containers.map(c => {
                const targetItems = character[c.key]
                const full = c.maxSlots !== Infinity && targetItems.length >= c.maxSlots
                return (
                  <button
                    key={c.key}
                    className="inv-move-option"
                    disabled={full}
                    onClick={() => { onMove(index, c.key); setShowActions(false); setShowMoveMenu(false) }}
                  >
                    {c.shortLabel}
                    {full && <span className="inv-move-full"> (full)</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
