import { readdir, stat } from 'node:fs/promises'
import { dirname, join, parse } from 'node:path'
import { classifyFile, isHiddenName } from './media-types'
import { checkDirPath } from './path-guard'
import type { MediaKind } from './media-types'

export type SortKey = 'name' | 'mtime' | 'size'
export type SortOrder = 'asc' | 'desc'

export interface DirEntry {
  name: string
  path: string
  kind: MediaKind
  size: number
  mtimeMs: number
  ext?: string
}

export interface DirPage {
  path: string
  parent: string | null
  total: number
  offset: number
  limit: number
  entries: DirEntry[]
}

export interface DirQuery {
  sort?: SortKey
  order?: SortOrder
  offset?: number
  limit?: number
  /** 跳过缓存重新读取（目录内文件被覆盖时目录 mtime 不变，需要强制刷新）。 */
  fresh?: boolean
}

export type DirErrorCode = 'BAD_PATH' | 'FORBIDDEN_PATH' | 'NOT_FOUND' | 'IO_ERROR'

export class DirError extends Error {
  readonly code: DirErrorCode
  readonly status: number

  constructor(code: DirErrorCode, status: number, message: string) {
    super(message)
    this.name = 'DirError'
    this.code = code
    this.status = status
  }
}

interface NameRecord {
  name: string
  isDir: boolean
  kind: MediaKind
  ext?: string
}

interface StatInfo {
  size: number
  mtimeMs: number
}

interface CachedDir {
  dirMtimeMs: number
  fetchedAt: number
  records: NameRecord[]
  stats: Map<string, StatInfo>
}

export interface DirIndexOptions {
  cacheLimit?: number
  ttlMs?: number
  statConcurrency?: number
  now?: () => number
}

const NAME_COLLATOR = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' })

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : undefined
}

function ioError(error: unknown): DirError {
  const code = errorCode(error)
  if (code === 'ENOENT' || code === 'ENOTDIR') {
    return new DirError('NOT_FOUND', 404, '目录不存在')
  }
  if (code === 'EACCES' || code === 'EPERM') {
    return new DirError('IO_ERROR', 500, '无权限读取目录')
  }
  return new DirError('IO_ERROR', 500, '读取目录失败')
}

function isMissing(error: unknown): boolean {
  const code = errorCode(error)
  return code === 'ENOENT' || code === 'ENOTDIR'
}

export function parentOfPath(dirPath: string): string {
  if (dirPath === parse(dirPath).root) return ''
  const parent = dirname(dirPath)
  return parent === dirPath ? '' : parent
}

function normalizeQuery(query: DirQuery): Required<DirQuery> {
  const sort: SortKey =
    query.sort === 'mtime' || query.sort === 'size' ? query.sort : 'name'
  const order: SortOrder = query.order === 'desc' ? 'desc' : 'asc'
  const offset =
    typeof query.offset === 'number' && Number.isFinite(query.offset)
      ? Math.max(0, Math.floor(query.offset))
      : 0
  const rawLimit =
    typeof query.limit === 'number' && Number.isFinite(query.limit)
      ? Math.floor(query.limit)
      : 500
  const limit = Math.min(1000, Math.max(1, rawLimit))
  return { sort, order, offset, limit, fresh: query.fresh === true }
}

async function mapLimit<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor]
      cursor += 1
      await worker(item as T)
    }
  })
  await Promise.all(runners)
}

export class DirIndex {
  private readonly cacheLimit: number
  private readonly ttlMs: number
  private readonly statConcurrency: number
  private readonly now: () => number
  private readonly cache = new Map<string, CachedDir>()

  constructor(options: DirIndexOptions = {}) {
    this.cacheLimit = options.cacheLimit ?? 20
    this.ttlMs = options.ttlMs ?? 10_000
    this.statConcurrency = options.statConcurrency ?? 32
    this.now = options.now ?? Date.now
  }

