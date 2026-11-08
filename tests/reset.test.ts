import { describe, expect, it } from 'vitest'
import { resetLayoutPatch, resetPrefsPatch } from '../src/shared/reset'

describe('reset patches', () => {
  it('恢复默认布局只重置窗口相关偏好', () => {
    expect(resetLayoutPatch()).toEqual({
      gridColumns: 4,
      detailOpen: true,
      splitRatio: 0.45,
    })
  })

  it('清理全部偏好包含目录与排序，窗口置空', () => {
    expect(resetPrefsPatch()).toEqual({
      lastFolder: null,
      sort: { key: 'name', order: 'asc' },
      gridColumns: 4,
      detailOpen: true,
      splitRatio: 0.45,
      theme: 'midnight',
      window: null,
    })
  })
})
