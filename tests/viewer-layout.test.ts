import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(__dirname, '..')
const html = readFileSync(join(root, 'src/web/index.html'), 'utf8')
const css = readFileSync(join(root, 'src/web/app.css'), 'utf8')
const app = readFileSync(join(root, 'src/web/app.ts'), 'utf8')
const viewer = readFileSync(join(root, 'src/web/viewer.ts'), 'utf8')
const controls = readFileSync(join(root, 'src/web/video-controls.ts'), 'utf8')

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
    expect(html).toContain('id="viewer-name"')
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

  it('视频播放时 mini 面板与信息浮层抬到播放条上方', () => {
    expect(css).toMatch(/\.fv-viewer--video \.fv-mini,[\s\S]*?bottom: 52px/)
    expect(block(css, '.fv-viewer--video .fv-viewer-detail')).toContain('bottom: 52px')
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

describe('视频静音按钮', () => {
  it('静音为图标按钮，含静音/取消静音两种图标', () => {
    const tag = html.slice(html.indexOf('id="video-mute"') - 200)
    const button = tag.slice(0, tag.indexOf('</button>'))
    expect(button).toContain('fv-video-icon-button')
    expect(button).toContain('aria-pressed="false"')
    expect(button).toContain('class="fv-mute-on"')
    expect(button).toContain('class="fv-mute-off"')
  })

  it('图标按钮样式随 aria-pressed 切换', () => {
    expect(block(css, '.fv-video-icon-button')).toContain('place-items: center')
    expect(css).toContain(".fv-video-icon-button[aria-pressed='true'] .fv-mute-on")
    expect(css).toContain(".fv-video-icon-button[aria-pressed='false'] .fv-mute-off")
  })

  it('切换视频时沿用音量与静音状态', () => {
    expect(controls).toContain('private volume = 1')
    expect(controls).toContain('private muted = false')
    expect(controls).toContain('this.video.muted = this.muted')
    expect(controls).toContain('this.video.volume = this.volume')
    expect(controls).toContain('this.syncAudioState()')
  })

  it('静音切换在音量为 0 时恢复上次音量', () => {
    expect(controls).toContain('if (this.video.volume === 0) this.video.volume = this.volume')
    expect(controls).toContain('this.video.muted || this.video.volume === 0')
  })
})
