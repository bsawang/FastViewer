import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  ASSOCIATION_EXTS,
  associationDef,
  associationIconFileName,
  associationProgId,
  normalizeAssociationExt,
  type AssociationDefault,
  type AssociationGroupDef,
  type AssociationInfo,
  type AssociationTypeInfo,
} from '../shared/associations'

export interface RegResult {
  status: number
  stdout: string
}

export type RegExec = (args: string[]) => Promise<RegResult>

const DEFAULT_CLASSES_ROOT = 'HKCU\\Software\\Classes'
const DEFAULT_FILE_EXTS_ROOT =
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts'
const READ_CONCURRENCY = 8

export function regExec(args: string[]): Promise<RegResult> {
  return new Promise((resolve) => {
    execFile('reg.exe', args, { windowsHide: true, maxBuffer: 1024 * 1024 }, (error, stdout) => {
      if (!error) {
        resolve({ status: 0, stdout })
        return
      }
      const code = (error as NodeJS.ErrnoException).code
      resolve({ status: typeof code === 'number' ? code : 1, stdout })
    })
  })
}

export function parseRegValue(stdout: string): string | null {
  const match = /\bREG_(?:SZ|EXPAND_SZ|MULTI_SZ|DWORD|QWORD|BINARY)\b\s*(.*)$/m.exec(stdout)
  return match ? match[1].trim() : null
}

async function queryValue(
  exec: RegExec,
  key: string,
  name: string | null,
): Promise<string | null> {
  const args = ['query', key, ...(name === null ? ['/ve'] : ['/v', name])]
  const result = await exec(args)
  return result.status === 0 ? parseRegValue(result.stdout) : null
}

async function writeValue(
  exec: RegExec,
  key: string,
  name: string | null,
  data: string,
): Promise<void> {
  const args = ['add', key, ...(name === null ? ['/ve'] : ['/v', name]), '/d', data, '/f']
  const result = await exec(args)
  if (result.status !== 0) throw new Error(`写入注册表失败（${key}）`)
}

async function dropValue(exec: RegExec, key: string, name: string | null): Promise<void> {
  await exec(['delete', key, ...(name === null ? ['/ve'] : ['/v', name]), '/f'])
}

function notifyShellChange(): Promise<void> {
  const script =
    "Add-Type -Namespace FastViewer -Name Shell32 -MemberDefinition '[System.Runtime.InteropServices.DllImport(\"shell32.dll\")] public static extern void SHChangeNotify(int eventId, int flags, System.IntPtr item1, System.IntPtr item2);'; [FastViewer.Shell32]::SHChangeNotify(0x08000000, 0, [System.IntPtr]::Zero, [System.IntPtr]::Zero)"
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', script],
      { windowsHide: true, timeout: 8000 },
      () => resolve(),
    )
  })
}

async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await fn(items[index])
    }
  })
  await Promise.all(workers)
  return results
}

export interface AssociationsOptions {
  exePath: string
  editable: boolean
  iconsDir?: string
  exec?: RegExec
  classesRoot?: string
  fileExtsRoot?: string
  notify?: () => void
}

export interface Associations {
  read(): Promise<AssociationInfo>
  set(exts: unknown, enabled: unknown): Promise<AssociationInfo>
}

export function createAssociations(options: AssociationsOptions): Associations {
  const exec = options.exec ?? regExec
  const classesRoot = options.classesRoot ?? DEFAULT_CLASSES_ROOT
  const fileExtsRoot = options.fileExtsRoot ?? DEFAULT_FILE_EXTS_ROOT
  const notify = options.notify ?? ((): void => void notifyShellChange())

  async function readType(ext: string, group: AssociationGroupDef): Promise<AssociationTypeInfo> {
    const progId = associationProgId(ext)
    const [extDefault, userChoice] = await Promise.all([
      queryValue(exec, `${classesRoot}\\.${ext}`, null),
      queryValue(exec, `${fileExtsRoot}\\.${ext}\\UserChoice`, 'ProgId'),
    ])
    let defaultApp: AssociationDefault = 'none'
    if (userChoice === progId) defaultApp = 'self'
    else if (userChoice !== null && userChoice !== '') defaultApp = 'other'
    return { ext, group: group.id, registered: extDefault === progId, defaultApp }
  }

  async function read(): Promise<AssociationInfo> {
    const entries = ASSOCIATION_EXTS.map((ext) => {
      const group = associationDef(ext)
      if (!group) throw new Error(`未知文件类型：${ext}`)
      return { ext, group }
    })
    const types = await mapLimit(entries, READ_CONCURRENCY, ({ ext, group }) =>
      readType(ext, group),
    )
    return { editable: options.editable, exePath: options.exePath, types }
  }

  function iconRef(ext: string): string {
    if (options.iconsDir) {
      const file = join(options.iconsDir, associationIconFileName(ext, 'ico'))
      if (existsSync(file)) return `"${file}",0`
    }
    return `"${options.exePath}",0`
  }

  async function enable(ext: string, group: AssociationGroupDef): Promise<void> {
    const progId = associationProgId(ext)
    const progIdKey = `${classesRoot}\\${progId}`
    const exe = options.exePath
    await writeValue(exec, progIdKey, null, group.description)
    await writeValue(exec, `${progIdKey}\\DefaultIcon`, null, iconRef(ext))
    await writeValue(exec, `${progIdKey}\\shell\\open\\command`, null, `"${exe}" "%1"`)
    await writeValue(exec, `${classesRoot}\\.${ext}`, null, progId)
    await writeValue(exec, `${classesRoot}\\.${ext}\\OpenWithProgids`, progId, '')
  }

  async function disable(ext: string): Promise<void> {
    const progId = associationProgId(ext)
    const current = await queryValue(exec, `${classesRoot}\\.${ext}`, null)
    if (current === progId) await dropValue(exec, `${classesRoot}\\.${ext}`, null)
    await dropValue(exec, `${classesRoot}\\.${ext}\\OpenWithProgids`, progId)
  }

  async function set(exts: unknown, enabled: unknown): Promise<AssociationInfo> {
    if (!options.editable) throw new Error('仅安装版可修改文件关联')
    if (typeof enabled !== 'boolean') throw new Error('参数无效')
    if (!Array.isArray(exts) || exts.length === 0) throw new Error('未指定文件类型')
    const groups = new Map<string, AssociationGroupDef>()
    for (const value of exts) {
      const ext = typeof value === 'string' ? normalizeAssociationExt(value) : ''
      const group = ext ? associationDef(ext) : null
      if (!group) throw new Error(`不支持的文件类型：${String(value)}`)
      groups.set(ext, group)
    }
    for (const [ext, group] of groups) {
      if (enabled) await enable(ext, group)
      else await disable(ext)
    }
    notify()
    return read()
  }

  return { read, set }
}
