import { Transition, TransitionType, TextOverlay } from './types'

export interface VideoListEntry {
  name: string
  size: number
  type: string
  lastModified: number
  transitionAfter?: Transition
  textOverlay?: TextOverlay
}

export interface VideoListDefinition {
  version: 1
  name: string
  createdAt: string
  videos: VideoListEntry[]
}

export function saveListDefinition(videos: { name: string; size: number; type: string; lastModified: number; transitionAfter?: Transition; textOverlay?: TextOverlay }[], listName?: string): void {
  const definition: VideoListDefinition = {
    version: 1,
    name: listName || generateListName(),
    createdAt: new Date().toISOString(),
    videos: videos.map(v => ({
      name: v.name,
      size: v.size,
      type: v.type,
      lastModified: v.lastModified,
      transitionAfter: v.transitionAfter,
      textOverlay: v.textOverlay
    }))
  }

  const json = JSON.stringify(definition, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${definition.name}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function parseListDefinition(json: string): VideoListDefinition {
  const data = JSON.parse(json)

  if (!data.version || !data.videos || !Array.isArray(data.videos)) {
    throw new Error('Invalid list definition file')
  }

  if (data.version > 1) {
    throw new Error('Unsupported list definition version')
  }

  return data as VideoListDefinition
}

export function matchFilesToDefinition(
  definition: VideoListDefinition,
  files: File[]
): { matched: VideoListEntry[]; unmatched: string[] } {
  const matched: VideoListEntry[] = []
  const unmatched: string[] = []

  const fileMap = new Map<string, File>()
  for (const file of files) {
    fileMap.set(file.name, file)
  }

  for (const entry of definition.videos) {
    if (fileMap.has(entry.name)) {
      matched.push(entry)
      fileMap.delete(entry.name)
    } else {
      unmatched.push(entry.name)
    }
  }

  return { matched, unmatched }
}

function generateListName(): string {
  const now = new Date()
  const date = now.toISOString().split('T')[0]
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '-')
  return `video-list-${date}-${time}`
}
