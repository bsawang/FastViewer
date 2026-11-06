import type { MediaItem } from './media-seq'
import { wrapIndex } from './media-seq'
import { formatBytes } from './viewer'
import { WheelNavigator } from './wheel-nav'
import { Zoom, type ZoomState } from './zoom'

interface FullscreenElements {
  modal: HTMLElement
  stage: HTMLElement
  image: HTMLImageElement
  close: HTMLButtonElement
  prev: HTMLButtonElement
  next: HTMLButtonElement
  zoomFit: HTMLButtonElement
  zoomActual: HTMLButtonElement
  detail: HTMLElement
  detailClose: HTMLButtonElement
  detailName: HTMLElement
  detailDim: HTMLElement
  detailSize: HTMLElement
  detailTime: HTMLElement
  info: HTMLButtonElement
  counter: HTMLElement
}

interface FullscreenOptions {
  onIndexChange(item: MediaItem): void
  onClose(): void
}

export interface FullscreenState {
  open: boolean
  detailOpen: boolean
  zoom: ZoomState
}

const CLICK_SLOP = 4

export class FullscreenLayer {
  private readonly el: FullscreenElements
  private readonly options: FullscreenOptions
  private readonly zoom = new Zoom(
    () => ({ width: this.el.image.naturalWidth, height: this.el.image.naturalHeight }),
    () => ({ width: this.el.stage.clientWidth, height: this.el.stage.clientHeight }),
  )
  private readonly resizeObserver: ResizeObserver
  private readonly wheelNav = new WheelNavigator()
  private items: MediaItem[] = []
  private index = 0
  private detailOpen = true
  private imageReady = false
  private pendingZoom: { x: number; y: number; factor: number } | null = null
  private pan: { startX: number; startY: number; lastX: number; lastY: number; active: boolean } | null =
    null

  constructor(elements: FullscreenElements, options: FullscreenOptions) {
    this.el = elements
    this.options = options
    this.el.image.draggable = false
    this.el.close.addEventListener('click', () => this.close())
    this.el.prev.addEventListener('click', () => this.prev())
    this.el.next.addEventListener('click', () => this.next())
    this.el.zoomFit.addEventListener('click', () => this.zoomFitNow())
    this.el.zoomActual.addEventListener('click', () => this.zoomActualNow())
    this.el.detailClose.addEventListener('click', () => this.setDetailOpen(false))
    this.el.info.addEventListener('click', () => this.setDetailOpen(true))
    this.bindStage()
    this.resizeObserver = new ResizeObserver(() => {
      if (this.isOpen() && this.imageReady && this.zoom.isFit()) this.applyZoom(this.zoom.fit())
    })
    this.resizeObserver.observe(this.el.stage)
  }

  open(items: MediaItem[], index: number, detailOpen: boolean): void {
    if (items.length === 0) return
    this.items = items.slice()
    this.index = wrapIndex(index, this.items.length)
    this.detailOpen = detailOpen
    this.el.modal.hidden = false
    this.el.modal.classList.remove('fv-fs-stage--grabbing')
    this.wheelNav.reset()
    this.setDetailOpen(detailOpen)
    this.render()
  }

  close(): void {
    if (!this.isOpen()) return
    this.pan = null
    this.pendingZoom = null
    this.imageReady = false
    this.items = []
    this.el.modal.hidden = true
    this.el.modal.classList.remove('fv-fs-stage--grabbing')
    this.wheelNav.reset()
    this.el.image.removeAttribute('src')
    this.el.image.hidden = true
    this.options.onClose()
  }

  isOpen(): boolean {
    return !this.el.modal.hidden
  }

  next(): void {
    this.move(1)
  }

  prev(): void {
    this.move(-1)
  }

  toggleDetail(): void {
    if (!this.isOpen()) return
    this.setDetailOpen(!this.detailOpen)
  }

  setDetailOpen(open: boolean): void {
    this.detailOpen = open
    this.el.detail.hidden = !open
    this.el.info.hidden = open
  }

  zoomIn(): void {
    this.zoomBy(1.1)
  }

  zoomOut(): void {
    this.zoomBy(1 / 1.1)
  }

  zoomFitNow(): void {
    if (!this.isOpen() || !this.imageReady) return
    this.applyZoom(this.zoom.fit())
  }

  zoomActualNow(): void {
    if (!this.isOpen() || !this.imageReady) return
    this.applyZoom(this.zoom.actual())
  }

  getState(): FullscreenState {
    return {
      open: this.isOpen(),
      detailOpen: this.detailOpen,
      zoom: this.zoom.getState(),
    }
  }

