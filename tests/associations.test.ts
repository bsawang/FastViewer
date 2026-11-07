import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ASSOCIATION_EXTS,
  ASSOCIATION_GROUPS,
  associationCategory,
  associationDef,
  associationIconFileName,
  associationProgId,
  normalizeAssociationExt,
} from '../src/shared/associations'
import {
  createAssociations,
  parseRegValue,
  type RegExec,
  type RegResult,
} from '../src/main/associations'

const EXE = 'C:\\Apps\\FastViewer\\FastViewer.exe'

function fakeExec(
  handler: (args: string[]) => RegResult | undefined = () => undefined,
): { exec: RegExec; calls: string[][] } {
  const calls: string[][] = []
  const exec: RegExec = async (args) => {
    calls.push(args)
    return handler(args) ?? { status: args[0] === 'add' ? 0 : 1, stdout: '' }
  }
  return { exec, calls }
}

describe('文件类型目录', () => {
  it('图片与视频分组共 18 个不重复扩展，且与安装包一致', () => {
    expect(ASSOCIATION_GROUPS.map((group) => group.id)).toEqual(['image', 'video'])
    expect(ASSOCIATION_GROUPS[0].exts).toEqual([
      'jpg',
      'jpeg',
      'jfif',
      'png',
      'apng',
      'gif',
      'webp',
      'avif',
      'bmp',
      'ico',
      'svg',
    ])
    expect(ASSOCIATION_GROUPS[1].exts).toEqual([
      'mp4',
      'm4v',
      'webm',
      'ogv',
      'ogg',
      'mov',
      'mkv',
    ])
    expect(new Set(ASSOCIATION_EXTS).size).toBe(18)
  })

  it('扩展名归一化并拒绝目录外类型', () => {
    expect(normalizeAssociationExt('.PNG')).toBe('png')
    expect(associationDef(' .Jfif ')?.id).toBe('image')
    expect(associationDef('mp4')?.id).toBe('video')
    expect(associationDef('tiff')).toBeNull()
    expect(associationDef('')).toBeNull()
    expect(associationProgId('.PNG')).toBe('FastViewer.png')
    expect(associationIconFileName('.PNG', 'ico')).toBe('png.ico')
  })

  it('按位图、矢量图、视频分类', () => {
    expect(associationCategory('jpg')).toBe('bitmap')
    expect(associationCategory('png')).toBe('bitmap')
    expect(associationCategory('svg')).toBe('vector')
    expect(associationCategory('mp4')).toBe('video')
    expect(associationCategory('mkv')).toBe('video')
  })
})

describe('reg 输出解析', () => {
  it('取默认值与空字符串', () => {
    expect(
      parseRegValue(
        'HKEY_CURRENT_USER\\Software\\Classes\\.png\r\n    (默认)    REG_SZ    FastViewer.Image\r\n',
      ),
    ).toBe('FastViewer.Image')
    expect(
      parseRegValue(
        'HKEY_CURRENT_USER\\Software\\Classes\\.png\\OpenWithProgids\r\n    FastViewer.Image    REG_SZ    \r\n',
      ),
    ).toBe('')
  })

  it('无值类型行返回 null', () => {
    expect(parseRegValue('错误: 系统找不到指定的注册表项或值。')).toBeNull()
  })
})

