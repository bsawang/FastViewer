import {
  GRID_GAP,
  GRID_PADDING,
  anchorScrollTop,
  clampTileSize,
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
  onLoadMore?(): void
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
  private items: GridItem[] = []
  private total = 0
  private tileSize = 180
  private metrics: GridMetrics = computeMetrics(0, this.tileSize, 0)
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

  setTileSize(size: number): void {
    const next = clampTileSize(size)
    if (next === this.tileSize) return
    const anchor = this.captureAnchor()
    this.tileSize = next
    this.refreshLayout(false)
    if (anchor && this.el) {
      this.el.scrollTop = anchorScrollTop(anchor.index, anchor.offset, this.metrics.cols, this.metrics)
      this.paint()
    }
  }

  getTileSize(): number {
    return this.tileSize
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
    this.metrics = computeMetrics(width, this.tileSize, this.items.length)
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
        node.remove()
        this.pool.push(node)
      }
    }

    const size = this.tileSize
    for (let index = range.start; index < range.end; index += 1) {
      const item = this.items[index]
      if (!item) continue
      let node = this.tiles.get(index)
      if (!node) {
        node = this.pool.pop() ?? this.createTile()
        this.tiles.set(index, node)
        this.layer.append(node)
      }
      this.updateTile(node, item, index, size)
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

    const name = document.createElement('span')
    name.className = 'fv-name'

    media.append(folder, img)
    node.append(media, name)
    node.addEventListener('click', () => {
      const index = Number(node.dataset.index)
      if (Number.isInteger(index)) this.options.onOpen(index)
    })
    return node
  }

  private updateTile(node: HTMLElement, item: GridItem, index: number, size: number): void {
    const { left, top } = tilePosition(index, this.metrics.cols, this.metrics, size)
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
      img.removeAttribute('src')
      img.dataset.url = ''
      node.classList.remove('fv-tile--error', 'fv-tile--loaded')
      return
    }

    const url = fileUrl(item.path)
    const absolute = new URL(url, location.href).href
    if (img.dataset.url !== absolute) {
      node.classList.remove('fv-tile--error', 'fv-tile--loaded')
      img.dataset.url = absolute
      img.src = url
    }
  }
}
