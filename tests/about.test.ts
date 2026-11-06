import { describe, expect, it } from 'vitest'
import { buildAboutInfo } from '../src/shared/about'

describe('about info', () => {
  it('映射应用、Electron、Chromium 版本与配置目录', () => {
    expect(
      buildAboutInfo(
        { app: '0.1.0', electron: '44.0.0', chromium: '152.0.7977.54' },
        'C:\\Users\\tester\\AppData\\Roaming\\FastViewer',
      ),
    ).toEqual({
      app: '0.1.0',
      electron: '44.0.0',
      chromium: '152.0.7977.54',
      configPath: 'C:\\Users\\tester\\AppData\\Roaming\\FastViewer',
    })
  })
})
