import { describe, expect, it } from 'vitest'
import {
  TILE_MAX,
  TILE_MIN,
  TILE_STEP,
  anchorScrollTop,
  clampTileSize,
  computeMetrics,
  focusScrollTop,
  rowIndexAt,
  tilePosition,
  visibleRange,
} from '../src/web/grid-math'

describe('computeMetrics', () => {
  it('行高固定为图块尺寸 + 间距，与文件名长短无关', () => {
    const metrics = computeMetrics(1000, 180, 11)

    expect(metrics.cols).toBe(5)
    expect(metrics.rows).toBe(3)
    expect(metrics.rowHeights).toEqual([188, 188, 188])
    expect(metrics.rowTops).toEqual([16, 204, 392])
    expect(metrics.totalH).toBe(596)
  })

  it('不满一行的条目行高与满载行一致', () => {
    const metrics = computeMetrics(1000, 180, 6)

    expect(metrics.rows).toBe(2)
    expect(metrics.rowHeights).toEqual([188, 188])
    expect(metrics.rowTops).toEqual([16, 204])
    expect(metrics.totalH).toBe(408)
  })

  it('容器过窄或为 0 时至少 1 列', () => {
    expect(computeMetrics(0, 180, 5).cols).toBe(1)
    expect(computeMetrics(100, 180, 5).cols).toBe(1)
  })

  it('空列表总高只含上下内边距', () => {
    const metrics = computeMetrics(1000, 180, 0)

    expect(metrics.rows).toBe(0)
    expect(metrics.rowTops).toEqual([])
    expect(metrics.totalH).toBe(32)
  })
})

describe('rowIndexAt', () => {
  it('定位滚动位置所在行，越过末尾钳到末行', () => {
    const metrics = computeMetrics(1000, 180, 11)

    expect(rowIndexAt(metrics.rowTops, 0)).toBe(0)
    expect(rowIndexAt(metrics.rowTops, 203)).toBe(0)
    expect(rowIndexAt(metrics.rowTops, 204)).toBe(1)
    expect(rowIndexAt(metrics.rowTops, 99999)).toBe(2)
  })
})

describe('tilePosition', () => {
  it('图块按列换行并叠加内边距', () => {
    const metrics = computeMetrics(1000, 180, 11)

    expect(tilePosition(0, 5, metrics, 180)).toEqual({ left: 16, top: 16 })
    expect(tilePosition(4, 5, metrics, 180)).toEqual({ left: 16 + 4 * 188, top: 16 })
    expect(tilePosition(6, 5, metrics, 180)).toEqual({ left: 16 + 188, top: 204 })
  })
})

describe('visibleRange', () => {
  it('包含 overscan 行', () => {
    const metrics = computeMetrics(1000, 180, 100)
    expect(visibleRange(0, 400, metrics, 100, 2)).toEqual({ start: 0, end: 25 })
  })

  it('滚动中段索引正确', () => {
    const metrics = computeMetrics(1000, 180, 100)
    expect(visibleRange(1000, 400, metrics, 100, 2)).toEqual({ start: 15, end: 50 })
  })

  it('无 overscan 时只覆盖可见行', () => {
    const metrics = computeMetrics(1000, 180, 11)
    expect(visibleRange(220, 260, metrics, 11, 0)).toEqual({ start: 5, end: 11 })
  })

  it('末尾钳制到条目总数', () => {
    const metrics = computeMetrics(1000, 180, 7)
    expect(visibleRange(0, 400, metrics, 7, 2)).toEqual({ start: 0, end: 7 })
  })

  it('空列表返回空区间', () => {
    const metrics = computeMetrics(1000, 180, 0)
    expect(visibleRange(0, 400, metrics, 0, 2)).toEqual({ start: 0, end: 0 })
  })
})

describe('anchorScrollTop', () => {
  it('保持锚点条目在视口内的偏移', () => {
    const metrics = computeMetrics(1000, 180, 13)
    expect(anchorScrollTop(12, 40, 5, metrics)).toBe(16 + 2 * 188 + 40)
  })

  it('列数变化后锚点换行仍保持偏移', () => {
    const metrics = computeMetrics(800, 180, 13)
    expect(metrics.cols).toBe(4)
    expect(anchorScrollTop(12, 40, 4, metrics)).toBe(16 + 3 * 188 + 40)
  })

  it('图块尺寸变化后行高与 rowTops 跟随', () => {
    const metrics = computeMetrics(1000, 196, 13)
    expect(anchorScrollTop(12, 40, 5, metrics)).toBe(16 + 2 * 204 + 40)
  })

  it('锚点落在对应行的顶部偏移', () => {
    const metrics = computeMetrics(1000, 180, 11)
    expect(anchorScrollTop(7, 40, 5, metrics)).toBe(204 + 40)
    expect(anchorScrollTop(2, 4, 5, metrics)).toBe(16 + 4)
  })
})

describe('clampTileSize', () => {
  it('钳制在 96–320 并对齐整数', () => {
    expect(clampTileSize(50)).toBe(TILE_MIN)
    expect(clampTileSize(400)).toBe(TILE_MAX)
    expect(clampTileSize(180.4)).toBe(180)
    expect(clampTileSize(180)).toBe(180)
  })

  it('每格缩放步长 ±16', () => {
    expect(clampTileSize(180 + TILE_STEP)).toBe(196)
    expect(clampTileSize(96 - TILE_STEP)).toBe(96)
    expect(clampTileSize(320 + TILE_STEP)).toBe(320)
  })
})

describe('focusScrollTop', () => {
  const metrics = computeMetrics(1000, 180, 11)

  it('当前行可见（含部分可见）时不滚动', () => {
    expect(focusScrollTop(2, 0, 400, metrics)).toBeNull()
    expect(focusScrollTop(6, 150, 100, metrics)).toBeNull()
    expect(focusScrollTop(10, 330, 100, metrics)).toBeNull()
  })

  it('当前行完全在上方或下方时贴顶', () => {
    expect(focusScrollTop(6, 0, 100, metrics)).toBe(188)
    expect(focusScrollTop(10, 0, 100, metrics)).toBe(376)
    expect(focusScrollTop(0, 300, 100, metrics)).toBe(0)
  })

  it('空列表或负索引不滚动', () => {
    expect(focusScrollTop(0, 0, 400, computeMetrics(1000, 180, 0))).toBeNull()
    expect(focusScrollTop(-1, 0, 400, metrics)).toBeNull()
  })
})
