import { createReadStream, readFileSync, statSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { DirError, DirIndex } from './dir-index'
import { DriveLister } from './drives'
import { classifyFile } from './media-types'
import { checkAbsolutePath } from './path-guard'
import { parseRange } from './range'
import type { PlaceInfo } from '../shared/places'

export const COOKIE_NAME = 'fv'

const CSP =
  "default-src 'self'; img-src 'self' data:; media-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'none'"

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.apng': 'image/apng',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.jfif': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.mp4': 'video/mp4',
  '.m4v': 'video/x-m4v',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.ogg': 'video/ogg',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.woff2': 'font/woff2',
}

export interface StartOptions {
  webDir: string
  token: string
  dirIndex?: DirIndex
  driveLister?: DriveLister
  placeLister?: () => PlaceInfo[] | Promise<PlaceInfo[]>
}

export interface LocalServer {
  port: number
  url: string
  token: string
  close(): Promise<void>
}

export type DenyReason = 'host' | 'origin' | 'token'

export type Authorization =
  | { ok: true; tokenInQuery: boolean }
  | { ok: false; reason: DenyReason }

export function checkRequest(
  req: IncomingMessage,
  port: number,
  token: string,
): Authorization {
  const selfHost = `127.0.0.1:${port}`
  if (req.headers.host !== selfHost) return { ok: false, reason: 'host' }

  const origin = req.headers.origin
  if (origin !== undefined && origin !== `http://${selfHost}`) {
    return { ok: false, reason: 'origin' }
  }

  const url = new URL(req.url ?? '/', `http://${selfHost}`)
  if (url.searchParams.get('t') === token) return { ok: true, tokenInQuery: true }

  const cookie = req.headers.cookie ?? ''
  const value = cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1)
  if (value === token) return { ok: true, tokenInQuery: false }

  return { ok: false, reason: 'token' }
}

function sendJson(res: ServerResponse, status: number, code: string, message: string): void {
  const body = JSON.stringify({ error: { code, message } })
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
    'cache-control': 'no-store',
  })
  res.end(body)
}

function sendJsonBody(res: ServerResponse, status: number, payload: unknown, head = false): void {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  res.end(head ? undefined : body)
}

function numberParam(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key)
  if (raw === null || raw.trim() === '') return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}

function setCookie(res: ServerResponse, token: string): void {
  res.setHeader(
    'set-cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict`,
  )
}

function sendPage(
  res: ServerResponse,
  html: string,
  token: string,
  setTokenCookie: boolean,
  head: boolean,
): void {
  if (setTokenCookie) setCookie(res, token)
  res.writeHead(200, {
    'content-type': MIME['.html'],
    'content-security-policy': CSP,
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'cache-control': 'no-store',
  })
  res.end(head ? undefined : html)
}

function fileWithin(root: string, pathname: string): string | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }
  if (decoded.includes('\0')) return null
  const full = resolve(root, `.${decoded}`)
  const prefix = resolve(root) + sep
  return full.startsWith(prefix) ? full : null
}

function serveStatic(
  res: ServerResponse,
  webDir: string,
  pathname: string,
  token: string,
  setTokenCookie: boolean,
  head: boolean,
): void {
  const file = fileWithin(webDir, pathname)
  if (!file) {
    sendJson(res, 404, 'NOT_FOUND', '文件不存在')
    return
  }
  let size: number
  try {
    const stat = statSync(file)
    if (!stat.isFile()) throw new Error('not a file')
    size = stat.size
  } catch {
    sendJson(res, 404, 'NOT_FOUND', '文件不存在')
    return
  }
  if (setTokenCookie) setCookie(res, token)
  res.writeHead(200, {
    'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'cache-control': 'no-store',
    'content-length': size,
  })
  if (head) res.end()
  else createReadStream(file).pipe(res)
}

