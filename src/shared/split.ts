export const SPLIT_DEFAULT = 0.45
export const SPLIT_MIN = 0.2
export const SPLIT_MAX = 0.8
export const SPLIT_DIVIDER = 6
export const WALL_MIN = 240
export const VIEWER_MIN = 320

export function clampSplitRatio(ratio: number, contentW: number): number {
  const safe = Number.isFinite(ratio) ? ratio : SPLIT_DEFAULT
  const bounded = Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, safe))
  if (!(contentW > 0)) return bounded

  const wallFloor = Math.max(SPLIT_MIN, Math.min(WALL_MIN / contentW, SPLIT_MAX))
  const viewerCap = Math.min(
    SPLIT_MAX,
    Math.max((contentW - VIEWER_MIN - SPLIT_DIVIDER) / contentW, SPLIT_MIN),
  )
  if (wallFloor > viewerCap) return bounded
  return Math.min(viewerCap, Math.max(wallFloor, bounded))
}

export function splitWidths(ratio: number, contentW: number): { wall: number; viewer: number } {
  const clamped = clampSplitRatio(ratio, contentW)
  const wall = Math.round(contentW * clamped)
  return { wall, viewer: Math.max(0, contentW - wall - SPLIT_DIVIDER) }
}
