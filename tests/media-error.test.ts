import { describe, expect, it } from 'vitest'
import { mapMediaError } from '../src/web/media-error'

describe('mapMediaError', () => {
  it.each([
    [1, '视频加载已取消'],
    [2, '视频加载失败，请重试'],
    [3, '视频解码失败'],
    [4, '该视频格式无法播放'],
  ])('maps MediaError code %i', (code, message) => {
    expect(mapMediaError(code)).toBe(message)
  })

  it('falls back to a generic message for unknown codes', () => {
    expect(mapMediaError(0)).toBe('视频无法播放')
    expect(mapMediaError(99)).toBe('视频无法播放')
    expect(mapMediaError(Number.NaN)).toBe('视频无法播放')
  })
})
