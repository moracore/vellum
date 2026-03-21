import './ResourceTracker.css'

interface Props {
  current: number
  max: number
  onUse: () => void
  onGain: () => void
}

export default function ResourceTracker({ current, max, onUse, onGain }: Props) {
  const isUnlimited = max === 999
  const displayMax = isUnlimited ? '∞' : max
  const displayCurrent = isUnlimited ? '∞' : current

  // Show dots only when max <= 10 (otherwise just show number)
  const showDots = !isUnlimited && max <= 10

  return (
    <div className="resource-tracker">
      {showDots && (
        <div className="resource-dots">
          {Array.from({ length: max }, (_, i) => (
            <span
              key={i}
              className={`resource-dot ${i < current ? 'filled' : 'empty'}`}
            />
          ))}
        </div>
      )}
      <span className="resource-count">{displayCurrent} / {displayMax}</span>
      <div className="resource-buttons">
        <button
          className="resource-btn resource-btn-use"
          onClick={onUse}
          disabled={!isUnlimited && current <= 0}
          aria-label="Use resource"
        >
          −
        </button>
        <button
          className="resource-btn resource-btn-gain"
          onClick={onGain}
          disabled={!isUnlimited && current >= max}
          aria-label="Gain resource"
        >
          +
        </button>
      </div>
    </div>
  )
}
