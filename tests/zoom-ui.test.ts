import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(__dirname, '..')
const html = readFileSync(join(root, 'src/web/index.html'), 'utf8')
const css = readFileSync(join(root, 'src/web/app.css'), 'utf8')
const viewer = readFileSync(join(root, 'src/web/viewer.ts'), 'utf8')

function block(source: string, selector: string): string {
  const start = source.indexOf(`${selector} {`)
  if (start < 0) return ''
  const end = source.indexOf('}', start)
  return source.slice(start, end)
}

describe('浮动缩放按钮', () => {
  it('查看器内提供 1:1 与适应窗口按钮', () => {
    const section = html.slice(html.indexOf('<section id="viewer"'))
    expect(section).toContain('id="viewer-zoom"')
    expect(section).toContain('id="zoom-actual"')
    expect(section).toContain('id="zoom-fit"')
    expect(section).toMatch(/id="zoom-actual"[^>]*>1:1</)
    expect(section).toMatch(/id="zoom-fit"[^>]*>适应窗口</)
  })

  it('工具条半透明浮动', () => {
    const bar = block(css, '.fv-viewer-zoom')
    expect(bar).toContain('position: absolute')
    expect(bar).toMatch(/background:\s*rgba\(/)
    expect(bar).toContain('backdrop-filter: blur')
    expect(block(css, '.fv-viewer-zoom button.is-active')).toMatch(/background:/)
  })
})

describe('缩放按钮接线', () => {
  it('按钮绑定 fit / actual 并同步高亮', () => {
    expect(viewer).toContain("zoomFitButton.addEventListener('click'")
    expect(viewer).toContain("zoomActualButton.addEventListener('click'")
    expect(viewer).toContain("classList.toggle('is-active'")
    expect(viewer).toContain("mode === 'fit'")
    expect(viewer).toContain('scale === 1')
  })

  it('缩放变化回调供外部同步', () => {
    expect(viewer).toContain('onZoomChange')
    expect(viewer).toContain('updateZoomUi')
  })
})
