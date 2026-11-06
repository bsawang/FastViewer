import { dirname, resolve, win32 } from 'node:path'

export type OpenTarget =
  | { kind: 'dir'; path: string }
  | { kind: 'file'; path: string; dir: string }

export interface PathProbe {
  kind(path: string): 'dir' | 'file' | 'missing'
}

export function parsePathArgs(args: string[]): string[] {
  return args.filter(
    (arg) => arg.length > 0 && !arg.startsWith('-') && (win32.isAbsolute(arg) || /^[A-Za-z]:[\\/]/.test(arg)),
  )
}

export function resolveOpenTarget(input: string, probe: PathProbe): OpenTarget | null {
  const path = resolve(input)
  const kind = probe.kind(path)
  if (kind === 'dir') return { kind: 'dir', path }
  if (kind === 'file') return { kind: 'file', path, dir: dirname(path) }
  return null
}

export function firstOpenTarget(args: string[], probe: PathProbe): OpenTarget | null {
  for (const arg of parsePathArgs(args)) {
    const target = resolveOpenTarget(arg, probe)
    if (target) return target
  }
  return null
}
