import type { GridItem } from './grid'

export interface MediaItem {
  kind: 'image' | 'video'
  path: string
  name: string
  size: number
  mtimeMs: number
  url: string
}

export function buildMediaSeq(items: GridItem[]): MediaItem[] {
  const seq: MediaItem[] = []
  for (const item of items) {
    if (item.kind !== 'image' && item.kind !== 'video') continue
    seq.push({
      kind: item.kind,
      path: item.path,
      name: item.name,
      size: item.size,
      mtimeMs: item.mtimeMs,
      url: `/api/file?path=${encodeURIComponent(item.path)}&v=${item.mtimeMs}`,
    })
  }
  return seq
}

export function wrapIndex(index: number, length: number): number {
  if (length <= 0) return -1
  return ((index % length) + length) % length
}