  async get(rawPath: string, query: DirQuery = {}): Promise<DirPage> {
    const checked = checkDirPath(rawPath)
    if (!checked.ok) {
      throw new DirError(checked.code, checked.code === 'BAD_PATH' ? 400 : 403, checked.message)
    }
    const dirPath = checked.path

    let dirStat
    try {
      dirStat = await stat(dirPath)
    } catch (error) {
      throw ioError(error)
    }
    if (!dirStat.isDirectory()) {
      throw new DirError('BAD_PATH', 400, '路径不是目录')
    }

    const { sort, order, offset, limit, fresh } = normalizeQuery(query)
    let cached = fresh ? null : this.lookup(dirPath, dirStat.mtimeMs)
    if (!cached) {
      cached = await this.load(dirPath, dirStat.mtimeMs)
      this.store(dirPath, cached)
    }

    let records = cached.records
    let stats = cached.stats

    if (sort === 'name') {
      records = [...records].sort((a, b) => this.compareName(a, b, order))
    } else {
      stats = await this.ensureStats(dirPath, records, stats)
      records = records
        .filter((record) => stats.has(record.name))
        .sort((a, b) => this.compareStat(a, b, stats, sort, order))
    }

    const total = records.length
    const page = records.slice(offset, offset + limit)

    if (sort === 'name') {
      stats = await this.ensureStats(dirPath, page, stats)
    }

    const entries: DirEntry[] = []
    for (const record of page) {
      const info = stats.get(record.name)
      if (!info) continue
      entries.push({
        name: record.name,
        path: join(dirPath, record.name),
        kind: record.kind,
        size: info.size,
        mtimeMs: info.mtimeMs,
        ...(record.ext === undefined ? {} : { ext: record.ext }),
      })
    }

    return {
      path: dirPath,
      parent: parentOfPath(dirPath),
      total,
      offset,
      limit,
      entries,
    }
  }

  private lookup(dirPath: string, dirMtimeMs: number): CachedDir | null {
    const entry = this.cache.get(dirPath)
    if (!entry) return null
    if (entry.dirMtimeMs !== dirMtimeMs || this.now() - entry.fetchedAt >= this.ttlMs) {
      this.cache.delete(dirPath)
      return null
    }
    this.cache.delete(dirPath)
    this.cache.set(dirPath, entry)
    return entry
  }

  private store(dirPath: string, entry: CachedDir): void {
    this.cache.delete(dirPath)
    this.cache.set(dirPath, entry)
    while (this.cache.size > this.cacheLimit) {
      const oldest = this.cache.keys().next()
      if (oldest.done) break
      this.cache.delete(oldest.value)
    }
  }

  private async load(dirPath: string, dirMtimeMs: number): Promise<CachedDir> {
    let dirents
    try {
      dirents = await readdir(dirPath, { withFileTypes: true })
    } catch (error) {
      throw ioError(error)
    }

    const records: NameRecord[] = []
    for (const dirent of dirents) {
      const name = dirent.name
      if (isHiddenName(name)) continue
      if (dirent.isDirectory()) {
        records.push({ name, isDir: true, kind: 'dir' })
        continue
      }
      if (!dirent.isFile()) continue
      const classified = classifyFile(name)
      if (!classified) continue
      records.push({ name, isDir: false, kind: classified.kind, ext: classified.ext })
    }

    return {
      dirMtimeMs,
      fetchedAt: this.now(),
      records,
      stats: new Map(),
    }
  }

  private async ensureStats(
    dirPath: string,
    records: NameRecord[],
    existing: Map<string, StatInfo>,
  ): Promise<Map<string, StatInfo>> {
    const missing = records.filter((record) => !existing.has(record.name))
    await mapLimit(missing, this.statConcurrency, async (record) => {
      try {
        const info = await stat(join(dirPath, record.name))
        existing.set(record.name, { size: info.size, mtimeMs: info.mtimeMs })
      } catch (error) {
        if (!isMissing(error)) return
      }
    })
    return existing
  }

  private compareName(a: NameRecord, b: NameRecord, order: SortOrder): number {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    const byName = NAME_COLLATOR.compare(a.name, b.name)
    if (byName !== 0) return order === 'asc' ? byName : -byName
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  }

  private compareStat(
    a: NameRecord,
    b: NameRecord,
    stats: Map<string, StatInfo>,
    sort: 'mtime' | 'size',
    order: SortOrder,
  ): number {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    const left = sort === 'size' ? (stats.get(a.name)?.size ?? 0) : (stats.get(a.name)?.mtimeMs ?? 0)
    const right = sort === 'size' ? (stats.get(b.name)?.size ?? 0) : (stats.get(b.name)?.mtimeMs ?? 0)
    if (left !== right) return order === 'asc' ? left - right : right - left
    return NAME_COLLATOR.compare(a.name, b.name)
  }
}
