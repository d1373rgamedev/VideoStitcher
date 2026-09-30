import { useState, useCallback } from 'react'
import { VideoItem, TextOverlay, TextPosition, TEXT_POSITIONS, FONT_SIZES } from '../types'

interface VideoListItemProps {
  video: VideoItem
  index: number
  isFirst: boolean
  isLast: boolean
  isDragged: boolean
  isDragOver: boolean
  isExternalDragOver: boolean
  onRemove: () => void
  onDuplicate: () => void
  onPreview: () => void
  onMove: (direction: 'up' | 'down') => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
  onTextOverlayChange: (overlay: TextOverlay | null) => void
  children?: React.ReactNode
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

function VideoListItem({
  video,
  index,
  isFirst,
  isLast,
  isDragged,
  isDragOver,
  isExternalDragOver,
  onRemove,
  onDuplicate,
  onPreview,
  onMove,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onTextOverlayChange,
  children
}: VideoListItemProps) {
  const [showTextEditor, setShowTextEditor] = useState(false)
  const overlay = video.textOverlay

  const handleTextChange = useCallback((text: string) => {
    onTextOverlayChange({
      text,
      fontSize: overlay?.fontSize || 32,
      position: overlay?.position || 'bottom-center',
      color: overlay?.color || '#ffffff'
    })
  }, [overlay, onTextOverlayChange])

  const handleSizeChange = useCallback((fontSize: number) => {
    onTextOverlayChange({
      text: overlay?.text || '',
      fontSize,
      position: overlay?.position || 'bottom-center',
      color: overlay?.color || '#ffffff'
    })
  }, [overlay, onTextOverlayChange])

  const handlePositionChange = useCallback((position: TextPosition) => {
    onTextOverlayChange({
      text: overlay?.text || '',
      fontSize: overlay?.fontSize || 32,
      position,
      color: overlay?.color || '#ffffff'
    })
  }, [overlay, onTextOverlayChange])

  const handleColorChange = useCallback((color: string) => {
    onTextOverlayChange({
      text: overlay?.text || '',
      fontSize: overlay?.fontSize || 32,
      position: overlay?.position || 'bottom-center',
      color
    })
  }, [overlay, onTextOverlayChange])

  const handleClearText = useCallback(() => {
    onTextOverlayChange(null)
    setShowTextEditor(false)
  }, [onTextOverlayChange])

  const classNames = [
    'video-list-item',
    isDragged ? 'video-list-item-dragged' : '',
    isDragOver ? 'video-list-item-drag-over' : '',
    isExternalDragOver ? 'video-list-item-external-drag' : ''
  ].filter(Boolean).join(' ')

  return (
    <div className="video-list-item-wrapper">
      <div
        className={classNames}
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
      >
        <div className="video-list-item-handle" title="Drag to reorder">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </div>

        <div className="video-list-item-number">{index + 1}</div>

        <div className="video-list-item-thumbnail">
          {video.thumbnail ? (
            <img src={video.thumbnail} alt={`${video.name} thumbnail`} />
          ) : (
            <div className="thumbnail-placeholder">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
          )}
        </div>

        <div className="video-list-item-info">
          <div className="video-list-item-name" title={video.name}>
            {video.name}
          </div>
          <div className="video-list-item-meta">
            {video.duration && (
              <span className="video-duration">{formatDuration(video.duration)}</span>
            )}
            <span className="video-size">{formatFileSize(video.size)}</span>
            <span className="video-format">{video.type.split('/')[1]?.toUpperCase() || 'VIDEO'}</span>
            {overlay?.text && (
              <span className="video-text-badge">T: {overlay.text.substring(0, 15)}{overlay.text.length > 15 ? '...' : ''}</span>
            )}
          </div>
        </div>

        <div className="video-list-item-actions">
          <button
            className={`btn-icon ${showTextEditor ? 'btn-icon-active' : ''}`}
            onClick={() => setShowTextEditor(!showTextEditor)}
            title="Add text overlay"
            aria-label="Add text overlay"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="9" y1="20" x2="15" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
          </button>
          <button
            className="btn-icon"
            onClick={onPreview}
            title="Preview"
            aria-label="Preview video"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </button>
          <button
            className="btn-icon"
            onClick={() => onMove('up')}
            disabled={isFirst}
            title="Move up"
            aria-label="Move up"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
          <button
            className="btn-icon"
            onClick={() => onMove('down')}
            disabled={isLast}
            title="Move down"
            aria-label="Move down"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <button
            className="btn-icon"
            onClick={onDuplicate}
            title="Duplicate"
            aria-label="Duplicate video"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          <button
            className="btn-icon btn-icon-danger"
            onClick={onRemove}
            title="Remove"
            aria-label="Remove video"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {showTextEditor && (
        <div className="text-editor-panel">
          <div className="text-editor-row">
            <label className="text-editor-label">Text</label>
            <textarea
              className="text-editor-textarea"
              value={overlay?.text || ''}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Enter text overlay..."
              maxLength={200}
              rows={2}
            />
          </div>
          <div className="text-editor-row">
            <label className="text-editor-label">Size</label>
            <select
              className="text-editor-select"
              value={overlay?.fontSize || 32}
              onChange={(e) => handleSizeChange(Number(e.target.value))}
            >
              {FONT_SIZES.map(size => (
                <option key={size} value={size}>{size}px</option>
              ))}
            </select>
          </div>
          <div className="text-editor-row">
            <label className="text-editor-label">Position</label>
            <select
              className="text-editor-select"
              value={overlay?.position || 'bottom-center'}
              onChange={(e) => handlePositionChange(e.target.value as TextPosition)}
            >
              {TEXT_POSITIONS.map(pos => (
                <option key={pos.value} value={pos.value}>{pos.label}</option>
              ))}
            </select>
          </div>
          <div className="text-editor-row">
            <label className="text-editor-label">Color</label>
            <input
              type="color"
              className="text-editor-color"
              value={overlay?.color || '#ffffff'}
              onChange={(e) => handleColorChange(e.target.value)}
            />
          </div>
          {overlay?.text && (
            <div className="text-editor-actions">
              <button className="btn btn-secondary btn-small" onClick={handleClearText}>
                Clear Text
              </button>
            </div>
          )}
        </div>
      )}

      {children}
    </div>
  )
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export default VideoListItem
