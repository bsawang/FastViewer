import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import {
  CONFIG_DEFAULTS,
  TILE_SIZE_MAX,
  TILE_SIZE_MIN,
  type AppConfig,
  type ConfigPatch,
  type WindowPlacement,
} from '../shared/config'
import { SPLIT_MAX, SPLIT_MIN } from '../shared/split'
import { DEFAULT_THEME, isThemeName } from '../shared/theme'
import { checkAbsolutePath } from './path-guard'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function copy(config: AppConfig): AppConfig {
  return {
    ...config,
    sort: { ...config.sort },
    window: config.window ? { ...config.window } : null,
  }
}

function cleanTileSize(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return CONFIG_DEFAULTS.tileSize
  return Math.min(TILE_SIZE_MAX, Math.max(TILE_SIZE_MIN, Math.round(value)))
}

function cleanSplitRatio(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return CONFIG_DEFAULTS.splitRatio
  return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, value))
}

function cleanFolder(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const checked = checkAbsolutePath(value)
  return checked.ok ? checked.path : null
}

function cleanWindow(value: unknown): WindowPlacement | null {
  if (!isRecord(value)) return null
  const { x, y, width, height } = value
  const numbers = [x, y, width, height]
  if (!numbers.every((field) => typeof field === 'number' && Number.isFinite(field))) return null
  if ((width as number) <= 0 || (height as number) <= 0) return null
  return {
    x: Math.round(x as number),
    y: Math.round(y as number),
    width: Math.round(width as number),
    height: Math.round(height as number),
    maximized: typeof value.maximized === 'boolean' ? value.maximized : false,
  }
}

export function sanitizeConfig(raw: unknown): AppConfig {
  if (!isRecord(raw) || raw.version !== 1) return copy(CONFIG_DEFAULTS)

  const sort = isRecord(raw.sort) ? raw.sort : {}
  const key = sort.key === 'mtime' || sort.key === 'size' ? sort.key : 'name'
  const order = sort.order === 'desc' ? 'desc' : 'asc'

  return {
    version: 1,
    lastFolder: cleanFolder(raw.lastFolder),
    sort: { key, order },
    tileSize: cleanTileSize(raw.tileSize),
    detailOpen: typeof raw.detailOpen === 'boolean' ? raw.detailOpen : true,
    splitRatio: cleanSplitRatio(raw.splitRatio),
    theme: isThemeName(raw.theme) ? raw.theme : DEFAULT_THEME,
    window: cleanWindow(raw.window),
  }
}

export class ConfigStore {
  private readonly filePath: string
  private cache: AppConfig | null = null

  constructor(
    filePath: string,
    private readonly warn: (message: string) => void = () => {},
  ) {
    this.filePath = filePath
  }

  get(): AppConfig {
    if (!this.cache) this.cache = this.read()
    return copy(this.cache)
  }

  patch(patch: ConfigPatch): AppConfig {
    if (typeof patch !== 'object' || patch === null) return this.get()
    const current = this.get()
    const merged = {
      ...current,
      lastFolder: patch.lastFolder === undefined ? current.lastFolder : patch.lastFolder,
      sort: patch.sort ? { ...current.sort, ...patch.sort } : current.sort,
      tileSize: patch.tileSize === undefined ? current.tileSize : patch.tileSize,
      detailOpen: patch.detailOpen === undefined ? current.detailOpen : patch.detailOpen,
      splitRatio: patch.splitRatio === undefined ? current.splitRatio : patch.splitRatio,
      theme: patch.theme === undefined ? current.theme : patch.theme,
      window: patch.window === undefined ? current.window : patch.window,
    }
    const next = sanitizeConfig(merged)
    this.write(next)
    this.cache = next
    return copy(next)
  }

  private read(): AppConfig {
    try {
      return sanitizeConfig(JSON.parse(readFileSync(this.filePath, 'utf8')))
    } catch {
      return copy(CONFIG_DEFAULTS)
    }
  }

  private write(config: AppConfig): void {
    try {
      mkdirSync(dirname(this.filePath), { recursive: true })
      const temporary = `${this.filePath}.${process.pid}.tmp`
      writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`)
      renameSync(temporary, this.filePath)
    } catch (error) {
      this.warn(`config write failed: ${String(error)}`)
    }
  }
}
