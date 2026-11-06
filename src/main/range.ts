export type RangeResult =
  | { kind: 'none' }
  | { kind: 'partial'; start: number; end: number }
  | { kind: 'unsatisfiable' }

const SINGLE = /^(\d*)-(\d*)$/

export function parseRange(header: string | undefined, size: number): RangeResult {
  if (header === undefined) return { kind: 'none' }
  const raw = header.trim()
  if (raw === '') return { kind: 'none' }
  if (!/^bytes=/i.test(raw)) return { kind: 'unsatisfiable' }

  const value = raw.slice('bytes='.length)
  if (value.includes(',')) return { kind: 'unsatisfiable' }
  const match = SINGLE.exec(value)
  if (!match) return { kind: 'unsatisfiable' }

  const startRaw = match[1]
  const endRaw = match[2]
  if (startRaw === '' && endRaw === '') return { kind: 'unsatisfiable' }
  if (size === 0) return { kind: 'unsatisfiable' }

  if (startRaw === '') {
    const suffix = Number(endRaw)
    if (suffix === 0) return { kind: 'unsatisfiable' }
    return { kind: 'partial', start: Math.max(0, size - suffix), end: size - 1 }
  }

  const start = Number(startRaw)
  if (start > size - 1) return { kind: 'unsatisfiable' }
  let end = endRaw === '' ? size - 1 : Number(endRaw)
  if (end < start) return { kind: 'unsatisfiable' }
  if (end > size - 1) end = size - 1
  return { kind: 'partial', start, end }
}
