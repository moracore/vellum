import { useState, useEffect, useCallback } from 'react'
import { getAllCharacterRecords, saveCharacterRecord, deleteCharacterRecord } from '../db'
import type { CharacterRecord } from '../db'
import { syncAllCharacters, pushCharacter } from '../lib/sync'
import type { PushSuccess } from '../lib/sync'

interface Props {
  onClose: () => void
}

function charNameFrom(md: string): string {
  return md.split('\n').find(l => l.startsWith('# '))?.slice(2).trim() ?? 'Unknown'
}

function RecordEditor({
  record,
  onBack,
  onDeleted,
}: {
  record: CharacterRecord
  onBack: (updated: CharacterRecord) => void
  onDeleted: () => void
}) {
  const [editMd, setEditMd]   = useState(record.markdown)
  const [current, setCurrent] = useState(record)
  const [status, setStatus]   = useState('')
  const [busy, setBusy]       = useState(false)

  const flash = (msg: string) => { setStatus(msg); setTimeout(() => setStatus(''), 3000) }

  const handleSaveLocal = async () => {
    setBusy(true)
    try {
      const now     = new Date().toISOString()
      const updated = { ...current, markdown: editMd, updatedAt: now, synced: false }
      await saveCharacterRecord(updated)
      setCurrent(updated)
      flash('Saved locally')
    } finally {
      setBusy(false)
    }
  }

  const handlePush = async () => {
    setBusy(true)
    setStatus('Pushing…')
    try {
      const now    = new Date().toISOString()
      const result = await pushCharacter(current.id, editMd, now, true)
      const ts     = (result as PushSuccess).updated_at ?? now
      const updated = { ...current, markdown: editMd, updatedAt: ts, synced: true }
      await saveCharacterRecord(updated)
      setCurrent(updated)
      flash('Pushed to server ✓')
    } catch {
      flash('Push failed')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete record "${current.id}"? This cannot be undone.`)) return
    await deleteCharacterRecord(current.id)
    onDeleted()
  }

  return (
    <div className="db-admin">
      <div className="db-admin-header">
        <button className="db-admin-back" onClick={() => onBack(current)}>← Records</button>
        <span className="db-admin-title db-admin-title--id">{current.id}</span>
        <div className="db-admin-actions">
          {status && <span className="db-admin-status">{status}</span>}
          <button className="btn btn-primary btn-sm"   onClick={handleSaveLocal} disabled={busy}>Save</button>
          <button className="btn btn-secondary btn-sm" onClick={handlePush}      disabled={busy}>Push</button>
          <button className="btn btn-danger btn-sm"    onClick={handleDelete}    disabled={busy}>Delete</button>
        </div>
      </div>
      <div className="db-admin-meta-bar">
        <span className={`db-admin-sync ${current.synced ? 'db-admin-sync--ok' : 'db-admin-sync--dirty'}`}>
          {current.synced ? '● synced' : '○ unsynced'}
        </span>
        <span className="db-admin-ts">{new Date(current.updatedAt).toLocaleString()}</span>
        {current.conflictServerMarkdown && (
          <span className="db-admin-conflict-badge">⚠ conflict</span>
        )}
      </div>
      <textarea
        className="dm-textarea"
        value={editMd}
        onChange={e => setEditMd(e.target.value)}
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
      />
    </div>
  )
}

export default function DBAdmin({ onClose }: Props) {
  const [records, setRecords]   = useState<CharacterRecord[]>([])
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState<CharacterRecord | null>(null)
  const [pulling, setPulling]   = useState(false)
  const [status, setStatus]     = useState('')

  const flash = (msg: string) => { setStatus(msg); setTimeout(() => setStatus(''), 3000) }

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setRecords(await getAllCharacterRecords())
    setLoading(false)
  }, [])

  useEffect(() => { void loadRecords() }, [loadRecords])

  const handlePullAll = async () => {
    setPulling(true)
    try {
      await syncAllCharacters()
      await loadRecords()
      flash('Pulled from server ✓')
    } catch {
      flash('Pull failed')
    } finally {
      setPulling(false)
    }
  }

  const handleEditorBack = (updated: CharacterRecord) => {
    setRecords(prev => prev.map(r => r.id === updated.id ? updated : r))
    setEditing(null)
  }

  if (editing) {
    return (
      <RecordEditor
        record={editing}
        onBack={handleEditorBack}
        onDeleted={() => { setEditing(null); void loadRecords() }}
      />
    )
  }

  return (
    <div className="db-admin">
      <div className="db-admin-header">
        <button className="db-admin-back" onClick={onClose}>← Back</button>
        <span className="db-admin-title">Database Admin</span>
        <div className="db-admin-actions">
          {status && <span className="db-admin-status">{status}</span>}
          <button className="btn btn-secondary btn-sm" onClick={handlePullAll} disabled={pulling}>
            {pulling ? 'Pulling…' : 'Pull Remote'}
          </button>
        </div>
      </div>

      <div className="db-admin-list">
        {loading && <p className="db-admin-empty">Loading…</p>}
        {!loading && records.length === 0 && (
          <p className="db-admin-empty">No records in local database.</p>
        )}
        {records.map(r => (
          <div key={r.id} className="db-admin-row" onClick={() => setEditing(r)}>
            <div className="db-admin-row-info">
              <span className="db-admin-row-name">{charNameFrom(r.markdown)}</span>
              <span className="db-admin-row-meta">
                {r.id} · {new Date(r.updatedAt).toLocaleString()}
                {r.conflictServerMarkdown && ' · ⚠ conflict'}
              </span>
            </div>
            <div className="db-admin-row-right">
              <span className={`db-admin-sync ${r.synced ? 'db-admin-sync--ok' : 'db-admin-sync--dirty'}`}>
                {r.synced ? 'synced' : 'unsynced'}
              </span>
              <span className="db-admin-chevron">›</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
