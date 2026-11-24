import type { GridItem } from './grid'

const THUMB_SIZE = 384
const MAX_ENTRIES = 180
const IMAGE_CONCURRENCY = 4
const VIDEO_CONCURRENCY = 2
const VIDEO_TIMEOUT_MS = 15_000
const SEEK_TIMEOUT_MS = 8_000

interface CacheEntry {
  url: string
}

function fileUrl(path: string): string {
  return `/api/file?path=${encodeURIComponent(path)}`
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.78)
  })
}

function waitForVideo(
  video: HTMLVideoElement,
  type: string,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false
    const onDone = (): void => {
      if (settled) return
      settled = true
      cleanup()
      resolve()
    }
    const onError = (): void => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error('video error'))
    }
    const onAbort = (): void => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error('aborted'))
    }
    const timer = window.setTimeout(onError, timeoutMs)
    function cleanup(): void {
      video.removeEventListener(type, onDone)
      video.removeEventListener('error', onError)
      signal.removeEventListener('abort', onAbort)
      window.clearTimeout(timer)
    }
    video.addEventListener(type, onDone, { once: true })
    video.addEventListener('error', onError, { once: true })
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

async function renderImage(path: string, signal: AbortSignal): Promise<Blob | null> {
  const response = await fetch(fileUrl(path), { signal })
  if (!response.ok) return null
  const blob = await response.blob()
  if (signal.aborted) return null

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(blob, { resizeWidth: THUMB_SIZE, resizeQuality: 'low' })
  } catch {
    return null
  }
  if (signal.aborted) {
    bitmap.close()
    return null
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, bitmap.width)
  canvas.height = Math.max(1, bitmap.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return null
  }
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  return canvasToBlob(canvas)
}

async function renderVideo(path: string, signal: AbortSignal): Promise<Blob | null> {
  const video = document.createElement('video')
  video.preload = 'metadata'
  video.muted = true
  video.playsInline = true
  video.src = fileUrl(path)
  try {
    await waitForVideo(video, 'loadedmetadata', signal, VIDEO_TIMEOUT_MS)
    const duration = Number.isFinite(video.duration) ? video.duration : 0
    const target = duration > 0 ? Math.min(5, Math.max(0.5, duration * 0.1)) : 0
    if (target > 0) {
      video.currentTime = target
      await waitForVideo(video, 'seeked', signal, SEEK_TIMEOUT_MS)
    }
    if (signal.aborted) return null

    const width = video.videoWidth
    const height = video.videoHeight
    if (width <= 0 || height <= 0) return null
    const longest = Math.max(width, height)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round((width / longest) * THUMB_SIZE))
    canvas.height = Math.max(1, Math.round((height / longest) * THUMB_SIZE))
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvasToBlob(canvas)
  } finally {
    video.removeAttribute('src')
    video.load()
  }
}

class Gate {
  private active = 0
  private readonly waiters: Array<() => void> = []

  constructor(private readonly limit: number) {}

  enter(signal: AbortSignal): Promise<boolean> {
    if (signal.aborted) return Promise.resolve(false)
    if (this.active < this.limit) {
      this.active += 1
      return Promise.resolve(true)
    }
    return new Promise<boolean>((resolve) => {
      const onAbort = (): void => {
        const index = this.waiters.indexOf(grant)
        if (index >= 0) this.waiters.splice(index, 1)
        resolve(false)
      }
      const grant = (): void => {
        signal.removeEventListener('abort', onAbort)
        resolve(true)
      }
      signal.addEventListener('abort', onAbort, { once: true })
      this.waiters.push(grant)
    })
  }

  leave(): void {
    const next = this.waiters.shift()
    if (next) next()
    else this.active -= 1
  }
}

/**
 * 图墙缩略图：图片按 384 px 解码缩放，视频抓取一帧，结果缓存为 blob URL。
 * 直接使用原图缩略图会在大图上产生数十 MB 的解码内存，是 ComfyUI 输出目录卡顿的主因。
 */
export class ThumbnailService {
  private readonly cache = new Map<string, CacheEntry>()
  private readonly imageGate = new Gate(IMAGE_CONCURRENCY)
  private readonly videoGate = new Gate(VIDEO_CONCURRENCY)

  async get(item: GridItem, signal: AbortSignal): Promise<string | null> {
    if (item.kind !== 'image' && item.kind !== 'video') return null
    const key = `${item.kind}:${item.path}:${item.mtimeMs}`
    const cached = this.cache.get(key)
    if (cached) {
      this.touch(key, cached)
      return cached.url
    }

    const gate = item.kind === 'image' ? this.imageGate : this.videoGate
    if (!(await gate.enter(signal))) return null
    try {
      if (signal.aborted) return null
      const again = this.cache.get(key)
      if (again) {
        this.touch(key, again)
        return again.url
      }
      const blob =
        item.kind === 'image'
          ? await renderImage(item.path, signal)
          : await renderVideo(item.path, signal)
      if (!blob || signal.aborted) return null
      const url = URL.createObjectURL(blob)
      this.store(key, { url })
      return url
    } catch {
      return null
    } finally {
      gate.leave()
    }
  }

  private touch(key: string, entry: CacheEntry): void {
    this.cache.delete(key)
    this.cache.set(key, entry)
  }

  private store(key: string, entry: CacheEntry): void {
    const previous = this.cache.get(key)
    if (previous) URL.revokeObjectURL(previous.url)
    this.cache.set(key, entry)
    while (this.cache.size > MAX_ENTRIES) {
      const oldest = this.cache.keys().next()
      if (oldest.done) break
      const value = this.cache.get(oldest.value)
      this.cache.delete(oldest.value)
      if (value) URL.revokeObjectURL(value.url)
    }
  }
}
