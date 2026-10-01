import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { VideoItem, Transition, TextPosition, OverlayConfig, OverlayPosition, SideBySideConfig } from './types'

let ffmpeg: FFmpeg | null = null

async function loadFFmpeg(
  onProgress: (progress: number, message: string) => void
): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg

  onProgress(0, 'Loading video processor...')

  const ffmpegInstance = new FFmpeg()

  ffmpegInstance.on('log', ({ message }) => {
    console.log('[FFmpeg]', message)
  })

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'

  await ffmpegInstance.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })

  ffmpeg = ffmpegInstance
  onProgress(5, 'Video processor ready')

  return ffmpegInstance
}

interface StitchResult {
  blob: Blob
  filename: string
}

interface VideoInfo {
  duration: number
  width: number
  height: number
}

async function getVideoInfo(
  ffmpegInstance: FFmpeg,
  filename: string
): Promise<VideoInfo> {
  let duration = 0
  let width = 0
  let height = 0
  const handler = ({ message }: { message: string }) => {
    const durationMatch = message.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/)
    if (durationMatch) {
      const hours = parseInt(durationMatch[1], 10)
      const minutes = parseInt(durationMatch[2], 10)
      const seconds = parseInt(durationMatch[3], 10)
      const centiseconds = parseInt(durationMatch[4], 10)
      duration = hours * 3600 + minutes * 60 + seconds + centiseconds / 100
    }
    const sizeMatch = message.match(/Stream.*Video.*\s(\d{3,5})x(\d{3,5})/)
    if (sizeMatch && width === 0) {
      width = parseInt(sizeMatch[1], 10)
      height = parseInt(sizeMatch[2], 10)
    }
  }

  ffmpegInstance.on('log', handler)

  await ffmpegInstance.exec([
    '-i', filename,
    '-f', 'null',
    '-'
  ])

  ffmpegInstance.off('log', handler)

  return { duration, width, height }
}

function hasAnyTransitions(videos: VideoItem[]): boolean {
  return videos.some(v => v.transitionAfter && v.transitionAfter.type !== 'cut')
}

interface Segment {
  start: number
  end: number
  duration: number
}

function buildSegments(videos: VideoItem[], videoDurations: number[]): Segment[] {
  const segments: Segment[] = []
  let segStart = 0
  let segDuration = videoDurations[0]

  for (let i = 0; i < videos.length - 1; i++) {
    const transition = videos[i].transitionAfter
    const isCut = !transition || transition.type === 'cut'

    if (isCut) {
      segDuration += videoDurations[i + 1]
    } else {
      segments.push({ start: segStart, end: i, duration: segDuration })
      segStart = i + 1
      segDuration = videoDurations[i + 1]
    }
  }

  segments.push({ start: segStart, end: videos.length - 1, duration: segDuration })
  return segments
}

function getTextPosition(position: TextPosition): string {
  const margin = '10'
  switch (position) {
    case 'top-left': return `x=${margin}:y=${margin}`
    case 'top-center': return `x=(w-text_w)/2:y=${margin}`
    case 'top-right': return `x=w-text_w-${margin}:y=${margin}`
    case 'center-left': return `x=${margin}:y=(h-text_h)/2`
    case 'center': return `x=(w-text_w)/2:y=(h-text_h)/2`
    case 'center-right': return `x=w-text_w-${margin}:y=(h-text_h)/2`
    case 'bottom-left': return `x=${margin}:y=h-text_h-${margin}`
    case 'bottom-center': return `x=(w-text_w)/2:y=h-text_h-${margin}`
    case 'bottom-right': return `x=w-text_w-${margin}:y=h-text_h-${margin}`
  }
}

