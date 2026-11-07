export type AssociationGroup = 'image' | 'video'

export type AssociationDefault = 'self' | 'other' | 'none'

export type AssociationCategory = 'bitmap' | 'vector' | 'video'

export interface AssociationCategoryDef {
  id: AssociationCategory
  label: string
  color: string
}

export interface AssociationGroupDef {
  id: AssociationGroup
  label: string
  description: string
  exts: readonly string[]
}

export interface AssociationTypeInfo {
  ext: string
  group: AssociationGroup
  registered: boolean
  defaultApp: AssociationDefault
}

export interface AssociationInfo {
  editable: boolean
  exePath: string
  types: AssociationTypeInfo[]
}

export const ASSOCIATION_CATEGORIES: Record<AssociationCategory, AssociationCategoryDef> = {
  bitmap: { id: 'bitmap', label: '位图', color: '#7F56D9' },
  vector: { id: 'vector', label: '矢量图', color: '#12B76A' },
  video: { id: 'video', label: '视频', color: '#F04438' },
}

export const ASSOCIATION_GROUPS: readonly AssociationGroupDef[] = [
  {
    id: 'image',
    label: '图片',
    description: 'FastViewer 图片',
    exts: ['jpg', 'jpeg', 'jfif', 'png', 'apng', 'gif', 'webp', 'avif', 'bmp', 'ico', 'svg'],
  },
  {
    id: 'video',
    label: '视频',
    description: 'FastViewer 视频',
    exts: ['mp4', 'm4v', 'webm', 'ogv', 'ogg', 'mov', 'mkv'],
  },
] as const

export const ASSOCIATION_EXTS: readonly string[] = ASSOCIATION_GROUPS.flatMap((group) => group.exts)

const VECTOR_EXTS = new Set(['svg'])

export function normalizeAssociationExt(value: string): string {
  return value.trim().toLowerCase().replace(/^\./, '')
}

export function associationDef(value: string): AssociationGroupDef | null {
  const ext = normalizeAssociationExt(value)
  for (const group of ASSOCIATION_GROUPS) {
    if (group.exts.includes(ext)) return group
  }
  return null
}

export function associationCategory(value: string): AssociationCategory {
  const ext = normalizeAssociationExt(value)
  if (VECTOR_EXTS.has(ext)) return 'vector'
  return associationDef(ext)?.id === 'video' ? 'video' : 'bitmap'
}

export function associationProgId(value: string): string {
  return `FastViewer.${normalizeAssociationExt(value)}`
}

export function associationIconFileName(value: string, kind: 'svg' | 'ico'): string {
  return `${normalizeAssociationExt(value)}.${kind}`
}
