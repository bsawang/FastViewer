import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  FileOpError,
  clearClipboard,
  copyEntry,
  createFolder,
  duplicateName,
  pasteEntry,
  renameEntry,
  validateEntryName,
} from '../src/main/file-ops'

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'fv-ops-'))
  clearClipboard()
})

describe('validateEntryName', () => {
  it('拒绝空名称与非法字符', () => {
    expect(validateEntryName('   ')).toBe('名称不能为空')
    expect(validateEntryName('..')).toBe('名称无效')
    expect(validateEntryName('a/b.jpg')).not.toBeNull()
    expect(validateEntryName('a?.jpg')).not.toBeNull()
    expect(validateEntryName('name.')).not.toBeNull()
  })

  it('接受普通文件名', () => {
    expect(validateEntryName('新文件夹')).toBeNull()
    expect(validateEntryName('image (2).webp')).toBeNull()
  })
})

describe('duplicateName', () => {
  it('在原扩展名前追加序号', () => {
    expect(duplicateName('a.webp', 1)).toBe('a.webp')
    expect(duplicateName('a.webp', 2)).toBe('a (2).webp')
    expect(duplicateName('noext', 3)).toBe('noext (3)')
    expect(duplicateName('model.v1.ckpt', 2)).toBe('model.v1 (2).ckpt')
  })
})

describe('文件操作', () => {
  it('重命名文件', async () => {
    const source = join(root, 'a.jpg')
    writeFileSync(source, 'x')
    const next = await renameEntry(source, 'b.jpg')
    expect(next).toBe(join(root, 'b.jpg'))
    expect(readFileSync(next, 'utf8')).toBe('x')
  })

  it('重命名遇到同名时报错', async () => {
    const a = join(root, 'a.jpg')
    const b = join(root, 'b.jpg')
    writeFileSync(a, 'x')
    writeFileSync(b, 'y')
    await expect(renameEntry(a, 'b.jpg')).rejects.toBeInstanceOf(FileOpError)
  })

  it('新建文件夹并拒绝同名', async () => {
    const created = await createFolder(root, '合集')
    expect(created).toBe(join(root, '合集'))
    await expect(createFolder(root, '合集')).rejects.toBeInstanceOf(FileOpError)
  })

  it('复制后粘贴，同名自动加序号', async () => {
    const dir = join(root, '输出')
    mkdirSync(dir)
    const source = join(root, 'img.webp')
    writeFileSync(source, 'data')
    await copyEntry(source)
    const first = await pasteEntry(dir)
    const second = await pasteEntry(dir)
    expect(first).toBe(join(dir, 'img.webp'))
    expect(second).toBe(join(dir, 'img (2).webp'))
    expect(readFileSync(second, 'utf8')).toBe('data')
  })

  it('剪贴板为空时粘贴报错', async () => {
    await expect(pasteEntry(root)).rejects.toBeInstanceOf(FileOpError)
  })
})
