import { describe, expect, it } from 'vitest'
import {
  anchorScrollTop,
  clampColumns,
  computeMetrics,
  focusScrollTop,
  rowIndexAt,
  tilePosition,
  visibleRange,
} from '../src/web/grid-math'

describe('computeMetrics', () => {
  it('按列数计算图块尺寸，行高为图块尺寸 + 间距', () => {
    const metrics = computeMetrics(1000, 5, 11)

    expect(metrics.cols).toBe(5)
    expect(metrics.tileSize).toBe(187)
    expect(metrics.rows).toBe(3)
    expect(metrics.rowHeights).toEqual([195, 195, 195])
    expect(metrics.rowTops).toEqual([16, 211, 406])
    expect(metrics.totalH).toBe(617)
  })

  it('列数越多图块越小', () => {
    expect(computeMetrics(1000, 2, 1).tileSize).toBe(480)
    expect(computeMetrics(1000, 10, 1).tileSize).toBe(89)
  })

  it('不满一行的条目行高与满载行一致', () => {
    const metrics = computeMetrics(1000, 5, 6)

    expect(metrics.rows).toBe(2)
    expect(metrics.rowHeights).toEqual([195, 195])
    expect(metrics.rowTops).toEqual([16, 211])
    expect(metrics.totalH).toBe(422)
  })

  it('容器过窄或为 0 时至少 1 列', () => {
    expect(computeMetrics(0, 5, 5).cols).toBe(1)
    expect(computeMetrics(100, 5, 5).cols).toBe(1)
  })

  it('空列表总高只含上下内边距', () => {
    const metrics = computeMetrics(1000, 5, 0)

    expect(metrics.rows).toBe(0)
    expect(metrics.rowTops).toEqual([])
    expect(metrics.totalH).toBe(32)
  })
})

describe('rowIndexAt', () => {
  it('定位滚动位置所在行，越过末尾钳到末行', () => {
    const metrics = computeMetrics(1000, 5, 11)

    expect(rowIndexAt(metrics.rowTops, 0)).toBe(0)
    expect(rowIndexAt(metrics.rowTops, 210)).toBe(0)
    expect(rowIndexAt(metrics.rowTops, 211)).toBe(1)
    expect(rowIndexAt(metrics.rowTops, 99999)).toBe(2)
  })
})

describe('tilePosition', () => {
  it('图块按列换行并叠加内边距', () => {
    const metrics = computeMetrics(1000, 5, 11)

    expect(tilePosition(0, 5, metrics)).toEqual({ left: 16, top: 16 })
    expect(tilePosition(4, 5, metrics)).toEqual({ left: 16 + 4 * 195, top: 16 })
    expect(tilePosition(6, 5, metrics)).toEqual({ left: 16 + 195, top: 211 })
  })
})

describe('visibleRange', () => {
  it('包含 overscan 行', () => {
    const metrics = computeMetrics(1000, 5, 100)
    expect(visibleRange(0, 400, metrics, 100, 2)).toEqual({ start: 0, end: 20 })
  })

  it('滚动中段索引正确', () => {
    const metrics = computeMetrics(1000, 5, 100)
    expect(visibleRange(1000, 400, metrics, 100, 2)).toEqual({ start: 15, end: 50 })
  })

  it('无 overscan 时只覆盖可见行', () => {
    const metrics = computeMetrics(1000, 5, 11)
    expect(visibleRange(220, 260, metrics, 11, 0)).toEqual({ start: 5, end: 11 })
  })

  it('末尾钳制到条目总数', () => {
    const metrics = computeMetrics(1000, 5, 7)
    expect(visibleRange(0, 400, metrics, 7, 2)).toEqual({ start: 0, end: 7 })
  })

  it('空列表返回空区间', () => {
    const metrics = computeMetrics(1000, 5, 0)
    expect(visibleRange(0, 400, metrics, 0, 2)).toEqual({ start: 0, end: 0 })
  })
})

describe('anchorScrollTop', () => {
  it('保持锚点条目在视口内的偏移', () => {
    const metrics = computeMetrics(1000, 5, 13)
    expect(anchorScrollTop(12, 40, 5, metrics)).toBe(16 + 2 * 195 + 40)
  })

  it('列数变化后锚点换行仍保持偏移', () => {
    const metrics = computeMetrics(800, 4, 13)
    expect(metrics.cols).toBe(4)
    expect(anchorScrollTop(12, 40, 4, metrics)).toBe(16 + 3 * 194 + 40)
  })

  it('图块尺寸变化后行高与 rowTops 跟随', () => {
    const metrics = computeMetrics(1000, 6, 13)
    expect(anchorScrollTop(12, 40, 5, metrics)).toBe(16 + 2 * 162 + 40)
  })

  it('锚点落在对应行的顶部偏移', () => {
    const metrics = computeMetrics(1000, 5, 11)
    expect(anchorScrollTop(7, 40, 5, metrics)).toBe(211 + 40)
    expect(anchorScrollTop(2, 4, 5, metrics)).toBe(16 + 4)
  })
})

describe('clampColumns', () => {
  it('钳制在 2–10 并对齐整数', () => {
    expect(clampColumns(0)).toBe(2)
    expect(clampColumns(20)).toBe(10)
    expect(clampColumns(4.4)).toBe(4)
    expect(clampColumns(4)).toBe(4)
  })
})

describe('focusScrollTop', () => {
  const metrics = computeMetrics(1000, 5, 11)

  it('当前行可见（含部分可见）时不滚动', () => {
    expect(focusScrollTop(2, 0, 400, metrics)).toBeNull()
    expect(focusScrollTop(6, 150, 100, metrics)).toBeNull()
    expect(focusScrollTop(10, 330, 100, metrics)).toBeNull()
  })

  it('当前行完全在上方或下方时贴顶', () => {
    expect(focusScrollTop(6, 0, 100, metrics)).toBe(195)
    expect(focusScrollTop(10, 0, 100, metrics)).toBe(390)
    expect(focusScrollTop(0, 300, 100, metrics)).toBe(0)
  })

  it('空列表或负索引不滚动', () => {
    expect(focusScrollTop(0, 0, 400, computeMetrics(1000, 5, 0))).toBeNull()
    expect(focusScrollTop(-1, 0, 400, metrics)).toBeNull()
  })
})
