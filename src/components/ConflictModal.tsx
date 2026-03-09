import { useState } from 'react'
import type { ConflictState } from '../context/CharacterContext'

interface Props {
  conflict: ConflictState
  localMarkdown: string
  onResolve: (choice: 'local' | 'server') => Promise<void>
}

function firstName(markdown: string): string {
  return markdown.split('\n').find(l => l.startsWith('# '))?.slice(2).trim() ?? 'Unknown'
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ConflictModal({ conflict, localMarkdown, onResolve }: Props) {
  const [busy, setBusy] = useState(false)

  const handle = async (choice: 'local' | 'server') => {
    setBusy(true)
    await onResolve(choice)
    setBusy(false)
  }

  const charName = firstName(localMarkdown)

  return (
    <div className="conflict-overlay">
      <div className="conflict-card">
        <h2 className="conflict-title">Sync Conflict</h2>
        <p className="conflict-desc">
          <strong>{charName}</strong> was edited on another device while you had unsynced local changes.
          Choose which version to keep:
        </p>

        <div className="conflict-options">
          <div className="conflict-option">
            <div className="conflict-option-label">Your version</div>
            <div className="conflict-option-time">{fmt(conflict.localUpdatedAt)}</div>
            <button
              className="btn-primary"
              onClick={() => handle('local')}
              disabled={busy}
            >
              Keep Mine
            </button>
          </div>

          <div className="conflict-divider">or</div>

          <div className="conflict-option">
            <div className="conflict-option-label">Server version</div>
            <div className="conflict-option-time">{fmt(conflict.serverUpdatedAt)}</div>
            <button
              className="btn-secondary"
              onClick={() => handle('server')}
              disabled={busy}
            >
              Use Server
            </button>
          </div>
        </div>

        {busy && <p className="conflict-busy">Resolving…</p>}
      </div>
    </div>
  )
}
