import { OverlayConfig, DEFAULT_OVERLAY_CONFIG, SideBySideConfig, DEFAULT_SIDE_BY_SIDE_CONFIG, Transition, TextOverlay } from './types'
import { retrieveFile, buildFileKey } from './fileStorage'

const STORAGE_KEY = 'video-stitcher-state'

interface SavedVideoEntry {
  id: string
  name: string
  size: number
  type: string
  lastModified: number
  duration?: number
  transitionAfter?: Transition
  textOverlay?: TextOverlay
}

interface SavedState {
  videos: SavedVideoEntry[]
  overlayConfig: OverlayConfig
  sideBySideConfig: SideBySideConfig
}

export function saveState(
  videos: { id: string; name: string; size: number; type: string; lastModified: number; duration?: number; transitionAfter?: Transition; textOverlay?: TextOverlay }[],
  overlayConfig: OverlayConfig,
  sideBySideConfig: SideBySideConfig
): void {
  try {
    const saved: SavedState = {
      videos: videos.map(v => ({
        id: v.id,
        name: v.name,
        size: v.size,
        type: v.type,
        lastModified: v.lastModified,
        duration: v.duration,
        transitionAfter: v.transitionAfter,
        textOverlay: v.textOverlay
      })),
      overlayConfig,
      sideBySideConfig
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  } catch {
    // localStorage may be full or unavailable
  }
}

export async function restoreState(): Promise<{
  videos: { id: string; file: File; name: string; size: number; type: string; lastModified: number; duration?: number; transitionAfter?: Transition; textOverlay?: TextOverlay }[]
  overlayConfig: OverlayConfig
  sideBySideConfig: SideBySideConfig
} | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const saved: SavedState = JSON.parse(raw)
    if (!saved.videos || !Array.isArray(saved.videos) || saved.videos.length === 0) return null

    const restored = []
    for (const entry of saved.videos) {
      const key = buildFileKey(entry.name, entry.size, entry.lastModified)
      const file = await retrieveFile(key)
      if (!file) return null
      restored.push({ ...entry, file })
    }

    return {
      videos: restored,
      overlayConfig: saved.overlayConfig || DEFAULT_OVERLAY_CONFIG,
      sideBySideConfig: saved.sideBySideConfig || DEFAULT_SIDE_BY_SIDE_CONFIG
    }
  } catch {
    return null
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
