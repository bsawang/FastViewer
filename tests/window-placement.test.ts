import { describe, expect, it } from 'vitest'
import { placeWindow } from '../src/shared/window-placement'

const primary = { x: 0, y: 0, width: 1920, height: 1040 }
const secondary = { x: 1920, y: 0, width: 1920, height: 1040 }

describe('placeWindow', () => {
  it('无配置或无显示器 → null', () => {
    expect(placeWindow(null, [primary])).toBeNull()
    expect(
      placeWindow({ x: 0, y: 0, width: 800, height: 600, maximized: false }, []),
    ).toBeNull()
  })

  it('完全在屏内 → 原样恢复', () => {
    expect(
      placeWindow({ x: 100, y: 80, width: 800, height: 600, maximized: false }, [primary]),
    ).toEqual({
      bounds: { x: 100, y: 80, width: 800, height: 600 },
      maximized: false,
    })
  })

  it('可见面积不足 30% → null（回退居中）', () => {
    expect(
      placeWindow({ x: 1700, y: 100, width: 1000, height: 700, maximized: false }, [primary]),
    ).toBeNull()
  })

  it('可见面积达到 30% → 保留', () => {
    const placed = placeWindow(
      { x: 1400, y: 100, width: 1000, height: 700, maximized: false },
      [primary],
    )
    expect(placed?.bounds).toEqual({ x: 1400, y: 100, width: 1000, height: 700 })
  })

  it('副屏坐标可恢复，主屏不可见时回退', () => {
    expect(
      placeWindow({ x: 2000, y: 120, width: 900, height: 700, maximized: false }, [
        primary,
        secondary,
      ])?.bounds,
    ).toEqual({ x: 2000, y: 120, width: 900, height: 700 })
    expect(
      placeWindow({ x: 2000, y: 120, width: 900, height: 700, maximized: false }, [primary]),
    ).toBeNull()
  })

  it('宽高钳制到最小 720×480', () => {
    expect(
      placeWindow({ x: 50, y: 50, width: 400, height: 300, maximized: false }, [primary])?.bounds,
    ).toEqual({ x: 50, y: 50, width: 720, height: 480 })
  })

  it('保留最大化标记', () => {
    expect(
      placeWindow({ x: 100, y: 80, width: 800, height: 600, maximized: true }, [primary])?.maximized,
    ).toBe(true)
  })

  it('非有限数值 → null', () => {
    expect(
      placeWindow(
        { x: Number.NaN, y: 0, width: 800, height: 600, maximized: false },
        [primary],
      ),
    ).toBeNull()
  })
})
