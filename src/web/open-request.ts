export function parentOf(path: string): string | null {
  const cut = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'))
  if (cut <= 0) return null
  const parent = path.slice(0, cut)
  return /^[A-Za-z]:$/.test(parent) ? `${parent}\\` : parent
}

export function findMediaIndex(
  seq: ReadonlyArray<{ path: string }>,
  path: string,
): number {
  const key = path.toLowerCase()
  return seq.findIndex((entry) => entry.path.toLowerCase() === key)
}
