import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

const html = read('src/shell/index.html')
const shellTs = read('src/shell/index.ts')
const css = read('src/shell/style.css')
const api = read('src/shared/api.ts')
const preload = read('src/preload/shell.ts')
const main = read('src/main/index.ts')

describe('设置面板文件关联', () => {
  it('面板包含文件关联区与系统默认应用入口', () => {
    expect(html).toContain('id="assoc-groups"')
    expect(html).toContain('id="assoc-note"')
    expect(html).toContain('id="assoc-summary"')
    expect(html).toContain('id="btn-default-apps"')
    expect(html).toContain('文件关联')
  })

  it('壳页按目录渲染分组芯片并调用关联 API', () => {
    expect(shellTs).toContain('ASSOCIATION_GROUPS')
    expect(shellTs).toContain('api.associations()')
    expect(shellTs).toContain('api.setAssociations')
    expect(shellTs).toContain('api.openDefaultApps')
    expect(shellTs).toContain("chip.dataset.default = type.defaultApp")
    expect(shellTs).toContain('assocBusy')
  })

  it('IPC 桥暴露三个关联方法', () => {
    expect(api).toContain('associations(): Promise<AssociationInfo>')
    expect(api).toContain('setAssociations(exts: string[], enabled: boolean)')
    expect(api).toContain('openDefaultApps(): Promise<void>')
    expect(preload).toContain("'shell:associations'")
    expect(preload).toContain("'shell:set-associations'")
    expect(preload).toContain("'shell:open-default-apps'")
  })

  it('主进程按安装态决定可写并打开系统默认应用页', () => {
    expect(main).toContain('createAssociations')
    expect(main).toContain('editable: app.isPackaged')
    expect(main).toContain("'ms-settings:defaultapps'")
    expect(main).toContain("ipcMain.handle('shell:set-associations'")
  })

  it('样式区分已登记、系统默认与只读状态', () => {
    expect(css).toContain(".fv-assoc-chip[aria-checked='true']")
    expect(css).toContain(".fv-assoc-chip[data-default='self']")
    expect(css).toContain('.fv-assoc-chip:disabled')
    expect(css).toContain('overflow-y: auto')
  })
})
