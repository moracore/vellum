import { useState, useEffect } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { CharacterProvider, useCharacter } from './context/CharacterContext'
import { getSettings, saveSettings, getLastPullAt, getDbSnapshot, saveDbSnapshot } from './db'
import { syncAllCharacters, STALE_MS, fetchDb, DB_CACHE_TTL } from './lib/sync'
import { db } from './lib/database'
import CharacterSelect from './pages/CharacterSelect'
import Stats from './pages/Stats'
import Inventory from './pages/Inventory'
import Traits from './pages/Traits'
import Spells from './pages/Spells'
import Notes from './pages/Notes'
import Settings from './pages/Settings'
import DMEdit from './pages/DMEdit'
import Dying from './pages/Dying'
import BottomNav from './components/BottomNav'

type Tab = 'stats' | 'inventory' | 'traits' | 'spells' | 'notes'

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

import LevelUpModal from './components/LevelUpModal'

function Shell() {
  const { character, dmMode, setDmMode, levelUpMsg, clearLevelUp } = useCharacter()
  const [tab, setTab]               = useState<Tab>('stats')
  const [showSettings, setShowSettings] = useState(false)
  const [isDying, setIsDying]       = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [dbError, setDbError]       = useState(false)
  const bp = useBreakpoint()

  useEffect(() => {
    void (async () => {
      try {
        const cached = await getDbSnapshot()
        const cacheAge = cached ? Date.now() - new Date(cached.fetchedAt).getTime() : Infinity
        const cacheStale = cacheAge > DB_CACHE_TTL

        if (cached && !cacheStale) {
          db.loadFromSnapshot(cached.data)
        } else {
          try {
            const data = await fetchDb()
            await saveDbSnapshot({ fetchedAt: new Date().toISOString(), data })
            db.loadFromSnapshot(data)
          } catch {
            if (cached) {
              db.loadFromSnapshot(cached.data)
            } else {
              setDbError(true)
              setInitializing(false)
              return
            }
          }
        }

        const lastPull = await getLastPullAt()
        const stale    = !lastPull || Date.now() - new Date(lastPull).getTime() > STALE_MS

        if (stale) await syncAllCharacters()
      } catch {
        // Offline — continue with IDB
      } finally {
        setInitializing(false)
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (character?.player) {
      getSettings().then(s => saveSettings({ ...s, playerName: character.player }))
    }
  }, [character?.player])

  if (initializing) {
    return (
      <div className="loading-screen">
        <span className="loading-text">{db.loaded ? 'Loading character…' : 'Loading game data…'}</span>
      </div>
    )
  }

  if (dbError) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Connect to the internet to load game data</span>
      </div>
    )
  }

  if (!character) return <CharacterSelect onLoaded={() => {}} />

  const handleTabChange = (t: Tab) => {
    setDmMode(false)
    setShowSettings(false)
    setTab(t)
  }

  const isCharGroup = tab === 'stats' || tab === 'inventory' || tab === 'traits'

  if (dmMode)       return <DMEdit onClose={() => setDmMode(false)} />
  if (showSettings) return (
    <div className="app-shell">
      <main className="main-scroll"><Settings onClose={() => setShowSettings(false)} /></main>
      <BottomNav active={tab} onChange={handleTabChange} />
    </div>
  )

  const openSettings = () => setShowSettings(true)
  const overlay = (levelUpMsg && character) ? (
    <LevelUpModal
      newLevel={character.level}
      className={character.class}
      onDismiss={clearLevelUp}
    />
  ) : null

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
        <BottomNav activeTabs={isCharGroup ? ['stats', 'inventory', 'traits'] : ['spells', 'notes']} onChange={handleTabChange} />
      </div>
    )
  }

  // Mobile
  return (
    <div className="app-shell">
      {overlay}
      <main className="main-scroll">
        {tab === 'stats'     && <Stats onOpenSettings={openSettings} onDying={() => setIsDying(true)} />}
        {tab === 'inventory' && <Inventory />}
        {tab === 'traits'    && <Traits />}
        {tab === 'spells'    && <Spells />}
        {tab === 'notes'     && <Notes />}
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
