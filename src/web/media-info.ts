export function extensionLabel(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot <= 0 || dot === name.length - 1) return '未知'
  return name.slice(dot + 1).toUpperCase()
}

export function formatPixels(width: number, height: number): string {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return '—'
  }
  const total = width * height
  if (total >= 10_000) return `${Math.round(total / 10_000)} 万像素`
  return `${total} 像素`
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—'
  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const tail = `${minutes}:${String(secs).padStart(2, '0')}`
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : tail
}

export function formatBitrate(sizeBytes: number, seconds: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return '—'
  if (!Number.isFinite(seconds) || seconds <= 0) return '—'
  const bitsPerSecond = (sizeBytes * 8) / seconds
  if (bitsPerSecond >= 1_000_000) return `${(bitsPerSecond / 1_000_000).toFixed(1)} Mbps`
  return `${Math.round(bitsPerSecond / 1000)} kbps`
}
