/**
 * 目录变更监听：只监听一个目录，事件合并后通知一次。
 * watch / notify 由调用方注入，便于单测，也方便主进程接 fs.watch 与 IPC。
 */

export interface WatchHandle {
  close(): void
}

export interface DirWatchOptions {
  watch(path: string, onChange: () => void, onError: (error: unknown) => void): WatchHandle
  notify(path: string): void
  delay?: number
  onError?(error: unknown): void
}

export class DirWatcher {
  private handle: WatchHandle | null = null
  private watched = ''
  private timer: ReturnType<typeof setTimeout> | null = null
  private readonly delay: number

  constructor(private readonly options: DirWatchOptions) {
    this.delay = options.delay ?? 200
  }

  /** 切换监听目录；传空字符串表示停止监听。返回是否成功建立监听。 */
  watch(path: string): boolean {
    if (path === '') {
      this.stop()
      return true
    }
    if (this.handle !== null && this.watched === path) return true
    this.stop()
    try {
      this.handle = this.options.watch(
        path,
        () => this.schedule(path),
        (error) => this.fail(error),
      )
    } catch (error) {
      this.options.onError?.(error)
      return false
    }
    this.watched = path
    return true
  }

  stop(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.handle !== null) {
      this.handle.close()
      this.handle = null
    }
    this.watched = ''
  }

  private schedule(path: string): void {
    if (path !== this.watched) return
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      if (path === this.watched) this.options.notify(path)
    }, this.delay)
  }

  private fail(error: unknown): void {
    this.options.onError?.(error)
    this.stop()
  }
}
