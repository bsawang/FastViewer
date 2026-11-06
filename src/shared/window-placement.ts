import type { WindowPlacement } from './config'
import type { Rect } from './window-state'

const MIN_WIDTH = 720
const MIN_HEIGHT = 480
const MIN_VISIBLE_RATIO = 0.3

export interface PlacedWindow {
  bounds: Rect
  maximized: boolean
}

function overlapArea(a: Rect, b: Rect): number {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  return width > 0 && height > 0 ? width * height : 0
}

export function placeWindow(
  placement: WindowPlacement | null,
  workAreas: Rect[],
): PlacedWindow | null {
  if (!placement || workAreas.length === 0) return null
  const { x, y, width, height } = placement
  if (![x, y, width, height].every((value) => Number.isFinite(value))) return null
  const bounds: Rect = {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(MIN_WIDTH, Math.round(width)),
    height: Math.max(MIN_HEIGHT, Math.round(height)),
  }
  const area = bounds.width * bounds.height
  const visible = workAreas.reduce((sum, workArea) => sum + overlapArea(bounds, workArea), 0)
  if (visible / area < MIN_VISIBLE_RATIO) return null
  return { bounds, maximized: placement.maximized === true }
}
