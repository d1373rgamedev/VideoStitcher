import { useState } from 'react'
import { Transition, DEFAULT_TRANSITION } from '../types'
import TransitionSelector from './TransitionSelector'

interface TransitionConnectorProps {
  transition: Transition | undefined
  onChange: (transition: Transition) => void
}

function TransitionConnector({ transition, onChange }: TransitionConnectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const currentTransition = transition || DEFAULT_TRANSITION
  const isCut = currentTransition.type === 'cut'

  const getTransitionLabel = () => {
    const type = currentTransition.type
    if (type === 'cut') return 'cut'
    const duration = currentTransition.duration.toFixed(1)
    return `${type} (${duration}s)`
  }

  return (
    <div className="transition-connector">
      <button
        className={`transition-connector-btn ${isCut ? 'transition-connector-btn-cut' : 'transition-connector-btn-active'}`}
        onClick={() => setIsOpen(true)}
        title="Click to change transition"
      >
        <span className="transition-connector-line" />
        <span className="transition-connector-label">{getTransitionLabel()}</span>
        <span className="transition-connector-line" />
      </button>

      {isOpen && (
        <TransitionSelector
          transition={currentTransition}
          onChange={onChange}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

export default TransitionConnector
