import { mkdtempSync, mkdirSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { DirError, DirIndex, parentOfPath } from '../src/main/dir-index'

const now = Date.now()
const base = now - 60_000

let root: string
let index: DirIndex

function names(entries: Array<{ name: string }>): string[] {
  return entries.map((entry) => entry.name)
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'fv-dir-'))
  index = new DirIndex()

  for (const directory of ['Alpha', 'beta', '子目录']) {
    mkdirSync(join(root, directory))
  }
  writeFileSync(join(root, 'a2.jpg'), '0123456789')
  writeFileSync(join(root, 'a10.jpg'), '01234567890123456789')
  writeFileSync(join(root, 'b.png'), 'x'.repeat(30))
  writeFileSync(join(root, 'clip.mp4'), 'x'.repeat(40))
  writeFileSync(join(root, 'notes.txt'), 'not media')
  writeFileSync(join(root, '.secret.jpg'), 'hidden')
  writeFileSync(join(root, 'Thumbs.db'), 'hidden')

  utimesSync(join(root, 'a2.jpg'), new Date(base + 3000), new Date(base + 3000))
  utimesSync(join(root, 'a10.jpg'), new Date(base + 1000), new Date(base + 1000))
  utimesSync(join(root, 'b.png'), new Date(base + 4000), new Date(base + 4000))
  utimesSync(join(root, 'clip.mp4'), new Date(base + 2000), new Date(base + 2000))
})

describe('DirIndex 列表与分类', () => {
  it('目录永远在文件之前，名称使用数字感知排序', async () => {
    const page = await index.get(root, { sort: 'name', order: 'asc' })

    expect(page.total).toBe(7)
    expect(names(page.entries)).toEqual([
      '子目录',
      'Alpha',
      'beta',
      'a2.jpg',
      'a10.jpg',
      'b.png',
      'clip.mp4',
    ])
  })

  it('降序只反转组内顺序，目录仍在最前', async () => {
    const page = await index.get(root, { sort: 'name', order: 'desc' })

    expect(names(page.entries).slice(3)).toEqual([
      'clip.mp4',
      'b.png',
      'a10.jpg',
      'a2.jpg',
    ])
    expect(page.entries.slice(0, 3).every((entry) => entry.kind === 'dir')).toBe(true)
  })

  it('按扩展名分类，other 不入列表', async () => {
    const page = await index.get(root, { sort: 'name', order: 'asc' })
    const kind = new Map(page.entries.map((entry) => [entry.name, entry.kind]))

    expect(kind.get('Alpha')).toBe('dir')
    expect(kind.get('a2.jpg')).toBe('image')
    expect(kind.get('b.png')).toBe('image')
    expect(kind.get('clip.mp4')).toBe('video')
    expect(kind.has('notes.txt')).toBe(false)
  })

  it('过滤隐藏项与系统缩略图缓存', async () => {
    const page = await index.get(root)

    expect(names(page.entries)).not.toContain('.secret.jpg')
    expect(names(page.entries)).not.toContain('Thumbs.db')
  })

  it('分页切片且 total 不受 limit 影响', async () => {
    const first = await index.get(root, { offset: 0, limit: 3 })
    const second = await index.get(root, { offset: 3, limit: 2 })
    const last = await index.get(root, { offset: 6, limit: 50 })
    const beyond = await index.get(root, { offset: 99, limit: 50 })

    expect(names(first.entries)).toEqual(['子目录', 'Alpha', 'beta'])
    expect(names(second.entries)).toEqual(['a2.jpg', 'a10.jpg'])
    expect(names(last.entries)).toEqual(['clip.mp4'])
    expect(beyond.entries).toEqual([])
    expect([first.total, second.total, last.total, beyond.total]).toEqual([7, 7, 7, 7])
  })

  it('按大小排序需要全量 stat', async () => {
    const page = await index.get(root, { sort: 'size', order: 'asc' })

    expect(names(page.entries).slice(3)).toEqual([
      'a2.jpg',
      'a10.jpg',
      'b.png',
      'clip.mp4',
    ])
    expect(page.entries[3]).toMatchObject({ size: 10, kind: 'image' })
  })

  it('按修改时间排序', async () => {
    const page = await index.get(root, { sort: 'mtime', order: 'asc' })

    expect(names(page.entries).slice(3)).toEqual([
      'a10.jpg',
      'clip.mp4',
      'a2.jpg',
      'b.png',
    ])
  })

  it('返回绝对路径、扩展名与父目录', async () => {
    const page = await index.get(root)

    expect(page.path).toBe(root)
    expect(page.parent).not.toBeNull()
    expect(page.entries[0]?.path).toBe(join(root, '子目录'))
    expect(page.entries[0]?.ext).toBeUndefined()
    expect(page.entries[3]?.ext).toBe('jpg')
  })

  it('fresh 跳过缓存，覆盖文件后能读到新的 mtime 与大小', async () => {
    const target = join(root, 'a2.jpg')
    const before = await index.get(root, { sort: 'name' })
    const beforeSize = before.entries.find((entry) => entry.name === 'a2.jpg')?.size
    writeFileSync(target, 'x'.repeat(321))
    utimesSync(target, new Date(base + 9000), new Date(base + 9000))

    const cached = await index.get(root, { sort: 'name' })
    expect(cached.entries.find((entry) => entry.name === 'a2.jpg')?.size).toBe(beforeSize)

    const fresh = await index.get(root, { sort: 'name', fresh: true })
    const entry = fresh.entries.find((item) => item.name === 'a2.jpg')
    expect(entry?.size).toBe(321)
    expect(entry?.mtimeMs).toBe(base + 9000)
  })

  it('空目录返回 total 0', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'fv-empty-'))
    const page = await index.get(empty)

    expect(page).toMatchObject({ total: 0, entries: [] })
  })
})

