import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  DriveLister,
  parseWmicCsv,
  scanDriveLetters,
  type DriveInfo,
} from '../src/main/drives'
import { startLocalServer, type LocalServer } from '../src/main/server'

const TOKEN = 'd'.repeat(64)
let server: LocalServer | null = null

const CSV = [
  'Node,DriveType,DeviceID',
  'DESKTOP,3,C:',
  'DESKTOP,2,E:',
  'DESKTOP,4,Z:',
  'DESKTOP,5,D:',
  'DESKTOP,3,F:',
  '',
].join('\r\n')

function names(drives: DriveInfo[]): string[] {
  return drives.map((drive) => drive.name)
}

describe('parseWmicCsv', () => {
  it('只保留固定盘与可移动盘，网络盘与光驱丢弃', () => {
    expect(parseWmicCsv(CSV)).toEqual([
      { path: 'C:\\', name: 'C:', label: '本地磁盘 (C:)', type: 'fixed' },
      { path: 'E:\\', name: 'E:', label: '可移动磁盘 (E:)', type: 'removable' },
      { path: 'F:\\', name: 'F:', label: '本地磁盘 (F:)', type: 'fixed' },
    ])
  })

  it('按表头定位列，不依赖列顺序', () => {
    const text = 'Node,DeviceID,DriveType\r\nHOST,E:,2\r\nHOST,C:,3\r\n'
    expect(names(parseWmicCsv(text))).toEqual(['C:', 'E:'])
  })

  it('空输出与畸形行返回空数组', () => {
    expect(parseWmicCsv('')).toEqual([])
    expect(parseWmicCsv('Node,DriveType,DeviceID\nHOST,x,C:\n')).toEqual([])
  })
})

describe('scanDriveLetters', () => {
  it('只保留探测存在的盘符，按升序返回', () => {
    const present = new Set(['E:\\', 'C:\\'])
    const drives = scanDriveLetters((path) => present.has(path))
    expect(names(drives)).toEqual(['C:', 'E:'])
    expect(drives[0]).toMatchObject({ path: 'C:\\', type: 'fixed' })
  })
})

describe('DriveLister', () => {
  it('wmic 失败时回退盘符扫描', async () => {
    const lister = new DriveLister({
      wmic: async () => {
        throw new Error('wmic missing')
      },
      exists: (path) => path === 'E:\\',
    })
    expect(names(await lister.list())).toEqual(['E:'])
  })

  it('结果按 5 秒缓存，refresh 强制重取', async () => {
    let calls = 0
    let time = 1000
    const lister = new DriveLister({
      wmic: async () => {
        calls += 1
        return 'Node,DriveType,DeviceID\r\nHOST,3,C:\r\n'
      },
      exists: () => false,
      now: () => time,
      ttlMs: 5000,
    })

    await lister.list()
    await lister.list()
    expect(calls).toBe(1)

    time += 5000
    await lister.list()
    expect(calls).toBe(2)

    await lister.list(true)
    expect(calls).toBe(3)
  })
})

describe('GET /api/drives', () => {
  it('凭 cookie 返回盘符列表，未授权 403', async () => {
    const webDir = mkdtempSync(join(tmpdir(), 'fv-drives-web-'))
    mkdirSync(join(webDir, 'assets'))
    writeFileSync(join(webDir, 'index.html'), '<!doctype html><title>fv</title>')
    const driveLister = new DriveLister({
      wmic: async () => CSV,
      exists: () => false,
    })
    server = await startLocalServer({ webDir, token: TOKEN, driveLister })

    const authorized = await get(server.port, '/api/drives', { cookie: `fv=${TOKEN}` })
    expect(authorized.status).toBe(200)
    expect(JSON.parse(authorized.body)).toEqual({
      drives: [
        { path: 'C:\\', name: 'C:', label: '本地磁盘 (C:)', type: 'fixed' },
        { path: 'E:\\', name: 'E:', label: '可移动磁盘 (E:)', type: 'removable' },
        { path: 'F:\\', name: 'F:', label: '本地磁盘 (F:)', type: 'fixed' },
      ],
      places: [],
    })

    const denied = await get(server.port, '/api/drives')
    expect(denied.status).toBe(403)
  })
})

afterAll(async () => {
  if (server) await server.close()
})

function get(port: number, path: string, headers: Record<string, string> = {}): Promise<{
  status: number
  body: string
}> {
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
