export const PLACE_IDS = [
  'desktop',
  'downloads',
  'documents',
  'pictures',
  'music',
  'videos',
] as const

export type PlaceId = (typeof PLACE_IDS)[number]

export interface PlaceInfo {
  id: string
  label: string
  path: string
}

export const PLACE_LABELS: Record<PlaceId, string> = {
  desktop: '桌面',
  downloads: '下载',
  documents: '文档',
  pictures: '图片',
  music: '音乐',
  videos: '视频',
}