describe('盘符根目录的父级', () => {
  it('盘符根目录的父级为空串（此电脑）', () => {
    expect(parentOfPath('C:\\')).toBe('')
    expect(parentOfPath('E:\\')).toBe('')
  })

  it('其余目录返回父目录绝对路径', () => {
    expect(parentOfPath('C:\\work')).toBe('C:\\')
    expect(parentOfPath('C:\\work\\ai')).toBe('C:\\work')
  })
})

describe('DirIndex 缓存', () => {
  it('目录 mtime 变化后重新读取', async () => {
    const first = await index.get(root)
    expect(first.total).toBe(7)

    writeFileSync(join(root, 'later.webp'), 'x')
    utimesSync(root, new Date(Date.now() + 5000), new Date(Date.now() + 5000))

    const second = await index.get(root)
    expect(second.total).toBe(8)
    expect(names(second.entries)).toContain('later.webp')
  })

  it('相同目录重复请求复用 readdir 结果', async () => {
    const first = await index.get(root)
    const second = await index.get(root)

    expect(second.total).toBe(first.total)
    expect(second.entries).not.toBe(first.entries)
  })
})

describe('DirIndex 错误码', () => {
  it('路径不存在 → 404 NOT_FOUND', async () => {
    const missing = join(root, 'no-such-dir')
    await expect(index.get(missing)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    })
  })

  it('存在但不是目录 → 400 BAD_PATH', async () => {
    await expect(index.get(join(root, 'a2.jpg'))).rejects.toMatchObject({
      code: 'BAD_PATH',
      status: 400,
    })
  })

  it('UNC 路径 → 403 FORBIDDEN_PATH', async () => {
    await expect(index.get('\\\\server\\share')).rejects.toBeInstanceOf(DirError)
    await expect(index.get('\\\\server\\share')).rejects.toMatchObject({
      code: 'FORBIDDEN_PATH',
      status: 403,
    })
  })

  it('相对路径 → 400 BAD_PATH', async () => {
    await expect(index.get('work')).rejects.toMatchObject({
      code: 'BAD_PATH',
      status: 400,
    })
  })

  it('含 NUL 的路径 → 403 FORBIDDEN_PATH', async () => {
    await expect(index.get('E:\\work\u0000x')).rejects.toMatchObject({
      code: 'FORBIDDEN_PATH',
      status: 403,
    })
  })
})
