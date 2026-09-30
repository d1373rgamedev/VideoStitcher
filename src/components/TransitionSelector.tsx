import { useState, useRef, useEffect, useCallback } from 'react'
import { Transition, TransitionType, TRANSITION_OPTIONS } from '../types'

interface TransitionSelectorProps {
  transition: Transition
  onChange: (transition: Transition) => void
  onClose: () => void
}

function TransitionSelector({ transition, onChange, onClose }: TransitionSelectorProps) {
  const [selectedType, setSelectedType] = useState<TransitionType>(transition.type)
  const [duration, setDuration] = useState(transition.duration)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleApply = useCallback(() => {
    onChange({ type: selectedType, duration })
    onClose()
  }, [selectedType, duration, onChange, onClose])

  return (
    <div className="transition-selector" ref={panelRef}>
      <div className="transition-selector-header">
        <h4>Transition</h4>
        <button className="transition-selector-close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="transition-type-grid">
        {TRANSITION_OPTIONS.map((option) => (
          <button
            key={option.type}
            className={`transition-type-btn ${selectedType === option.type ? 'transition-type-btn-active' : ''}`}
            onClick={() => setSelectedType(option.type)}
            title={option.label}
          >
            <span className="transition-type-icon">{option.icon}</span>
            <span className="transition-type-label">{option.label}</span>
          </button>
        ))}
      </div>

      <div className="transition-duration">
        <label htmlFor="transition-duration">Duration:</label>
        <div className="transition-duration-input">
          <input
            id="transition-duration"
            type="number"
            min="0.1"
            max="5"
            step="0.1"
            value={duration}
            onChange={(e) => setDuration(parseFloat(e.target.value) || 1.0)}
          />
          <span>seconds</span>
        </div>
      </div>

      <button className="btn btn-primary btn-small" onClick={handleApply}>
        Apply
      </button>
    </div>
  )
}

export default TransitionSelector
