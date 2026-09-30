import { VideoItem, OverlayConfig, OverlayPosition, OVERLAY_POSITIONS, OVERLAY_SCALES, OverlayAudioSource, OVERLAY_AUDIO_SOURCES, OverlayDurationSource, OVERLAY_DURATION_SOURCES } from '../types'

interface OverlayModeProps {
  videos: VideoItem[]
  config: OverlayConfig
  onConfigChange: (config: OverlayConfig) => void
  onStartOverlay: () => void
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function OverlayMode({ videos, config, onConfigChange, onStartOverlay }: OverlayModeProps) {
  const mainVideo = videos.find(v => v.id === config.mainVideoId)
  const overlayVideo = videos.find(v => v.id === config.overlayVideoId)
  const canStart = mainVideo && overlayVideo && mainVideo.id !== overlayVideo.id

  return (
    <div className="overlay-mode">
      <div className="overlay-header">
        <h2>Picture-in-Picture</h2>
        <p className="overlay-description">
          Select a main video and an overlay video to create a picture-in-picture effect.
        </p>
      </div>

      <div className="overlay-selections">
        <div className="overlay-selection">
          <label className="overlay-label">Main Video (Background)</label>
          <select
            className="overlay-select"
            value={config.mainVideoId || ''}
            onChange={(e) => onConfigChange({ ...config, mainVideoId: e.target.value || null })}
          >
            <option value="">Select main video...</option>
            {videos.map((v, i) => {
              const isImg = v.type.startsWith('image/')
              const tag = isImg ? '[Image]' : '[Video]'
              return (
                <option key={v.id} value={v.id}>
                  {i + 1}. {v.name} {tag} {v.duration ? `(${formatDuration(v.duration)})` : ''}
                </option>
              )
            })}
          </select>
        </div>

        <div className="overlay-selection">
          <label className="overlay-label">Overlay (Picture-in-Picture)</label>
          <select
            className="overlay-select"
            value={config.overlayVideoId || ''}
            onChange={(e) => onConfigChange({ ...config, overlayVideoId: e.target.value || null })}
          >
            <option value="">Select overlay...</option>
            {videos.map((v, i) => {
              const isImg = v.type.startsWith('image/')
              const tag = isImg ? '[Image]' : '[Video]'
              return (
                <option key={v.id} value={v.id}>
                  {i + 1}. {v.name} {tag} {v.duration ? `(${formatDuration(v.duration)})` : ''}
                </option>
              )
            })}
          </select>
        </div>
      </div>

      {mainVideo && overlayVideo && mainVideo.id !== overlayVideo.id && (
        <div className="overlay-settings">
          <div className="overlay-setting">
            <label className="overlay-label">Position</label>
            <select
              className="overlay-select"
              value={config.position}
              onChange={(e) => onConfigChange({ ...config, position: e.target.value as OverlayPosition })}
            >
              {OVERLAY_POSITIONS.map(pos => (
                <option key={pos.value} value={pos.value}>{pos.label}</option>
              ))}
            </select>
          </div>

          <div className="overlay-setting">
            <label className="overlay-label">Overlay Size</label>
            <select
              className="overlay-select"
              value={config.scale}
              onChange={(e) => onConfigChange({ ...config, scale: Number(e.target.value) })}
            >
              {OVERLAY_SCALES.map(s => (
                <option key={s} value={s}>{Math.round(s * 100)}%</option>
              ))}
            </select>
          </div>

          {overlayVideo.type.startsWith('video/') && (
            <div className="overlay-setting">
              <label className="overlay-label">Audio Source</label>
              <select
                className="overlay-select"
                value={config.audioSource}
                onChange={(e) => onConfigChange({ ...config, audioSource: e.target.value as OverlayAudioSource })}
              >
                {OVERLAY_AUDIO_SOURCES.map(src => (
                  <option key={src.value} value={src.value}>{src.label}</option>
                ))}
              </select>
            </div>
          )}

          {overlayVideo.type.startsWith('video/') && (
            <div className="overlay-setting">
              <label className="overlay-label">Video Length</label>
              <select
                className="overlay-select"
                value={config.durationSource}
                onChange={(e) => onConfigChange({ ...config, durationSource: e.target.value as OverlayDurationSource })}
              >
                {OVERLAY_DURATION_SOURCES.map(src => (
                  <option key={src.value} value={src.value}>{src.label}</option>
                ))}
              </select>
            </div>
          )}

          {overlayVideo.type.startsWith('image/') && (
            <p className="overlay-hint">Image will be displayed for the main video's duration</p>
          )}

          <div className="overlay-setting">
            <label className="overlay-label">Flip Main Video</label>
            <label className="overlay-toggle">
              <input
                type="checkbox"
                checked={config.flipMain}
                onChange={(e) => onConfigChange({ ...config, flipMain: e.target.checked })}
              />
              <span className="overlay-toggle-slider"></span>
            </label>
          </div>

          <div className="overlay-setting">
            <label className="overlay-label">Flip Overlay</label>
            <label className="overlay-toggle">
              <input
                type="checkbox"
                checked={config.flipOverlay}
                onChange={(e) => onConfigChange({ ...config, flipOverlay: e.target.checked })}
              />
              <span className="overlay-toggle-slider"></span>
            </label>
          </div>

          <div className="overlay-preview-box">
            <div className="overlay-preview-main">
              <div className="overlay-preview-label">Main</div>
            </div>
            <div className={`overlay-preview-pip overlay-preview-pip-${config.position}`} style={{ width: `${config.scale * 100}%`, aspectRatio: '16/9' }}>
              <div className="overlay-preview-label">Overlay</div>
            </div>
          </div>
        </div>
      )}

      <div className="overlay-actions">
        <button
          className="btn btn-primary btn-large"
          onClick={onStartOverlay}
          disabled={!canStart}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Create Picture-in-Picture
        </button>
        {!canStart && (
          <p className="overlay-hint">Select two different videos to start</p>
        )}
      </div>
    </div>
  )
}

export default OverlayMode
