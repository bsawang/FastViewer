import {
  GRID_GAP,
  GRID_PADDING,
  anchorScrollTop,
  clampColumns,
  computeMetrics,
  focusScrollTop,
  rowIndexAt,
  tilePosition,
  visibleRange,
  type GridMetrics,
} from './grid-math'

export interface GridItem {
  name: string
  path: string
  kind: 'dir' | 'image' | 'video'
  size: number
  mtimeMs: number
  ext?: string
}

export interface GridOptions {
  onOpen(index: number): void
  onDoubleClick?(index: number): void
  onContextMenu?(index: number, x: number, y: number): void
  onBlankContextMenu?(x: number, y: number): void
  onLoadMore?(): void
  getThumbnail?(item: GridItem, signal: AbortSignal): Promise<string | null>
}

const OVERSCAN_ROWS = 2
const LOAD_MORE_ROWS = 3

function fileUrl(path: string): string {
  return `/api/file?path=${encodeURIComponent(path)}`
}

export class Grid {
  private el: HTMLElement | null = null
  private layer: HTMLDivElement | null = null
  private options: GridOptions = { onOpen: () => {} }
  private readonly tiles = new Map<number, HTMLElement>()
  private readonly pool: HTMLElement[] = []
  private readonly thumbAborts = new Map<HTMLElement, AbortController>()
  private items: GridItem[] = []
  private total = 0
  private columns = 4
  private metrics: GridMetrics = computeMetrics(0, this.columns, 0)
  private currentIndex = -1
  private frame = 0
  private observer: ResizeObserver | null = null