function buildVideoFilterChain(
  videos: VideoItem[],
  videoDurations: number[],
  targetWidth: number,
  targetHeight: number
): string {
  const n = videos.length
  if (n < 2) return ''

  const segments = buildSegments(videos, videoDurations)
  const filters: string[] = []
  const normLabels: string[] = []

  for (let i = 0; i < n; i++) {
    const label = `[vnorm${i}]`
    normLabels.push(label)
    let filter = `[${i}:v]setpts=PTS-STARTPTS,scale=${targetWidth}:${targetHeight}`
    const overlay = videos[i].textOverlay
    if (overlay && overlay.text) {
      const pos = getTextPosition(overlay.position)
      const fontColor = overlay.color.startsWith('#') ? overlay.color.slice(1) : overlay.color
      filter += `,drawtext=fontfile='font.ttf':textfile='overlay_${i}.txt':fontsize=${overlay.fontSize}:fontcolor=0x${fontColor}:${pos}`
    }
    filters.push(`${filter}${label}`)
  }

  if (segments.length === 1) {
    const inputs = normLabels.join('')
    filters.push(`${inputs}concat=n=${n}:v=1:a=0[vout]`)
    return filters.join(';')
  }

  const segLabels: string[] = []

  for (let s = 0; s < segments.length; s++) {
    const seg = segments[s]
    const segCount = seg.end - seg.start + 1
    const segLabel = `[seg${s}]`
    segLabels.push(segLabel)

    const inputs = normLabels.slice(seg.start, seg.end + 1).join('')
    filters.push(`${inputs}concat=n=${segCount}:v=1:a=0${segLabel}`)
  }

  let lastOutput = segLabels[0]
  let cumulativeOffset = segments[0].duration

  for (let s = 0; s < segments.length - 1; s++) {
    const i = segments[s].end
    const transition = videos[i].transitionAfter!
    const xfadeDuration = transition.duration || 1.0
    const outputLabel = s < segments.length - 2 ? `[xv${s}]` : '[vout]'

    const offset = cumulativeOffset - xfadeDuration
    filters.push(
      `${lastOutput}${segLabels[s + 1]}xfade=transition=${transition.type}:duration=${xfadeDuration}:offset=${offset.toFixed(2)}${outputLabel}`
    )

    cumulativeOffset += segments[s + 1].duration - xfadeDuration
    lastOutput = outputLabel
  }

  return filters.join(';')
}

function buildAudioFilterChain(
  videos: VideoItem[],
  videoDurations: number[]
): string {
  const n = videos.length
  if (n < 2) return ''

  const segments = buildSegments(videos, videoDurations)
  const filters: string[] = []
  const normLabels: string[] = []

  for (let i = 0; i < n; i++) {
    const label = `[anorm${i}]`
    normLabels.push(label)
    filters.push(`[${i}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo${label}`)
  }

  if (segments.length === 1) {
    const inputs = normLabels.join('')
    filters.push(`${inputs}concat=n=${n}:v=0:a=1[aout]`)
    return filters.join(';')
  }

  const segLabels: string[] = []

  for (let s = 0; s < segments.length; s++) {
    const seg = segments[s]
    const segCount = seg.end - seg.start + 1
    const segLabel = `[aseg${s}]`
    segLabels.push(segLabel)

    const inputs = normLabels.slice(seg.start, seg.end + 1).join('')
    filters.push(`${inputs}concat=n=${segCount}:v=0:a=1${segLabel}`)
  }

  let lastOutput = segLabels[0]

  for (let s = 0; s < segments.length - 1; s++) {
    const i = segments[s].end
    const transition = videos[i].transitionAfter!
    const acrossfadeDuration = transition.duration || 1.0
    const outputLabel = s < segments.length - 2 ? `[xa${s}]` : '[aout]'

    filters.push(
      `${lastOutput}${segLabels[s + 1]}acrossfade=d=${acrossfadeDuration}:c1=tri:c2=tri${outputLabel}`
    )

    lastOutput = outputLabel
  }

  return filters.join(';')
}

