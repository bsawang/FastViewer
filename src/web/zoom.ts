export interface Size {
  width: number
  height: number
}

export type ZoomMode = 'fit' | 'actual' | 'free'

export interface ZoomState {
  scale: number
  tx: number
  ty: number
  mode: ZoomMode
}

export const ZOOM_MIN = 0.05
export const ZOOM_MAX = 16

function ready(image: Size, view: Size): boolean {
  return image.width > 0 && image.height > 0 && view.width > 0 && view.height > 0
}

export function clampScale(scale: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale))
}

export function fitScale(image: Size, view: Size): number {
  if (!ready(image, view)) return 1
  return clampScale(Math.min(1, view.width / image.width, view.height / image.height))
}

export function fitState(image: Size, view: Size): ZoomState {
  const scale = fitScale(image, view)
  return {
    scale,
    tx: view.width > 0 ? (view.width - image.width * scale) / 2 : 0,
    ty: view.height > 0 ? (view.height - image.height * scale) / 2 : 0,
    mode: 'fit',
  }
}

function clampAxis(value: number, displayed: number, view: number): number {
  if (displayed < view) {
    // 图像小于视口时允许自由平移，但必须覆盖视口中心点
    return Math.min(view / 2, Math.max(view / 2 - displayed, value))
  }
  return Math.min(0, Math.max(view - displayed, value))
}

export function clampPan(state: ZoomState, image: Size, view: Size): ZoomState {
  if (!ready(image, view)) return state
  return {
    scale: state.scale,
    tx: clampAxis(state.tx, image.width * state.scale, view.width),
    ty: clampAxis(state.ty, image.height * state.scale, view.height),
    mode: state.mode,
  }
}

export function zoomState(
  state: ZoomState,
  anchor: { x: number; y: number },
  factor: number,
  image: Size,
  view: Size,
): ZoomState {
  if (!ready(image, view) || !Number.isFinite(factor) || factor <= 0) return state
  const scale = clampScale(state.scale * factor)
  if (scale === state.scale) return state
  const ratio = scale / state.scale
  return clampPan(
    {
      scale,
      tx: anchor.x - (anchor.x - state.tx) * ratio,
      ty: anchor.y - (anchor.y - state.ty) * ratio,
      mode: 'free',
    },
    image,
    view,
  )
}

export function actualState(
  state: ZoomState,
  anchor: { x: number; y: number },
  image: Size,
  view: Size,
): ZoomState {
  if (!ready(image, view)) return state
  const ratio = 1 / state.scale
  return clampPan(
    {
      scale: 1,
      tx: anchor.x - (anchor.x - state.tx) * ratio,
      ty: anchor.y - (anchor.y - state.ty) * ratio,
      mode: 'actual',
    },
    image,
    view,
  )
}

export function actualCenteredState(image: Size, view: Size): ZoomState {
  if (!ready(image, view)) return { scale: 1, tx: 0, ty: 0, mode: 'actual' }
  return clampPan(
    {
      scale: 1,
      tx: (view.width - image.width) / 2,
      ty: (view.height - image.height) / 2,
      mode: 'actual',
    },
    image,
    view,
  )
}

export function panState(
  state: ZoomState,
  dx: number,
  dy: number,
  image: Size,
  view: Size,
): ZoomState {
  if (!ready(image, view)) return state
  if (state.scale <= fitScale(image, view) + 1e-9) return state
  return clampPan({ scale: state.scale, tx: state.tx + dx, ty: state.ty + dy, mode: 'free' }, image, view)
}

export class Zoom {
  private state: ZoomState = { scale: 1, tx: 0, ty: 0, mode: 'fit' }

  constructor(
    private readonly imageSize: () => Size,
    private readonly viewSize: () => Size,
  ) {}

  getScale(): number {
    return this.state.scale
  }

  getState(): ZoomState {
    return { ...this.state }
  }

  isFit(): boolean {
    return this.state.mode === 'fit'
  }

  fit(): ZoomState {
    this.state = fitState(this.imageSize(), this.viewSize())
    return this.getState()
  }

  actual(anchor?: { x: number; y: number }): ZoomState {
    const view = this.viewSize()
    this.state = anchor
      ? actualState(this.state, anchor, this.imageSize(), view)
      : actualCenteredState(this.imageSize(), view)
    return this.getState()
  }

  restore(state: ZoomState): ZoomState {
    this.state = clampPan(state, this.imageSize(), this.viewSize())
    return this.getState()
  }

  zoomAt(cx: number, cy: number, factor: number): ZoomState {
    this.state = zoomState(this.state, { x: cx, y: cy }, factor, this.imageSize(), this.viewSize())
    return this.getState()
  }

  pan(dx: number, dy: number): ZoomState {
    this.state = panState(this.state, dx, dy, this.imageSize(), this.viewSize())
    return this.getState()
  }
}
