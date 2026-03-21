import { useState, useEffect, useRef } from 'react'
import { HardDrive, Cloud, Check, CloudOff } from 'lucide-react'
import { useCharacter } from '../context/CharacterContext'
import CharacterHeader from '../components/CharacterHeader'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function Notes({ hideHeader }: { hideHeader?: boolean } = {}) {
  const { character, updateDescription, saveNotesLocal, saveNotesCloud } = useCharacter()
  const [draft, setDraft] = useState(character?.notes ?? '')
  const [localStatus, setLocalStatus] = useState<SaveStatus>('idle')
  const [cloudStatus, setCloudStatus] = useState<SaveStatus>('idle')
  const draftRef = useRef(draft)

  useEffect(() => { draftRef.current = draft }, [draft])

  useEffect(() => {
    return () => { void saveNotesLocal(draftRef.current) }
  }, [saveNotesLocal])

  useEffect(() => {
    if (character?.notes !== undefined) setDraft(character.notes)
  }, [character?.notes]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!character) return null

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
      {!hideHeader && (
        <div className="notes-sticky">
          <CharacterHeader />
        </div>
      )}
      <textarea
        className="notes-desc-textarea"
        value={character.description}
        onChange={e => updateDescription(e.target.value)}
        placeholder="Character description..."
      />
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