export async function stitchVideos(
  videos: VideoItem[],
  onProgress: (progress: number, message: string) => void,
  onLog?: (line: string) => void
): Promise<StitchResult> {
  const ffmpegInstance = await loadFFmpeg(onProgress)

  const logHandler = ({ message }: { message: string }) => {
    onLog?.(message)
  }
  ffmpegInstance.on('log', logHandler)

  const progressHandler = ({ progress }: { progress: number; time: number }) => {
    if (progress >= 0) {
      onProgress(Math.min(progress * 100, 95), `Processing...`)
    }
  }
  ffmpegInstance.on('progress', progressHandler)

  onProgress(5, 'Preparing videos...')

  const inputFiles = videos.map((_, i) => `input_${i}.${getExtension(videos[i].type)}`)

  onProgress(5, 'Loading videos...')

  const fileDataArray = await Promise.all(videos.map(v => fetchFile(v.file)))
  await Promise.all(fileDataArray.map((data, i) => ffmpegInstance.writeFile(inputFiles[i], data)))

  const hasTextOverlay = videos.some(v => v.textOverlay?.text)
  if (hasTextOverlay) {
    const fontUrl = `${window.location.origin}/Roboto-Regular.ttf`
    const fontData = await fetchFile(fontUrl)
    await ffmpegInstance.writeFile('font.ttf', fontData)
    for (let i = 0; i < videos.length; i++) {
      if (videos[i].textOverlay?.text) {
        const text = videos[i].textOverlay!.text!
        await ffmpegInstance.writeFile(`overlay_${i}.txt`, new TextEncoder().encode(text))
      }
    }
  }

  onProgress(20, 'Analyzing video durations...')

  const videoInfos: VideoInfo[] = []
  for (let i = 0; i < inputFiles.length; i++) {
    const info = await getVideoInfo(ffmpegInstance, inputFiles[i])
    videoInfos.push({
      duration: info.duration || videos[i].duration || 10,
      width: info.width,
      height: info.height
    })
  }
  const videoDurations = videoInfos.map(v => v.duration)

  const targetWidth = videoInfos[0].width || 1920
  const targetHeight = videoInfos[0].height || 1080

  const useTransitions = hasAnyTransitions(videos)
  const useFilterComplex = useTransitions || hasTextOverlay
  const outputFilename = 'stitched-video.mp4'

  if (!useFilterComplex) {
    // Simple concat without transitions
    onProgress(30, 'Stitching videos (no transitions)...')

    const concatList = inputFiles.map(f => `file '${f}'`).join('\n')
    await ffmpegInstance.writeFile('concat.txt', concatList)

    try {
      await ffmpegInstance.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat.txt',
        '-c', 'copy',
        outputFilename
      ])
    } catch (err) {
      onProgress(35, 'Retrying with re-encoding...')

      await ffmpegInstance.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat.txt',
        '-pix_fmt', 'yuv420p',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        outputFilename
      ])
    }
  } else {
    // Use xfade for transitions or drawtext for overlays
    onProgress(30, 'Building transition filters...')

    const videoFilter = buildVideoFilterChain(videos, videoDurations, targetWidth, targetHeight)
    const audioFilter = buildAudioFilterChain(videos, videoDurations)

    const inputArgs = inputFiles.flatMap(f => ['-i', f])

    const filterComplex = `${videoFilter};${audioFilter}`

    console.log('[Stitcher] filterComplex:', filterComplex)

    onProgress(35, 'Stitching videos with transitions...')

    const exitCode = await ffmpegInstance.exec([
      ...inputArgs,
      '-filter_complex', filterComplex,
      '-map', '[vout]',
      '-map', '[aout]',
      '-pix_fmt', 'yuv420p',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputFilename
    ])

    if (exitCode !== 0) {
      throw new Error(`FFmpeg exited with code ${exitCode}`)
    }
  }

  ffmpegInstance.off('progress', progressHandler)
  ffmpegInstance.off('log', logHandler)

  onProgress(85, 'Finalizing video...')

  const data = await ffmpegInstance.readFile(outputFilename)

  if (!data || (data as Uint8Array).length === 0) {
    throw new Error('Output file is empty. FFmpeg filter graph may have failed.')
  }

  onProgress(90, 'Cleaning up...')

  for (const inputFile of inputFiles) {
    await ffmpegInstance.deleteFile(inputFile)
  }
  await ffmpegInstance.deleteFile(outputFilename)
  if (!useFilterComplex) {
    await ffmpegInstance.deleteFile('concat.txt').catch(() => {})
  }
  if (hasTextOverlay) {
    await ffmpegInstance.deleteFile('font.ttf').catch(() => {})
    for (let i = 0; i < videos.length; i++) {
      if (videos[i].textOverlay?.text) {
        await ffmpegInstance.deleteFile(`overlay_${i}.txt`).catch(() => {})
      }
    }
  }

  onProgress(100, 'Complete!')

  const uint8Data = data as Uint8Array
  const arrayBuffer = uint8Data.buffer.slice(0) as ArrayBuffer
  const blob = new Blob([arrayBuffer], { type: 'video/mp4' })

  return {
    blob,
    filename: generateOutputFilename(videos)
  }
}

function getExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-matroska': 'mkv',
    'video/avi': 'avi',
    'video/x-msvideo': 'avi',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif'
  }
  return extensions[mimeType] || 'mp4'
}

function isImageType(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

function generateOutputFilename(videos: VideoItem[]): string {
  if (videos.length === 1) {
    const name = videos[0].name.replace(/\.[^/.]+$/, '')
    return `${name}-stitched.mp4`
  }
  return 'stitched-video.mp4'
}

export async function addBackgroundMusic(
  videoBlob: Blob,
  videoFilename: string,
  musicFile: File,
  mode: 'mix' | 'replace',
  onProgress: (progress: number, message: string) => void,
  onLog?: (line: string) => void
): Promise<{ blob: Blob; filename: string }> {
  const ffmpegInstance = await loadFFmpeg(onProgress)

  const logHandler = ({ message }: { message: string }) => {
    onLog?.(message)
  }
  ffmpegInstance.on('log', logHandler)

  onProgress(10, 'Loading files...')

  const videoData = await fetchFile(videoBlob)
  const musicData = await fetchFile(musicFile)

  const ext = videoFilename.split('.').pop() || 'mp4'
  const videoPath = `input-video.${ext}`
  const musicExt = musicFile.name.split('.').pop() || 'mp3'
  const musicPath = `input-music.${musicExt}`
  const outputPath = 'output-with-music.mp4'

  await ffmpegInstance.writeFile(videoPath, videoData)
  await ffmpegInstance.writeFile(musicPath, musicData)

  onProgress(30, 'Getting video duration...')

  let duration = 0
  const handler = ({ message }: { message: string }) => {
    const match = message.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/)
    if (match) {
      const hours = parseInt(match[1], 10)
      const minutes = parseInt(match[2], 10)
      const seconds = parseInt(match[3], 10)
      const centiseconds = parseInt(match[4], 10)
      duration = hours * 3600 + minutes * 60 + seconds + centiseconds / 100
    }
  }
  ffmpegInstance.on('log', handler)
  await ffmpegInstance.exec(['-i', videoPath, '-f', 'null', '-'])
  ffmpegInstance.off('log', handler)

  onProgress(50, mode === 'mix' ? 'Mixing audio with background music...' : 'Replacing audio with background music...')

  let filterComplex: string
  let mapArgs: string[]

  if (mode === 'mix') {
    filterComplex = `[1:a]atrim=0:${duration},asetpts=PTS-STARTPTS,apad=whole_dur=${duration}[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=0[a]`
    mapArgs = ['-map', '0:v:0', '-map', '[a]']
  } else {
    filterComplex = `[1:a]atrim=0:${duration},asetpts=PTS-STARTPTS,apad=whole_dur=${duration}[a]`
    mapArgs = ['-map', '0:v:0', '-map', '[a]']
  }

  const progressHandler = ({ progress }: { progress: number; time: number }) => {
    if (progress >= 0) {
      onProgress(50 + Math.min(progress * 40, 40), `Processing music...`)
    }
  }
  ffmpegInstance.on('progress', progressHandler)

  let execError: unknown = null
  try {
    await ffmpegInstance.exec([
      '-i', videoPath,
      '-i', musicPath,
      '-filter_complex', filterComplex,
      ...mapArgs,
      '-c:v', 'copy',
      '-pix_fmt', 'yuv420p',
      '-t', String(duration),
      '-movflags', '+faststart',
      outputPath
    ])
  } catch (err) {
    execError = err
  }

  ffmpegInstance.off('progress', progressHandler)
  ffmpegInstance.off('log', logHandler)

  onProgress(90, 'Reading output...')

  let outputData: Uint8Array
  try {
    outputData = await ffmpegInstance.readFile(outputPath)
  } catch {
    const detail = execError instanceof Error ? execError.message : String(execError)
    throw new Error(`Failed to read output file${execError ? `: ${detail}` : ''}`)
  }

  if (!outputData || outputData.length === 0) {
    throw new Error('Output file is empty')
  }

  const outputBlob = new Blob([outputData.buffer], { type: 'video/mp4' })
  const outputName = videoFilename.replace(/\.[^/.]+$/, '') + '-music.mp4'

  onProgress(100, 'Background music applied!')

  return { blob: outputBlob, filename: outputName }
}

