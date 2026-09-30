import { useCallback, useRef, useState, useEffect } from 'react'

interface ResultPanelProps {
  filename: string
  blob: Blob
  processingDuration?: number
  musicProcessing?: boolean
  musicProgress?: number
  musicMessage?: string
  musicLogs?: string[]
  onNewProject: () => void
  onEditList: () => void
  onAddMusic: (file: File, mode: 'mix' | 'replace') => void
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function ResultPanel({ filename, blob, processingDuration, musicProcessing, musicProgress, musicMessage, musicLogs, onNewProject, onEditList, onAddMusic }: ResultPanelProps) {
  const musicInputRef = useRef<HTMLInputElement>(null)
  const musicLogRef = useRef<HTMLPreElement>(null)
  const [selectedMusicFile, setSelectedMusicFile] = useState<File | null>(null)
  const [musicMode, setMusicMode] = useState<'mix' | 'replace'>('mix')

  useEffect(() => {
    if (musicLogRef.current) {
      musicLogRef.current.scrollTop = musicLogRef.current.scrollHeight
    }
  }, [musicLogs?.length])

  const handleMusicClick = useCallback(() => {
    musicInputRef.current?.click()
  }, [])

  const handleMusicChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedMusicFile(file)
    }
    e.target.value = ''
  }, [])

  const handleApplyMusic = useCallback(() => {
    if (selectedMusicFile) {
      onAddMusic(selectedMusicFile, musicMode)
    }
  }, [selectedMusicFile, musicMode, onAddMusic])

  const handleCancelMusic = useCallback(() => {
    setSelectedMusicFile(null)
    setMusicMode('mix')
  }, [])
  const handleDownload = useCallback(() => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [blob, filename])

  const handlePreview = useCallback(() => {
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }, [blob])

  const fileSize = formatFileSize(blob.size)

  return (
    <div className="result-panel">
      <div className="result-success-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <h3>Stitching complete!</h3>
      <div className="result-info">
        <p className="result-filename">{filename}</p>
        <p className="result-size">{fileSize}</p>
        {processingDuration != null && (
          <p className="result-duration">Processed in {formatDuration(processingDuration)}</p>
        )}
      </div>
      <div className="result-actions">
        <button className="btn btn-primary btn-large" onClick={handleDownload}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download Video
        </button>
        <button className="btn btn-secondary" onClick={handlePreview}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Preview Video
        </button>
        <button className="btn btn-secondary" onClick={onEditList}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit List
        </button>
        <button className="btn btn-secondary" onClick={onNewProject}>
          Start New Project
        </button>
      </div>
      {!musicProcessing && !selectedMusicFile && (
        <div className="result-music">
          <button className="btn btn-secondary" onClick={handleMusicClick}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            Add Background Music
          </button>
          <input
            ref={musicInputRef}
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={handleMusicChange}
          />
        </div>
      )}
      {!musicProcessing && selectedMusicFile && (
        <div className="result-music-config">
          <p className="music-config-filename">{selectedMusicFile.name}</p>
          <div className="music-config-options">
            <label className="music-config-option">
              <input
                type="radio"
                name="musicMode"
                checked={musicMode === 'mix'}
                onChange={() => setMusicMode('mix')}
              />
              Mix with original audio
            </label>
            <label className="music-config-option">
              <input
                type="radio"
                name="musicMode"
                checked={musicMode === 'replace'}
                onChange={() => setMusicMode('replace')}
              />
              Replace original audio
            </label>
          </div>
          <div className="music-config-actions">
            <button className="btn btn-primary" onClick={handleApplyMusic}>
              Apply Music
            </button>
            <button className="btn btn-secondary" onClick={handleCancelMusic}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {musicProcessing && (
        <div className="result-music-processing">
          <div className="music-progress-bar">
            <div className="music-progress-fill" style={{ width: `${musicProgress || 0}%` }} />
          </div>
          <p className="music-status-message">{musicMessage || 'Processing music...'}</p>
          {musicLogs && musicLogs.length > 0 && (
            <div className="ffmpeg-log">
              <pre ref={musicLogRef}>{musicLogs.join('\n')}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

export default ResultPanel
