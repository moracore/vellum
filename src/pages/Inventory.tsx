import { useState, useMemo, useRef, useEffect } from 'react'
import { useCharacter } from '../context/CharacterContext'
import CharacterHeader from '../components/CharacterHeader'
import { db } from '../lib/database'
import type { CharacterData } from '../types'

// ── Container definitions ────────────────────────────────────────────────────

type ContainerKey =
  | 'onPerson' | 'bag' | 'bag2' | 'bag3' | 'bag4'
  | 'sack1' | 'sack2' | 'sack3' | 'sack4'
  | 'bagOfHolding'

interface ContainerDef {
  key: ContainerKey
  label: string
  maxSlots: number
  cols: number
}

const ALL_CONTAINERS: ContainerDef[] = [
  { key: 'onPerson',     label: 'On Person',     maxSlots: 4,        cols: 1 }, // +1 locked Bag slot visual
  { key: 'bag',          label: 'Bag',            maxSlots: 20,       cols: 2 },
  { key: 'bag2',         label: 'Bag 2',          maxSlots: 20,       cols: 2 },
  { key: 'bag3',         label: 'Bag 3',          maxSlots: 20,       cols: 2 },
  { key: 'bag4',         label: 'Bag 4',          maxSlots: 20,       cols: 2 },
  { key: 'sack1',        label: 'Pouch',          maxSlots: 4,        cols: 1 },
  { key: 'sack2',        label: 'Pouch 2',        maxSlots: 4,        cols: 1 },
  { key: 'sack3',        label: 'Pouch 3',        maxSlots: 4,        cols: 1 },
  { key: 'sack4',        label: 'Pouch 4',        maxSlots: 4,        cols: 1 },
  { key: 'bagOfHolding', label: 'Bag of Holding', maxSlots: Infinity, cols: 2 },
]

const ALL_KEYS: ContainerKey[] = ALL_CONTAINERS.map(c => c.key)

// Also scan legacy bag5/sack5 for equipment lookups, just don't show them as containers
const SCAN_KEYS = [...ALL_KEYS, 'bag5' as ContainerKey, 'sack5' as ContainerKey]

const EXTRA_BAG_KEYS:  ContainerKey[] = ['bag2', 'bag3', 'bag4']         // max 3 extra (4 total inc. primary)
const EXTRA_SACK_KEYS: ContainerKey[] = ['sack1', 'sack2', 'sack3', 'sack4'] // max 4

const BAG_KEYWORDS  = ['bag', 'pack', 'haversack', 'satchel']
const SACK_KEYWORDS = ['pouch', 'sack', 'purse']
const PERMANENT: ContainerKey[] = ['onPerson', 'bag']

// Auto-corrected names for generic "Bag" / "Pouch" entries
const BAG_NAMES  = ['Bag 2', 'Bag 3', 'Bag 4']
const POUCH_NAMES = ['Pouch', 'Pouch 2', 'Pouch 3', 'Pouch 4']

const CURRENCY = [
  { idx: 0 as const, label: 'G', color: '#ffd700' },
  { idx: 1 as const, label: 'S', color: '#aaaaaa' },
  { idx: 2 as const, label: 'P', color: '#b87333' },
]

function extractPrefix(text: string, keywords: string[]): string | null {
  const lower = text.toLowerCase()
  for (const kw of keywords) {
    const idx = lower.indexOf(kw)
    if (idx === -1) continue
    const prefix = text.slice(0, idx).trim()
    return prefix || null
  }
  return null
}

function containerLabel(def: ContainerDef, cn: Record<string, string>): string {
  return cn[`cname_${def.key}`] ?? def.label
}

function findSubContainer(
  itemName: string,
  cn: Record<string, string>,
  visible: ContainerDef[],
): ContainerKey | null {
  const lower = itemName.toLowerCase()
  if (lower.includes('bag of holding')) {
    return visible.find(c => c.key === 'bagOfHolding') ? 'bagOfHolding' : null
  }
  for (const def of visible) {
    const citem = cn[`citem_${def.key}`]
    if (citem && citem.toLowerCase() === lower) return def.key
  }
  return null
}

