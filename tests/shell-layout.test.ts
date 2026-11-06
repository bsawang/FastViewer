import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

const shellHtml = read('src/shell/index.html')
const shellTs = read('src/shell/index.ts')
const shellPreload = read('src/preload/shell.ts')
const guestPreload = read('src/preload/guest.ts')
const api = read('src/shared/api.ts')
const main = read('src/main/index.ts')
const css = read('src/shell/style.css')

describe('标题栏与沉浸态', () => {
  it('标题栏只显示应用名，不含路径/文件夹名占位', () => {
    expect(shellHtml).toContain('<div id="brand">FastViewer</div>')
    expect(shellHtml).not.toContain('id="title"')
  })

  it('壳页订阅沉浸态而非目录标题', () => {
    expect(shellTs).toContain('onImmersive')
    expect(shellTs).toContain("classList.toggle('is-immersive'")
    expect(shellTs).not.toContain('onTitle')
  })

  it('IPC 桥以沉浸态替代系统全屏与标题广播', () => {
    expect(api).toContain('setImmersive')
    expect(api).toContain('onImmersive')
    expect(api).not.toContain('setFullscreen')
    expect(api).not.toContain('onFullscreenChange')
    expect(api).not.toContain('onTitle')
    expect(shellPreload).not.toContain("'shell:title'")
    expect(guestPreload).toContain('fv:set-immersive')
    expect(guestPreload).not.toContain('fv:set-fullscreen')
  })

  it('主进程转发沉浸态且不再广播 shell:title', () => {
    expect(main).toContain('fv:set-immersive')
    expect(main).toContain("shell:immersive")
    expect(main).not.toContain('shell:title')
    expect(main).not.toContain('fv:set-fullscreen')
  })

  it('沉浸态隐藏标题栏并让 webview 铺满', () => {
    expect(css).toContain('.is-immersive #bar')
  })
})
