import { useState, useEffect } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { CharacterProvider, useCharacter } from './context/CharacterContext'
import { findCharacter } from './data/characters'
import { getSettings, saveSettings, getLastPullAt } from './db'
import { syncAllCharacters, STALE_MS } from './lib/sync'
import CharacterSelect from './pages/CharacterSelect'
import Stats from './pages/Stats'
import Traits from './pages/Traits'
import Spells from './pages/Spells'
import Notes from './pages/Notes'
import Settings from './pages/Settings'
import DMEdit from './pages/DMEdit'
import Dying from './pages/Dying'
import BottomNav from './components/BottomNav'

type Tab = 'stats' | 'traits' | 'spells' | 'notes'

function useBreakpoint() {
  const get = () => {
    const ar = window.innerWidth / window.innerHeight
    if (ar >= 16/10) return 'desktop4'
    if (ar >= 12/9) return 'desktop3'
    if (ar >= 8/9) return 'tablet'
    return 'mobile'
  }
  const [bp, setBp] = useState(get)
  useEffect(() => {
    const h = () => setBp(get())
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return bp
}

function LevelUpOverlay({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="levelup-overlay" onClick={onDismiss}>
      <div className="levelup-card" onClick={e => e.stopPropagation()}>
        <div className="levelup-title">Level Up!</div>
        <p className="levelup-msg">{msg}</p>
        <button className="levelup-btn" onClick={onDismiss}>Awesome!</button>
      </div>
    </div>
  )
}

function Shell() {
  const { sheet, dmMode, setDmMode, loadCharacter, levelUpMsg, clearLevelUp } = useCharacter()
  const [tab, setTab]               = useState<Tab>('stats')
  const [showSettings, setShowSettings] = useState(false)
  const [isDying, setIsDying]       = useState(false)
  const [initializing, setInitializing] = useState(true)
  const bp = useBreakpoint()

  // On mount: pull-all if stale, then auto-load saved player character
  useEffect(() => {
    void (async () => {
      try {
        const lastPull = await getLastPullAt()
        const stale    = !lastPull || Date.now() - new Date(lastPull).getTime() > STALE_MS

        if (stale) await syncAllCharacters()

        const s = await getSettings()
        if (s.playerName) {
          const result = await findCharacter(s.playerName)
          if (result) await loadCharacter(result.id)
        }
      } catch {
        // Offline or worker unavailable — continue with whatever is in IDB
      } finally {
        setInitializing(false)
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sheet?.playerName) {
      getSettings().then(s => saveSettings({ ...s, playerName: sheet.playerName }))
    }
  }, [sheet?.playerName])

  if (initializing) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Loading…</span>
      </div>
    )
  }

  if (!sheet) return <CharacterSelect onLoaded={() => {}} />

  const handleTabChange = (t: Tab) => {
    setDmMode(false)
    setShowSettings(false)
    setTab(t)
  }

  const isCharGroup = tab === 'stats' || tab === 'traits'

  if (dmMode)       return <DMEdit onClose={() => setDmMode(false)} />
  if (showSettings) return (
    <div className="app-shell">
      <main className="main-scroll"><Settings onClose={() => setShowSettings(false)} /></main>
      <BottomNav active={tab} onChange={handleTabChange} />
    </div>
  )

  const openSettings = () => setShowSettings(true)
  const overlay = levelUpMsg ? <LevelUpOverlay msg={levelUpMsg} onDismiss={clearLevelUp} /> : null

  if (isDying) {
    return (
      <div className="app-shell">
        {overlay}
        <Dying onStabilized={() => setIsDying(false)} />
      </div>
    )
  }

  if (bp === 'desktop4') {
    return (
      <div className="app-shell app-shell--desktop">
        {overlay}
        <div className="panels panels--4">
          <div className="panel"><Stats onOpenSettings={openSettings} onDying={() => setIsDying(true)} /></div>
          <div className="panel"><Traits hideHeader /></div>
          <div className="panel"><Spells hideHeader /></div>
          <div className="panel"><Notes hideHeader /></div>
        </div>
      </div>
    )
  }

  if (bp === 'desktop3') {
    return (
      <div className="app-shell app-shell--desktop">
        {overlay}
        <div className="panels panels--3">
          <div className="panel"><Stats onOpenSettings={openSettings} onDying={() => setIsDying(true)} /></div>
          <div className="panel"><Traits hideHeader /></div>
          <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
             <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}><Spells hideHeader /></div>
             <div style={{ height: '1px', background: 'var(--border-subtle)', flexShrink: 0 }} />
             <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}><Notes hideHeader /></div>
          </div>
        </div>
      </div>
    )
  }

  if (bp === 'tablet') {
    return (
      <div className="app-shell app-shell--tablet" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {overlay}
        <div className="panels panels--2" style={{ flex: 1 }}>
          {isCharGroup ? (
            <>
              <div className="panel"><Stats onOpenSettings={openSettings} onDying={() => setIsDying(true)} /></div>
              <div className="panel"><Traits hideHeader /></div>
            </>
          ) : (
            <>
              <div className="panel"><Spells /></div>
              <div className="panel"><Notes hideHeader /></div>
            </>
          )}
        </div>
        <BottomNav activeTabs={isCharGroup ? ['stats', 'traits'] : ['spells', 'notes']} onChange={handleTabChange} />
      </div>
    )
  }

  // Mobile
  return (
    <div className="app-shell">
      {overlay}
      <main className="main-scroll">
        {tab === 'stats'  && <Stats onOpenSettings={openSettings} onDying={() => setIsDying(true)} />}
        {tab === 'traits' && <Traits />}
        {tab === 'spells' && <Spells />}
        {tab === 'notes'  && <Notes />}
      </main>
      <BottomNav active={tab} onChange={handleTabChange} />
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <CharacterProvider>
        <Shell />
      </CharacterProvider>
    </ThemeProvider>
  )
}
