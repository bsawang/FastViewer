import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { parseRange } from '../src/main/range'
import { startLocalServer, type LocalServer } from '../src/main/server'

describe('parseRange', () => {
  const SIZE = 4096

  it('ignores a missing or empty header', () => {
    expect(parseRange(undefined, SIZE)).toEqual({ kind: 'none' })
    expect(parseRange('', SIZE)).toEqual({ kind: 'none' })
  })

  it.each([
    ['bytes=0-1023', 0, 1023],
    ['bytes=1000-', 1000, 4095],
    ['bytes=-100', 3996, 4095],
    ['bytes=4000-9999', 4000, 4095],
    ['bytes=-9999', 0, 4095],
    ['BYTES=1-2', 1, 2],
  ])('parses %s', (header, start, end) => {
    expect(parseRange(header, SIZE)).toEqual({ kind: 'partial', start, end })
  })

  it.each([
    ['bytes=4096-'],
    ['bytes=5000-6000'],
    ['bytes=5-3'],
    ['bytes=-0'],
    ['bytes=0-1,3-4'],
    ['bytes='],
    ['items=0-1'],
    ['bytes=a-b'],
    ['bytes=1-2-3'],
    ['bytes=--1'],
    ['bytes=1.5-2'],
    ['bytes= 1-2'],
  ])('rejects %s as unsatisfiable', (header) => {
    expect(parseRange(header, SIZE)).toEqual({ kind: 'unsatisfiable' })
  })

  it('treats any range on an empty file as unsatisfiable', () => {
    expect(parseRange(undefined, 0)).toEqual({ kind: 'none' })
    expect(parseRange('bytes=0-', 0)).toEqual({ kind: 'unsatisfiable' })
  })
})

const TOKEN = 'b'.repeat(64)
const SIZE = 4096

interface Reply {
  status: number
  headers: Record<string, string | string[] | undefined>
  body: Buffer
}

function fetchFile(
  port: number,
  filePath: string,
  headers: Record<string, string> = {},
  method: 'GET' | 'HEAD' = 'GET',
): Promise<Reply> {
  const query = encodeURIComponent(filePath)
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: '127.0.0.1',
        port,
        path: `/api/file?path=${query}`,
        method,
        headers: { host: `127.0.0.1:${port}`, cookie: `fv=${TOKEN}`, ...headers },
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }),
        )
      },
    )
    req.on('error', reject)
    req.end()
  })
}

let server: LocalServer
let clip: string
let empty: string

beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), 'fv-range-'))
  const webDir = join(dir, 'web')
  mkdirSync(webDir)
  writeFileSync(join(webDir, 'index.html'), '<!doctype html><title>guest</title>')
  clip = join(dir, 'clip.mp4')
  const data = Buffer.alloc(SIZE)
  for (let i = 0; i < SIZE; i += 1) data[i] = i % 251
  writeFileSync(clip, data)
  empty = join(dir, 'empty.mp4')
  writeFileSync(empty, Buffer.alloc(0))
  server = await startLocalServer({ webDir, token: TOKEN })
})

afterAll(async () => {
  await server.close()
})

describe('/api/file ranges', () => {
  it('serves a full 200 with cache validators', async () => {
    const res = await fetchFile(server.port, clip)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toBe('video/mp4')
    expect(res.headers['content-length']).toBe(String(SIZE))
    expect(res.headers['accept-ranges']).toBe('bytes')
    expect(String(res.headers['etag'])).toMatch(/^"\d+-\d+"$/)
    expect(String(res.headers['last-modified'])).toContain('GMT')
    expect(res.body.length).toBe(SIZE)
  })

  it('serves bytes=0-1023 as 206', async () => {
    const res = await fetchFile(server.port, clip, { range: 'bytes=0-1023' })
    expect(res.status).toBe(206)
    expect(res.headers['content-range']).toBe(`bytes 0-1023/${SIZE}`)
    expect(res.headers['content-length']).toBe('1024')
    expect(res.headers['accept-ranges']).toBe('bytes')
    expect(res.body.length).toBe(1024)
    expect(res.body[0]).toBe(0)
    expect(res.body[1023]).toBe(1023 % 251)
  })

  it('serves an open-ended range', async () => {
    const res = await fetchFile(server.port, clip, { range: 'bytes=4095-' })
    expect(res.status).toBe(206)
    expect(res.headers['content-range']).toBe(`bytes 4095-4095/${SIZE}`)
    expect(res.body.length).toBe(1)
  })

  it('serves a suffix range', async () => {
    const res = await fetchFile(server.port, clip, { range: 'bytes=-64' })
    expect(res.status).toBe(206)
    expect(res.headers['content-range']).toBe(`bytes 4032-4095/${SIZE}`)
    expect(res.body.length).toBe(64)
  })

  it('answers 416 for an out-of-range start', async () => {
    const res = await fetchFile(server.port, clip, { range: 'bytes=4096-' })
    expect(res.status).toBe(416)
    expect(res.headers['content-range']).toBe(`bytes */${SIZE}`)
    expect(res.body.length).toBe(0)
  })

  it('answers 416 for multiple ranges', async () => {
    const res = await fetchFile(server.port, clip, { range: 'bytes=0-1,3-4' })
    expect(res.status).toBe(416)
  })

  it('supports HEAD with a range', async () => {
    const res = await fetchFile(server.port, clip, { range: 'bytes=0-99' }, 'HEAD')
    expect(res.status).toBe(206)
    expect(res.headers['content-length']).toBe('100')
    expect(res.body.length).toBe(0)
  })

  it('serves an empty file as 200 with zero length', async () => {
    const res = await fetchFile(server.port, empty)
    expect(res.status).toBe(200)
    expect(res.headers['content-length']).toBe('0')
    expect(res.body.length).toBe(0)
  })

  it('rejects a range request without the token', async () => {
    const req = new Promise<number>((resolvePromise, reject) => {
      const r = request(
        {
          host: '127.0.0.1',
          port: server.port,
          path: `/api/file?path=${encodeURIComponent(clip)}`,
          headers: { host: `127.0.0.1:${server.port}`, range: 'bytes=0-1' },
        },
        (res) => {
          res.resume()
          res.on('end', () => resolvePromise(res.statusCode ?? 0))
        },
      )
      r.on('error', reject)
      r.end()
    })
    expect(await req).toBe(403)
  })
})
