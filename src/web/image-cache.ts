export interface ImageLike {
  decode(): Promise<void>
  readonly naturalWidth: number
  readonly naturalHeight: number
}

export type ImageFactory = (url: string) => ImageLike

export class ImageLoadError extends Error {
  readonly reason = 'timeout'

  constructor() {
    super('图片加载超时')
    this.name = 'ImageLoadError'
  }
}

export class LoadGeneration {
  private value = 0

  next(): number {
    this.value += 1
    return this.value
  }

  isCurrent(token: number): boolean {
    return token === this.value
  }
}

function defaultFactory(url: string): ImageLike {
  const image = new Image()
  image.decoding = 'async'
  image.src = url
  return image
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new ImageLoadError()), timeoutMs)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

interface CacheEntry {
  image: ImageLike
  lastUsed: number
}

export class ImageCache {
  private readonly entries = new Map<string, CacheEntry>()
  private tick = 0

  constructor(
    private readonly factory: ImageFactory = defaultFactory,
    private readonly limit = 8,
  ) {}

  get size(): number {
    return this.entries.size
  }

  has(url: string): boolean {
    return this.entries.has(url)
  }

  async load(url: string, timeoutMs = 10_000): Promise<ImageLike> {
    const cached = this.touch(url)
    if (cached) return cached

    const image = this.factory(url)
    try {
      await withTimeout(image.decode(), timeoutMs)
    } catch (error) {
      this.entries.delete(url)
      throw error
    }
    this.store(url, image)
    return image
  }

  prefetch(url: string): void {
    void this.load(url).catch(() => {})
  }

  private touch(url: string): ImageLike | null {
    const entry = this.entries.get(url)
    if (!entry) return null
    entry.lastUsed = ++this.tick
    return entry.image
  }

  private store(url: string, image: ImageLike): void {
    this.entries.set(url, { image, lastUsed: ++this.tick })
    while (this.entries.size > this.limit) {
      let oldestUrl: string | null = null
      let oldest = Number.POSITIVE_INFINITY
      for (const [key, entry] of this.entries) {
        if (entry.lastUsed < oldest) {
          oldest = entry.lastUsed
          oldestUrl = key
        }
      }
      if (oldestUrl === null) break
      this.entries.delete(oldestUrl)
    }
  }
}
