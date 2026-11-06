import { appendFileSync, mkdirSync, renameSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

const MAX_BYTES = 1024 * 1024
const KEEP = 2

let logFile: string | null = null

function file(): string {
  if (!logFile) {
    const dir = join(app.getPath('userData'), 'logs')
    mkdirSync(dir, { recursive: true })
    logFile = join(dir, 'main.log')
  }
  return logFile
}

function rotate(path: string): void {
  try {
    if (statSync(path).size < MAX_BYTES) return
  } catch {
    return
  }
  for (let i = KEEP - 1; i >= 1; i--) {
    try {
      renameSync(`${path}.${i}`, `${path}.${i + 1}`)
    } catch {
      /* missing segment */
    }
  }
  try {
    renameSync(path, `${path}.1`)
  } catch {
    /* best effort */
  }
}

function write(level: string, args: unknown[]): void {
  const line = `${new Date().toISOString()} ${level} ${args
    .map((v) => (typeof v === 'string' ? v : JSON.stringify(v)))
    .join(' ')}`
  if (level === 'ERROR') console.error(line)
  else console.log(line)
  try {
    const path = file()
    rotate(path)
    appendFileSync(path, `${line}\n`)
  } catch {
    /* logging must never break the app */
  }
}

export const logger = {
  info: (...args: unknown[]) => write('INFO', args),
  warn: (...args: unknown[]) => write('WARN', args),
  error: (...args: unknown[]) => write('ERROR', args),
}
