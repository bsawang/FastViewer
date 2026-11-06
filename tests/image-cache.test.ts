import { describe, expect, it } from 'vitest'
import { ImageCache, ImageLoadError, LoadGeneration, type ImageLike } from '../src/web/image-cache'

interface FakeImage extends ImageLike {
  readonly url: string
}

function fakeFactory(
  behavior: (url: string) => Promise<void> = async () => {},
): { factory: (url: string) => FakeImage; calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    factory: (url: string): FakeImage => {
      calls.push(url)
      return {
        url,
        naturalWidth: 100,
        naturalHeight: 50,
        decode: () => behavior(url),
      }
    },
  }
}

describe('ImageCache', () => {
  it('超过上限时淘汰最久未使用的条目', async () => {
    const { factory } = fakeFactory()
    const cache = new ImageCache(factory, 3)

    await cache.load('a')
    await cache.load('b')
    await cache.load('c')
    await cache.load('d')

    expect(cache.size).toBe(3)
    expect(cache.has('a')).toBe(false)
    expect(cache.has('b')).toBe(true)
    expect(cache.has('d')).toBe(true)
  })

  it('重复访问会刷新热度，避免被淘汰', async () => {
    const { factory, calls } = fakeFactory()
    const cache = new ImageCache(factory, 3)

    await cache.load('a')
    await cache.load('b')
    await cache.load('c')
    await cache.load('a')
    expect(calls.filter((url) => url === 'a')).toHaveLength(1)

    await cache.load('d')

    expect(cache.has('a')).toBe(true)
    expect(cache.has('b')).toBe(false)
  })

  it('命中缓存不再构造图片', async () => {
    const { factory, calls } = fakeFactory()
    const cache = new ImageCache(factory, 3)

    const first = await cache.load('a')
    const second = await cache.load('a')

    expect(second).toBe(first)
    expect(calls).toEqual(['a'])
  })

  it('decode 超时抛出 timeout', async () => {
    const { factory } = fakeFactory(() => new Promise<void>(() => {}))
    const cache = new ImageCache(factory, 3)

    await expect(cache.load('slow', 20)).rejects.toMatchObject({
      name: 'ImageLoadError',
      reason: 'timeout',
    })
    await expect(cache.load('slow', 20)).rejects.toBeInstanceOf(ImageLoadError)
  })

  it('decode 失败不缓存，重试会重新加载', async () => {
    let attempts = 0
    const { factory, calls } = fakeFactory(async () => {
      attempts += 1
      if (attempts === 1) throw new Error('bad image')
    })
    const cache = new ImageCache(factory, 3)

    await expect(cache.load('broken')).rejects.toThrow('bad image')
    expect(cache.has('broken')).toBe(false)

    await expect(cache.load('broken')).resolves.toBeTruthy()
    expect(calls).toEqual(['broken', 'broken'])
  })

  it('prefetch 失败不抛出', async () => {
    const { factory } = fakeFactory(async () => {
      throw new Error('nope')
    })
    const cache = new ImageCache(factory, 3)

    expect(() => cache.prefetch('bad')).not.toThrow()
    await new Promise((resolve) => setTimeout(resolve, 10))
  })
})

describe('LoadGeneration', () => {
  it('旧 generation 的加载结果被判定过期', () => {
    const generation = new LoadGeneration()
    const first = generation.next()

    expect(generation.isCurrent(first)).toBe(true)
    const second = generation.next()
    expect(second).not.toBe(first)
    expect(generation.isCurrent(first)).toBe(false)
    expect(generation.isCurrent(second)).toBe(true)
  })
})
