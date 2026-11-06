import { describe, expect, it } from 'vitest'
import { buildMediaSeq, wrapIndex } from '../src/web/media-seq'
import type { GridItem } from '../src/web/grid'

const entries: GridItem[] = [
  { name: '返回上级', path: 'E:\\', kind: 'dir', size: 0, mtimeMs: 0 },
  { name: 'a.jpg', path: 'E:\\a.jpg', kind: 'image', size: 10, mtimeMs: 1, ext: 'jpg' },
  { name: 'b.mp4', path: 'E:\\b.mp4', kind: 'video', size: 20, mtimeMs: 2, ext: 'mp4' },
  { name: 'c png.png', path: 'E:\\c png.png', kind: 'image', size: 30, mtimeMs: 3, ext: 'png' },
]

describe('buildMediaSeq', () => {
  it('只保留媒体条目并保持图墙顺序', () => {
    expect(buildMediaSeq(entries).map((item) => item.name)).toEqual([
      'a.jpg',
      'b.mp4',
      'c png.png',
    ])
  })

  it('生成编码后的 /api/file URL', () => {
    expect(buildMediaSeq(entries)[2]?.url).toBe('/api/file?path=E%3A%5Cc%20png.png')
  })

  it('目录序列为空', () => {
    expect(buildMediaSeq(entries.slice(0, 1))).toEqual([])
    expect(buildMediaSeq([])).toEqual([])
  })
})

describe('wrapIndex', () => {
  it('首尾循环', () => {
    expect(wrapIndex(0, 3)).toBe(0)
    expect(wrapIndex(3, 3)).toBe(0)
    expect(wrapIndex(-1, 3)).toBe(2)
    expect(wrapIndex(4, 3)).toBe(1)
  })

  it('空序列返回 -1', () => {
    expect(wrapIndex(0, 0)).toBe(-1)
  })
})
