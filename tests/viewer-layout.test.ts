import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(__dirname, '..')
const html = readFileSync(join(root, 'src/web/index.html'), 'utf8')
const css = readFileSync(join(root, 'src/web/app.css'), 'utf8')
const app = readFileSync(join(root, 'src/web/app.ts'), 'utf8')
const viewer = readFileSync(join(root, 'src/web/viewer.ts'), 'utf8')

function block(source: string, selector: string): string {
  const start = source.indexOf(`${selector} {`)
  if (start < 0) return ''
  const end = source.indexOf('}', start)
  return source.slice(start, end)
}

describe('常驻查看器结构', () => {
  it('查看器不再有顶部/底部文件名栏与关闭按钮', () => {
    expect(html).not.toContain('fv-viewer-bar')
    expect(html).not.toContain('fv-viewer-foot')
    expect(html).not.toContain('id="viewer-close"')
    expect(html).not.toContain('id="viewer-title"')
  })

  it('查看器常驻、含空态与浮动信息按钮', () => {
    const viewerTag = html.slice(html.indexOf('<section id="viewer"'))
    const openTag = viewerTag.slice(0, viewerTag.indexOf('>') + 1)
    expect(openTag).toContain('class="fv-viewer"')
    expect(openTag).not.toContain('hidden')
    expect(html).toContain('id="viewer-empty"')
    expect(html).toContain('id="viewer-info"')
    expect(html).toContain('id="split"')
  })

  it('详情面板位于查看器内部，左右切换按钮已移除', () => {
    const viewerTag = html.slice(html.indexOf('<section id="viewer"'))
    expect(viewerTag).toContain('id="viewer-detail"')
    expect(viewerTag).not.toContain('id="viewer-hot-prev"')
    expect(viewerTag).not.toContain('id="viewer-hot-next"')
    expect(viewer).not.toContain('hotPrev')
    expect(viewer).not.toContain('hotNext')
    expect(css).not.toContain('.fv-viewer-hot')
  })
})

describe('查看器浮动样式', () => {
  it('详情为右下角 300px 半透明浮动面板，高度随内容', () => {
    const detail = block(css, '.fv-viewer-detail')
    expect(detail).toContain('position: absolute')
    expect(detail).toContain('right: 12px')
    expect(detail).toContain('bottom: 12px')
    expect(detail).toContain('width: 300px')
    expect(detail).toContain('max-height: calc(100% - 24px)')
    expect(detail).toContain('overflow-y: auto')
    expect(detail).not.toMatch(/^\s*top:/m)
    expect(detail).toContain('backdrop-filter: blur')
    expect(detail).toMatch(/background:\s*rgba\(/)
  })

  it('信息按钮位于右下角', () => {
    const info = block(css, '.fv-viewer-info')
    expect(info).toContain('position: absolute')
    expect(info).toContain('right: 12px')
    expect(info).toContain('bottom: 12px')
    expect(info).not.toMatch(/^\s*top:/m)
  })
})

describe('常驻查看器接线', () => {
  it('打开目录后自动选首项，空媒体显示空态', () => {
    expect(app).toContain('buildMediaSeq(items)')
    expect(app).toContain('viewer.showEmpty()')
    expect(app).not.toContain('closeViewer')
    expect(app).not.toContain('splitHandle.hidden')
  })

  it('查看器切换索引后回调图墙选中', () => {
    expect(viewer).toContain('onIndexChange')
    expect(app).toContain('onIndexChange')
    expect(app).toContain('grid.setCurrent')
  })

  it('查看器提供空态接口且不再负责关闭', () => {
    expect(viewer).toContain('showEmpty')
    expect(viewer).not.toContain('onClose')
    expect(viewer).not.toContain('setFullscreen')
  })
})
