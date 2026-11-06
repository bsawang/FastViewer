import { ImageCache, LoadGeneration } from './image-cache'
import { mapMediaError } from './media-error'
import { wrapIndex, type MediaItem } from './media-seq'
import { VideoController } from './video-controls'
import { WheelNavigator } from './wheel-nav'
import { Zoom, type ZoomState } from './zoom'

interface ViewerElements {
  root: HTMLElement
  empty: HTMLElement
  stage: HTMLElement
  image: HTMLImageElement
  video: HTMLVideoElement
  loading: HTMLElement
  error: HTMLElement
  errorName: HTMLElement
  errorText: HTMLElement
  retry: HTMLButtonElement
  nextError: HTMLButtonElement
  detail: HTMLElement
  detailClose: HTMLButtonElement
  detailName: HTMLElement
  detailDim: HTMLElement
  detailSize: HTMLElement
  detailTime: HTMLElement
  info: HTMLButtonElement
  counter: HTMLElement
  zoomBar: HTMLElement
  zoomFitButton: HTMLButtonElement
  zoomActualButton: HTMLButtonElement
  videoControls: HTMLElement
  videoPlay: HTMLButtonElement
  videoTime: HTMLElement
  videoTrack: HTMLElement
  videoPlayed: HTMLElement
  videoBuffered: HTMLElement
  videoThumb: HTMLElement
  videoMute: HTMLButtonElement
  videoVolume: HTMLInputElement
  videoReplay: HTMLElement
  videoReplayButton: HTMLButtonElement
}

interface ViewerOptions {
  onDetailChange(open: boolean): void
  onIndexChange(item: MediaItem): void
  onZoomChange?(state: ZoomState): void
  onImageClick?(): void
}

const cache = new ImageCache()
const VIDEO_STALL_MS = 15000

