import { describe, expect, it } from 'vitest'
import { collapseBreadcrumb, parseBreadcrumb } from '../src/web/breadcrumb'

describe('parseBreadcrumb', () => {
  it('虚拟根“此电脑”只有一段', () => {
    expect(parseBreadcrumb('')).toEqual([{ label: '此电脑', path: '' }])
  })

  it('盘符根目录以“此电脑”开头', () => {
    expect(parseBreadcrumb('C:\\')).toEqual([
      { label: '此电脑', path: '' },
      { label: 'C:', path: 'C:\\' },
    ])
  })

  it('逐级拆分并给出累计路径', () => {
    expect(parseBreadcrumb('E:\\work\\ai\\FastViewer')).toEqual([
      { label: '此电脑', path: '' },
      { label: 'E:', path: 'E:\\' },
      { label: 'work', path: 'E:\\work' },
      { label: 'ai', path: 'E:\\work\\ai' },
      { label: 'FastViewer', path: 'E:\\work\\ai\\FastViewer' },
    ])
  })

  it('尾部反斜杠与正斜杠归一化', () => {
    expect(parseBreadcrumb('E:\\work\\ai\\')).toEqual(parseBreadcrumb('E:/work/ai'))
  })

  it('中文目录原样保留', () => {
    const segments = parseBreadcrumb('E:\\图片\\旅行')
    expect(segments.map((segment) => segment.label)).toEqual(['此电脑', 'E:', '图片', '旅行'])
  })

  it('拒绝 UNC、设备路径与相对路径', () => {
    expect(parseBreadcrumb('\\\\server\\share')).toEqual([])
    expect(parseBreadcrumb('\\\\?\\C:\\work')).toEqual([])
    expect(parseBreadcrumb('work\\pics')).toEqual([])
  })
})

describe('collapseBreadcrumb', () => {
  const deep = parseBreadcrumb('E:\\a\\b\\c\\d\\e\\f')

  it('不超过 5 段不折叠', () => {
    const segments = parseBreadcrumb('E:\\work\\ai\\FastViewer')
    expect(collapseBreadcrumb(segments)).toEqual({ visible: segments, hidden: [] })
  })

  it('超过 5 段保留首段与末 3 段', () => {
    const { visible, hidden } = collapseBreadcrumb(deep)
    expect(visible.map((segment) => segment.label)).toEqual(['此电脑', 'd', 'e', 'f'])
    expect(hidden.map((segment) => segment.label)).toEqual(['E:', 'a', 'b', 'c'])
  })

  it('刚好 5 段不折叠', () => {
    const segments = parseBreadcrumb('E:\\a\\b\\c')
    expect(collapseBreadcrumb(segments).hidden).toEqual([])
  })
})
