import type { ConfigPatch } from './config'
import { CONFIG_DEFAULTS } from './config'

export type ResetKind = 'layout' | 'prefs'

export function resetLayoutPatch(): ConfigPatch {
  return {
    tileSize: CONFIG_DEFAULTS.tileSize,
    detailOpen: CONFIG_DEFAULTS.detailOpen,
    splitRatio: CONFIG_DEFAULTS.splitRatio,
  }
}

export function resetPrefsPatch(): ConfigPatch {
  return {
    lastFolder: null,
    sort: { ...CONFIG_DEFAULTS.sort },
    tileSize: CONFIG_DEFAULTS.tileSize,
    detailOpen: CONFIG_DEFAULTS.detailOpen,
    splitRatio: CONFIG_DEFAULTS.splitRatio,
    theme: CONFIG_DEFAULTS.theme,
    window: null,
  }
}

export function resetPatch(kind: ResetKind): ConfigPatch {
  return kind === 'layout' ? resetLayoutPatch() : resetPrefsPatch()
}
