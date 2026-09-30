import { useState, useCallback, useRef, useEffect } from 'react'
import { VideoItem, AppState, Transition, TextOverlay, AppMode, OverlayConfig, DEFAULT_OVERLAY_CONFIG, SideBySideConfig, DEFAULT_SIDE_BY_SIDE_CONFIG } from './types'
import VideoDropZone from './components/VideoDropZone'
import VideoList from './components/VideoList'
import StitchControls from './components/StitchControls'
import ProcessingStatus from './components/ProcessingStatus'
import ResultPanel from './components/ResultPanel'
import VideoPreviewModal from './components/VideoPreviewModal'
import OverlayMode from './components/OverlayMode'
import SideBySideMode from './components/SideBySideMode'
import { stitchVideos, addBackgroundMusic, stitchOverlay, stitchSideBySide } from './stitcher'
import { saveListDefinition, parseListDefinition, VideoListDefinition, VideoListEntry } from './listStorage'
import { storeFile, retrieveFile, storeAllFiles, buildFileKey } from './fileStorage'
import { saveState, restoreState, clearState } from './stateStorage'

interface PendingLoad {
  definition: VideoListDefinition
  restored: VideoItem[]
  missing: VideoListEntry[]
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

function App() {
  const [state, setState] = useState<AppState>({
    videos: [],
    status: 'idle',
    progress: 0,
    statusMessage: '',
    mode: 'stitch',
    overlayConfig: DEFAULT_OVERLAY_CONFIG,
    sideBySideConfig: DEFAULT_SIDE_BY_SIDE_CONFIG,
    ffmpegLogs: []
  })
  const [previewVideo, setPreviewVideo] = useState<VideoItem | null>(null)
  const [pendingLoad, setPendingLoad] = useState<PendingLoad | null>(null)
  const [musicProcessing, setMusicProcessing] = useState(false)
  const [musicProgress, setMusicProgress] = useState(0)
  const [musicMessage, setMusicMessage] = useState('')
  const loadFileInputRef = useRef<HTMLInputElement>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    restoreState().then(restored => {
      if (restored) {
        setState(prev => ({
          ...prev,
          videos: restored.videos as VideoItem[],
          overlayConfig: restored.overlayConfig,
          sideBySideConfig: restored.sideBySideConfig
        }))
      }
    })
  }, [])

  useEffect(() => {
    if (state.videos.length > 0) {
      saveState(state.videos, state.overlayConfig, state.sideBySideConfig)
    }
  }, [state.videos, state.overlayConfig, state.sideBySideConfig])

  const handleSaveList = useCallback(() => {
    if (state.videos.length === 0) return
    saveListDefinition(state.videos)
  }, [state.videos])

  const handleLoadClick = useCallback(() => {
    loadFileInputRef.current?.click()
  }, [])

  const handleLoadFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const definition = parseListDefinition(text)

      const restored: VideoItem[] = []
      const missing: VideoListEntry[] = []

      for (const entry of definition.videos) {
        const key = buildFileKey(entry.name, entry.size, entry.lastModified)
        const dbFile = await retrieveFile(key)
        if (dbFile) {
          restored.push({
            id: generateId(),
            file: dbFile,
            name: entry.name,
            size: entry.size,
            type: entry.type,
            lastModified: entry.lastModified,
            transitionAfter: entry.transitionAfter
          })
        } else {
          missing.push(entry)
        }
      }

      if (missing.length === 0) {
        setState(prev => ({ ...prev, videos: [...prev.videos, ...restored] }))
        alert(`List "${definition.name}" restored! ${restored.length} video(s) loaded from storage.`)
      } else if (restored.length > 0) {
        setPendingLoad({ definition, restored, missing })
      } else {
        setPendingLoad({ definition, restored: [], missing })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load list'
      alert(message)
    }

    e.target.value = ''
  }, [])

  const handleLoadConfirm = useCallback(async (files: File[]) => {
    if (!pendingLoad) return

    const fileMap = new Map<string, File>()
    for (const file of files) {
      fileMap.set(file.name, file)
    }

    const allRestored = [...pendingLoad.restored]
    const stillMissing: VideoListEntry[] = []
    const toStore: { key: string; file: File }[] = []

    for (const entry of pendingLoad.missing) {
      const file = fileMap.get(entry.name)
      if (file) {
        const key = buildFileKey(entry.name, entry.size, entry.lastModified)
        toStore.push({ key, file })
        allRestored.push({
          id: generateId(),
          file,
          name: entry.name,
          size: entry.size,
          type: entry.type,
          lastModified: entry.lastModified,
          transitionAfter: entry.transitionAfter
        })
      } else {
        stillMissing.push(entry)
      }
    }

    if (toStore.length > 0) {
      await storeAllFiles(toStore)
    }

    if (stillMissing.length > 0) {
      alert(`Still missing: ${stillMissing.map(v => v.name).join(', ')}`)
      setPendingLoad({ ...pendingLoad, restored: allRestored, missing: stillMissing })
    } else {
      setState(prev => ({ ...prev, videos: [...prev.videos, ...allRestored] }))
      setPendingLoad(null)
    }
  }, [pendingLoad])

  const handleLoadCancel = useCallback(() => {
    setPendingLoad(null)
  }, [])

  const addVideos = useCallback(async (files: File[]) => {
    const newVideos: VideoItem[] = files.map(file => ({
      id: generateId(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }))

    const toStore = files.map(file => ({
      key: buildFileKey(file.name, file.size, file.lastModified),
      file
    }))
    await storeAllFiles(toStore)

    setState(prev => ({
      ...prev,
      videos: [...prev.videos, ...newVideos]
    }))
  }, [])

  const addVideosAtPosition = useCallback(async (files: File[], index: number) => {
    const newVideos: VideoItem[] = files.map(file => ({
      id: generateId(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }))

    const toStore = files.map(file => ({
      key: buildFileKey(file.name, file.size, file.lastModified),
      file
    }))
    await storeAllFiles(toStore)

    setState(prev => {
      const newVideosList = [...prev.videos]
      newVideosList.splice(index, 0, ...newVideos)
      return { ...prev, videos: newVideosList }
    })
  }, [])

  const updateTransition = useCallback((videoId: string, transition: Transition) => {
    setState(prev => ({
      ...prev,
      videos: prev.videos.map(v =>
        v.id === videoId ? { ...v, transitionAfter: transition } : v
      )
    }))
  }, [])

  const handleTextOverlayChange = useCallback((videoId: string, overlay: TextOverlay | null) => {
    setState(prev => ({
      ...prev,
      videos: prev.videos.map(v =>
        v.id === videoId ? { ...v, textOverlay: overlay || undefined } : v
      )
    }))
  }, [])

  const pushLog = useCallback((line: string) => {
    setState(prev => ({
      ...prev,
      ffmpegLogs: [...prev.ffmpegLogs, line].slice(-300)
    }))
  }, [])

  const removeVideo = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      videos: prev.videos.filter(v => v.id !== id)
    }))
  }, [])

  const duplicateVideo = useCallback((id: string) => {
    setState(prev => {
      const index = prev.videos.findIndex(v => v.id === id)
      if (index === -1) return prev

      const original = prev.videos[index]
      const duplicate: VideoItem = {
        ...original,
        id: generateId(),
        thumbnail: undefined
      }

      const newVideos = [...prev.videos]
      newVideos.splice(index + 1, 0, duplicate)

      return { ...prev, videos: newVideos }
    })
  }, [])

  const reorderVideos = useCallback((fromIndex: number, toIndex: number) => {
    setState(prev => {
      const newVideos = [...prev.videos]
      const [moved] = newVideos.splice(fromIndex, 1)
      newVideos.splice(toIndex, 0, moved)
      return { ...prev, videos: newVideos }
    })
  }, [])

  const moveVideo = useCallback((id: string, direction: 'up' | 'down') => {
    setState(prev => {
      const index = prev.videos.findIndex(v => v.id === id)
      if (index === -1) return prev

      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= prev.videos.length) return prev

      const newVideos = [...prev.videos]
      const [moved] = newVideos.splice(index, 1)
      newVideos.splice(newIndex, 0, moved)

      return { ...prev, videos: newVideos }
    })
  }, [])

  const openPreview = useCallback((id: string) => {
    const video = state.videos.find(v => v.id === id)
    if (video) {
      setPreviewVideo(video)
    }
  }, [state.videos])

  const closePreview = useCallback(() => {
    setPreviewVideo(null)
  }, [])

  const handleStitch = useCallback(async () => {
    if (state.videos.length < 2) return

    cancelledRef.current = false
    const startedAt = Date.now()

    setState(prev => ({
      ...prev,
      status: 'preparing',
      progress: 0,
      statusMessage: 'Preparing videos...',
      error: undefined,
      outputFile: undefined,
      processingStartedAt: startedAt,
      processingDuration: undefined,
      ffmpegLogs: []
    }))

    try {
      const result = await stitchVideos(
        state.videos,
        (progress: number, message: string) => {
          if (cancelledRef.current) return
          setState(prev => ({
            ...prev,
            status: 'processing',
            progress,
            statusMessage: message
          }))
        },
        pushLog
      )

      if (cancelledRef.current) return

      const duration = Math.round((Date.now() - startedAt) / 1000)

      setState(prev => ({
        ...prev,
        status: 'complete',
        progress: 100,
        statusMessage: 'Stitching complete!',
        outputFile: result.blob,
        outputFilename: result.filename,
        processingDuration: duration
      }))
    } catch (err) {
      if (cancelledRef.current) return
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setState(prev => ({
        ...prev,
        status: 'error',
        progress: 0,
        statusMessage: '',
        error: errorMessage
      }))
    }
  }, [state.videos, pushLog])

  const handleCancel = useCallback(() => {
    cancelledRef.current = true
    setState(prev => ({
      ...prev,
      status: 'idle',
      progress: 0,
      statusMessage: '',
      error: undefined,
      outputFile: undefined,
      outputFilename: undefined,
      ffmpegLogs: []
    }))
  }, [])

  const handleRetry = useCallback(() => {
    setState(prev => ({
      ...prev,
      status: 'idle',
      progress: 0,
      statusMessage: '',
      error: undefined,
      outputFile: undefined,
      ffmpegLogs: []
    }))
  }, [])

  const handleNewProject = useCallback(() => {
    clearState()
    setState({
      videos: [],
      status: 'idle',
      progress: 0,
      statusMessage: '',
      mode: 'stitch',
      overlayConfig: DEFAULT_OVERLAY_CONFIG,
      sideBySideConfig: DEFAULT_SIDE_BY_SIDE_CONFIG,
      ffmpegLogs: []
    })
  }, [])

  const handleClearList = useCallback(() => {
    clearState()
    setState(prev => ({
      ...prev,
      videos: [],
      overlayConfig: DEFAULT_OVERLAY_CONFIG,
      sideBySideConfig: DEFAULT_SIDE_BY_SIDE_CONFIG
    }))
  }, [])

  const handleEditList = useCallback(() => {
    setState(prev => ({
      ...prev,
      status: 'idle',
      outputFile: undefined,
      outputFilename: undefined
    }))
  }, [])

  const handleAddMusic = useCallback(async (musicFile: File, mode: 'mix' | 'replace') => {
    if (!state.outputFile || !state.outputFilename) return

    setMusicProcessing(true)
    setMusicProgress(0)
    setMusicMessage('Preparing...')
    setState(prev => ({ ...prev, ffmpegLogs: [] }))

    try {
      const result = await addBackgroundMusic(
        state.outputFile,
        state.outputFilename,
        musicFile,
        mode,
        (progress: number, message: string) => {
          setMusicProgress(progress)
          setMusicMessage(message)
        },
        pushLog
      )

      setState(prev => ({
        ...prev,
        outputFile: result.blob,
        outputFilename: result.filename
      }))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add background music'
      alert(errorMessage)
    } finally {
      setMusicProcessing(false)
      setMusicProgress(0)
      setMusicMessage('')
    }
  }, [state.outputFile, state.outputFilename, pushLog])

  const isProcessing = state.status === 'preparing' || state.status === 'processing'

  const handleModeChange = useCallback((mode: AppMode) => {
    setState(prev => ({ ...prev, mode }))
  }, [])

  const handleOverlayConfigChange = useCallback((config: OverlayConfig) => {
    setState(prev => ({ ...prev, overlayConfig: config }))
  }, [])

  const handleStartOverlay = useCallback(async () => {
    const mainVideo = state.videos.find(v => v.id === state.overlayConfig.mainVideoId)
    const overlayVideo = state.videos.find(v => v.id === state.overlayConfig.overlayVideoId)
    if (!mainVideo || !overlayVideo) return

    cancelledRef.current = false
    const startedAt = Date.now()

    setState(prev => ({
      ...prev,
      status: 'preparing',
      progress: 0,
      statusMessage: 'Preparing overlay...',
      error: undefined,
      outputFile: undefined,
      processingStartedAt: startedAt,
      processingDuration: undefined,
      ffmpegLogs: []
    }))

    try {
      const result = await stitchOverlay(
        mainVideo,
        overlayVideo,
        state.overlayConfig,
        (progress: number, message: string) => {
          if (cancelledRef.current) return
          setState(prev => ({
            ...prev,
            status: 'processing',
            progress,
            statusMessage: message
          }))
        },
        pushLog
      )

      if (cancelledRef.current) return

      const duration = Math.round((Date.now() - startedAt) / 1000)

      setState(prev => ({
        ...prev,
        status: 'complete',
        progress: 100,
        statusMessage: 'Overlay complete!',
        outputFile: result.blob,
        outputFilename: result.filename,
        processingDuration: duration
      }))
    } catch (err) {
      if (cancelledRef.current) return
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setState(prev => ({
        ...prev,
        status: 'error',
        progress: 0,
        statusMessage: '',
        error: errorMessage
      }))
    }
  }, [state.videos, state.overlayConfig, pushLog])

  const handleSideBySideConfigChange = useCallback((config: SideBySideConfig) => {
    setState(prev => ({ ...prev, sideBySideConfig: config }))
  }, [])

  const handleStartSideBySide = useCallback(async () => {
    const leftVideo = state.videos.find(v => v.id === state.sideBySideConfig.leftVideoId)
    const rightVideo = state.videos.find(v => v.id === state.sideBySideConfig.rightVideoId)
    if (!leftVideo || !rightVideo) return

    cancelledRef.current = false
    const startedAt = Date.now()

    setState(prev => ({
      ...prev,
      status: 'preparing',
      progress: 0,
      statusMessage: 'Preparing side-by-side...',
      error: undefined,
      outputFile: undefined,
      processingStartedAt: startedAt,
      processingDuration: undefined,
      ffmpegLogs: []
    }))

    try {
      const result = await stitchSideBySide(
        leftVideo,
        rightVideo,
        state.sideBySideConfig,
        (progress: number, message: string) => {
          if (cancelledRef.current) return
          setState(prev => ({
            ...prev,
            status: 'processing',
            progress,
            statusMessage: message
          }))
        },
        pushLog
      )

      if (cancelledRef.current) return

      const duration = Math.round((Date.now() - startedAt) / 1000)

      setState(prev => ({
        ...prev,
        status: 'complete',
        progress: 100,
        statusMessage: 'Side-by-side complete!',
        outputFile: result.blob,
        outputFilename: result.filename,
        processingDuration: duration
      }))
    } catch (err) {
      if (cancelledRef.current) return
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setState(prev => ({
        ...prev,
        status: 'error',
        progress: 0,
        statusMessage: '',
        error: errorMessage
      }))
    }
  }, [state.videos, state.sideBySideConfig, pushLog])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Video Stitcher</h1>
        <div className="mode-switcher">
          <button
            className={`mode-btn ${state.mode === 'stitch' ? 'mode-btn-active' : ''}`}
            onClick={() => handleModeChange('stitch')}
            disabled={isProcessing}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="8" height="16" rx="1" />
              <rect x="14" y="4" width="8" height="16" rx="1" />
            </svg>
            Stitch
          </button>
          <button
            className={`mode-btn ${state.mode === 'overlay' ? 'mode-btn-active' : ''}`}
            onClick={() => handleModeChange('overlay')}
            disabled={isProcessing}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <rect x="12" y="12" width="10" height="10" rx="1" />
            </svg>
            Overlay
          </button>
          <button
            className={`mode-btn ${state.mode === 'side-by-side' ? 'mode-btn-active' : ''}`}
            onClick={() => handleModeChange('side-by-side')}
            disabled={isProcessing}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="3" width="10" height="18" rx="1" />
              <rect x="13" y="3" width="10" height="18" rx="1" />
            </svg>
            Side-by-Side
          </button>
        </div>
        <p className="privacy-notice">
          Your videos are processed locally in your browser. They are not uploaded to a server.
        </p>
      </header>

      <main className="app-main">
        {!isProcessing && state.status !== 'complete' && (
          <>
            <VideoDropZone onFilesAdded={addVideos} disabled={isProcessing} />
            <div className="list-toolbar">
              {state.videos.length > 0 && (
                <button className="btn btn-secondary btn-small" onClick={handleSaveList}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save List
                </button>
              )}
              <button className="btn btn-secondary btn-small" onClick={handleLoadClick}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Load List
              </button>
              {state.videos.length > 0 && (
                <button className="btn btn-secondary btn-small" onClick={handleClearList}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Clear List
                </button>
              )}
              <input
                ref={loadFileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleLoadFileChange}
              />
            </div>
          </>
        )}

        {state.videos.length > 0 && !isProcessing && state.status !== 'complete' && state.mode === 'stitch' && (
          <>
            <VideoList
              videos={state.videos}
              onRemove={removeVideo}
              onDuplicate={duplicateVideo}
              onPreview={openPreview}
              onReorder={reorderVideos}
              onMove={moveVideo}
              onFilesAtPosition={addVideosAtPosition}
              onTransitionChange={updateTransition}
              onTextOverlayChange={handleTextOverlayChange}
            />
            <StitchControls
              videoCount={state.videos.length}
              onStitch={handleStitch}
            />
          </>
        )}

        {state.videos.length > 0 && !isProcessing && state.status !== 'complete' && state.mode === 'overlay' && (
          <OverlayMode
            videos={state.videos}
            config={state.overlayConfig}
            onConfigChange={handleOverlayConfigChange}
            onStartOverlay={handleStartOverlay}
          />
        )}

        {state.videos.length > 0 && !isProcessing && state.status !== 'complete' && state.mode === 'side-by-side' && (
          <SideBySideMode
            videos={state.videos}
            config={state.sideBySideConfig}
            onConfigChange={handleSideBySideConfigChange}
            onStartSideBySide={handleStartSideBySide}
          />
        )}

        {isProcessing && (
          <ProcessingStatus
            progress={state.progress}
            message={state.statusMessage}
            startedAt={state.processingStartedAt}
            log={state.ffmpegLogs}
            onCancel={handleCancel}
          />
        )}

        {state.status === 'complete' && state.outputFile && state.outputFilename && (
          <ResultPanel
            filename={state.outputFilename}
            blob={state.outputFile}
            processingDuration={state.processingDuration}
            musicProcessing={musicProcessing}
            musicProgress={musicProgress}
            musicMessage={musicMessage}
            musicLogs={musicProcessing ? state.ffmpegLogs : undefined}
            onNewProject={handleNewProject}
            onEditList={handleEditList}
            onAddMusic={handleAddMusic}
          />
        )}

        {state.status === 'error' && state.error && (
          <div className="error-panel">
            <div className="error-icon">!</div>
            <h3>Processing Failed</h3>
            <p>{state.error}</p>
            <button className="btn btn-primary" onClick={handleRetry}>
              Try Again
            </button>
          </div>
        )}
      </main>

      {previewVideo && (
        <VideoPreviewModal
          video={previewVideo}
          onClose={closePreview}
        />
      )}

      {pendingLoad && (
        <div className="modal-overlay" onClick={handleLoadCancel}>
          <div className="modal-content load-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Load Video List</h3>
              <button className="modal-close" onClick={handleLoadCancel} aria-label="Close">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body load-modal-body">
              {pendingLoad.restored.length > 0 && (
                <p className="load-modal-restored">
                  {pendingLoad.restored.length} video(s) restored from storage.
                </p>
              )}
              <p className="load-modal-instruction">
                Please select the remaining {pendingLoad.missing.length} missing video file(s):
              </p>
              <ul className="load-modal-file-list">
                {pendingLoad.missing.map((v, i) => (
                  <li key={i}>{v.name}</li>
                ))}
              </ul>
              <div className="load-modal-actions">
                <LoadFilePicker onFilesSelected={handleLoadConfirm} />
                <button className="btn btn-secondary" onClick={handleLoadCancel}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LoadFilePicker({ onFilesSelected }: { onFilesSelected: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFilesSelected(Array.from(files))
    }
    e.target.value = ''
  }

  return (
    <>
      <button className="btn btn-primary" onClick={handleClick}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Select Video Files
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="video/*,image/png,image/jpeg,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </>
  )
}

export default App
