import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import {
  firstOpenTarget,
  parsePathArgs,
  resolveOpenTarget,
  type PathProbe,
} from '../src/main/open-target'
import { folderTitle } from '../src/shared/path-title'

function probe(map: Record<string, 'dir' | 'file'>): PathProbe {
  return {
    kind: (path) => map[path] ?? 'missing',
  }
}

describe('parsePathArgs', () => {
  it('保留绝对路径并忽略开关', () => {
    expect(parsePathArgs(['--inspect=5858', 'E:\\pics', '--user-data-dir=E:\\tmp'])).toEqual([
      'E:\\pics',
    ])
  })

  it('忽略相对路径与空串', () => {
    expect(parsePathArgs(['pics', '', 'E:/album'])).toEqual(['E:/album'])
  })

  it('无路径参数时返回空数组', () => {
    expect(parsePathArgs([])).toEqual([])
  })
})

describe('resolveOpenTarget', () => {
  it('目录 → dir', () => {
    const path = resolve('E:\\pics')
    expect(resolveOpenTarget('E:\\pics', probe({ [path]: 'dir' }))).toEqual({
      kind: 'dir',
      path,
    })
  })

  it('文件 → 父目录 + 文件路径', () => {
    const path = resolve('E:\\pics\\a.jpg')
    expect(resolveOpenTarget('E:\\pics\\a.jpg', probe({ [path]: 'file' }))).toEqual({
      kind: 'file',
      path,
      dir: resolve('E:\\pics'),
    })
  })

  it('不存在 → null', () => {
    expect(resolveOpenTarget('E:\\missing', probe({}))).toBeNull()
  })
})

describe('firstOpenTarget', () => {
  it('跳过不存在与非法参数，取第一个有效目标', () => {
    const dir = resolve('E:\\album')
    const target = firstOpenTarget(['--foo', 'E:\\missing', 'E:\\album'], probe({ [dir]: 'dir' }))
    expect(target).toEqual({ kind: 'dir', path: dir })
  })

  it('全部无效 → null（回退默认）', () => {
    expect(firstOpenTarget(['--foo', 'E:\\missing'], probe({}))).toBeNull()
  })
})

describe('folderTitle', () => {
  it('普通目录取末级名称', () => {
    expect(folderTitle('E:\\work\\ai\\FastViewer')).toBe('FastViewer')
  })

  it('忽略尾部分隔符', () => {
    expect(folderTitle('E:\\work\\ai\\FastViewer\\')).toBe('FastViewer')
  })

  it('盘符根目录显示盘符', () => {
    expect(folderTitle('E:\\')).toBe('E:')
    expect(folderTitle('e:')).toBe('E:')
  })

  it('中文目录名原样返回', () => {
    expect(folderTitle('E:\\图片\\旅行')).toBe('旅行')
  })
})
