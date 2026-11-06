import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const html = readFileSync(join(process.cwd(), 'src/shell/index.html'), 'utf8')
const css = readFileSync(join(process.cwd(), 'src/shell/style.css'), 'utf8')

describe('壳页主题下拉', () => {
  it('使用自绘 listbox，不再有原生 select', () => {
    expect(html).not.toContain('<select')
    expect(html).not.toContain('theme-select')
    expect(html).toContain('id="theme-trigger"')
    expect(html).toContain('class="fv-theme-trigger"')
    expect(html).toContain('aria-haspopup="listbox"')
    expect(html).toContain('role="listbox"')
    expect(html).toContain('aria-expanded="false"')
  })

  it('菜单含 5 个皮肤选项，默认选中深空蓝', () => {
    const options = [...html.matchAll(/role="option" data-theme="([a-z]+)"/g)].map(
      (match) => match[1],
    )
    expect(options).toEqual(['midnight', 'obsidian', 'moss', 'ember', 'dawn'])
    expect(html).toContain('id="theme-label">深空蓝<')
    expect(html).toContain('data-theme="midnight" aria-selected="true"')
  })

  it('下拉菜单浮在内容区之上且不参与拖拽', () => {
    const menu = css.slice(css.indexOf('.fv-theme-menu'))
    expect(menu.slice(0, menu.indexOf('}'))).toContain('position: absolute')
    expect(menu.slice(0, menu.indexOf('}'))).toContain('z-index')
    expect(menu.slice(0, menu.indexOf('}'))).toContain('-webkit-app-region: no-drag')
    expect(css).toContain('.fv-theme-option.is-active')
  })
})
