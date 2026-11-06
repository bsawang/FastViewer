export const GRID_PADDING = 16
export const GRID_GAP = 8
export const TILE_MIN = 96
export const TILE_MAX = 320
export const TILE_STEP = 16

export interface GridMetrics {
  cols: number
  rows: number
  rowHeights: number[]
  rowTops: number[]
  totalH: number
}

export function computeMetrics(width: number, tileSize: number, count: number): GridMetrics {
  const cols = Math.max(1, Math.floor((width - GRID_PADDING * 2 + GRID_GAP) / (tileSize + GRID_GAP)))
  const rows = count > 0 ? Math.ceil(count / cols) : 0
  const height = tileSize + GRID_GAP
  const rowHeights: number[] = []
  const rowTops: number[] = []

  for (let row = 0; row < rows; row += 1) {
    rowTops.push(GRID_PADDING + row * height)
    rowHeights.push(height)
  }

  return { cols, rows, rowHeights, rowTops, totalH: GRID_PADDING + rows * height + GRID_PADDING }
}

export function rowIndexAt(rowTops: number[], y: number): number {
  if (rowTops.length === 0) return 0
  let lo = 0
  let hi = rowTops.length - 1
  let found = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (rowTops[mid] <= y) {
      found = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return found
}

export function tilePosition(
  index: number,
  cols: number,
  metrics: GridMetrics,
  tileSize: number,
): { left: number; top: number } {
  if (cols <= 0) return { left: GRID_PADDING, top: GRID_PADDING }
  const row = Math.floor(index / cols)
  const col = index % cols
  return {
    left: GRID_PADDING + col * (tileSize + GRID_GAP),
    top: metrics.rowTops[row] ?? GRID_PADDING,
  }
}

export function visibleRange(
  scrollTop: number,
  viewportH: number,
  metrics: GridMetrics,
  count: number,
  overscan = 2,
): { start: number; end: number } {
  if (count === 0 || metrics.rows === 0) return { start: 0, end: 0 }
  const firstRow = rowIndexAt(metrics.rowTops, Math.max(0, scrollTop))
  const lastRow = rowIndexAt(metrics.rowTops, scrollTop + Math.max(0, viewportH))
  const lo = Math.max(0, firstRow - overscan)
  const hi = Math.min(metrics.rows - 1, lastRow + overscan)
  return {
    start: lo * metrics.cols,
    end: Math.min(count, (hi + 1) * metrics.cols),
  }
}

export function anchorScrollTop(
  anchorIndex: number,
  offsetInTile: number,
  cols: number,
  metrics: GridMetrics,
): number {
  const row = Math.floor(anchorIndex / Math.max(1, cols))
  return (metrics.rowTops[row] ?? GRID_PADDING) + offsetInTile
}

export function focusScrollTop(
  index: number,
  scrollTop: number,
  viewportH: number,
  metrics: GridMetrics,
): number | null {
  if (index < 0 || metrics.rows === 0) return null
  const row = Math.min(metrics.rows - 1, Math.floor(index / Math.max(1, metrics.cols)))
  const top = metrics.rowTops[row] ?? GRID_PADDING
  const bottom = top + (metrics.rowHeights[row] ?? 0)
  const visible = bottom > scrollTop && top < scrollTop + viewportH
  if (visible) return null
  return Math.max(0, top - GRID_PADDING)
}

export function clampTileSize(value: number): number {
  return Math.min(TILE_MAX, Math.max(TILE_MIN, Math.round(value)))
}
