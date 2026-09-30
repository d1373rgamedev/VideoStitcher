import { useEffect, useRef, useCallback, useMemo } from 'react'
import { VideoItem, TextOverlay, TextPosition } from '../types'

interface VideoPreviewModalProps {
  video: VideoItem
  onClose: () => void
}

function getTextOverlayStyle(overlay: TextOverlay): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    fontSize: `${overlay.fontSize}px`,
    color: overlay.color,
    fontFamily: 'Roboto, sans-serif',
    fontWeight: 'bold',
    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
    pointerEvents: 'none',
    maxWidth: '90%',
    textAlign: 'center',
    padding: '4px 8px',
    whiteSpace: 'pre',
  }

  const margin = '12px'

  switch (overlay.position) {
    case 'top-left':
      return { ...base, top: margin, left: margin }
    case 'top-center':
      return { ...base, top: margin, left: '50%', transform: 'translateX(-50%)' }
    case 'top-right':
      return { ...base, top: margin, right: margin }
    case 'center-left':
      return { ...base, top: '50%', left: margin, transform: 'translateY(-50%)' }
    case 'center':
      return { ...base, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    case 'center-right':
      return { ...base, top: '50%', right: margin, transform: 'translateY(-50%)' }
    case 'bottom-left':
      return { ...base, bottom: margin, left: margin }
    case 'bottom-center':
      return { ...base, bottom: margin, left: '50%', transform: 'translateX(-50%)' }
    case 'bottom-right':
      return { ...base, bottom: margin, right: margin }
  }
}

function VideoPreviewModal({ video, onClose }: VideoPreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    if (video.file) {
      urlRef.current = URL.createObjectURL(video.file)
      if (videoRef.current) {
        videoRef.current.src = urlRef.current
      }
    }

    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      }
    }
  }, [video.file])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }, [onClose])

  const overlayStyle = useMemo(() => {
    return video.textOverlay?.text ? getTextOverlayStyle(video.textOverlay) : null
  }, [video.textOverlay])

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">{video.name}</h3>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close preview"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="video-preview-container">
            <video
              ref={videoRef}
              controls
              autoPlay
              className="video-player"
            />
            {overlayStyle && video.textOverlay && (
              <div style={overlayStyle}>
                {video.textOverlay.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoPreviewModal
