import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(__dirname, '..')
const html = readFileSync(join(root, 'src/web/index.html'), 'utf8')
const css = readFileSync(join(root, 'src/web/app.css'), 'utf8')
const app = readFileSync(join(root, 'src/web/app.ts'), 'utf8')
const viewer = readFileSync(join(root, 'src/web/viewer.ts'), 'utf8')
const layer = readFileSync(join(root, 'src/web/fullscreen.ts'), 'utf8')

function block(source: string, selector: string): string {
  const start = source.indexOf(`${selector} {`)
  if (start < 0) return ''
  const end = source.indexOf('}', start)
  return source.slice(start, end)
}

describe('应用内全屏浮层结构', () => {
  it('浮层含关闭、左右箭头、缩放、详情与信息按钮', () => {
    const modal = html.slice(html.indexOf('id="fs-modal"'))
    expect(html).toContain('id="fs-modal"')
    expect(modal).toContain('id="fs-close"')
    expect(modal).toContain('id="fs-prev"')
    expect(modal).toContain('id="fs-next"')
    expect(modal).toContain('id="fs-zoom-actual"')
    expect(modal).toContain('id="fs-zoom-fit"')
    expect(modal).toContain('id="fs-detail"')
    expect(modal).toContain('id="fs-info"')
    expect(modal).toContain('id="fs-image"')
    expect(modal).toContain('id="fs-file-name"')
  })

  it('浮层默认隐藏且为半透明模糊遮罩', () => {
    expect(html).toMatch(/id="fs-modal"[^>]*hidden/)
    const modal = block(css, '.fv-fs-modal')
    expect(modal).toContain('position: fixed')
    expect(modal).toContain('inset: 0')
    expect(modal).toMatch(/background:\s*rgba\(/)
    expect(modal).toContain('backdrop-filter: blur')
    expect(css).toContain('.fv-fs-modal[hidden]')
  })

  it('关闭在右上角，计数器在左下角', () => {
    const close = block(css, '.fv-fs-close')
    expect(close).toContain('top: 16px')
    expect(close).toContain('right: 16px')
    expect(close).not.toMatch(/^\s*left:/m)
    const counter = block(css, '.fv-fs-counter')
    expect(counter).toContain('bottom: 18px')
    expect(counter).toContain('left: 16px')
    expect(counter).not.toMatch(/^\s*top:/m)
    const zoom = block(css, '.fv-fs-modal .fv-viewer-zoom')
    expect(zoom).toContain('left: 50%')
    expect(zoom).toContain('transform: translateX(-50%)')
  })

  it('左右箭头为常驻圆形放大热区', () => {
    const hot = block(css, '.fv-fs-hot')
    expect(hot).toContain('position: absolute')
    expect(hot).toContain('width: 56px')
    expect(hot).toContain('height: 56px')
    expect(hot).toContain('border-radius: 50%')
    expect(hot).toMatch(/font-size:\s*(3[2-9]|[4-9]\d)px/)
    expect(hot).toMatch(/background:\s*rgba\(/)
    expect(hot).toContain('background: rgba(18, 20, 28, 0)')
    expect(hot).not.toContain('backdrop-filter')
    expect(hot).not.toContain('display: none')
    expect(block(css, '.fv-fs-hot--prev')).toContain('left: 16px')
    expect(block(css, '.fv-fs-hot--next')).toContain('right: 16px')
    expect(block(css, '.fv-fs-hot--prev')).not.toContain('border-radius: 0')
    expect(css).not.toContain('chrome-hidden')
  })

  it('详情与信息按钮都在右下角', () => {
    const detail = block(css, '.fv-fs-detail')
    expect(detail).toContain('position: absolute')
    expect(detail).toContain('right: 16px')
    expect(detail).toContain('bottom: 16px')
    expect(detail).not.toMatch(/^\s*left:/m)
    expect(detail).toMatch(/background:\s*rgba\(/)
    const info = block(css, '.fv-fs-info')
    expect(info).toContain('right: 16px')
    expect(info).toContain('bottom: 16px')
    expect(info).not.toMatch(/^\s*top:/m)
  })
})

describe('全屏浮层接线', () => {
  it('浮层类提供 open/close/next/prev/toggleDetail/getState 与独立缩放', () => {
    expect(layer).toContain('class FullscreenLayer')
    for (const method of ['open(', 'close(', 'next(', 'prev(', 'toggleDetail(', 'getState(']) {
      expect(layer).toContain(method)
    }
    expect(layer).toContain('new Zoom(')
    expect(layer).toContain('zoom.actual()')
  })

  it('打开/关闭同步壳页沉浸态', () => {
    expect(app).toContain('setImmersive(true)')
    expect(app).toContain('setImmersive(false)')
    expect(app).toContain('fullscreen.open')
    expect(app).toContain('fullscreen.close')
  })

  it('单击图片打开浮层，拖拽与双击不误触', () => {
    expect(viewer).toContain('onImageClick')
    expect(viewer).toContain('pointerup')
    expect(viewer).toContain('500')
    expect(viewer).toContain('250')
  })

  it('视频不进入浮层', () => {
    expect(app).toContain('isVideoActive')
    expect(viewer).not.toContain('setFullScreen')
  })

  it('浮层控件常驻，不启用闲置自动隐藏', () => {
    expect(layer).not.toContain('chromeVisible')
    expect(layer).not.toContain('IDLE_MS')
    expect(layer).not.toContain('toggleChrome')
    expect(layer).not.toContain('wake(')
  })

  it('普通滚轮切换、Ctrl+滚轮缩放复用 WheelNavigator', () => {
    expect(layer).toContain('WheelNavigator')
    expect(layer).toContain('ctrlKey')
    expect(layer).toContain('wheelNav.feed')
  })
})