  private move(delta: number): void {
    if (this.items.length === 0) return
    for (let step = 1; step <= this.items.length; step += 1) {
      const next = wrapIndex(this.index + delta * step, this.items.length)
      if (this.items[next].kind !== 'image') continue
      this.index = next
      this.render()
      this.options.onIndexChange(this.items[this.index])
      return
    }
  }

  private render(): void {
    const item = this.items[this.index]
    if (!item) return
    const keepActual = this.zoom.getState().mode === 'actual'
    this.imageReady = false
    this.pendingZoom = null
    this.pan = null
    this.el.image.hidden = true
    this.el.detailName.textContent = item.name
    this.el.detailDim.textContent = '读取中…'
    this.el.detailSize.textContent = formatBytes(item.size)
    this.el.detailTime.textContent = new Date(item.mtimeMs).toLocaleString('zh-CN')
    this.updateCounter()
    this.el.image.onload = () => {
      this.imageReady = true
      this.el.detailDim.textContent = `${this.el.image.naturalWidth} × ${this.el.image.naturalHeight}`
      this.el.image.hidden = false
      this.applyZoom(keepActual ? this.zoom.actual() : this.zoom.fit())
      if (this.pendingZoom) {
        const pending = this.pendingZoom
        this.pendingZoom = null
        this.applyZoom(this.zoom.zoomAt(pending.x, pending.y, pending.factor))
      }
    }
    this.el.image.onerror = () => {
      this.imageReady = false
      this.el.image.hidden = true
    }
    this.el.image.src = item.url
    if (this.el.image.complete && this.el.image.naturalWidth > 0) this.el.image.onload?.(new Event('load'))
  }

  private bindStage(): void {
    const stage = this.el.stage

    stage.addEventListener(
      'wheel',
      (event) => {
        if (!this.isOpen()) return
        if (event.ctrlKey) {
          event.preventDefault()
          const rect = stage.getBoundingClientRect()
          const factor = Math.pow(1.1, -event.deltaY / 100)
          if (!this.imageReady) {
            const base = this.pendingZoom?.factor ?? 1
            this.pendingZoom = {
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
              factor: base * factor,
            }
            return
          }
          this.applyZoom(this.zoom.zoomAt(event.clientX - rect.left, event.clientY - rect.top, factor))
          return
        }
        event.preventDefault()
        const direction = this.wheelNav.feed(event.deltaY, performance.now())
        if (direction !== 0) this.move(direction)
      },
      { passive: false },
    )

    stage.addEventListener('dblclick', (event) => {
      if (!this.isOpen() || !this.imageReady) return
      const rect = stage.getBoundingClientRect()
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top }
      this.applyZoom(this.zoom.isFit() ? this.zoom.actual(anchor) : this.zoom.fit())
    })

    stage.addEventListener('pointerdown', (event) => {
      if (!this.isOpen() || event.button !== 0) return
      this.pan = {
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        active: false,
      }
      stage.setPointerCapture(event.pointerId)
    })

    stage.addEventListener('pointermove', (event) => {
      if (!this.pan) return
      if (!this.pan.active) {
        if (Math.hypot(event.clientX - this.pan.startX, event.clientY - this.pan.startY) <= CLICK_SLOP) return
        this.pan.active = true
        this.el.modal.classList.add('fv-fs-stage--grabbing')
      }
      const dx = event.clientX - this.pan.lastX
      const dy = event.clientY - this.pan.lastY
      this.pan.lastX = event.clientX
      this.pan.lastY = event.clientY
      if (this.imageReady && (dx !== 0 || dy !== 0)) this.applyZoom(this.zoom.pan(dx, dy))
    })

    const endPan = (event: PointerEvent): void => {
      this.pan = null
      this.el.modal.classList.remove('fv-fs-stage--grabbing')
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId)
    }
    stage.addEventListener('pointerup', endPan)
    stage.addEventListener('pointercancel', endPan)
  }

  private zoomBy(factor: number): void {
    if (!this.isOpen() || !this.imageReady) return
    const x = this.el.stage.clientWidth / 2
    const y = this.el.stage.clientHeight / 2
    this.applyZoom(this.zoom.zoomAt(x, y, factor))
  }

  private applyZoom(state: ZoomState): void {
    this.el.image.style.transform = `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`
    this.el.zoomFit.classList.toggle('is-active', state.mode === 'fit')
    this.el.zoomActual.classList.toggle('is-active', state.mode !== 'fit' && state.scale === 1)
    this.updateCounter()
  }

  private updateCounter(): void {
    const item = this.items[this.index]
    if (!item) {
      this.el.counter.textContent = ''
      return
    }
    const zoom = this.imageReady ? ` · ${Math.round(this.zoom.getScale() * 100)}%` : ''
    this.el.counter.textContent = `${this.index + 1}/${this.items.length}${zoom}`
  }
}
