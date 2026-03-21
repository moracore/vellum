import { Sword, Package, Shield, Sparkles, ScrollText } from 'lucide-react'

type Tab = 'stats' | 'inventory' | 'traits' | 'spells' | 'notes'

interface Props {
  active?: Tab
  activeTabs?: Tab[]
  onChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string; Icon: React.FC<{ size?: number }> }[] = [
  { id: 'stats',     label: 'Character', Icon: Sword },
  { id: 'inventory', label: 'Inventory', Icon: Package },
  { id: 'traits',    label: 'Traits',    Icon: Shield },
  { id: 'spells',    label: 'Spells',    Icon: Sparkles },
  { id: 'notes',     label: 'Notes',     Icon: ScrollText },
]

export default function BottomNav({ active, activeTabs, onChange }: Props) {
  const isActive = (id: Tab) => activeTabs ? activeTabs.includes(id) : active === id

  return (
    <nav className="bottom-nav">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`nav-tab ${isActive(id) ? 'active' : ''}`}
          onClick={() => onChange(id)}
        >
          <Icon size={20} />
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  )
}
