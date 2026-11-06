import { describe, expect, it } from 'vitest'
import {
  listPlaces,
  listQuickAccessPlaces,
  mergePlaces,
  parseQuickAccess,
} from '../src/main/places'
import type { PlaceId } from '../src/shared/places'

const PATHS: Record<PlaceId, string> = {
  desktop: 'C:\\Users\\me\\Desktop',
  downloads: 'C:\\Users\\me\\Downloads',
  documents: 'C:\\Users\\me\\Documents',
  pictures: 'C:\\Users\\me\\Pictures',
  music: 'C:\\Users\\me\\Music',
  videos: 'C:\\Users\\me\\Videos',
}

describe('listPlaces', () => {
  it('按固定顺序返回存在的快速访问目录', () => {
    const places = listPlaces({ pathFor: (id) => PATHS[id], isDir: () => true })
    expect(places.map((place) => place.id)).toEqual([
      'desktop',
      'downloads',
      'documents',
      'pictures',
      'music',
      'videos',
    ])
    expect(places[0]).toEqual({
      id: 'desktop',
      label: '桌面',
      path: 'C:\\Users\\me\\Desktop',
    })
  })

  it('路径不存在或不是目录时隐藏该项', () => {
    const places = listPlaces({
      pathFor: (id) => PATHS[id],
      isDir: (path) => path.includes('Pictures') || path.includes('Videos'),
    })
    expect(places.map((place) => place.id)).toEqual(['pictures', 'videos'])
  })

  it('解析路径抛错时跳过该项，不影响其他项', () => {
    const places = listPlaces({
      pathFor: (id) => {
        if (id === 'desktop') throw new Error('missing')
        return PATHS[id]
      },
      isDir: () => true,
    })
    expect(places.map((place) => place.id)).not.toContain('desktop')
    expect(places).toHaveLength(5)
  })

  it('空路径不返回', () => {
    const places = listPlaces({ pathFor: () => '', isDir: () => true })
    expect(places).toEqual([])
  })
})

describe('parseQuickAccess', () => {
  it('解析 Shell COM 输出的 JSON 数组', () => {
    const output = '[{"path":"E:\\\\work\\\\ai","name":"ai"},{"path":"H:\\\\models","name":"models"}]'
    expect(parseQuickAccess(output)).toEqual([
      { path: 'E:\\work\\ai', name: 'ai' },
      { path: 'H:\\models', name: 'models' },
    ])
  })

  it('单项输出被规范化为数组', () => {
    expect(parseQuickAccess('{"path":"E:\\\\work","name":"工作"}')).toEqual([
      { path: 'E:\\work', name: '工作' },
    ])
  })

  it('空输出、非法 JSON、缺少路径的项一律跳过', () => {
    expect(parseQuickAccess('')).toEqual([])
    expect(parseQuickAccess('not-json')).toEqual([])
    expect(parseQuickAccess('[{"name":"无名"},null,{"path":"  ","name":"空"}]')).toEqual([])
  })
})

describe('mergePlaces', () => {
  const standard = [{ id: 'desktop', label: '桌面', path: 'C:\\Users\\me\\Desktop' }] as const

  it('标准目录在前，自定义固定项按输入顺序追加并生成稳定 id', () => {
    const merged = mergePlaces(
      [...standard],
      [
        { path: 'E:\\work\\ai', name: 'ai' },
        { path: 'H:\\models', name: '' },
      ],
      () => true,
    )
    expect(merged).toEqual([
      { id: 'desktop', label: '桌面', path: 'C:\\Users\\me\\Desktop' },
      { id: 'qa:e:\\work\\ai', label: 'ai', path: 'E:\\work\\ai' },
      { id: 'qa:h:\\models', label: 'models', path: 'H:\\models' },
    ])
  })

  it('过滤不存在项，并与标准目录及自身按大小写不敏感去重', () => {
    const merged = mergePlaces(
      [...standard],
      [
        { path: 'c:\\users\\ME\\desktop', name: '桌面副本' },
        { path: 'E:\\work\\ai', name: 'ai' },
        { path: 'e:\\WORK\\AI', name: 'ai 重复' },
        { path: 'Z:\\missing', name: '不存在' },
      ],
      (path) => !path.includes('missing'),
    )
    expect(merged.map((place) => place.path)).toEqual(['C:\\Users\\me\\Desktop', 'E:\\work\\ai'])
  })
})

describe('listQuickAccessPlaces', () => {
  it('解析 runner 输出为固定项', async () => {
    await expect(
      listQuickAccessPlaces({
        run: async () => '[{"path":"E:\\\\work\\\\ai","name":"ai"}]',
      }),
    ).resolves.toEqual([{ path: 'E:\\work\\ai', name: 'ai' }])
  })

  it('runner 抛错或空输出时回退为空数组', async () => {
    await expect(
      listQuickAccessPlaces({
        run: async () => {
          throw new Error('powershell missing')
        },
      }),
    ).resolves.toEqual([])
    await expect(listQuickAccessPlaces({ run: async () => '' })).resolves.toEqual([])
  })
})
