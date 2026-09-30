export type TransitionType =
  | 'cut'
  | 'fade'
  | 'fadeblack'
  | 'fadewhite'
  | 'dissolve'
  | 'wipeleft'
  | 'wiperight'
  | 'wipeup'
  | 'wipedown'
  | 'slideleft'
  | 'slideright'
  | 'circlecrop'
  | 'radial'
  | 'pixelize'
  | 'smoothleft'
  | 'smoothright'
  | 'zoomin'

export interface Transition {
  type: TransitionType
  duration: number
}

export const DEFAULT_TRANSITION: Transition = { type: 'cut', duration: 1.0 }

export const TRANSITION_OPTIONS: { type: TransitionType; label: string; icon: string }[] = [
  { type: 'cut', label: 'Cut', icon: '–––' },
  { type: 'fade', label: 'Fade', icon: '◐' },
  { type: 'fadeblack', label: 'Fade Black', icon: '◑' },
  { type: 'fadewhite', label: 'Fade White', icon: '◒' },
  { type: 'dissolve', label: 'Dissolve', icon: '◓' },
  { type: 'wipeleft', label: 'Wipe Left', icon: '←' },
  { type: 'wiperight', label: 'Wipe Right', icon: '→' },
  { type: 'wipeup', label: 'Wipe Up', icon: '↑' },
  { type: 'wipedown', label: 'Wipe Down', icon: '↓' },
  { type: 'slideleft', label: 'Slide Left', icon: '≺' },
  { type: 'slideright', label: 'Slide Right', icon: '≻' },
  { type: 'circlecrop', label: 'Circle Crop', icon: '◎' },
  { type: 'radial', label: 'Radial', icon: '↻' },
  { type: 'pixelize', label: 'Pixelize', icon: '▦' },
  { type: 'smoothleft', label: 'Smooth Left', icon: '⇤' },
  { type: 'smoothright', label: 'Smooth Right', icon: '⇥' },
  { type: 'zoomin', label: 'Zoom In', icon: '⊕' },
]

export interface VideoItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  duration?: number;
  thumbnail?: string;
  transitionAfter?: Transition;
  textOverlay?: TextOverlay;
}

export type TextPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'

export interface TextOverlay {
  text: string
  fontSize: number
  position: TextPosition
  color: string
}

export const TEXT_POSITIONS: { value: TextPosition; label: string }[] = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-center', label: 'Top Center' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'center-left', label: 'Center Left' },
  { value: 'center', label: 'Center' },
  { value: 'center-right', label: 'Center Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-center', label: 'Bottom Center' },
  { value: 'bottom-right', label: 'Bottom Right' },
]

export const FONT_SIZES = [16, 20, 24, 28, 32, 36, 48, 64, 72]

export type AppMode = 'stitch' | 'overlay' | 'side-by-side'

export type OverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'

export type OverlayAudioSource = 'main' | 'overlay' | 'none'

export const OVERLAY_AUDIO_SOURCES: { value: OverlayAudioSource; label: string }[] = [
  { value: 'main', label: 'Main Video Audio' },
  { value: 'overlay', label: 'Overlay Video Audio' },
  { value: 'none', label: 'No Audio' },
]

export type OverlayDurationSource = 'shortest' | 'main' | 'overlay'

export const OVERLAY_DURATION_SOURCES: { value: OverlayDurationSource; label: string }[] = [
  { value: 'shortest', label: 'Shortest Video' },
  { value: 'main', label: 'Main Video Length' },
  { value: 'overlay', label: 'Overlay Video Length' },
]

export interface OverlayConfig {
  mainVideoId: string | null
  overlayVideoId: string | null
  position: OverlayPosition
  scale: number
  audioSource: OverlayAudioSource
  durationSource: OverlayDurationSource
  flipMain: boolean
  flipOverlay: boolean
}

export const DEFAULT_OVERLAY_CONFIG: OverlayConfig = {
  mainVideoId: null,
  overlayVideoId: null,
  position: 'bottom-right',
  scale: 0.3,
  audioSource: 'main',
  durationSource: 'shortest',
  flipMain: false,
  flipOverlay: false
}

export interface SideBySideConfig {
  leftVideoId: string | null
  rightVideoId: string | null
}

export const DEFAULT_SIDE_BY_SIDE_CONFIG: SideBySideConfig = {
  leftVideoId: null,
  rightVideoId: null
}

export const OVERLAY_POSITIONS: { value: OverlayPosition; label: string }[] = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'center', label: 'Center' },
]

export const OVERLAY_SCALES = [0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5]

export type AppStatus = "idle" | "preparing" | "processing" | "complete" | "error";

export interface AppState {
  videos: VideoItem[];
  status: AppStatus;
  progress: number;
  statusMessage: string;
  outputFile?: Blob;
  outputFilename?: string;
  error?: string;
  processingStartedAt?: number;
  processingDuration?: number;
  mode: AppMode;
  overlayConfig: OverlayConfig;
  sideBySideConfig: SideBySideConfig;
  ffmpegLogs: string[];
}
