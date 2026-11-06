import { describe, expect, it } from 'vitest'
import {
  ZOOM_MAX,
  ZOOM_MIN,
  Zoom,
  actualCenteredState,
  actualState,
  clampPan,
  fitScale,
  fitState,
  panState,
  zoomState,
  type Size,
  type ZoomState,
} from '../src/web/zoom'

const view: Size = { width: 800, height: 600 }
const big: Size = { width: 4000, height: 3000 }
const small: Size = { width: 400, height: 300 }

function imagePoint(state: ZoomState, x: number, y: number): { x: number; y: number } {
  return { x: (x - state.tx) / state.scale, y: (y - state.ty) / state.scale }
}

describe('fitScale', () => {
  it('含 min(1, …)，小图不放大', () => {
    expect(fitScale({ width: 100, height: 80 }, view)).toBe(1)
    expect(fitScale(small, view)).toBe(1)
    expect(fitScale(big, view)).toBeCloseTo(0.2)
    expect(fitScale({ width: 4000, height: 1000 }, view)).toBeCloseTo(0.2)
    expect(fitScale({ width: 1000, height: 3000 }, view)).toBeCloseTo(0.2)
  })

  it('尺寸为 0 时返回 1', () => {
    expect(fitScale({ width: 0, height: 0 }, view)).toBe(1)
    expect(fitScale(big, { width: 0, height: 600 })).toBe(1)
  })
})

describe('fitState', () => {
  it('大图贴合并居中', () => {
    expect(fitState(big, view)).toEqual({ scale: 0.2, tx: 0, ty: 0, mode: 'fit' })
  })

  it('小图 1:1 居中', () => {
    expect(fitState(small, view)).toEqual({ scale: 1, tx: 200, ty: 150, mode: 'fit' })
    expect(fitState({ width: 200, height: 100 }, view)).toEqual({ scale: 1, tx: 300, ty: 250, mode: 'fit' })
  })
})