export function startLocalServer(options: StartOptions): Promise<LocalServer> {
  const { webDir, token } = options
  const dirIndex = options.dirIndex ?? new DirIndex()
  const driveLister = options.driveLister ?? new DriveLister()
  const indexFile = resolve(webDir, 'index.html')
  let port = 0

  const server = createServer(async (req, res) => {
    const auth = checkRequest(req, port, token)
    if (!auth.ok) {
      sendJson(res, 403, 'UNAUTHORIZED', '未授权的请求')
      return
    }

    const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`)
    const pathname = url.pathname
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD' })
      res.end()
      return
    }

    if (pathname === '/api/drives') {
      try {
        const drives = await driveLister.list(url.searchParams.get('refresh') === '1')
        const places = (await options.placeLister?.()) ?? []
        sendJsonBody(res, 200, { drives, places }, req.method === 'HEAD')
      } catch {
        sendJson(res, 500, 'IO_ERROR', '读取磁盘列表失败')
      }
      return
    }

    if (pathname === '/api/dir') {
      const dirPath = url.searchParams.get('path')
      if (dirPath === null) {
        sendJson(res, 400, 'BAD_PATH', '缺少 path 参数')
        return
      }
      const sortParam = url.searchParams.get('sort')
      const sort = sortParam === 'mtime' || sortParam === 'size' ? sortParam : 'name'
      const order = url.searchParams.get('order') === 'desc' ? 'desc' : 'asc'
      try {
        const page = await dirIndex.get(dirPath, {
          sort,
          order,
          offset: numberParam(url.searchParams, 'offset'),
          limit: numberParam(url.searchParams, 'limit'),
        })
        sendJsonBody(res, 200, page, req.method === 'HEAD')
      } catch (error) {
        if (error instanceof DirError) {
          sendJson(res, error.status, error.code, error.message)
        } else {
          sendJson(res, 500, 'IO_ERROR', '读取目录失败')
        }
      }
      return
    }

    if (pathname === '/api/file') {
      const rawPath = url.searchParams.get('path')
      if (rawPath === null) {
        sendJson(res, 400, 'BAD_PATH', '缺少 path 参数')
        return
      }
      const checked = checkAbsolutePath(rawPath)
      if (!checked.ok) {
        sendJson(res, checked.code === 'BAD_PATH' ? 400 : 403, checked.code, checked.message)
        return
      }
      const filePath = checked.path
      const classified = classifyFile(filePath)
      if (!classified) {
        sendJson(res, 400, 'BAD_PATH', '不支持的文件类型')
        return
      }
      let fileStat
      try {
        fileStat = statSync(filePath)
      } catch (error) {
        const code =
          typeof error === 'object' && error !== null && 'code' in error
            ? String((error as { code?: unknown }).code)
            : ''
        if (code === 'ENOENT' || code === 'ENOTDIR') {
          sendJson(res, 404, 'NOT_FOUND', '文件不存在')
        } else if (code === 'EACCES' || code === 'EPERM') {
          sendJson(res, 500, 'IO_ERROR', '无权限读取文件')
        } else {
          sendJson(res, 500, 'IO_ERROR', '读取文件失败')
        }
        return
      }
      if (!fileStat.isFile()) {
        sendJson(res, 400, 'BAD_PATH', '路径不是文件')
        return
      }
      const etag = `"${fileStat.size}-${Math.round(fileStat.mtimeMs)}"`
      const validators = {
        'accept-ranges': 'bytes',
        'x-content-type-options': 'nosniff',
        'cache-control': 'private, max-age=3600',
        'last-modified': fileStat.mtime.toUTCString(),
        etag,
      }
      const range = parseRange(req.headers.range, fileStat.size)
      if (range.kind === 'unsatisfiable') {
        res.writeHead(416, {
          ...validators,
          'content-range': `bytes */${fileStat.size}`,
          'content-length': 0,
        })
        res.end()
        return
      }
      const partial = range.kind === 'partial'
      res.writeHead(partial ? 206 : 200, {
        ...validators,
        'content-type': MIME[`.${classified.ext}`] ?? 'application/octet-stream',
        'content-length': partial ? range.end - range.start + 1 : fileStat.size,
        ...(partial
          ? { 'content-range': `bytes ${range.start}-${range.end}/${fileStat.size}` }
          : {}),
      })
      if (req.method === 'HEAD') {
        res.end()
        return
      }
      const stream = partial
        ? createReadStream(filePath, { start: range.start, end: range.end })
        : createReadStream(filePath)
      stream.on('error', () => res.destroy())
      res.on('close', () => {
        if (!res.writableEnded) stream.destroy()
      })
      stream.pipe(res)
      return
    }

    if (pathname === '/') {
      let html: string
      try {
        html = readFileSync(indexFile, 'utf8')
      } catch {
        sendJson(res, 500, 'IO_ERROR', '读取页面失败')
        return
      }
      sendPage(res, html, token, auth.tokenInQuery, req.method === 'HEAD')
      return
    }

    if (pathname.startsWith('/assets/')) {
      serveStatic(res, webDir, pathname, token, auth.tokenInQuery, req.method === 'HEAD')
      return
    }

    sendJson(res, 404, 'NOT_FOUND', '接口不存在')
  })

  return new Promise((resolvePromise, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address === null || typeof address === 'string') {
        reject(new Error('unexpected server address'))
        return
      }
      port = address.port
      resolvePromise({
        port,
        url: `http://127.0.0.1:${port}/?t=${token}`,
        token,
        close: () =>
          new Promise((done, fail) =>
            server.close((error) => (error ? fail(error) : done())),
          ),
      })
    })
  })
}
