import { SPLIT_DEFAULT } from './split'
import { DEFAULT_THEME, type ThemeName } from './theme'

export type SortKey = 'name' | 'mtime' | 'size'
export type SortOrder = 'asc' | 'desc'

export interface WindowPlacement {
  x: number
  y: number
  width: number
  height: number
  maximized: boolean
}

export interface AppConfig {
  version: 1
  lastFolder: string | null
  sort: { key: SortKey; order: SortOrder }
  tileSize: number
  detailOpen: boolean
  splitRatio: number
  theme: ThemeName
  window: WindowPlacement | null
}

export interface ConfigPatch {
  lastFolder?: string | null
  sort?: { key?: SortKey; order?: SortOrder }
  tileSize?: number
  detailOpen?: boolean
  splitRatio?: number
  theme?: ThemeName
  window?: WindowPlacement | null
}

export const TILE_SIZE_MIN = 96
export const TILE_SIZE_MAX = 320
export const TILE_SIZE_STEP = 16

export const CONFIG_DEFAULTS: AppConfig = {
  version: 1,
  lastFolder: null,
  sort: { key: 'name', order: 'asc' },
  tileSize: 180,
  detailOpen: true,
  splitRatio: SPLIT_DEFAULT,
  theme: DEFAULT_THEME,
  window: null,
}