describe('关联快照', () => {
  it('未登记时 18 个类型全部为 false/none', async () => {
    const { exec } = fakeExec()
    const associations = createAssociations({ exePath: EXE, editable: true, exec, notify: () => {} })
    const info = await associations.read()
    expect(info.editable).toBe(true)
    expect(info.exePath).toBe(EXE)
    expect(info.types).toHaveLength(18)
    expect(info.types.every((type) => !type.registered && type.defaultApp === 'none')).toBe(true)
    expect(info.types[0]).toMatchObject({ ext: 'jpg', group: 'image' })
    expect(info.types[17]).toMatchObject({ ext: 'mkv', group: 'video' })
  })

  it('区分系统默认归属', async () => {
    const { exec } = fakeExec((args) => {
      if (args[0] !== 'query') return undefined
      if (args[1].endsWith('\\.png\\UserChoice')) {
        return { status: 0, stdout: 'HKEY_CURRENT_USER\r\n    ProgId    REG_SZ    FastViewer.png\r\n' }
      }
      if (args[1].endsWith('\\.mp4\\UserChoice')) {
        return { status: 0, stdout: 'HKEY_CURRENT_USER\r\n    ProgId    REG_SZ    PotPlayer.MP4\r\n' }
      }
      if (args[1].endsWith('\\.png')) {
        return { status: 0, stdout: 'HKEY_CURRENT_USER\r\n    (默认)    REG_SZ    FastViewer.png\r\n' }
      }
      return undefined
    })
    const associations = createAssociations({ exePath: EXE, editable: true, exec })
    const info = await associations.read()
    const png = info.types.find((type) => type.ext === 'png')
    const mp4 = info.types.find((type) => type.ext === 'mp4')
    const jpg = info.types.find((type) => type.ext === 'jpg')
    expect(png).toMatchObject({ registered: true, defaultApp: 'self' })
    expect(mp4).toMatchObject({ registered: false, defaultApp: 'other' })
    expect(jpg).toMatchObject({ registered: false, defaultApp: 'none' })
  })
})

describe('登记与取消', () => {
  it('登记写入 ProgID、图标、命令、扩展默认值与 OpenWithProgids', async () => {
    let notified = 0
    const { exec, calls } = fakeExec()
    const associations = createAssociations({
      exePath: EXE,
      editable: true,
      exec,
      notify: () => {
        notified += 1
      },
    })
    await associations.set(['.JFIF'], true)
    expect(notified).toBe(1)
    expect(calls).toContainEqual([
      'add',
      'HKCU\\Software\\Classes\\FastViewer.jfif',
      '/ve',
      '/d',
      'FastViewer 图片',
      '/f',
    ])
    expect(calls).toContainEqual([
      'add',
      'HKCU\\Software\\Classes\\FastViewer.jfif\\DefaultIcon',
      '/ve',
      '/d',
      `"${EXE}",0`,
      '/f',
    ])
    expect(calls).toContainEqual([
      'add',
      'HKCU\\Software\\Classes\\FastViewer.jfif\\shell\\open\\command',
      '/ve',
      '/d',
      `"${EXE}" "%1"`,
      '/f',
    ])
    expect(calls).toContainEqual([
      'add',
      'HKCU\\Software\\Classes\\.jfif',
      '/ve',
      '/d',
      'FastViewer.jfif',
      '/f',
    ])
    expect(calls).toContainEqual([
      'add',
      'HKCU\\Software\\Classes\\.jfif\\OpenWithProgids',
      '/v',
      'FastViewer.jfif',
      '/d',
      '',
      '/f',
    ])
    expect(
      calls
        .filter((args) => args[0] !== 'query')
        .some((args) => args[1].includes('UserChoice')),
    ).toBe(false)
  })

  it('取消只在默认值仍属于本应用时删除，并清理 OpenWithProgids', async () => {
    const { exec, calls } = fakeExec((args) => {
      if (args[0] === 'query' && args[1].endsWith('\\.png') && args[1].endsWith('\\Classes\\.png')) {
        return { status: 0, stdout: 'HKEY_CURRENT_USER\r\n    (默认)    REG_SZ    FastViewer.png\r\n' }
      }
      return undefined
    })
    const associations = createAssociations({ exePath: EXE, editable: true, exec, notify: () => {} })
    await associations.set(['png'], false)
    expect(calls).toContainEqual(['delete', 'HKCU\\Software\\Classes\\.png', '/ve', '/f'])
    expect(calls).toContainEqual([
      'delete',
      'HKCU\\Software\\Classes\\.png\\OpenWithProgids',
      '/v',
      'FastViewer.png',
      '/f',
    ])
  })

  it('取消时默认值属于别的程序则不动扩展默认值', async () => {
    const { exec, calls } = fakeExec((args) => {
      if (args[0] === 'query' && args[1].endsWith('\\Classes\\.png')) {
        return { status: 0, stdout: 'HKEY_CURRENT_USER\r\n    (默认)    REG_SZ    Other.App\r\n' }
      }
      return undefined
    })
    const associations = createAssociations({ exePath: EXE, editable: true, exec, notify: () => {} })
    await associations.set(['png'], false)
    expect(calls).not.toContainEqual(['delete', 'HKCU\\Software\\Classes\\.png', '/ve', '/f'])
    expect(calls).toContainEqual([
      'delete',
      'HKCU\\Software\\Classes\\.png\\OpenWithProgids',
      '/v',
      'FastViewer.png',
      '/f',
    ])
  })

  it('安装版把 DefaultIcon 指向分格式图标', async () => {
    const { exec, calls } = fakeExec()
    const associations = createAssociations({
      exePath: EXE,
      editable: true,
      iconsDir: join(process.cwd(), 'build/file-icons'),
      exec,
      notify: () => {},
    })
    await associations.set(['png'], true)
    const icon = join(process.cwd(), 'build/file-icons', 'png.ico')
    expect(calls).toContainEqual([
      'add',
      'HKCU\\Software\\Classes\\FastViewer.png\\DefaultIcon',
      '/ve',
      '/d',
      `"${icon}",0`,
      '/f',
    ])
  })

  it('只读模式与非法参数被拒绝', async () => {
    const readonly = createAssociations({ exePath: EXE, editable: false, exec: fakeExec().exec })
    await expect(readonly.set(['png'], true)).rejects.toThrow('仅安装版可修改文件关联')

    const writable = createAssociations({ exePath: EXE, editable: true, exec: fakeExec().exec })
    await expect(writable.set([], true)).rejects.toThrow('未指定文件类型')
    await expect(writable.set(['tiff'], true)).rejects.toThrow('不支持的文件类型：tiff')
    await expect(writable.set('png', true)).rejects.toThrow('未指定文件类型')
    await expect(writable.set(['png'], 'yes')).rejects.toThrow('参数无效')
  })
})

