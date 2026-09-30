import { useState, useEffect, useRef } from 'react'

interface ProcessingStatusProps {
  progress: number
  message: string
  startedAt?: number
  log?: string[]
  onCancel: () => void
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function ProcessingStatus({ progress, message, startedAt, log, onCancel }: ProcessingStatusProps) {
  const progressWidth = Math.min(100, Math.max(0, progress))
  const [elapsed, setElapsed] = useState(0)
  const logRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (!startedAt) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [log?.length])

  return (
    <div className="processing-status">
      <div className="processing-icon">
        <div className="spinner" />
      </div>
      <h3>Stitching videos...</h3>
      <p className="processing-message">{message}</p>
      <div className="progress-container">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progressWidth}%` }}
          />
        </div>
        <span className="progress-text">{Math.round(progressWidth)}%</span>
      </div>
      {startedAt && (
        <p className="processing-elapsed">Elapsed: {formatElapsed(elapsed)}</p>
      )}
      {log && log.length > 0 && (
        <div className="ffmpeg-log">
          <pre ref={logRef}>{log.join('\n')}</pre>
        </div>
      )}
      <p className="processing-notice">
        Processing is happening locally in your browser.
        <br />
        This may take some time depending on video size and your device.
      </p>
      <button className="btn btn-secondary" onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}

export default ProcessingStatus
