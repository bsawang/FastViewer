import type { MediaItem } from './media-seq'

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const minutes = Math.floor(total / 60)
  return `${minutes}:${String(total % 60).padStart(2, '0')}`
}

export interface VideoControlElements {
  controls: HTMLElement
  play: HTMLButtonElement
  time: HTMLElement
  track: HTMLElement
  played: HTMLElement
  buffered: HTMLElement
  thumb: HTMLElement
  mute: HTMLButtonElement
  volume: HTMLInputElement
  replay: HTMLElement
  replayButton: HTMLButtonElement
}

export class VideoController {
  private readonly video: HTMLVideoElement
  private readonly el: VideoControlElements
  private raf = 0
  private scrubbing = false
  private preview = 0
  private duration = 0
  private seekable = false
  private active = false

  constructor(video: HTMLVideoElement, elements: VideoControlElements) {
    this.video = video
    this.el = elements

    this.el.play.addEventListener('click', () => this.togglePlay())
    this.el.mute.addEventListener('click', () => this.toggleMute())
    this.el.volume.addEventListener('input', () => {
      this.setVolume(Number(this.el.volume.value) / 100)
    })
    this.el.replayButton.addEventListener('click', () => {
      this.seek(0)
      this.play()
    })
    this.bindScrub()

    const refreshMetadata = (): void => {
      if (!this.active) return
      const duration = this.effectiveDuration()
      if (duration > 0) this.duration = duration
      this.seekable = video.seekable.length > 0 && video.seekable.end(0) > 0
      this.el.track.classList.toggle('is-disabled', !this.seekable)
      this.el.track.setAttribute('aria-disabled', String(!this.seekable))
      this.el.track.title = this.seekable ? '拖动定位' : '当前视频不支持定位'
      this.render(this.scrubbing ? this.preview : this.video.currentTime)
    }
    video.addEventListener('loadedmetadata', () => {
      if (!this.active) return
      this.el.replay.hidden = true
      refreshMetadata()
    })
    video.addEventListener('durationchange', refreshMetadata)
    video.addEventListener('timeupdate', () => {
      if (!this.active) return
      if (this.duration <= 0 || !this.seekable) refreshMetadata()
      if (!this.scrubbing) this.render(this.video.currentTime)
    })
    video.addEventListener('progress', () => {
      if (!this.active) return
      if (this.duration <= 0 || !this.seekable) refreshMetadata()
      this.renderBuffered()
    })
    video.addEventListener('play', () => {
      if (!this.active) return
      this.el.play.textContent = '暂停'
      this.el.replay.hidden = true
      this.startRaf()
    })
    video.addEventListener('pause', () => {
      if (!this.active) return
      this.el.play.textContent = '播放'
      this.stopRaf()
      this.render(this.scrubbing ? this.preview : this.video.currentTime)
    })
    video.addEventListener('ended', () => {
      if (!this.active) return
      this.el.play.textContent = '播放'
      this.el.replay.hidden = false
      this.stopRaf()
      this.render(this.duration)
    })
    video.addEventListener('volumechange', () => {
      this.el.volume.value = String(Math.round(this.video.volume * 100))
      this.el.mute.textContent = this.video.muted || this.video.volume === 0 ? '取消静音' : '静音'
      this.el.mute.setAttribute('aria-pressed', String(this.video.muted))
    })
  }

  mount(item: MediaItem): void {
    this.active = true
    this.duration = 0
    this.preview = 0
    this.scrubbing = false
    this.seekable = false
    this.el.controls.hidden = false
    this.el.replay.hidden = true
    this.el.play.textContent = '播放'
    this.el.track.classList.remove('is-disabled')
    this.el.track.setAttribute('aria-disabled', 'false')
    this.el.track.title = '拖动定位'
    this.render(0)
    this.video.src = item.url
    this.video.load()
  }

