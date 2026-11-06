import { describe, expect, it } from 'vitest'
import { INITIAL_WINDOW_STATE, initialBounds, reduceWindowState, type WindowStateEvent } from '../src/shared/window-state'

describe('reduceWindowState', () => {
  const cases: Array<[WindowStateEvent, { maximized: boolean; fullscreen: boolean }]> = [
    ['maximize', { maximized: true, fullscreen: false }],
    ['unmaximize', { maximized: false, fullscreen: false }],
    ['enter-full-screen', { maximized: false, fullscreen: true }],
    ['leave-full-screen', { maximized: false, fullscreen: false }],
  ]

  for (const [event, expected] of cases) {
    it(`applies ${event}`, () => {
      expect(reduceWindowState(INITIAL_WINDOW_STATE, event)).toEqual(expected)
    })
  }

  it('keeps flags independent when events interleave', () => {
    let state = INITIAL_WINDOW_STATE
    state = reduceWindowState(state, 'maximize')
    state = reduceWindowState(state, 'enter-full-screen')
    expect(state).toEqual({ maximized: true, fullscreen: true })
    state = reduceWindowState(state, 'leave-full-screen')
    expect(state).toEqual({ maximized: true, fullscreen: false })
  })
})

describe('initialBounds', () => {
  it('uses 80% of a 1920x1080 work area, capped at 1280x860, centered', () => {
    expect(initialBounds({ x: 0, y: 0, width: 1920, height: 1080 })).toEqual({
      x: 320,
      y: 110,
      width: 1280,
      height: 860,
    })
  })

  it('uses 80% when below the cap', () => {
    expect(initialBounds({ x: 100, y: 50, width: 1000, height: 700 })).toEqual({
      x: 200,
      y: 120,
      width: 800,
      height: 560,
    })
  })

  it('never goes below the 720x480 minimum window size', () => {
    expect(initialBounds({ x: 0, y: 0, width: 800, height: 600 })).toEqual({
      x: 40,
      y: 60,
      width: 720,
      height: 480,
    })
  })
})