export function formatBytes(size: number): string {
  if (!Number.isFinite(size) || size < 0) return '未知'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export class Viewer {
  private readonly el: ViewerElements
  private readonly options: ViewerOptions
  private readonly generation = new LoadGeneration()
  private readonly zoom = new Zoom(
    () => ({ width: this.el.image.naturalWidth, height: this.el.image.naturalHeight }),
    () => ({ width: this.el.stage.clientWidth, height: this.el.stage.clientHeight }),
  )
  private readonly resizeObserver: ResizeObserver
  private readonly videoController: VideoController
  private readonly wheelNav = new WheelNavigator()
  private items: MediaItem[] = []
  private index = 0
  private detailOpen = true
  private imageActive = false
  private imageReady = false
  private pendingZoom: { x: number; y: number; factor: number } | null = null
  private pan: { startX: number; startY: number; lastX: number; lastY: number; active: boolean } | null =
    null
  private clickStart: { x: number; y: number; at: number } | null = null
  private clickTimer = 0
  private keepZoom: ZoomState | null = null
  private stallTimer = 0

  constructor(elements: ViewerElements, options: ViewerOptions) {
    this.el = elements
    this.options = options
    this.el.info.addEventListener('click', () => this.toggleDetail())
    this.el.zoomFitButton.addEventListener('click', () => this.zoomFit())
    this.el.zoomActualButton.addEventListener('click', () => this.zoomActual())
    this.el.retry.addEventListener('click', () => this.render())
    this.el.nextError.addEventListener('click', () => this.next())
    this.el.detailClose.addEventListener('click', () => this.setDetailOpen(false, true))
    this.el.image.draggable = false
    this.videoController = new VideoController(this.el.video, {
      controls: this.el.videoControls,
      play: this.el.videoPlay,
      time: this.el.videoTime,
      track: this.el.videoTrack,
      played: this.el.videoPlayed,
      buffered: this.el.videoBuffered,
      thumb: this.el.videoThumb,
      mute: this.el.videoMute,
      volume: this.el.videoVolume,
      replay: this.el.videoReplay,
      replayButton: this.el.videoReplayButton,
    })
    this.bindZoom()
    this.resizeObserver = new ResizeObserver(() => {
      if (this.imageReady && this.zoom.isFit()) this.applyZoom(this.zoom.fit())
    })
    this.resizeObserver.observe(this.el.stage)
  }

  open(items: MediaItem[], index: number, detailOpen: boolean): void {
    if (items.length === 0) {
      this.showEmpty()
      return
    }
    this.items = items.slice()
    this.index = wrapIndex(index, this.items.length)
    this.el.root.hidden = false
    this.el.root.classList.remove('fv-viewer--empty')
    this.el.empty.hidden = true
    this.el.counter.hidden = false
    this.wheelNav.reset()
    this.setDetailOpen(detailOpen, false)
    this.render()
    this.options.onIndexChange(this.items[this.index])
  }

  showEmpty(): void {
    window.clearTimeout(this.stallTimer)
    this.generation.next()
    this.wheelNav.reset()
    this.clearVideoHandlers()
    this.videoController.destroy()
    this.items = []
    this.index = 0
    this.imageActive = false
    this.imageReady = false
    this.pendingZoom = null
    this.pan = null
    this.el.image.removeAttribute('src')
    this.el.image.style.transform = ''
    this.el.video.removeAttribute('src')
    this.el.loading.hidden = true
    this.el.error.hidden = true
    this.el.root.hidden = false
    this.el.root.classList.add('fv-viewer--empty')
    this.el.empty.hidden = false
    this.el.detail.hidden = true
    this.el.info.hidden = true
    this.el.counter.hidden = true
    this.el.zoomBar.hidden = true
    this.el.stage.classList.remove('fv-viewer-stage--image', 'fv-viewer-stage--grabbing')
  }

  isOpen(): boolean {
    return this.items.length > 0 && !this.el.root.classList.contains('fv-viewer--empty')
  }

  getItems(): MediaItem[] {
    return this.items.slice()
  }

  getCurrent(): MediaItem | undefined {
    return this.items[this.index]
  }

  setIndex(index: number): void {
    if (this.items.length === 0) return
    const next = wrapIndex(index, this.items.length)
    if (next === this.index) return
    const keep = this.zoom.getState()
    this.index = next
    this.render(keep)
    this.options.onIndexChange(this.items[this.index])
  }

  private step(delta: number): void {
    this.setIndex(this.index + delta)
  }

  next(): void {
    this.move(1)
  }

  prev(): void {
    this.move(-1)
  }

  toggleDetail(): void {
    if (!this.isOpen()) return
    this.setDetailOpen(!this.detailOpen, true)
  }

  setDetailOpen(open: boolean, notify: boolean): void {
    this.detailOpen = open
    this.el.detail.hidden = !open
    this.el.info.hidden = open || !this.isOpen()
    if (notify) this.options.onDetailChange(open)
  }

  isVideoActive(): boolean {
    return this.isOpen() && this.items[this.index]?.kind === 'video'
  }

  togglePlay(): void {
    this.videoController.togglePlay()
  }

  seekBy(delta: number): void {
    this.videoController.seekBy(delta)
  }

  volumeBy(delta: number): void {
    this.videoController.volumeBy(delta)
  }

  toggleMute(): void {
    this.videoController.toggleMute()
  }

  zoomIn(): void {
    this.zoomBy(1.1)
  }

  zoomOut(): void {
    this.zoomBy(1 / 1.1)
  }

  zoomFit(): void {
    if (!this.imageActive || !this.imageReady || !this.isOpen()) return
    this.applyZoom(this.zoom.fit())
  }

  zoomActual(): void {
    if (!this.imageActive || !this.imageReady || !this.isOpen()) return
    this.applyZoom(this.zoom.actual())
  }

  getState(): { index: number; detailOpen: boolean; total: number; scale: number; fit: boolean; mode: ZoomState['mode'] } {
    return {
      index: this.index,
      detailOpen: this.detailOpen,
      total: this.items.length,
      scale: this.zoom.getScale(),
      fit: this.zoom.isFit(),
      mode: this.zoom.getState().mode,
    }
  }

  private move(delta: number): void {
    if (this.items.length === 0) return
    this.index = wrapIndex(this.index + delta, this.items.length)
    this.render()
    this.options.onIndexChange(this.items[this.index])
  }

  private showLoading(): void {
    this.el.loading.hidden = false
    this.el.error.hidden = true
    this.el.image.hidden = true
    this.el.video.hidden = true
    this.updateZoomUi()
  }

  private showError(message = '无法显示该文件'): void {
    this.imageReady = false
    this.pendingZoom = null
    this.el.loading.hidden = true
    this.el.image.hidden = true
    this.el.video.hidden = true
    this.el.detailDim.textContent = '—'
    this.el.errorText.textContent = message
    this.el.error.hidden = false
    this.updateZoomUi()
  }

  private clearVideoHandlers(): void {
    window.clearTimeout(this.stallTimer)
    const video = this.el.video
    video.onloadedmetadata = null
    video.oncanplay = null
    video.onplaying = null
    video.onerror = null
  }

  private showVideoError(code: number | null): void {
    this.clearVideoHandlers()
    this.videoController.destroy()
    this.showError(code === null ? '视频加载超时，文件可能无法访问' : mapMediaError(code))
  }

  private bindZoom(): void {
    const stage = this.el.stage

    stage.addEventListener(
      'wheel',
      (event) => {
        if (!this.isOpen()) return
        if (event.ctrlKey) {
          event.preventDefault()
          if (!this.imageActive) return
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
        if (direction !== 0) this.step(direction)
      },
      { passive: false },
    )

    stage.addEventListener('dblclick', (event) => {
      if (!this.imageActive || !this.imageReady) return
      window.clearTimeout(this.clickTimer)
      const rect = stage.getBoundingClientRect()
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top }
      this.applyZoom(this.zoom.isFit() ? this.zoom.actual(anchor) : this.zoom.fit())
    })

    stage.addEventListener('pointerdown', (event) => {
      if (!this.imageActive || !this.imageReady || event.button !== 0) return
      window.clearTimeout(this.clickTimer)
      this.clickStart = { x: event.clientX, y: event.clientY, at: performance.now() }
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
        if (Math.hypot(event.clientX - this.pan.startX, event.clientY - this.pan.startY) <= 4) return
        this.pan.active = true
        stage.classList.add('fv-viewer-stage--grabbing')
      }
      const dx = event.clientX - this.pan.lastX
      const dy = event.clientY - this.pan.lastY
      this.pan.lastX = event.clientX
      this.pan.lastY = event.clientY
      if (dx !== 0 || dy !== 0) this.applyZoom(this.zoom.pan(dx, dy))
    })

    const endPan = (event: PointerEvent): void => {
      const pan = this.pan
      const click = this.clickStart
      this.pan = null
      this.clickStart = null
      stage.classList.remove('fv-viewer-stage--grabbing')
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId)
      if (!pan || !click || event.type !== 'pointerup') return
      if (!this.imageActive || !this.imageReady || pan.active) return
      const distance = Math.hypot(event.clientX - click.x, event.clientY - click.y)
      const elapsed = performance.now() - click.at
      if (distance > 4 || elapsed >= 500) return
      this.clickTimer = window.setTimeout(() => {
        if (this.imageActive && this.imageReady) this.options.onImageClick?.()
      }, 250)
    }
    stage.addEventListener('pointerup', endPan)
    stage.addEventListener('pointercancel', endPan)
  }

  private zoomBy(factor: number): void {
    if (!this.imageActive || !this.imageReady || !this.isOpen()) return
    const x = this.el.stage.clientWidth / 2
    const y = this.el.stage.clientHeight / 2
    this.applyZoom(this.zoom.zoomAt(x, y, factor))
  }

  private applyZoom(state: ZoomState): void {
    this.el.image.style.transform = `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`
    this.updateCounter()
    this.updateZoomUi(state)
  }

  private updateZoomUi(state: ZoomState = this.zoom.getState()): void {
    const ready = this.imageActive && this.imageReady && this.isOpen()
    this.el.zoomBar.hidden = !ready
    if (!ready) return
    this.el.zoomFitButton.classList.toggle('is-active', state.mode === 'fit')
    this.el.zoomActualButton.classList.toggle('is-active', state.mode !== 'fit' && state.scale === 1)
    this.options.onZoomChange?.(state)
  }

  private updateCounter(): void {
    const item = this.items[this.index]
    if (!item) {
      this.el.counter.hidden = true
      return
    }
    const zoom = item.kind === 'image' && this.imageReady ? ` · ${Math.round(this.zoom.getScale() * 100)}%` : ''
    this.el.counter.hidden = false
    this.el.counter.textContent = `${this.index + 1}/${this.items.length}${zoom}`
  }

  private resetZoom(): void {
    window.clearTimeout(this.clickTimer)
    this.imageReady = false
    this.pendingZoom = null
    this.pan = null
    this.clickStart = null
    this.el.stage.classList.remove('fv-viewer-stage--grabbing')
    this.el.image.style.transform = ''
    this.zoom.fit()
    this.updateZoomUi()
  }

  private revealImage(): void {
    this.imageReady = true
    const keep = this.keepZoom
    this.keepZoom = null
    if (keep?.mode === 'actual') this.applyZoom(this.zoom.actual())
    else if (keep?.mode === 'free') this.applyZoom(this.zoom.restore(keep))
    else this.applyZoom(this.zoom.fit())
    if (this.pendingZoom) {
      const pending = this.pendingZoom
      this.pendingZoom = null
      this.applyZoom(this.zoom.zoomAt(pending.x, pending.y, pending.factor))
    }
  }

  private render(keepZoom: ZoomState | null = null): void {
    this.keepZoom = keepZoom
    const item = this.items[this.index]
    if (!item) return
    const token = this.generation.next()

    this.el.errorName.textContent = item.name
    this.el.errorText.textContent = '无法显示该文件'
    this.el.detailName.textContent = item.name
    this.el.detailDim.textContent = '读取中…'
    this.el.detailSize.textContent = formatBytes(item.size)
    this.el.detailTime.textContent = new Date(item.mtimeMs).toLocaleString('zh-CN')
    this.resetZoom()
    if (item.kind !== 'image') this.keepZoom = null
    this.imageActive = item.kind === 'image'
    this.el.stage.classList.toggle('fv-viewer-stage--image', this.imageActive)
    this.updateCounter()
    this.showLoading()

    if (item.kind === 'image') {
      void this.renderImage(item, token)
      return
    }
    this.renderVideo(item, token)
  }

  private async renderImage(item: MediaItem, token: number): Promise<void> {
    this.clearVideoHandlers()
    this.videoController.destroy()
    try {
      const loaded = await cache.load(item.url)
      if (!this.generation.isCurrent(token)) return
      this.el.detailDim.textContent = `${loaded.naturalWidth} × ${loaded.naturalHeight}`

      const reveal = (): void => {
        if (!this.generation.isCurrent(token)) return
        this.el.image.onload = null
        this.el.loading.hidden = true
        this.el.image.hidden = false
        this.revealImage()
      }
      this.el.image.onload = reveal
      this.el.image.onerror = () => {
        if (!this.generation.isCurrent(token)) return
        this.showError()
      }
      this.el.image.src = item.url
      if (this.el.image.complete && this.el.image.naturalWidth > 0) reveal()
      this.prefetchNeighbors()
    } catch {
      if (!this.generation.isCurrent(token)) return
      this.showError()
    }
  }

  private renderVideo(item: MediaItem, token: number): void {
    this.clearVideoHandlers()
    this.el.image.hidden = true
    this.el.image.removeAttribute('src')
    this.el.error.hidden = true
    this.el.video.hidden = false
    this.videoController.mount(item)
    const video = this.el.video
    video.onloadedmetadata = () => {
      if (!this.generation.isCurrent(token)) return
      this.el.loading.hidden = true
      this.el.detailDim.textContent = `${video.videoWidth} × ${video.videoHeight}`
    }
    const ready = (): void => {
      if (!this.generation.isCurrent(token)) return
      window.clearTimeout(this.stallTimer)
    }
    video.oncanplay = ready
    video.onplaying = ready
    video.onerror = () => {
      if (!this.generation.isCurrent(token)) return
      this.showVideoError(video.error?.code ?? null)
    }
    this.stallTimer = window.setTimeout(() => {
      if (!this.generation.isCurrent(token)) return
      this.showVideoError(null)
    }, VIDEO_STALL_MS)
  }

  private prefetchNeighbors(): void {
    if (this.items.length < 2) return
    for (const delta of [1, -1]) {
      const item = this.items[wrapIndex(this.index + delta, this.items.length)]
      if (item?.kind === 'image') cache.prefetch(item.url)
    }
  }
}
