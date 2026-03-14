import { useState, useEffect, useRef } from 'react'
import { HardDrive, Cloud, Check, CloudOff } from 'lucide-react'
import { useCharacter } from '../context/CharacterContext'
import CharacterHeader from '../components/CharacterHeader'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function Notes({ hideHeader }: { hideHeader?: boolean } = {}) {
  const { state, saveNotesLocal, saveNotesCloud } = useCharacter()
  const [draft, setDraft] = useState(state?.notes ?? '')
  const [localStatus, setLocalStatus] = useState<SaveStatus>('idle')
  const [cloudStatus, setCloudStatus] = useState<SaveStatus>('idle')
  const draftRef = useRef(draft)

  useEffect(() => { draftRef.current = draft }, [draft])

  // Auto-save draft to IDB when switching away from this tab
  useEffect(() => {
    return () => { void saveNotesLocal(draftRef.current) }
  }, [saveNotesLocal])

  // Sync draft if notes change externally (e.g. conflict resolution)
  useEffect(() => {
    if (state?.notes !== undefined) setDraft(state.notes)
  }, [state?.notes]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!state) return null

  const handleLocalSave = async () => {
    setLocalStatus('saving')
    await saveNotesLocal(draft)
    setLocalStatus('saved')
    setTimeout(() => setLocalStatus('idle'), 2000)
  }

  const handleCloudSave = async () => {
    setCloudStatus('saving')
    const ok = await saveNotesCloud(draft)
    setCloudStatus(ok ? 'saved' : 'error')
    setTimeout(() => setCloudStatus('idle'), 2000)
  }

  return (
    <div className="notes-page">
      {!hideHeader && <CharacterHeader />}
      <textarea
        className="notes-textarea"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder="Notes from your adventure..."
      />
      <div className="notes-save-row">
        <button
          className={`notes-save-btn${localStatus === 'saved' ? ' saved' : ''}`}
          disabled={localStatus === 'saving'}
          onClick={handleLocalSave}
        >
          {localStatus === 'saved' ? <Check size={15} /> : <HardDrive size={15} />}
          {localStatus === 'saving' ? 'Saving…' : localStatus === 'saved' ? 'Saved' : 'Local Save'}
        </button>
        <button
          className={`notes-save-btn${cloudStatus === 'saved' ? ' saved' : cloudStatus === 'error' ? ' error' : ''}`}
          disabled={cloudStatus === 'saving'}
          onClick={handleCloudSave}
        >
          {cloudStatus === 'saved'  ? <Check size={15} /> : cloudStatus === 'error' ? <CloudOff size={15} /> : <Cloud size={15} />}
          {cloudStatus === 'saving' ? 'Saving…' : cloudStatus === 'saved' ? 'Saved' : cloudStatus === 'error' ? 'Failed' : 'Cloud Save'}
        </button>
      </div>
    </div>
  )
}