  mount(el: HTMLElement, options: GridOptions): void {
    this.el = el
    this.options = options
    this.layer = document.createElement('div')
    this.layer.className = 'fv-layer'
    el.append(this.layer)

    el.addEventListener('scroll', this.onScroll, { passive: true })
    el.addEventListener('contextmenu', (event) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('.fv-tile')) return
      event.preventDefault()
      this.options.onBlankContextMenu?.(event.clientX, event.clientY)
    })
    this.observer = new ResizeObserver(() => {
      if (!this.el || this.el.clientWidth === 0) return
      this.refreshLayout(true)
    })
    this.observer.observe(el)
    this.refreshLayout(false)
  }

  setEntries(entries: GridItem[], total: number, reset: boolean): void {
    if (reset) {
      this.items = entries.slice()
      this.currentIndex = -1
      if (this.el) this.el.scrollTop = 0
    } else {
      this.items = this.items.concat(entries)
    }
    this.total = total
    this.refreshLayout(false)
  }

  setColumns(columns: number): void {
    const next = clampColumns(columns)
    if (next === this.columns) return
    const anchor = this.captureAnchor()
    this.columns = next
    this.refreshLayout(false)
    if (anchor && this.el) {
      this.el.scrollTop = anchorScrollTop(anchor.index, anchor.offset, this.metrics.cols, this.metrics)
      this.paint()
    }
  }

  getColumns(): number {
    return this.columns
  }

  setCurrent(index: number): void {
    if (this.currentIndex !== index) {
      this.currentIndex = index
      for (const [tileIndex, node] of this.tiles) {
        node.classList.toggle('is-current', tileIndex === index)
      }
    }
    if (!this.el || index < 0) return
    const next = focusScrollTop(index, this.el.scrollTop, this.el.clientHeight, this.metrics)
    if (next === null) return
    this.el.scrollTop = next
    this.paint()
  }

  refreshLayout(preserveAnchor: boolean): void {
    if (!this.el || !this.layer) return
    const width = this.el.clientWidth
    if (width === 0) return

    const anchor = preserveAnchor ? this.captureAnchor() : null
    this.metrics = computeMetrics(width, this.columns, this.items.length)
    this.layer.style.height = `${this.metrics.totalH}px`

    if (anchor) {
      this.el.scrollTop = anchorScrollTop(anchor.index, anchor.offset, this.metrics.cols, this.metrics)
    }
    this.paint()
  }

  destroy(): void {
    this.observer?.disconnect()
    this.observer = null
    if (this.el) this.el.removeEventListener('scroll', this.onScroll)
    if (this.layer) this.layer.remove()
    for (const controller of this.thumbAborts.values()) controller.abort()
    this.thumbAborts.clear()
    this.tiles.clear()
    this.pool.length = 0
    this.el = null
    this.layer = null
  }

  private captureAnchor(): { index: number; offset: number } | null {
    if (!this.el || this.items.length === 0 || this.metrics.rows === 0) return null
    const scrollTop = this.el.scrollTop
    const row = rowIndexAt(this.metrics.rowTops, scrollTop)
    const index = Math.min(this.items.length - 1, row * this.metrics.cols)
    const offset = scrollTop - (this.metrics.rowTops[row] ?? GRID_PADDING)
    return { index, offset }
  }

  private readonly onScroll = (): void => {
    if (this.frame !== 0) return
    this.frame = requestAnimationFrame(() => {
      this.frame = 0
      this.paint()
    })
  }

  private paint(): void {
    if (!this.el || !this.layer) return
    const range = visibleRange(
      this.el.scrollTop,
      this.el.clientHeight,
      this.metrics,
      this.items.length,
      OVERSCAN_ROWS,
    )

    for (const [index, node] of this.tiles) {
      if (index < range.start || index >= range.end) {
        this.tiles.delete(index)
        this.cancelThumb(node)
        node.remove()
        this.pool.push(node)
      }
    }

    for (let index = range.start; index < range.end; index += 1) {
      const item = this.items[index]
      if (!item) continue
      let node = this.tiles.get(index)
      if (!node) {
        node = this.pool.pop() ?? this.createTile()
        this.tiles.set(index, node)
        this.layer.append(node)
      }
      this.updateTile(node, item, index)
    }

    const loadedRows = Math.ceil(this.items.length / this.metrics.cols)
    if (
      this.items.length < this.total &&
      range.end > (loadedRows - LOAD_MORE_ROWS) * this.metrics.cols
    ) {
      this.options.onLoadMore?.()
    }
  }

  private createTile(): HTMLElement {
    const node = document.createElement('div')
    node.className = 'fv-tile'

    const media = document.createElement('div')
    media.className = 'fv-media'

    const folder = document.createElement('div')
    folder.className = 'fv-folder'
    folder.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h3.2c.7 0 1.3.3 1.8.8l1.1 1.2h6.9A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" /></svg>'

    const img = document.createElement('img')
    img.className = 'fv-thumb'
    img.decoding = 'async'
    img.alt = ''
    img.addEventListener('error', () => {
      if (!img.getAttribute('src') || img.dataset.url !== img.src) return
      node.classList.add('fv-tile--error')
    })
    img.addEventListener('load', () => {
      if (img.dataset.url === img.src) {
        node.classList.remove('fv-tile--error')
        node.classList.add('fv-tile--loaded')
      }
    })

    const mark = document.createElement('div')
    mark.className = 'fv-video-mark'
    mark.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>'

    const name = document.createElement('span')
    name.className = 'fv-name'

    media.append(folder, img, mark)
    node.append(media, name)
    node.addEventListener('click', () => {
      const index = Number(node.dataset.index)
      if (Number.isInteger(index)) this.options.onOpen(index)
    })
    node.addEventListener('dblclick', () => {
      const index = Number(node.dataset.index)
      if (Number.isInteger(index)) this.options.onDoubleClick?.(index)
    })
    node.addEventListener('contextmenu', (event) => {
      event.preventDefault()
      const index = Number(node.dataset.index)
      if (Number.isInteger(index)) {
        this.options.onContextMenu?.(index, event.clientX, event.clientY)
      }
    })
    return node
  }

  private updateTile(node: HTMLElement, item: GridItem, index: number): void {
    const size = this.metrics.tileSize
    const { left, top } = tilePosition(index, this.metrics.cols, this.metrics)
    const row = Math.floor(index / this.metrics.cols)
    const height = (this.metrics.rowHeights[row] ?? size + GRID_GAP) - GRID_GAP
    node.dataset.index = String(index)
    node.dataset.kind = item.kind
    node.classList.toggle('is-current', index === this.currentIndex)
    node.style.left = `${left}px`
    node.style.top = `${top}px`
    node.style.width = `${size}px`
    node.style.height = `${height}px`

    const img = node.querySelector<HTMLImageElement>('.fv-thumb')
    const name = node.querySelector<HTMLElement>('.fv-name')
    if (name) {
      name.textContent = item.name
      name.title = item.name
    }
    if (!img) return

    if (item.kind === 'dir') {
      this.cancelThumb(node)
      img.removeAttribute('src')
      img.dataset.url = ''
      node.classList.remove('fv-tile--error', 'fv-tile--loaded')
      return
    }

    const key = `${item.kind}:${item.path}`
    if (node.dataset.thumbKey === key) return
    this.cancelThumb(node)
    node.dataset.thumbKey = key
    node.classList.remove('fv-tile--error', 'fv-tile--loaded')
    img.removeAttribute('src')
    img.dataset.url = ''

    const provider = this.options.getThumbnail
    if (!provider) {
      this.setThumb(img, fileUrl(item.path))
      return
    }

    const controller = new AbortController()
    this.thumbAborts.set(node, controller)
    void provider(item, controller.signal).then((url) => {
      if (controller.signal.aborted || node.dataset.thumbKey !== key) return
      if (url) {
        this.setThumb(img, url)
        return
      }
      // 缩略图生成失败：图片回退原图，视频保留下方占位与播放标记。
      if (item.kind === 'image') this.setThumb(img, fileUrl(item.path))
    })
  }

  private setThumb(img: HTMLImageElement, url: string): void {
    img.dataset.url = new URL(url, location.href).href
    img.src = url
  }

  private cancelThumb(node: HTMLElement): void {
    const controller = this.thumbAborts.get(node)
    if (controller) {
      controller.abort()
      this.thumbAborts.delete(node)
    }
    node.dataset.thumbKey = ''
  }
}
