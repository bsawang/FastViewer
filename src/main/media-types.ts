export type MediaKind = 'dir' | 'image' | 'video'

const IMAGE_EXTS = new Set([
  'jpg',
  'jpeg',
  'jfif',
  'png',
  'apng',
  'gif',
  'webp',
  'avif',
  'bmp',
  'ico',
  'svg',
])

const VIDEO_EXTS = new Set(['mp4', 'm4v', 'webm', 'ogv', 'ogg', 'mov', 'mkv'])

export function isHiddenName(name: string): boolean {
  if (name.startsWith('.')) return true
  const lower = name.toLowerCase()
  return lower === 'desktop.ini' || lower === 'thumbs.db'
}

export function classifyFile(name: string): { kind: MediaKind; ext: string } | null {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return null
  const ext = name.slice(dot + 1).toLowerCase()
  if (IMAGE_EXTS.has(ext)) return { kind: 'image', ext }
  if (VIDEO_EXTS.has(ext)) return { kind: 'video', ext }
  return null
}
