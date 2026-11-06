import { execFile } from 'node:child_process'
import { statSync } from 'node:fs'
import { promisify } from 'node:util'
import type { DriveInfo, DriveType } from '../shared/drives'

export type { DriveInfo, DriveType } from '../shared/drives'

const execFileAsync = promisify(execFile)

interface CacheEntry {
  at: number
  drives: DriveInfo[]
}

function driveInfo(letter: string, type: DriveType): DriveInfo {
  const name = `${letter.toUpperCase()}:`
  const kind = type === 'removable' ? '可移动磁盘' : '本地磁盘'
  return { path: `${name}\\`, name, label: `${kind} (${name})`, type }
}

export function parseWmicCsv(text: string): DriveInfo[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  if (lines.length < 2) return []

  const header = (lines[0] as string).split(',').map((cell) => cell.trim())
  const idColumn = header.indexOf('DeviceID')
  const typeColumn = header.indexOf('DriveType')
  if (idColumn < 0 || typeColumn < 0) return []

  const byName = new Map<string, DriveInfo>()
  for (const line of lines.slice(1)) {
    const cells = line.split(',')
    const id = (cells[idColumn] ?? '').trim()
    const driveType = Number((cells[typeColumn] ?? '').trim())
    if (!/^[A-Za-z]:$/.test(id)) continue
    if (driveType !== 2 && driveType !== 3) continue
    const info = driveInfo(id[0] as string, driveType === 2 ? 'removable' : 'fixed')
    byName.set(info.name, info)
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function scanDriveLetters(exists: (path: string) => boolean): DriveInfo[] {
  const drives: DriveInfo[] = []
  for (let code = 65; code <= 90; code += 1) {
    const letter = String.fromCharCode(code)
    if (!exists(`${letter}:\\`)) continue
    drives.push(driveInfo(letter, 'fixed'))
  }
  return drives
}

async function defaultWmic(): Promise<string> {
  const { stdout } = await execFileAsync(
    'wmic',
    ['logicaldisk', 'get', 'DeviceID,DriveType', '/format:csv'],
    { timeout: 2000, windowsHide: true, maxBuffer: 1024 * 1024 },
  )
  return stdout
}

function defaultExists(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

export interface DriveListerOptions {
  wmic?: () => Promise<string>
  exists?: (path: string) => boolean
  now?: () => number
  ttlMs?: number
}

export class DriveLister {
  private readonly wmic: () => Promise<string>
  private readonly exists: (path: string) => boolean
  private readonly now: () => number
  private readonly ttlMs: number
  private cache: CacheEntry | null = null

  constructor(options: DriveListerOptions = {}) {
    this.wmic = options.wmic ?? defaultWmic
    this.exists = options.exists ?? defaultExists
    this.now = options.now ?? Date.now
    this.ttlMs = options.ttlMs ?? 5000
  }

  async list(refresh = false): Promise<DriveInfo[]> {
    if (!refresh && this.cache && this.now() - this.cache.at < this.ttlMs) {
      return this.cache.drives
    }

    let drives: DriveInfo[] = []
    try {
      drives = parseWmicCsv(await this.wmic())
    } catch {
      drives = []
    }
    if (drives.length === 0) drives = scanDriveLetters(this.exists)

    this.cache = { at: this.now(), drives }
    return drives
  }
}