function getOverlayPosition(position: OverlayPosition, overlayW: string, overlayH: string): string {
  const margin = '10'
  switch (position) {
    case 'top-left': return `x=${margin}:y=${margin}`
    case 'top-right': return `x=main_w-${overlayW}-${margin}:y=${margin}`
    case 'bottom-left': return `x=${margin}:y=main_h-${overlayH}-${margin}`
    case 'bottom-right': return `x=main_w-${overlayW}-${margin}:y=main_h-${overlayH}-${margin}`
    case 'center': return `x=(main_w-${overlayW})/2:y=(main_h-${overlayH})/2`
  }
}

export async function stitchOverlay(
  mainVideo: VideoItem,
  overlayVideo: VideoItem,
  config: OverlayConfig,
  onProgress: (progress: number, message: string) => void,
  onLog?: (line: string) => void
): Promise<StitchResult> {
  const ffmpegInstance = await loadFFmpeg(onProgress)

  const logHandler = ({ message }: { message: string }) => {
    onLog?.(message)
  }
  ffmpegInstance.on('log', logHandler)

  const progressHandler = ({ progress }: { progress: number; time: number }) => {
    if (progress >= 0) {
      onProgress(Math.min(progress * 100, 95), `Processing...`)
    }
  }
  ffmpegInstance.on('progress', progressHandler)

  onProgress(5, 'Preparing videos...')

  const mainExt = getExtension(mainVideo.type)
  const overlayExt = getExtension(overlayVideo.type)
  const mainPath = `main.${mainExt}`
  const overlayPath = `overlay.${overlayExt}`
  const outputPath = 'overlay-output.mp4'

  const mainData = await fetchFile(mainVideo.file)
  const overlayData = await fetchFile(overlayVideo.file)

  await ffmpegInstance.writeFile(mainPath, mainData)
  await ffmpegInstance.writeFile(overlayPath, overlayData)

  onProgress(20, 'Analyzing videos...')

  let mainDuration = 0
  let mainWidth = 0
  let mainHeight = 0
  const durationHandler = ({ message }: { message: string }) => {
    const durationMatch = message.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/)
    if (durationMatch) {
      const hours = parseInt(durationMatch[1], 10)
      const minutes = parseInt(durationMatch[2], 10)
      const seconds = parseInt(durationMatch[3], 10)
      const centiseconds = parseInt(durationMatch[4], 10)
      mainDuration = hours * 3600 + minutes * 60 + seconds + centiseconds / 100
    }
    const sizeMatch = message.match(/Stream.*Video.*\s(\d{3,5})x(\d{3,5})/)
    if (sizeMatch && mainWidth === 0) {
      mainWidth = parseInt(sizeMatch[1], 10)
      mainHeight = parseInt(sizeMatch[2], 10)
    }
  }
  ffmpegInstance.on('log', durationHandler)
  await ffmpegInstance.exec(['-i', mainPath, '-f', 'null', '-'])
  ffmpegInstance.off('log', durationHandler)

  let overlayDuration = 0
  let overlayWidth = 0
  let overlayHeight = 0
  const infoHandler = ({ message }: { message: string }) => {
    const sizeMatch = message.match(/Stream.*Video.*\s(\d{3,5})x(\d{3,5})/)
    if (sizeMatch && overlayWidth === 0) {
      overlayWidth = parseInt(sizeMatch[1], 10)
      overlayHeight = parseInt(sizeMatch[2], 10)
    }
    const durMatch = message.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/)
    if (durMatch) {
      const hours = parseInt(durMatch[1], 10)
      const minutes = parseInt(durMatch[2], 10)
      const seconds = parseInt(durMatch[3], 10)
      const centiseconds = parseInt(durMatch[4], 10)
      overlayDuration = hours * 3600 + minutes * 60 + seconds + centiseconds / 100
    }
  }
  ffmpegInstance.on('log', infoHandler)
  await ffmpegInstance.exec(['-i', overlayPath, '-f', 'null', '-'])
  ffmpegInstance.off('log', infoHandler)

  onProgress(40, 'Creating picture-in-picture...')

  const isImage = isImageType(overlayVideo.type)
  const scale = config.scale
  const scaledW = Math.round(mainWidth * scale)
  const scaledH = Math.round(scaledW * (overlayHeight / overlayWidth))
  const pos = getOverlayPosition(config.position, String(scaledW), String(scaledH))

  const overlayFlipFilter = config.flipOverlay ? ',hflip' : ''
  const mainFlipFilter = config.flipMain ? ',hflip' : ''
  const mainLabel = config.flipMain ? '[mainflip]' : '[0:v]'
  const filterComplex = config.durationSource === 'shortest' && !isImage
    ? `${config.flipMain ? `[0:v]hflip[mainflip];` : ''}[1:v]scale=${scaledW}:${scaledH}${overlayFlipFilter}[ov];${mainLabel}[ov]overlay=${pos}:shortest=1[out]`
    : `${config.flipMain ? `[0:v]hflip[mainflip];` : ''}[1:v]scale=${scaledW}:${scaledH}${overlayFlipFilter}[ov];${mainLabel}[ov]overlay=${pos}[out]`

  const audioArgs: string[] = []
  if (!isImage) {
    switch (config.audioSource) {
      case 'main':
        audioArgs.push('-map', '0:a?', '-c:a', 'copy')
        break
      case 'overlay':
        audioArgs.push('-map', '1:a?', '-c:a', 'copy')
        break
      case 'none':
        break
    }
  } else {
    audioArgs.push('-map', '0:a?', '-c:a', 'copy')
  }

  const durationArgs: string[] = []
  if (isImage) {
    durationArgs.push('-t', String(mainDuration))
  } else if (config.durationSource === 'main' && mainDuration > 0) {
    durationArgs.push('-t', String(mainDuration))
  } else if (config.durationSource === 'overlay' && overlayDuration > 0) {
    durationArgs.push('-t', String(overlayDuration))
  }

  const overlayInputArgs = isImage ? ['-loop', '1'] : []

  let execError: unknown = null
  try {
    await ffmpegInstance.exec([
      '-i', mainPath,
      ...overlayInputArgs,
      '-i', overlayPath,
      '-filter_complex', filterComplex,
      '-map', '[out]',
      ...audioArgs,
      ...durationArgs,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      outputPath
    ])
  } catch (err) {
    execError = err
  }

  ffmpegInstance.off('progress', progressHandler)
  ffmpegInstance.off('log', logHandler)

  onProgress(85, 'Reading output...')

  let outputData: Uint8Array
  try {
    outputData = await ffmpegInstance.readFile(outputPath)
  } catch {
    const detail = execError instanceof Error ? execError.message : String(execError)
    throw new Error(`Failed to read output file${execError ? `: ${detail}` : ''}`)
  }

  if (!outputData || outputData.length === 0) {
    throw new Error('Output file is empty')
  }

  onProgress(90, 'Cleaning up...')

  await ffmpegInstance.deleteFile(mainPath)
  await ffmpegInstance.deleteFile(overlayPath)
  await ffmpegInstance.deleteFile(outputPath)

  onProgress(100, 'Complete!')

  const arrayBuffer = (outputData as Uint8Array).buffer.slice(0) as ArrayBuffer
  const blob = new Blob([arrayBuffer], { type: 'video/mp4' })

  return {
    blob,
    filename: 'overlay-video.mp4'
  }
}

