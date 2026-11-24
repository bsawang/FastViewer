import { constants } from 'node:fs'
import { copyFile, mkdir, rename, stat } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'
import { checkAbsolutePath } from './path-guard'

const INVALID_NAME = /[<>:"/\\|?*\u0000-\u001f]/

export class FileOpError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FileOpError'
  }
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  )
}

function check(input: string): string {
  const checked = checkAbsolutePath(input)
  if (!checked.ok) throw new FileOpError(checked.message)
  return checked.path
}

export function validateEntryName(rawName: string): string | null {
  const name = rawName.trim()
  if (name.length === 0) return '名称不能为空'
  if (name === '.' || name === '..') return '名称无效'
  if (INVALID_NAME.test(name)) return '名称不能包含 < > : " / \\ | ? * 等字符'
  if (/[. ]$/.test(name)) return '名称不能以空格或点结尾'
  return null
}

export function duplicateName(name: string, copyIndex: number): string {
  if (copyIndex <= 1) return name
  const ext = extname(name)
  const stem = ext.length > 0 ? name.slice(0, -ext.length) : name
  return `${stem} (${copyIndex})${ext}`
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch (error) {
    if (isMissing(error)) return false
    throw error
  }
}

export async function renameEntry(input: string, rawName: string): Promise<string> {
  const invalid = validateEntryName(rawName)
  if (invalid) throw new FileOpError(invalid)
  const source = check(input)
  const destination = join(dirname(source), rawName.trim())
  if (destination === source) return source
  if (await exists(destination)) throw new FileOpError('已存在同名文件或文件夹')
  await rename(source, destination)
  return destination
}

export async function createFolder(dirInput: string, rawName: string): Promise<string> {
  const invalid = validateEntryName(rawName)
  if (invalid) throw new FileOpError(invalid)
  const dir = check(dirInput)
  const destination = join(dir, rawName.trim())
  if (await exists(destination)) throw new FileOpError('已存在同名文件或文件夹')
  await mkdir(destination)
  return destination
}

export type ClipboardMode = 'copy' | 'cut'

interface ClipboardEntry {
  paths: string[]
  mode: ClipboardMode
}

let clipboard: ClipboardEntry | null = null

export async function copyEntries(inputs: string[], mode: ClipboardMode): Promise<number> {
  if (inputs.length === 0) throw new FileOpError('没有可操作的文件')
  const paths: string[] = []
  for (const input of inputs) {
    const source = check(input)
    const info = await stat(source)
    if (!info.isFile()) throw new FileOpError('只能复制文件')
    paths.push(source)
  }
  clipboard = { paths, mode }
  return paths.length
}

async function uniqueDestination(dir: string, name: string): Promise<string> {
  for (let index = 1; index <= 1000; index += 1) {
    const candidate = join(dir, duplicateName(name, index))
    if (!(await exists(candidate))) return candidate
  }
  throw new FileOpError('目标文件夹中同名文件过多')
}

export async function pasteEntry(dirInput: string): Promise<string[]> {
  if (!clipboard) throw new FileOpError('剪贴板为空，请先复制文件')
  const dir = check(dirInput)
  const { paths, mode } = clipboard
  const pasted: string[] = []
  for (const source of paths) {
    if (mode === 'cut' && dirname(source) === dir) continue
    const destination = await uniqueDestination(dir, basename(source))
    if (mode === 'copy') {
      await copyFile(source, destination, constants.COPYFILE_EXCL)
    } else {
      await rename(source, destination)
    }
    pasted.push(destination)
  }
  if (mode === 'cut') clipboard = null
  if (pasted.length === 0) throw new FileOpError('文件已在该文件夹中')
  return pasted
}

export function clearClipboard(): void {
  clipboard = null
}
