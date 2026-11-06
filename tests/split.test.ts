import { describe, expect, it } from 'vitest'
import {
  SPLIT_DEFAULT,
  SPLIT_DIVIDER,
  SPLIT_MAX,
  SPLIT_MIN,
  clampSplitRatio,
  splitWidths,
} from '../src/shared/split'

describe('clampSplitRatio', () => {
  it('比例在 20%–80% 内原样返回', () => {
    expect(clampSplitRatio(0.45, 1200)).toBeCloseTo(0.45)
    expect(clampSplitRatio(0.6, 1200)).toBeCloseTo(0.6)
  })

  it('越界钳制到 20% / 80%', () => {
    expect(clampSplitRatio(0.05, 1200)).toBeCloseTo(SPLIT_MIN)
    expect(clampSplitRatio(2, 2000)).toBeCloseTo(SPLIT_MAX)
    expect(SPLIT_MIN).toBeCloseTo(0.2)
    expect(SPLIT_MAX).toBeCloseTo(0.8)
  })

  it('图墙不足 240px 时按最小宽度反推', () => {
    expect(clampSplitRatio(0.2, 600)).toBeCloseTo(240 / 600)
  })

  it('查看器不足 320px 时按最小宽度反推', () => {
    expect(clampSplitRatio(0.8, 800)).toBeCloseTo((800 - 320 - SPLIT_DIVIDER) / 800)
  })

  it('内容区过窄无法同时满足最小宽度时回落到比例边界', () => {
    expect(clampSplitRatio(0.45, 500)).toBeCloseTo(SPLIT_DEFAULT)
  })

  it('NaN 回默认比例', () => {
    expect(clampSplitRatio(Number.NaN, 1200)).toBeCloseTo(SPLIT_DEFAULT)
    expect(SPLIT_DEFAULT).toBeCloseTo(0.45)
  })
})

describe('splitWidths', () => {
  it('宽度包含 6px 分隔条且合计等于内容宽', () => {
    const { wall, viewer } = splitWidths(0.45, 1000)

    expect(wall).toBe(450)
    expect(viewer).toBe(544)
    expect(wall + viewer + SPLIT_DIVIDER).toBe(1000)
  })

  it('反推后仍满足最小宽度', () => {
    const { wall, viewer } = splitWidths(0.8, 800)

    expect(wall).toBeGreaterThanOrEqual(240)
    expect(viewer).toBeGreaterThanOrEqual(320)
  })
})
