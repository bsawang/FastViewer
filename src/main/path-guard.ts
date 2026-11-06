import { resolve } from 'node:path'

export type PathCheck =
  | { ok: true; path: string }
  | { ok: false; code: 'BAD_PATH' | 'FORBIDDEN_PATH'; message: string }

const DRIVE_ABSOLUTE = /^[A-Za-z]:[\\/]/

export function checkAbsolutePath(input: string): PathCheck {
  if (input.length === 0) {
    return { ok: false, code: 'FORBIDDEN_PATH', message: '路径为空' }
  }
  if (input.includes('\0')) {
    return { ok: false, code: 'FORBIDDEN_PATH', message: '路径包含非法字符' }
  }
  if (/^[\\/]{2}/.test(input)) {
    return { ok: false, code: 'FORBIDDEN_PATH', message: '不支持网络或设备路径' }
  }
  if (!DRIVE_ABSOLUTE.test(input)) {
    return { ok: false, code: 'BAD_PATH', message: '必须是盘符绝对路径' }
  }
  return { ok: true, path: resolve(input) }
}

export const checkDirPath = checkAbsolutePath