describe('安装包图标资源', () => {
  it('每个格式都有独立图标并被安装包登记', () => {
    const yml = readFileSync(join(process.cwd(), 'electron-builder.yml'), 'utf8')
    const nsh = readFileSync(join(process.cwd(), 'build/installer.nsh'), 'utf8')
    for (const ext of ASSOCIATION_EXTS) {
      expect(existsSync(join(process.cwd(), 'build/file-icons', `${ext}.ico`))).toBe(true)
      expect(existsSync(join(process.cwd(), 'build/file-icons', `${ext}.svg`))).toBe(true)
      expect(yml).toContain(`name: ${associationProgId(ext)}`)
      expect(yml).toContain(`icon: build/file-icons/${ext}.ico`)
      expect(nsh).toContain(`"${associationProgId(ext)}"`)
    }
  })
})

const SANDBOX = 'HKCU\\Software\\FastViewerTest'

describe.skipIf(process.platform !== 'win32')('真实 reg.exe 沙箱', () => {
  it('登记、读取、取消后清理沙箱', async () => {
    const associations = createAssociations({
      exePath: EXE,
      editable: true,
      classesRoot: `${SANDBOX}\\Classes`,
      fileExtsRoot: `${SANDBOX}\\FileExts`,
      notify: () => {},
    })
    try {
      const initial = await associations.read()
      expect(initial.types.find((type) => type.ext === 'jfif')?.registered).toBe(false)

      const enabled = await associations.set(['jfif'], true)
      expect(enabled.types.find((type) => type.ext === 'jfif')?.registered).toBe(true)
      const command = execFileSync(
        'reg.exe',
        [
          'query',
          `${SANDBOX}\\Classes\\FastViewer.jfif\\shell\\open\\command`,
          '/ve',
        ],
        { encoding: 'utf8', windowsHide: true },
      )
      expect(command).toContain(`"${EXE}" "%1"`)

      const disabled = await associations.set(['jfif'], false)
      expect(disabled.types.find((type) => type.ext === 'jfif')?.registered).toBe(false)
    } finally {
      execFileSync('reg.exe', ['delete', SANDBOX, '/f'], { windowsHide: true })
    }
  })
})
