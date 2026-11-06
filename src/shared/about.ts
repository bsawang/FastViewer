import type { AboutInfo } from './api'

export interface AboutVersions {
  app: string
  electron: string
  chromium: string
}

export function buildAboutInfo(versions: AboutVersions, configPath: string): AboutInfo {
  return {
    app: versions.app,
    electron: versions.electron,
    chromium: versions.chromium,
    configPath,
  }
}
