import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Zoom } from '../src/web/zoom'

const viewer = readFileSync(join(__dirname, '../src/web/viewer.ts'), 'utf8')

function method(source: string, signature: string): string {
  const start = source.indexOf(signature)
  if (start < 0) return ''
  const end = source.indexOf('\n  }', start)
  return source.slice(start, end)
}

describe('浮层内切换只同步索引', () => {
  it('setIndex 把当前缩放状态交给 render 保留', () => {
    const body = method(viewer, 'setIndex(index: number): void {')
    expect(body).toContain('const keep = this.zoom.getState()')
    expect(body).toContain('this.render(keep)')
  })

  it('图片载入后按原模式恢复缩放', () => {
    const body = method(viewer, 'private revealImage(): void {')
    expect(body).toContain("keep?.mode === 'actual'")
    expect(body).toContain('this.zoom.actual()')
    expect(body).toContain('this.zoom.restore(keep)')
    expect(body).toContain('this.zoom.fit()')
  })

  it('Zoom.restore 保留模式并夹紧平移', () => {
    const zoom = new Zoom(
      () => ({ width: 1600, height: 1200 }),
      () => ({ width: 800, height: 600 }),
    )
    expect(zoom.restore({ scale: 2, tx: -100, ty: -50, mode: 'free' })).toEqual({
      scale: 2,
      tx: -100,
      ty: -50,
      mode: 'free',
    })
  })
})
