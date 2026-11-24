import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'src/web/app.css'), 'utf8')
const html = readFileSync(join(process.cwd(), 'src/web/index.html'), 'utf8')

function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(css)
  return (match?.[1] ?? '').replace(/\s+/g, ' ').trim()
}

describe('图墙卡片视觉', () => {
  it('缩略图铺满正方形媒体区、顶部居中裁切', () => {
    const media = rule('.fv-media')
    expect(media).toContain('aspect-ratio: 1 / 1')
    const thumb = rule('.fv-thumb')
    expect(thumb).toContain('position: absolute')
    expect(thumb).toContain('object-fit: cover')
    expect(thumb).toContain('object-position: center top')
    expect(thumb).toContain('width: 100%')
    expect(thumb).toContain('height: 100%')
  })

  it('文件名压在图内底部向上换行，带半透明底衬', () => {
    const name = rule('.fv-name')
    expect(name).toContain('position: absolute')
    expect(name).toContain('bottom: 0')
    expect(name).toContain('background: var(--fv-name-bg)')
    expect(name).toContain('white-space: normal')
    expect(name).toContain('word-break: break-all')
    expect(name).toContain('text-wrap: balance')
    expect(name).not.toContain('text-overflow')
    expect(name).not.toContain('-webkit-line-clamp')
  })

  it('文件夹图块在正方形内居中图标，名称无底衬', () => {
    expect(rule(".fv-tile[data-kind='dir'] .fv-folder")).toContain('display: flex')
    const icon = rule('.fv-folder svg')
    expect(icon).toContain('fill: currentColor')
    expect(icon).toContain('stroke: none')
    const name = rule(".fv-tile[data-kind='dir'] .fv-name")
    expect(name).toContain('background: none')
    expect(name).toContain('text-align: center')
  })

  it('当前选中图块有 5px 强调色描边与外发光', () => {
    const current = rule('.fv-tile.is-current')
    expect(current).toContain('outline-color: var(--fv-accent)')
    expect(current).toContain('outline-width: 5px')
    expect(current).toContain('box-shadow')
  })

  it('多选图块有强调色描边与浅色底', () => {
    const selected = rule('.fv-tile.is-selected')
    expect(selected).toContain('outline-color: var(--fv-accent)')
    expect(selected).toContain('outline-width: 3px')
    expect(selected).toContain('background')
  })
})

describe('多选交互', () => {
  const grid = readFileSync(join(process.cwd(), 'src/web/grid.ts'), 'utf8')
  const app = readFileSync(join(process.cwd(), 'src/web/app.ts'), 'utf8')

  it('Ctrl/Cmd 点击切换选中且不打开媒体', () => {
    expect(grid).toContain('event.ctrlKey || event.metaKey')
    expect(grid).toContain('this.toggleSelection(index)')
  })

  it('点击空白或切换目录时清空多选', () => {
    expect(grid).toContain("target?.closest('.fv-tile')")
    expect(grid).toContain('this.clearSelection()')
    expect(grid).toContain('this.selected.clear()')
  })

  it('右键菜单按选中项提供复制、剪切、删除', () => {
    expect(app).toContain("copyTargets(targets, 'copy')")
    expect(app).toContain("copyTargets(targets, 'cut')")
    expect(app).toContain('deleteItems(targets)')
    expect(app).toContain('`剪切 ${targets.length} 项`')
  })
})

describe('控件位置', () => {
  it('排序与图块大小控件位于面包屑下方、图墙上方', () => {
    const crumbs = html.indexOf('id="crumbs"')
    const toolbar = html.indexOf('id="toolbar"')
    const wall = html.indexOf('id="wall"')
    expect(crumbs).toBeGreaterThan(-1)
    expect(toolbar).toBeGreaterThan(crumbs)
    expect(wall).toBeGreaterThan(toolbar)
    expect(html).not.toContain('<footer id="toolbar"')
  })
})