function parseCurrencyText(text: string): [number, number, number] | null {
  const t = text.trim().toLowerCase()
  const gm = t.match(/^(\d+)\s*gp?$/);  if (gm) return [parseInt(gm[1]), 0, 0]
  const sm = t.match(/^(\d+)\s*sp?$/);  if (sm) return [0, parseInt(sm[1]), 0]
  const cm = t.match(/^(\d+)\s*cp?$/);  if (cm) return [0, 0, parseInt(cm[1])]
  return null
}

// ── Component ────────────────────────────────────────────────────────────────

export default function Inventory({ hideHeader }: { hideHeader?: boolean } = {}) {
  const { character, updateCharacter, updateCurrency, updateEquipment } = useCharacter()

  const [navStack, setNavStack]       = useState<ContainerKey[]>(['onPerson'])
  const [selected, setSelected]       = useState<number | null>(null)
  const [showMove, setShowMove]       = useState(false)
  const [editingSlot, setEditingSlot] = useState<number | null>(null)
  const [editValue, setEditValue]     = useState('')
  const [coinEdit, setCoinEdit]       = useState<number | null>(null)
  const [coinInput, setCoinInput]     = useState('')

  const editInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (editingSlot !== null) editInputRef.current?.focus()
  }, [editingSlot])

  const weaponNames = useMemo(() => {
    if (!db.loaded) return new Set<string>()
    return new Set([...db.weapons.values()].map(w => w.name.toLowerCase()))
  }, [])

  const armourNames = useMemo(() => {
    if (!db.loaded) return new Set<string>()
    return new Set([...db.armour.values()].filter(a => a.armour_category !== 'shield').map(a => a.name.toLowerCase()))
  }, [])

  const shieldNames = useMemo(() => {
    if (!db.loaded) return new Set<string>()
    return new Set([...db.armour.values()].filter(a => a.armour_category === 'shield').map(a => a.name.toLowerCase()))
  }, [])

  const visibleContainers = useMemo(() => {
    if (!character) return ALL_CONTAINERS.slice(0, 2)
    const flat = ALL_KEYS.flatMap(k => character[k as keyof typeof character] as string[])
    const bagCount  = flat.filter(i =>
      BAG_KEYWORDS.some(k => i.toLowerCase().includes(k)) && !i.toLowerCase().includes('bag of holding')
    ).length
    const sackCount = flat.filter(i => SACK_KEYWORDS.some(k => i.toLowerCase().includes(k))).length
    const hasHolding = character.bagOfHolding.length > 0
      || flat.some(i => i.toLowerCase().includes('bag of holding'))
    const result: ContainerDef[] = [ALL_CONTAINERS[0], ALL_CONTAINERS[1]]
    result.push(...ALL_CONTAINERS.slice(2, 5).slice(0, Math.min(bagCount, 3)))
    result.push(...ALL_CONTAINERS.slice(5, 9).slice(0, Math.min(sackCount, 4)))
    if (hasHolding) result.push(ALL_CONTAINERS[9])
    return result
  }, [
    character?.onPerson, character?.bag,
    character?.bag2, character?.bag3, character?.bag4,
    character?.sack1, character?.sack2, character?.sack3, character?.sack4,
    character?.bagOfHolding,
  ])

  if (!character) return null

  const currentKey = navStack[navStack.length - 1]
  const activeDef  = ALL_CONTAINERS.find(c => c.key === currentKey)!
  const items      = character[currentKey as keyof CharacterData] as string[]
  const isOnPerson = currentKey === 'onPerson'
  const canDrop    = !PERMANENT.includes(currentKey)

  // ── Navigation ──

  const navigateTo  = (idx: number) => {
    setNavStack(prev => prev.slice(0, idx + 1))
    setSelected(null); setShowMove(false); setEditingSlot(null)
  }

  const navigateInto = (key: ContainerKey) => {
    setNavStack(prev => [...prev, key])
    setSelected(null); setShowMove(false); setEditingSlot(null)
  }

  const dropContainer = () => {
    const itemName = character.containerNames[`citem_${currentKey}`]
    if (!itemName) return
    const nc = { ...character.containerNames }
    delete nc[`citem_${currentKey}`]
    delete nc[`cname_${currentKey}`]
    const patch: Partial<CharacterData> = { containerNames: nc, [currentKey]: [] }
    for (const key of ALL_KEYS) {
      const arr = character[key as keyof CharacterData] as string[]
      const i = arr.findIndex(l => l.toLowerCase() === itemName.toLowerCase())
      if (i !== -1) {
        ;(patch as Record<string, unknown>)[key] = arr.filter((_, j) => j !== i)
        break
      }
    }
    updateCharacter(patch)
    setNavStack(prev => prev.slice(0, -1))
    setSelected(null)
  }

  // ── Mutations ──

  const commitSlot = (_idx: number, text: string) => {
    setEditingSlot(null)
    setEditValue('')
    const trimmed = text.trim()
    if (!trimmed) return

    const coins = parseCurrencyText(trimmed)
    if (coins) {
      updateCurrency([
        character.currency[0] + coins[0],
        character.currency[1] + coins[1],
        character.currency[2] + coins[2],
      ])
      return
    }

    const lower = trimmed.toLowerCase()
    const isBagOfHolding = lower.includes('bag of holding')
    const isBagItem  = !isBagOfHolding && BAG_KEYWORDS.some(k => lower.includes(k))
    const isSackItem = SACK_KEYWORDS.some(k => lower.includes(k))

    const def = activeDef
    const cur = character[currentKey as keyof CharacterData] as string[]

    // ── Placement rules ──

    if (isBagItem) {
      // Bags can only go in On Person
      if (currentKey !== 'onPerson') return
      // Max 3 extra bags (4 total inc. locked primary)
      const onPersonBagCount = character.onPerson.filter(i =>
        BAG_KEYWORDS.some(k => i.toLowerCase().includes(k)) && !i.toLowerCase().includes('bag of holding')
      ).length
      if (onPersonBagCount >= 3) return
    }

    if (isSackItem) {
      // Pouches can't go in pouches
      if (EXTRA_SACK_KEYS.includes(currentKey as ContainerKey)) return
      // Max 4 pouches total
      const totalPouches = ALL_KEYS.flatMap(k =>
        character[k as keyof CharacterData] as string[]
      ).filter(i => SACK_KEYWORDS.some(k => i.toLowerCase().includes(k))).length
      if (totalPouches >= 4) return
    }

    if (def.maxSlots !== Infinity && cur.length >= def.maxSlots) return

    // ── Auto-correct generic names ──
    let finalName = trimmed

    if (isBagItem && lower === 'bag') {
      const bagCount = ALL_KEYS.flatMap(k =>
        character[k as keyof CharacterData] as string[]
      ).filter(i =>
        BAG_KEYWORDS.some(k => i.toLowerCase().includes(k)) && !i.toLowerCase().includes('bag of holding')
      ).length
      finalName = BAG_NAMES[bagCount] ?? 'Bag 4'
    }

    if (isSackItem && lower === 'pouch') {
      const sackCount = ALL_KEYS.flatMap(k =>
        character[k as keyof CharacterData] as string[]
      ).filter(i => SACK_KEYWORDS.some(k => i.toLowerCase().includes(k))).length
      finalName = POUCH_NAMES[sackCount] ?? 'Pouch 4'
    }

    const patch: Partial<CharacterData> = { [currentKey]: [...cur, finalName] }

    // ── Register container link ──

    if (isBagItem) {
      const bagCount = ALL_KEYS.flatMap(k =>
        character[k as keyof CharacterData] as string[]
      ).filter(i =>
        BAG_KEYWORDS.some(k => i.toLowerCase().includes(k)) && !i.toLowerCase().includes('bag of holding')
      ).length
      const nextKey = EXTRA_BAG_KEYS[bagCount]
      if (nextKey) {
        const prefix = extractPrefix(finalName, BAG_KEYWORDS)
        const nc = { ...character.containerNames, [`citem_${nextKey}`]: finalName }
        if (prefix) nc[`cname_${nextKey}`] = prefix
        else delete nc[`cname_${nextKey}`]
        patch.containerNames = nc
      }
    }

    if (isSackItem) {
      const sackCount = ALL_KEYS.flatMap(k =>
        character[k as keyof CharacterData] as string[]
      ).filter(i => SACK_KEYWORDS.some(k => i.toLowerCase().includes(k))).length
      const nextKey = EXTRA_SACK_KEYS[sackCount]
      if (nextKey) {
        const prefix = extractPrefix(finalName, SACK_KEYWORDS)
        const nc = { ...character.containerNames, [`citem_${nextKey}`]: finalName }
        if (prefix) nc[`cname_${nextKey}`] = prefix
        else delete nc[`cname_${nextKey}`]
        patch.containerNames = nc
      }
    }

    if (isBagOfHolding) {
      // Only one Bag of Holding allowed
      const alreadyHasBoH = character.containerNames['citem_bagOfHolding'] != null
        || character.bagOfHolding.length > 0
      if (alreadyHasBoH) return
      patch.containerNames = { ...character.containerNames, 'citem_bagOfHolding': finalName }
    }

    updateCharacter(patch)
  }

  const removeItem = (idx: number) => {
    const item = items[idx]
    const subKey = findSubContainer(item, character.containerNames, visibleContainers)
    const patch: Partial<CharacterData> = {
      [currentKey]: items.filter((_, i) => i !== idx),
    }
    if (subKey) {
      const nc = { ...character.containerNames }
      delete nc[`citem_${subKey}`]
      delete nc[`cname_${subKey}`]
      patch.containerNames = nc
      ;(patch as Record<string, unknown>)[subKey] = []
    }
    updateCharacter(patch)
    setSelected(null)
  }

  const moveItem = (idx: number, toKey: ContainerKey) => {
    const item = items[idx]
    const toDef = ALL_CONTAINERS.find(c => c.key === toKey)!
    const toItems = character[toKey as keyof CharacterData] as string[]
    if (toDef.maxSlots !== Infinity && toItems.length >= toDef.maxSlots) return
    updateCharacter({
      [currentKey]: items.filter((_, i) => i !== idx),
      [toKey]: [...toItems, item],
    } as Partial<CharacterData>)
    setSelected(null); setShowMove(false)
  }

  const commitCoin = (idx: number) => {
    const v = parseInt(coinInput)
    if (!isNaN(v) && v >= 0) {
      const next: [number, number, number] = [...character.currency]
      next[idx] = v
      updateCurrency(next)
    }
    setCoinEdit(null)
  }

  // ── Equipment ──

  const allItems      = SCAN_KEYS.flatMap(k => (character[k as keyof CharacterData] as string[] | undefined) ?? [])
  const armorOptions  = allItems.filter(l => armourNames.has(l.toLowerCase()))
  const weaponOptions = allItems.filter(l => weaponNames.has(l.toLowerCase()) || shieldNames.has(l.toLowerCase()))

  const equippedArmor   = character.equipment[0]
  const equippedWeapons: [string | null, string | null] = [character.equipment[1], character.equipment[2]]

  const removeFromAny = (name: string) => {
    for (const key of SCAN_KEYS) {
      const arr = (character[key as keyof CharacterData] as string[] | undefined) ?? []
      const i = arr.findIndex(l => l.toLowerCase() === name.toLowerCase())
      if (i !== -1) { updateCharacter({ [key]: arr.filter((_, j) => j !== i) } as Partial<CharacterData>); return }
    }
  }

  const handleEquipArmor = (val: string) => {
    const newArmor = val || null
    if (equippedArmor && equippedArmor !== newArmor)
      updateCharacter({ bag: [...character.bag, equippedArmor] } as Partial<CharacterData>)
    if (newArmor) removeFromAny(newArmor)
    updateEquipment(newArmor, equippedWeapons)
  }

  const handleEquipWeapon = (slot: 0 | 1, val: string) => {
    const newWeapon = val || null
    const oldWeapon = equippedWeapons[slot]
    if (oldWeapon && oldWeapon !== newWeapon)
      updateCharacter({ bag: [...character.bag, oldWeapon] } as Partial<CharacterData>)
    if (newWeapon) removeFromAny(newWeapon)
    const nw: [string | null, string | null] = [...equippedWeapons]
    nw[slot] = newWeapon
    updateEquipment(equippedArmor, nw)
  }

  // ── Grid sizing ──
  const isFull      = activeDef.maxSlots !== Infinity && items.length >= activeDef.maxSlots
  const realCount   = activeDef.maxSlots === Infinity ? items.length + 1 : activeDef.maxSlots
  const visualCount = isOnPerson ? realCount + 1 : realCount

  // ── Render ──

  return (
    <div className="inv-page">
      {!hideHeader && <div className="inv-sticky"><CharacterHeader /></div>}

      <div className="inv-scroll">

        {/* ── Equipped + Currency ── */}
        <div className="inv-top-strip">
          <div className="inv-equip-col">
            <div className="inv-group-heading">Equipped</div>
            <div className="inv-equip-card">
              <div className="inv-equip-row">
                <span className="inv-equip-label">Armor</span>
                <select className="inv-equip-select" value={equippedArmor ?? ''} onChange={e => handleEquipArmor(e.target.value)}>
                  <option value="">— none —</option>
                  {equippedArmor && !armorOptions.some(a => a.toLowerCase() === equippedArmor.toLowerCase()) && (
                    <option value={equippedArmor}>{equippedArmor}</option>
                  )}
                  {armorOptions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              {([0, 1] as const).map(slot => (
                <div className="inv-equip-row" key={slot}>
                  <span className="inv-equip-label">Wpn {slot + 1}</span>
                  <select className="inv-equip-select" value={equippedWeapons[slot] ?? ''} onChange={e => handleEquipWeapon(slot, e.target.value)}>
                    <option value="">— none —</option>
                    {equippedWeapons[slot] && !weaponOptions.some(w =>
                      w.toLowerCase() === equippedWeapons[slot]!.toLowerCase()
                    ) && <option value={equippedWeapons[slot]!}>{equippedWeapons[slot]}</option>}
                    {weaponOptions.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="inv-currency-col">
            <div className="inv-group-heading">Currency</div>
            <div className="inv-coins-card">
              {CURRENCY.map(({ idx, label, color }) => (
                <div
                  key={idx}
                  className={`inv-coin${coinEdit === idx ? ' inv-coin--active' : ''}`}
                  onClick={() => { setCoinEdit(idx); setCoinInput(String(character.currency[idx])) }}
                >
                  <span className="inv-coin-pip" style={{ background: color }} />
                  {coinEdit === idx ? (
                    <input
                      className="inv-coin-input"
                      type="text" inputMode="numeric" value={coinInput} autoFocus
                      onChange={e => setCoinInput(e.target.value.replace(/\D/g, ''))}
                      onBlur={() => commitCoin(idx)}
                      onKeyDown={e => { if (e.key === 'Enter') commitCoin(idx); if (e.key === 'Escape') setCoinEdit(null) }}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span className="inv-coin-val">{character.currency[idx]}</span>
                  )}
                  <span className="inv-coin-lbl">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Breadcrumb + Drop button ── */}
        <div className="inv-nav-row">
          <div className="inv-breadcrumb">
            {navStack.map((key, i) => {
              const def   = ALL_CONTAINERS.find(c => c.key === key)!
              const label = containerLabel(def, character.containerNames)
              const isCurrent = i === navStack.length - 1
              return (
                <span key={key} className="inv-breadcrumb-segment">
                  {i > 0 && <span className="inv-breadcrumb-sep">›</span>}
                  {isCurrent ? (
                    <span className="inv-breadcrumb-current">{label}</span>
                  ) : (
                    <button className="inv-breadcrumb-btn" onClick={() => navigateTo(i)}>{label}</button>
                  )}
                </span>
              )
            })}
          </div>
          {canDrop && (
            <button className="inv-drop-container-btn" onClick={dropContainer}>
              Drop {containerLabel(activeDef, character.containerNames)}
            </button>
          )}
        </div>

        {/* ── Slot grid ── */}
        <div className="inv-grid" style={{ gridTemplateColumns: `repeat(${activeDef.cols}, 1fr)` }}>
          {Array.from({ length: visualCount }, (_, vi) => {
            const realIdx = isOnPerson ? vi - 1 : vi
            const item    = realIdx >= 0 ? items[realIdx] : undefined

            // On Person locked Bag slot
            if (isOnPerson && vi === 0) {
              return (
                <button key="locked-bag" className="inv-cell inv-cell--container" onClick={() => navigateInto('bag')}>
                  Bag ›
                </button>
              )
            }

            if (item != null) {
              const subKey = findSubContainer(item, character.containerNames, visibleContainers)
              const isSel  = selected === realIdx
              return subKey ? (
                <button
                  key={realIdx} title={item}
                  className="inv-cell inv-cell--container"
                  onClick={() => navigateInto(subKey)}
                >
                  {item} ›
                </button>
              ) : (
                <button
                  key={realIdx} title={item}
                  className={`inv-cell inv-cell--filled${isSel ? ' inv-cell--sel' : ''}`}
                  onClick={() => { setSelected(isSel ? null : realIdx); setShowMove(false); setEditingSlot(null) }}
                >
                  {item}
                </button>
              )
            }

            if (editingSlot === realIdx) {
              return (
                <div key={realIdx} className="inv-cell inv-cell--editing">
                  <input
                    ref={editInputRef} className="inv-slot-input"
                    type="text" value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitSlot(realIdx, editValue)
                      if (e.key === 'Escape') { setEditingSlot(null); setEditValue('') }
                    }}
                    onBlur={() => commitSlot(realIdx, editValue)}
                    placeholder="Item name…"
                  />
                </div>
              )
            }

            if (!isFull || realIdx < items.length) {
              return (
                <button
                  key={realIdx} className="inv-cell inv-cell--empty"
                  onClick={() => { setEditingSlot(realIdx); setEditValue(''); setSelected(null) }}
                >
                  +
                </button>
              )
            }

            return <div key={realIdx} className="inv-cell inv-cell--locked" />
          })}
        </div>

        {/* ── Action bar ── */}
        {selected !== null && (
          <div className="inv-action-bar">
            <button className="inv-action inv-action--drop" onClick={() => removeItem(selected)}>Drop</button>
            <button className={`inv-action${showMove ? ' inv-action--active' : ''}`} onClick={() => setShowMove(!showMove)}>
              Move to…
            </button>
            {showMove && visibleContainers
              .filter(c => c.key !== currentKey)
              .map(c => {
                const full = c.maxSlots !== Infinity && (character[c.key as keyof CharacterData] as string[]).length >= c.maxSlots
                return (
                  <button key={c.key} className="inv-action inv-action--dest" disabled={full} onClick={() => moveItem(selected, c.key)}>
                    {containerLabel(c, character.containerNames)}{full ? ' ✕' : ''}
                  </button>
                )
              })
            }
          </div>
        )}

      </div>
    </div>
  )
}
