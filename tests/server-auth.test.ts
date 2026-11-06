import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startLocalServer, type LocalServer } from '../src/main/server'

const TOKEN = 'a'.repeat(64)

interface Reply {
  status: number
  headers: Record<string, string | string[] | undefined>
  body: string
}

function get(
  port: number,
  path: string,
  headers: Record<string, string> = {},
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const req = request(
      { host: '127.0.0.1', port, path, method: 'GET', headers },
      (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => (body += chunk))
        res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }))
      },
    )
    req.on('error', reject)
    req.end()
  })
}

let server: LocalServer

beforeAll(async () => {
  const webDir = mkdtempSync(join(tmpdir(), 'fv-web-'))
  mkdirSync(join(webDir, 'assets'))
  writeFileSync(join(webDir, 'index.html'), '<!doctype html><title>guest</title>')
  writeFileSync(join(webDir, 'assets', 'app.js'), 'console.log(1)')
  server = await startLocalServer({ webDir, token: TOKEN })
})

afterAll(async () => {
  await server.close()
})

const base = () => ({ host: `127.0.0.1:${server.port}` })
const cookie = () => ({ ...base(), cookie: `fv=${TOKEN}` })

describe('local server auth', () => {
  it('rejects a foreign Host header', async () => {
    const res = await get(server.port, '/api/dir?path=E%3A%5C', { host: 'evil.com' })
    expect(res.status).toBe(403)
    expect(JSON.parse(res.body).error.code).toBe('UNAUTHORIZED')
  })

  it('rejects /api/dir without a cookie', async () => {
    const res = await get(server.port, '/api/dir?path=E%3A%5C', base())
    expect(res.status).toBe(403)
    expect(JSON.parse(res.body).error.code).toBe('UNAUTHORIZED')
  })

  it('rejects a cross-origin Origin header', async () => {
    const res = await get(server.port, '/api/dir?path=E%3A%5C', {
      ...cookie(),
      origin: 'https://evil.example',
    })
    expect(res.status).toBe(403)
  })

  it('accepts a same-origin Origin header', async () => {
    const res = await get(server.port, '/assets/app.js', {
      ...cookie(),
      origin: `http://127.0.0.1:${server.port}`,
    })
    expect(res.status).toBe(200)
    expect(res.body).toBe('console.log(1)')
  })

  it('lets the token query in and sets an HttpOnly SameSite=Strict cookie', async () => {
    const res = await get(server.port, `/?t=${TOKEN}`, base())
    expect(res.status).toBe(200)
    expect(String(res.headers['set-cookie'])).toContain(`fv=${TOKEN}`)
    expect(String(res.headers['set-cookie'])).toContain('HttpOnly')
    expect(String(res.headers['set-cookie'])).toContain('SameSite=Strict')
    expect(res.body).toContain('<title>guest</title>')
  })

  it('serves the page with a strict CSP', async () => {
    const res = await get(server.port, `/?t=${TOKEN}`, base())
    const csp = String(res.headers['content-security-policy'])
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(res.headers['x-content-type-options']).toBe('nosniff')
  })

  it('rejects a wrong token', async () => {
    const res = await get(server.port, '/?t=deadbeef', base())
    expect(res.status).toBe(403)
  })

  it('passes auth for /api/dir with a valid cookie', async () => {
    const res = await get(
      server.port,
      `/api/dir?path=${encodeURIComponent(tmpdir())}`,
      cookie(),
    )
    expect(res.status).toBe(200)
    expect(typeof JSON.parse(res.body).total).toBe('number')
  })

  it('blocks path traversal in /assets', async () => {
    const res = await get(server.port, '/assets/..%2F..%2Findex.html', cookie())
    expect([403, 404]).toContain(res.status)
  })
})
