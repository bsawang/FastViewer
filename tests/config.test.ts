import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ConfigStore, sanitizeConfig } from '../src/main/config'
import { CONFIG_DEFAULTS } from '../src/shared/config'

function tempFile(): string {
  return join(mkdtempSync(join(tmpdir(), 'fv-config-')), 'fastviewer-config.json')
}

describe('sanitizeConfig', () => {
  it('非对象回退默认值', () => {
    expect(sanitizeConfig(null)).toEqual(CONFIG_DEFAULTS)
    expect(sanitizeConfig('bad')).toEqual(CONFIG_DEFAULTS)
  })

  it('版本不符整体回默认', () => {
    expect(sanitizeConfig({ version: 2, tileSize: 300 })).toEqual(CONFIG_DEFAULTS)
  })

  it('钳制 tileSize 并校验枚举', () => {
    expect(sanitizeConfig({ version: 1, tileSize: 1000 }).tileSize).toBe(320)
    expect(sanitizeConfig({ version: 1, tileSize: 10 }).tileSize).toBe(96)
    expect(sanitizeConfig({ version: 1, tileSize: 'big' }).tileSize).toBe(180)
    expect(sanitizeConfig({ version: 1, sort: { key: 'x', order: 'up' } }).sort).toEqual({
      key: 'name',
      order: 'asc',
    })
  })

  it('非法 lastFolder 归 null，detailOpen 非布尔归 true', () => {
    expect(sanitizeConfig({ version: 1, lastFolder: 'work\\pics' }).lastFolder).toBeNull()
    expect(sanitizeConfig({ version: 1, lastFolder: '\\\\server\\share' }).lastFolder).toBeNull()
    expect(sanitizeConfig({ version: 1, detailOpen: 'yes' }).detailOpen).toBe(true)
  })

  it('splitRatio 钳制到 0.2–0.8，非法值回默认', () => {
    expect(sanitizeConfig({ version: 1, splitRatio: 2 }).splitRatio).toBe(0.8)
    expect(sanitizeConfig({ version: 1, splitRatio: 0.1 }).splitRatio).toBe(0.2)
    expect(sanitizeConfig({ version: 1, splitRatio: 'wide' }).splitRatio).toBe(0.45)
  })

  it('theme 非法值回退 midnight，合法值保留', () => {
    expect(sanitizeConfig({ version: 1, theme: 'moss' }).theme).toBe('moss')
    expect(sanitizeConfig({ version: 1, theme: 'unknown' }).theme).toBe('midnight')
    expect(sanitizeConfig({ version: 1, theme: 3 }).theme).toBe('midnight')
  })

  it('单字段非法不影响其他字段', () => {
    const config = sanitizeConfig({
      version: 1,
      tileSize: 'huge',
      lastFolder: 'E:\\pics',
      splitRatio: 0.6,
      window: { x: 'a', y: 0, width: 800, height: 600 },
    })
    expect(config.tileSize).toBe(180)
    expect(config.lastFolder).toBe('E:\\pics')
    expect(config.splitRatio).toBe(0.6)
    expect(config.window).toBeNull()
  })

  it('window 非对象或字段缺失归 null', () => {
    expect(sanitizeConfig({ version: 1, window: { x: 1 } }).window).toBeNull()
    expect(
      sanitizeConfig({
        version: 1,
        window: { x: 10, y: 20, width: 800, height: 600, maximized: false },
      }).window,
    ).toEqual({ x: 10, y: 20, width: 800, height: 600, maximized: false })
  })
})

describe('ConfigStore', () => {
  it('文件不存在时返回默认值', () => {
    const store = new ConfigStore(tempFile())
    expect(store.get()).toEqual(CONFIG_DEFAULTS)
  })

  it('坏 JSON 回默认值', () => {
    const file = tempFile()
    writeFileSync(file, '{ broken')
    expect(new ConfigStore(file).get()).toEqual(CONFIG_DEFAULTS)
  })

  it('patch 写入磁盘并可重新加载', () => {
    const file = tempFile()
    const store = new ConfigStore(file)
    store.patch({ tileSize: 196, lastFolder: 'E:\\work' })

    const saved = JSON.parse(readFileSync(file, 'utf8'))
    expect(saved.tileSize).toBe(196)
    expect(saved.lastFolder).toBe('E:\\work')
    expect(new ConfigStore(file).get()).toMatchObject({ tileSize: 196, lastFolder: 'E:\\work' })
  })

  it('sort 局部补丁保留另一字段', () => {
    const file = tempFile()
    const store = new ConfigStore(file)
    store.patch({ sort: { key: 'mtime' } })
    store.patch({ sort: { order: 'desc' } })

    expect(store.get().sort).toEqual({ key: 'mtime', order: 'desc' })
  })

  it('越界补丁被钳制后再落盘', () => {
    const file = tempFile()
    const store = new ConfigStore(file)
    store.patch({ tileSize: 9999 })

    expect(store.get().tileSize).toBe(320)
    expect(JSON.parse(readFileSync(file, 'utf8')).tileSize).toBe(320)
  })

  it('window 补丁写入并可重新加载', () => {
    const file = tempFile()
    const store = new ConfigStore(file)
    store.patch({ window: { x: 120, y: 90, width: 1000, height: 700, maximized: true } })

    expect(new ConfigStore(file).get().window).toEqual({
      x: 120,
      y: 90,
      width: 1000,
      height: 700,
      maximized: true,
    })
    expect(readdirSync(join(file, '..')).filter((name) => name.endsWith('.tmp'))).toEqual([])
  })

  it('splitRatio 补丁落盘并被钳制', () => {
    const file = tempFile()
    const store = new ConfigStore(file)
    store.patch({ splitRatio: 0.717 })

    expect(store.get().splitRatio).toBeCloseTo(0.717)
    expect(JSON.parse(readFileSync(file, 'utf8')).splitRatio).toBeCloseTo(0.717)

    store.patch({ splitRatio: 2 })
    expect(store.get().splitRatio).toBe(0.8)
    expect(JSON.parse(readFileSync(file, 'utf8')).splitRatio).toBe(0.8)
  })
})
