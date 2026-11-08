import { describe, expect, it } from 'vitest'
import {
  extensionLabel,
  formatBitrate,
  formatDuration,
  formatPixels,
} from '../src/web/media-info'

describe('extensionLabel', () => {
  it('取大写扩展名', () => {
    expect(extensionLabel('a.WEBP')).toBe('WEBP')
    expect(extensionLabel('model.v1.ckpt')).toBe('CKPT')
    expect(extensionLabel('noext')).toBe('未知')
    expect(extensionLabel('.hidden')).toBe('未知')
  })
})

describe('formatPixels', () => {
  it('按万像素展示总像素', () => {
    expect(formatPixels(1920, 1080)).toBe('207 万像素')
    expect(formatPixels(64, 64)).toBe('4096 像素')
    expect(formatPixels(0, 0)).toBe('—')
  })
})

describe('formatDuration', () => {
  it('格式化时长', () => {
    expect(formatDuration(12)).toBe('0:12')
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(3725)).toBe('1:02:05')
    expect(formatDuration(0)).toBe('—')
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('—')
  })
})

describe('formatBitrate', () => {
  it('按文件大小与时长计算平均码率', () => {
    expect(formatBitrate(10 * 1024 * 1024, 30)).toBe('2.8 Mbps')
    expect(formatBitrate(500 * 1024, 10)).toBe('410 kbps')
    expect(formatBitrate(0, 10)).toBe('—')
    expect(formatBitrate(1024, 0)).toBe('—')
  })
})
