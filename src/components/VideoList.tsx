import { useState, useRef, useCallback } from 'react'
import { VideoItem, Transition, TextOverlay } from '../types'
import VideoListItem from './VideoListItem'
import TransitionConnector from './TransitionConnector'

interface VideoListProps {
  videos: VideoItem[]
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  onPreview: (id: string) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onMove: (id: string, direction: 'up' | 'down') => void
  onFilesAtPosition: (files: File[], index: number) => void
  onTransitionChange: (videoId: string, transition: Transition) => void
  onTextOverlayChange: (videoId: string, overlay: TextOverlay | null) => void
}

function VideoList({ videos, onRemove, onDuplicate, onPreview, onReorder, onMove, onFilesAtPosition, onTransitionChange, onTextOverlayChange }: VideoListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [externalDragOver, setExternalDragOver] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const isExternalDrag = useCallback((e: React.DragEvent) => {
    return e.dataTransfer.types.includes('Files')
  }, [])

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (isExternalDrag(e)) {
      e.dataTransfer.dropEffect = 'copy'
      setExternalDragOver(index)
    } else {
      e.dataTransfer.dropEffect = 'move'
      setDragOverIndex(index)
    }
  }, [isExternalDrag])

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
    setExternalDragOver(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    if (isExternalDrag(e)) {
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/') || f.type.startsWith('image/'))
      if (files.length > 0) {
        onFilesAtPosition(files, toIndex)
      }
      setExternalDragOver(null)
    } else {
      if (draggedIndex !== null && draggedIndex !== toIndex) {
        onReorder(draggedIndex, toIndex)
      }
      setDraggedIndex(null)
      setDragOverIndex(null)
    }
  }, [draggedIndex, onReorder, onFilesAtPosition, isExternalDrag])

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
    setDragOverIndex(null)
    setExternalDragOver(null)
  }, [])

  return (
    <div className="video-list-container">
      <h2 className="video-list-title">
        Video Sequence
        <span className="video-count">{videos.length} video{videos.length !== 1 ? 's' : ''}</span>
      </h2>
      <div className="video-list" ref={listRef}>
        {videos.map((video, index) => (
          <VideoListItem
            key={video.id}
            video={video}
            index={index}
            isFirst={index === 0}
            isLast={index === videos.length - 1}
            isDragged={draggedIndex === index}
            isDragOver={dragOverIndex === index}
            isExternalDragOver={externalDragOver === index}
            onRemove={() => onRemove(video.id)}
            onDuplicate={() => onDuplicate(video.id)}
            onPreview={() => onPreview(video.id)}
            onMove={(direction) => onMove(video.id, direction)}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onTextOverlayChange={(overlay) => onTextOverlayChange(video.id, overlay)}
          >
            {index < videos.length - 1 && (
              <TransitionConnector
                transition={video.transitionAfter}
                onChange={(transition) => onTransitionChange(video.id, transition)}
              />
            )}
          </VideoListItem>
        ))}
      </div>
    </div>
  )
}

export default VideoList
