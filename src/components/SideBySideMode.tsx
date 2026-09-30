import { VideoItem, SideBySideConfig } from '../types'

interface SideBySideModeProps {
  videos: VideoItem[]
  config: SideBySideConfig
  onConfigChange: (config: SideBySideConfig) => void
  onStartSideBySide: () => void
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function SideBySideMode({ videos, config, onConfigChange, onStartSideBySide }: SideBySideModeProps) {
  const leftVideo = videos.find(v => v.id === config.leftVideoId)
  const rightVideo = videos.find(v => v.id === config.rightVideoId)
  const canStart = leftVideo && rightVideo && leftVideo.id !== rightVideo.id

  return (
    <div className="overlay-mode">
      <div className="overlay-header">
        <h2>Side-by-Side</h2>
        <p className="overlay-description">
          Select two videos to place them next to each other. Both are scaled to the same height.
          The result length is the shorter of the two. Audio comes from the left video.
        </p>
      </div>

      <div className="overlay-selections">
        <div className="overlay-selection">
          <label className="overlay-label">Left Video</label>
          <select
            className="overlay-select"
            value={config.leftVideoId || ''}
            onChange={(e) => onConfigChange({ ...config, leftVideoId: e.target.value || null })}
          >
            <option value="">Select left video...</option>
            {videos.map((v, i) => (
              <option key={v.id} value={v.id}>
                {i + 1}. {v.name} {v.duration ? `(${formatDuration(v.duration)})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="overlay-selection">
          <label className="overlay-label">Right Video</label>
          <select
            className="overlay-select"
            value={config.rightVideoId || ''}
            onChange={(e) => onConfigChange({ ...config, rightVideoId: e.target.value || null })}
          >
            <option value="">Select right video...</option>
            {videos.map((v, i) => (
              <option key={v.id} value={v.id}>
                {i + 1}. {v.name} {v.duration ? `(${formatDuration(v.duration)})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {leftVideo && rightVideo && leftVideo.id !== rightVideo.id && (
        <div className="overlay-settings">
          <div className="side-by-side-preview-box">
            <div className="side-by-side-preview-left">
              <div className="overlay-preview-label">Left</div>
            </div>
            <div className="side-by-side-preview-right">
              <div className="overlay-preview-label">Right</div>
            </div>
          </div>
        </div>
      )}

      <div className="overlay-actions">
        <button
          className="btn btn-primary btn-large"
          onClick={onStartSideBySide}
          disabled={!canStart}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="3" width="10" height="18" rx="1" />
            <rect x="13" y="3" width="10" height="18" rx="1" />
          </svg>
          Create Side-by-Side
        </button>
        {!canStart && (
          <p className="overlay-hint">Select two different videos to start</p>
        )}
      </div>
    </div>
  )
}

export default SideBySideMode
