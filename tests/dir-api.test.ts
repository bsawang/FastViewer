import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startLocalServer, type LocalServer } from '../src/main/server'

const TOKEN = 'b'.repeat(64)

interface Reply {
  status: number
  body: string
}

interface DirResponse {
  path: string
  parent: string | null
  total: number
  offset: number
  limit: number
  entries: Array<{ name: string; path: string; kind: string; size: number; mtimeMs: number; ext?: string }>
}

function get(port: number, path: string, headers: Record<string, string> = {}): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path, method: 'GET', headers }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }))
    })
    req.on('error', reject)
    req.end()
  })
}

let server: LocalServer
let mediaDir: string

beforeAll(async () => {
  mediaDir = mkdtempSync(join(tmpdir(), 'fv-api-media-'))
  mkdirSync(join(mediaDir, 'album'))
  writeFileSync(join(mediaDir, 'one.jpg'), 'x'.repeat(11))
  writeFileSync(join(mediaDir, 'two.mp4'), 'x'.repeat(22))
  writeFileSync(join(mediaDir, 'skip.txt'), 'x')

  const webDir = mkdtempSync(join(tmpdir(), 'fv-api-web-'))
  mkdirSync(join(webDir, 'assets'))
  writeFileSync(join(webDir, 'index.html'), '<!doctype html><title>fv</title>')

  server = await startLocalServer({ webDir, token: TOKEN })
})

afterAll(async () => {
  await server.close()
})

function dirUrl(query: Record<string, string>): string {
  const params = new URLSearchParams(query)
  return `/api/dir?${params.toString()}`
}

describe('GET /api/dir', () => {
  it('凭 cookie 返回分页结果且目录在前', async () => {
    const reply = await get(
      server.port,
      dirUrl({ path: mediaDir, sort: 'name', order: 'asc', offset: '0', limit: '50' }),
      { cookie: `fv=${TOKEN}` },
    )

    expect(reply.status).toBe(200)
    const body = JSON.parse(reply.body) as DirResponse
    expect(body.path).toBe(mediaDir)
    expect(body.total).toBe(3)
    expect(body.offset).toBe(0)
    expect(body.limit).toBe(50)
    expect(body.entries.length).toBeLessThanOrEqual(50)
    expect(body.entries.map((entry) => entry.name)).toEqual(['album', 'one.jpg', 'two.mp4'])
    expect(body.entries[0]?.kind).toBe('dir')
    expect(body.entries.slice(1).every((entry) => entry.kind === 'image' || entry.kind === 'video')).toBe(true)
  })

  it('不带 cookie 与 token → 403', async () => {
    const reply = await get(server.port, dirUrl({ path: mediaDir }))

    expect(reply.status).toBe(403)
    expect(JSON.parse(reply.body)).toMatchObject({ error: { code: 'UNAUTHORIZED' } })
  })

  it('支持 ?t= token 鉴权', async () => {
    const reply = await get(server.port, `${dirUrl({ path: mediaDir })}&t=${TOKEN}`)

    expect(reply.status).toBe(200)
  })

  it('limit 越界被钳制到 1000', async () => {
    const reply = await get(server.port, dirUrl({ path: mediaDir, limit: '99999' }), {
      cookie: `fv=${TOKEN}`,
    })

    expect(reply.status).toBe(200)
    expect((JSON.parse(reply.body) as DirResponse).limit).toBe(1000)
  })

  it('缺少 path 参数 → 400 BAD_PATH', async () => {
    const reply = await get(server.port, '/api/dir', { cookie: `fv=${TOKEN}` })

    expect(reply.status).toBe(400)
    expect(JSON.parse(reply.body)).toMatchObject({ error: { code: 'BAD_PATH' } })
  })

  it('路径不存在 → 404 NOT_FOUND', async () => {
    const reply = await get(server.port, dirUrl({ path: join(mediaDir, 'gone') }), {
      cookie: `fv=${TOKEN}`,
    })

    expect(reply.status).toBe(404)
    expect(JSON.parse(reply.body)).toMatchObject({ error: { code: 'NOT_FOUND' } })
  })

  it('文件路径 → 400 BAD_PATH', async () => {
    const reply = await get(server.port, dirUrl({ path: join(mediaDir, 'one.jpg') }), {
      cookie: `fv=${TOKEN}`,
    })

    expect(reply.status).toBe(400)
    expect(JSON.parse(reply.body)).toMatchObject({ error: { code: 'BAD_PATH' } })
  })

  it('按大小降序返回文件大小', async () => {
    const reply = await get(server.port, dirUrl({ path: mediaDir, sort: 'size', order: 'desc' }), {
      cookie: `fv=${TOKEN}`,
    })

    const body = JSON.parse(reply.body) as DirResponse
    const files = body.entries.filter((entry) => entry.kind !== 'dir')
    expect(files.map((entry) => entry.name)).toEqual(['two.mp4', 'one.jpg'])
    expect(files[0]?.size).toBe(22)
  })
})