  destroy(): void {
    this.active = false
    this.scrubbing = false
    this.stopRaf()
    this.video.pause()
    this.video.removeAttribute('src')
    this.video.load()
    this.el.controls.hidden = true
    this.el.replay.hidden = true
  }

  play(): void {
    if (!this.active) return
    const started = this.video.play()
    if (started) void started.catch(() => this.el.play.textContent = '播放')
  }

  pause(): void {
    this.video.pause()
  }

  togglePlay(): void {
    if (!this.active) return
    if (this.video.paused) this.play()
    else this.pause()
  }

  seek(target: number): void {
    if (!this.active || !this.seekable || this.duration <= 0) return
    this.video.currentTime = Math.min(this.duration, Math.max(0, target))
    this.render(this.video.currentTime)
  }

  seekBy(delta: number): void {
    this.seek(this.video.currentTime + delta)
  }

  setVolume(value: number): void {
    const next = Math.round(Math.min(1, Math.max(0, value)) * 100) / 100
    this.video.volume = next
    this.el.volume.value = String(Math.round(next * 100))
    if (next > 0 && this.video.muted) this.video.muted = false
  }

  volumeBy(delta: number): void {
    this.setVolume(this.video.volume + delta)
  }

  toggleMute(): void {
    this.video.muted = !this.video.muted
  }

  getState(): {
    duration: number
    currentTime: number
    volume: number
    muted: boolean
    paused: boolean
    seekable: boolean
  } {
    return {
      duration: this.duration,
      currentTime: this.video.currentTime,
      volume: this.video.volume,
      muted: this.video.muted,
      paused: this.video.paused,
      seekable: this.seekable,
    }
  }

  private effectiveDuration(): number {
    if (Number.isFinite(this.video.duration)) return this.video.duration
    return this.video.seekable.length > 0 ? this.video.seekable.end(0) : 0
  }

  private bindScrub(): void {
    const track = this.el.track
    const ratioAt = (clientX: number): number => {
      const rect = track.getBoundingClientRect()
      if (rect.width <= 0) return 0
      return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    }

    track.addEventListener('pointerdown', (event) => {
      if (!this.active || !this.seekable || this.duration <= 0) return
      this.scrubbing = true
      this.preview = ratioAt(event.clientX) * this.duration
      track.setPointerCapture(event.pointerId)
      this.render(this.preview)
      event.preventDefault()
    })
    track.addEventListener('pointermove', (event) => {
      if (!this.scrubbing) return
      this.preview = ratioAt(event.clientX) * this.duration
      this.render(this.preview)
    })
    const end = (event: PointerEvent): void => {
      if (!this.scrubbing) return
      this.scrubbing = false
      if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId)
      this.seek(this.preview)
    }
    track.addEventListener('pointerup', end)
    track.addEventListener('pointercancel', end)
  }

  private render(displayTime: number): void {
    const ratio = this.duration > 0 ? Math.min(1, Math.max(0, displayTime / this.duration)) : 0
    const percent = `${(ratio * 100).toFixed(2)}%`
    this.el.played.style.width = percent
    this.el.thumb.style.left = percent
    this.el.time.textContent = `${formatTime(displayTime)} / ${formatTime(this.duration)}`
    this.el.track.setAttribute('aria-valuenow', String(Math.round(ratio * 100)))
    this.renderBuffered()
  }

  private renderBuffered(): void {
    if (this.duration <= 0) {
      this.el.buffered.style.width = '0%'
      return
    }
    let end = 0
    for (let i = 0; i < this.video.buffered.length; i += 1) {
      end = Math.max(end, this.video.buffered.end(i))
    }
    this.el.buffered.style.width = `${Math.min(100, (end / this.duration) * 100).toFixed(2)}%`
  }

  private startRaf(): void {
    this.stopRaf()
    const loop = (): void => {
      if (!this.active) return
      if (!this.scrubbing) this.render(this.video.currentTime)
      if (!this.video.paused) this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  private stopRaf(): void {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
  }
}
