import { useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'

interface VideoDropZoneProps {
  onFilesAdded: (files: File[]) => void
  disabled: boolean
}

const ACCEPTED_FORMATS = {
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov'],
  'video/x-matroska': ['.mkv'],
  'video/avi': ['.avi'],
  'video/x-msvideo': ['.avi'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif']
}

function VideoDropZone({ onFilesAdded, disabled }: VideoDropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFilesAdded(acceptedFiles)
    }
  }, [onFilesAdded])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    accept: ACCEPTED_FORMATS,
    multiple: true
  })

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFilesAdded(Array.from(files))
      e.target.value = ''
    }
  }

  return (
    <div className="dropzone-container">
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'dropzone-active' : ''} ${disabled ? 'dropzone-disabled' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="dropzone-content">
          <div className="dropzone-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="dropzone-text">
            {isDragActive
              ? 'Drop your videos here...'
              : 'Drag and drop your videos here'}
          </p>
          <p className="dropzone-subtext">or</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleButtonClick}
            disabled={disabled}
          >
            Select Videos
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*"
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
          />
          <p className="dropzone-formats">
            Supported formats: MP4, WebM, MOV, MKV, AVI
          </p>
        </div>
      </div>
    </div>
  )
}

export default VideoDropZone