describe('zoomState', () => {
  it('放大一格 scale ×1.1', () => {
    const next = zoomState({ scale: 1, tx: 0, ty: 0, mode: 'free' }, { x: 400, y: 300 }, 1.1, small, view)
    expect(next.scale).toBeCloseTo(1.1)
  })

  it('锚点下图像像素位置偏差 ≤1 px（大图）', () => {
    const before = fitState(big, view)
    const anchor = { x: 300, y: 200 }
    const p = imagePoint(before, anchor.x, anchor.y)
    const after = zoomState(before, anchor, 1.1, big, view)
    const moved = imagePoint(after, anchor.x, anchor.y)
    expect(Math.abs(moved.x - p.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(moved.y - p.y)).toBeLessThanOrEqual(1)
  })

  it('锚点下图像像素位置偏差 ≤1 px（小于视口的小图）', () => {
    const before = fitState(small, view)
    const anchor = { x: 650, y: 450 }
    const p = imagePoint(before, anchor.x, anchor.y)
    const after = zoomState(before, anchor, 1.1, small, view)
    const moved = imagePoint(after, anchor.x, anchor.y)
    expect(Math.abs(moved.x - p.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(moved.y - p.y)).toBeLessThanOrEqual(1)
  })

  it('上限 16、下限 0.05，触边忽略该方向', () => {
    let state: ZoomState = { scale: 1, tx: 0, ty: 0, mode: 'free' }
    for (let i = 0; i < 40; i += 1) state = zoomState(state, { x: 400, y: 300 }, 2, big, view)
    expect(state.scale).toBe(ZOOM_MAX)
    const atMax = zoomState(state, { x: 400, y: 300 }, 2, big, view)
    expect(atMax).toEqual(state)

    let down: ZoomState = { scale: 1, tx: 0, ty: 0, mode: 'free' }
    for (let i = 0; i < 60; i += 1) down = zoomState(down, { x: 400, y: 300 }, 0.5, big, view)
    expect(down.scale).toBe(ZOOM_MIN)
    expect(zoomState(down, { x: 400, y: 300 }, 0.5, big, view)).toEqual(down)
  })

  it('图片/视口未就绪时跳过', () => {
    const state = { scale: 1, tx: 0, ty: 0, mode: 'free' as const }
    expect(zoomState(state, { x: 10, y: 10 }, 1.1, { width: 0, height: 0 }, view)).toBe(state)
    expect(zoomState(state, { x: 10, y: 10 }, 1.1, small, { width: 0, height: 0 })).toBe(state)
  })

  it('缩放后进入 free 模式', () => {
    const next = zoomState(fitState(big, view), { x: 400, y: 300 }, 1.1, big, view)
    expect(next.mode).toBe('free')
  })
})

describe('actualState', () => {
  it('切到 1:1 并以锚点保持光标像素', () => {
    const before = fitState(big, view)
    const anchor = { x: 500, y: 400 }
    const p = imagePoint(before, anchor.x, anchor.y)
    const after = actualState(before, anchor, big, view)
    expect(after.scale).toBe(1)
    expect(after.mode).toBe('actual')
    const moved = imagePoint(after, anchor.x, anchor.y)
    expect(Math.abs(moved.x - p.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(moved.y - p.y)).toBeLessThanOrEqual(1)
  })
})

describe('actualCenteredState', () => {
  it('置 1:1 并居中，忽略此前平移', () => {
    expect(actualCenteredState(big, view)).toEqual({
      scale: 1,
      tx: (800 - 4000) / 2,
      ty: (600 - 3000) / 2,
      mode: 'actual',
    })
    expect(actualCenteredState(small, view)).toEqual({ scale: 1, tx: 200, ty: 150, mode: 'actual' })
  })
})

describe('panState', () => {
  it('放大后可平移，边缘不露出空白', () => {
    const state = { scale: 0.4, tx: -100, ty: -100, mode: 'free' as const }
    const right = panState(state, 100, 100, big, view)
    expect(right.tx).toBe(0)
    expect(right.ty).toBe(0)
    expect(right.mode).toBe('free')
    const left = panState(state, -10000, -10000, big, view)
    expect(left.tx).toBe(800 - 4000 * 0.4)
    expect(left.ty).toBe(600 - 3000 * 0.4)
  })

  it('小图平移仍覆盖视口中心', () => {
    const state = { scale: 1.5, tx: 200, ty: 150, mode: 'free' as const }
    const far = panState(state, 10000, 10000, small, view)
    expect(far.tx).toBe(400)
    expect(far.ty).toBe(300)
    const back = panState(state, -10000, -10000, small, view)
    expect(back.tx).toBe(-200)
    expect(back.ty).toBe(-150)
  })

  it('fit 比例下不启用平移', () => {
    const state = fitState(small, view)
    expect(panState(state, 50, 50, small, view)).toEqual(state)
  })
})

describe('clampPan', () => {
  it('大图钳制在视口内', () => {
    expect(clampPan({ scale: 2, tx: 500, ty: 500, mode: 'free' }, big, view).tx).toBe(0)
    expect(clampPan({ scale: 2, tx: -99999, ty: -99999, mode: 'free' }, big, view).tx).toBe(800 - 8000)
  })
})

describe('Zoom 类', () => {
  it('fit/actual 切换与模式标记', () => {
    const zoom = new Zoom(() => big, () => view)
    expect(zoom.fit()).toEqual({ scale: 0.2, tx: 0, ty: 0, mode: 'fit' })
    expect(zoom.isFit()).toBe(true)
    zoom.zoomAt(400, 300, 1.1)
    expect(zoom.isFit()).toBe(false)
    expect(zoom.getState().mode).toBe('free')
    expect(zoom.getScale()).toBeCloseTo(0.22)
    zoom.actual({ x: 400, y: 300 })
    expect(zoom.getScale()).toBe(1)
    zoom.fit()
    expect(zoom.isFit()).toBe(true)
  })

  it('actual() 无锚点时居中（按钮语义）', () => {
    const zoom = new Zoom(() => big, () => view)
    zoom.fit()
    zoom.zoomAt(400, 300, 2)
    expect(zoom.getScale()).toBeCloseTo(0.4)
    zoom.actual()
    expect(zoom.getState()).toEqual({ scale: 1, tx: -1600, ty: -1200, mode: 'actual' })
  })

  it('resize 后 fit 重新贴合', () => {
    let size: Size = { width: 800, height: 600 }
    const zoom = new Zoom(() => big, () => size)
    zoom.fit()
    expect(zoom.getScale()).toBeCloseTo(0.2)
    size = { width: 1600, height: 1200 }
    zoom.fit()
    expect(zoom.getScale()).toBeCloseTo(0.4)
    expect(zoom.getState()).toEqual({ scale: 0.4, tx: 0, ty: 0, mode: 'fit' })
  })

  it('未就绪时缩放不改变状态', () => {
    const zoom = new Zoom(() => ({ width: 0, height: 0 }), () => view)
    const state = zoom.getState()
    expect(zoom.zoomAt(10, 10, 1.1)).toEqual(state)
    expect(zoom.pan(10, 10)).toEqual(state)
  })
})
