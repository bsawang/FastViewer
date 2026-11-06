import { execFile } from 'node:child_process'
import { statSync } from 'node:fs'
import { basename } from 'node:path'
import { PLACE_IDS, PLACE_LABELS, type PlaceId, type PlaceInfo } from '../shared/places'

export interface PlaceListerOptions {
  pathFor(id: PlaceId): string
  isDir?(path: string): boolean
}

export interface QuickAccessEntry {
  path: string
  name: string
}

export interface QuickAccessOptions {
  run?: () => Promise<string>
}

const QUICK_ACCESS_CACHE_TTL = 30_000

const QUICK_ACCESS_SCRIPT = [
  "[Console]::OutputEncoding=[Text.Encoding]::UTF8",
  "$shell=New-Object -ComObject Shell.Application",
  "$ns=$shell.NameSpace('shell:::{679f85cb-0220-4080-b29b-5540cc05aab6}')",
  'if($ns){ @($ns.Items() | Where-Object { $_.Path } | ForEach-Object { [pscustomobject]@{ path=$_.Path; name=$_.Name } }) | ConvertTo-Json -Compress }',
].join('\n')

let quickAccessCache: { at: number; items: QuickAccessEntry[] } | null = null
let quickAccessPending: Promise<QuickAccessEntry[]> | null = null

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

function runPowerShell(): Promise<string> {
  const encoded = Buffer.from(QUICK_ACCESS_SCRIPT, 'utf16le').toString('base64')
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
      { timeout: 4000, windowsHide: true, encoding: 'utf8' },
      (error, stdout) => {
        if (error) reject(error)
        else resolve(stdout)
      },
    )
  })
}

export function listPlaces(options: PlaceListerOptions): PlaceInfo[] {
  const isDir = options.isDir ?? isDirectory
  const places: PlaceInfo[] = []
  for (const id of PLACE_IDS) {
    let path = ''
    try {
      path = options.pathFor(id)
    } catch {
      continue
    }
    if (!path || !isDir(path)) continue
    places.push({ id, label: PLACE_LABELS[id], path })
  }
  return places
}

export function parseQuickAccess(output: string): QuickAccessEntry[] {
  const text = output.trim()
  if (!text) return []
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return []
  }
  const list = Array.isArray(data) ? data : [data]
  const entries: QuickAccessEntry[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const record = item as { path?: unknown; name?: unknown }
    const path = typeof record.path === 'string' ? record.path.trim() : ''
    if (!path) continue
    const name = typeof record.name === 'string' ? record.name.trim() : ''
    entries.push({ path, name })
  }
  return entries
}

export function mergePlaces(
  standard: PlaceInfo[],
  pinned: QuickAccessEntry[],
  isDir: (path: string) => boolean = isDirectory,
): PlaceInfo[] {
  const merged = [...standard]
  const seen = new Set(standard.map((place) => place.path.toLowerCase()))
  for (const entry of pinned) {
    const key = entry.path.toLowerCase()
    if (seen.has(key) || !isDir(entry.path)) continue
    seen.add(key)
    merged.push({
      id: `qa:${key}`,
      label: entry.name || basename(entry.path) || entry.path,
      path: entry.path,
    })
  }
  return merged
}

export async function listQuickAccessPlaces(
  options: QuickAccessOptions = {},
): Promise<QuickAccessEntry[]> {
  const runner = options.run
  if (!runner) {
    const now = Date.now()
    if (quickAccessCache && now - quickAccessCache.at < QUICK_ACCESS_CACHE_TTL) {
      return quickAccessCache.items
    }
    if (quickAccessPending) return quickAccessPending
    quickAccessPending = (async () => {
      let items: QuickAccessEntry[] = []
      try {
        items = parseQuickAccess(await runPowerShell())
      } catch {
        items = []
      }
      quickAccessCache = { at: Date.now(), items }
      quickAccessPending = null
      return items
    })()
    return quickAccessPending
  }
  try {
    return parseQuickAccess(await runner())
  } catch {
    return []
  }
}
