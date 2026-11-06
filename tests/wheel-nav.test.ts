import { describe, expect, it } from 'vitest'
import { WHEEL_COOLDOWN_MS, WHEEL_THRESHOLD, WheelNavigator } from '../src/web/wheel-nav'

describe('WheelNavigator', () => {
  it('累积到阈值才切换，向下为下一项、向上为上一项', () => {
    const nav = new WheelNavigator()
    expect(nav.feed(30, 0)).toBe(0)
    expect(nav.feed(30, 10)).toBe(1)

    expect(nav.feed(-30, 1000)).toBe(0)
    expect(nav.feed(-30, 1010)).toBe(-1)
  })

  it('同一手势冷却期内不重复切换，冷却后重新累积', () => {
    const nav = new WheelNavigator()
    expect(nav.feed(WHEEL_THRESHOLD, 0)).toBe(1)
    expect(nav.feed(WHEEL_THRESHOLD, WHEEL_COOLDOWN_MS - 1)).toBe(0)
    expect(nav.feed(WHEEL_THRESHOLD, WHEEL_COOLDOWN_MS + 1)).toBe(1)
  })

  it('冷却期内的位移不进入下一次累积', () => {
    const nav = new WheelNavigator()
    expect(nav.feed(50, 0)).toBe(1)
    expect(nav.feed(40, 50)).toBe(0)
    expect(nav.feed(40, 300)).toBe(0)
    expect(nav.feed(10, 310)).toBe(1)
  })

  it('reset 清空累积与冷却', () => {
    const nav = new WheelNavigator()
    expect(nav.feed(30, 0)).toBe(0)
    nav.reset()
    expect(nav.feed(30, 10)).toBe(0)
    expect(nav.feed(30, 20)).toBe(1)
  })
})
