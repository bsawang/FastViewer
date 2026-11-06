export interface CrumbSegment {
  label: string
  path: string
}

const DRIVE_ABSOLUTE = /^([A-Za-z]:)[\\/]/

function computerRoot(): CrumbSegment {
  return { label: '此电脑', path: '' }
}

export function parseBreadcrumb(absPath: string): CrumbSegment[] {
  if (absPath === '') return [computerRoot()]
  if (/^[\\/]{2}/.test(absPath) || absPath.includes('\0')) return []
  const match = DRIVE_ABSOLUTE.exec(absPath)
  if (!match) return []

  const drive = match[1] as string
  const segments: CrumbSegment[] = [computerRoot(), { label: drive, path: `${drive}\\` }]
  const rest = absPath
    .slice(2)
    .replace(/[\\/]+/g, '\\')
    .replace(/^\\|\\$/g, '')

  if (rest.length === 0) return segments

  let current = `${drive}\\`
  for (const part of rest.split('\\')) {
    if (part.length === 0) continue
    current = current.endsWith('\\') ? `${current}${part}` : `${current}\\${part}`
    segments.push({ label: part, path: current })
  }
  return segments
}

export function collapseBreadcrumb(
  segments: CrumbSegment[],
  max = 5,
): { visible: CrumbSegment[]; hidden: CrumbSegment[] } {
  if (segments.length <= max) return { visible: segments, hidden: [] }
  return {
    visible: [segments[0] as CrumbSegment, ...segments.slice(-3)],
    hidden: segments.slice(1, -3),
  }
}
