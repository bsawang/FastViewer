import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DirWatcher } from '../src/main/dir-watch'

interface FakeWatch {
  path: string
  closed: boolean
  change(): void
  fail(error: unknown): void
}

function setup(delay = 200) {
  const watches: FakeWatch[] = []
  const notified: string[] = []
  const errors: unknown[] = []
  const watcher = new DirWatcher({
    delay,
    watch: (path, onChange, onError) => {
      const record: FakeWatch = {
        path,
        closed: false,
        change: onChange,
        fail: onError,
      }
      watches.push(record)
      return {
        close: () => {
          record.closed = true
        },
      }
    },
    notify: (path) => notified.push(path),
    onError: (error) => errors.push(error),
  })
  return { watcher, watches, notified, errors }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('DirWatcher', () => {
  it('连续事件合并为一次通知', () => {
    const { watcher, watches, notified } = setup()
    expect(watcher.watch('C:\\pics')).toBe(true)
    watches[0].change()
    watches[0].change()
    vi.advanceTimersByTime(120)
    expect(notified).toEqual([])
    vi.advanceTimersByTime(120)
    expect(notified).toEqual(['C:\\pics'])
  })

  it('切换目录时关闭旧监听，只通知新目录', () => {
    const { watcher, watches, notified } = setup()
    watcher.watch('C:\\a')
    watches[0].change()
    watcher.watch('C:\\b')
    expect(watches[0].closed).toBe(true)
    vi.advanceTimersByTime(300)
    expect(notified).toEqual([])
    watches[1].change()
    vi.advanceTimersByTime(300)
    expect(notified).toEqual(['C:\\b'])
  })

  it('停止监听会取消待发通知', () => {
    const { watcher, watches, notified } = setup()
    watcher.watch('C:\\a')
    watches[0].change()
    watcher.watch('')
    expect(watches[0].closed).toBe(true)
    vi.advanceTimersByTime(300)
    expect(notified).toEqual([])
  })

  it('重复监听同一目录不会重复建立', () => {
    const { watcher, watches } = setup()
    watcher.watch('C:\\a')
    watcher.watch('C:\\a')
    expect(watches).toHaveLength(1)
  })

  it('建立监听失败时返回 false 并上报错误', () => {
    const errors: string[] = []
    const watcher = new DirWatcher({
      watch: () => {
        throw new Error('EPERM')
      },
      notify: () => {},
      onError: (error) => errors.push(String(error)),
    })
    expect(watcher.watch('Z:\\missing')).toBe(false)
    expect(errors[0]).toContain('EPERM')
  })

  it('监听出错时关闭并上报，不再通知', () => {
    const { watcher, watches, notified, errors } = setup()
    watcher.watch('C:\\a')
    watches[0].fail(new Error('ENOENT'))
    expect(watches[0].closed).toBe(true)
    expect(errors).toHaveLength(1)
    vi.advanceTimersByTime(300)
    expect(notified).toEqual([])
  })
})
