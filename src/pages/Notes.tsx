import { useCharacter } from '../context/CharacterContext'
import CharacterHeader from '../components/CharacterHeader'

export default function Notes({ hideHeader }: { hideHeader?: boolean } = {}) {
  const { state, updateNotes } = useCharacter()

  if (!state) return null

  return (
    <div className="notes-page">
      {!hideHeader && <CharacterHeader />}
      <textarea
        className="notes-textarea"
        value={state.notes}
        onChange={e => updateNotes(e.target.value)}
        placeholder="Notes from your adventure..."
      />
    </div>
  )
}