export async function stitchSideBySide(
  leftVideo: VideoItem,
  rightVideo: VideoItem,
  config: SideBySideConfig,
  onProgress: (progress: number, message: string) => void,
  onLog?: (line: string) => void
): Promise<StitchResult> {
  const ffmpegInstance = await loadFFmpeg(onProgress)

  const logHandler = ({ message }: { message: string }) => {
    onLog?.(message)
  }
  ffmpegInstance.on('log', logHandler)

  const progressHandler = ({ progress }: { progress: number; time: number }) => {
    if (progress >= 0) {
      onProgress(Math.min(progress * 100, 95), `Processing...`)
    }
  }
  ffmpegInstance.on('progress', progressHandler)

  onProgress(5, 'Preparing videos...')

  const leftExt = getExtension(leftVideo.type)
  const rightExt = getExtension(rightVideo.type)
  const leftPath = `left.${leftExt}`
  const rightPath = `right.${rightExt}`
  const outputPath = 'side-by-side.mp4'

  const leftData = await fetchFile(leftVideo.file)
  const rightData = await fetchFile(rightVideo.file)

  await ffmpegInstance.writeFile(leftPath, leftData)
  await ffmpegInstance.writeFile(rightPath, rightData)

  onProgress(15, 'Analyzing videos...')

  let leftHeight = 0
  const heightHandler = ({ message }: { message: string }) => {
    const match = message.match(/Stream.*Video.*\s(\d{3,5})x(\d{3,5})/)
    if (match && leftHeight === 0) {
      leftHeight = parseInt(match[2], 10)
    }
  }
  ffmpegInstance.on('log', heightHandler)
  await ffmpegInstance.exec(['-i', leftPath, '-f', 'null', '-'])
  ffmpegInstance.off('log', heightHandler)

  if (leftHeight === 0) {
    leftHeight = 720
  }

  onProgress(25, 'Creating side-by-side video...')

  const filterComplex =
    `[0:v]scale=-2:${leftHeight}[v0];[1:v]scale=-2:${leftHeight}[v1];[v0][v1]hstack=inputs=2:shortest=1[vout]`

  let execError: unknown = null
  try {
    await ffmpegInstance.exec([
      '-i', leftPath,
      '-i', rightPath,
      '-filter_complex', filterComplex,
      '-map', '[vout]',
      '-map', '0:a?',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '23',
      '-c:a', 'copy',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      outputPath
    ])
  } catch (err) {
    execError = err
  }

  ffmpegInstance.off('progress', progressHandler)
  ffmpegInstance.off('log', logHandler)

  onProgress(85, 'Reading output...')

  let outputData: Uint8Array
  try {
    outputData = await ffmpegInstance.readFile(outputPath)
  } catch {
    const detail = execError instanceof Error ? execError.message : String(execError)
    throw new Error(`Failed to read output file${execError ? `: ${detail}` : ''}`)
  }

  if (!outputData || outputData.length === 0) {
    throw new Error('Output file is empty')
  }

  onProgress(90, 'Cleaning up...')

  await ffmpegInstance.deleteFile(leftPath)
  await ffmpegInstance.deleteFile(rightPath)
  await ffmpegInstance.deleteFile(outputPath)

  onProgress(100, 'Complete!')

  const arrayBuffer = (outputData as Uint8Array).buffer.slice(0) as ArrayBuffer
  const blob = new Blob([arrayBuffer], { type: 'video/mp4' })

  return {
    blob,
    filename: 'side-by-side.mp4'
  }
}
