import type { AssociationInfo } from './associations'
import type { AppConfig, ConfigPatch } from './config'
import type { ResetKind } from './reset'
import type { ThemeName } from './theme'
import type { WindowState } from './window-state'

export type WindowAction = 'minimize' | 'toggle-maximize' | 'close'

export type FsResult =
  | { ok: true; path?: string; count?: number }
  | { ok: false; message: string }

export interface BootInfo {
  appUrl: string
  guestPreloadUrl: string
}

export interface AboutInfo {
  app: string
  electron: string
  chromium: string
  configPath: string
}

export interface ShellApi {
  bootInfo(): Promise<BootInfo>
  window(action: WindowAction): void
  onWindowState(cb: (state: WindowState) => void): void
  onImmersive(cb: (on: boolean) => void): void
  about(): Promise<AboutInfo>
  revealConfig(): Promise<string>
  resetLayout(): Promise<void>
  resetPrefs(): Promise<void>
  associations(): Promise<AssociationInfo>
  setAssociations(exts: string[], enabled: boolean): Promise<AssociationInfo>
  openDefaultApps(): Promise<void>
  getTheme(): Promise<ThemeName>
  setTheme(theme: ThemeName): Promise<void>
  onTheme(cb: (theme: ThemeName) => void): void
}

export interface HostApi {
  getPathForFile(file: File): string
  getConfig(): Promise<AppConfig>
  patchConfig(patch: ConfigPatch): Promise<AppConfig>
  getStartupPath(): Promise<string | null>
  setFolderTitle(title: string): void
  setImmersive(on: boolean): void
  copyEntries(paths: string[], mode: 'copy' | 'cut'): Promise<FsResult>
  pasteEntry(dirPath: string): Promise<FsResult>
  renameEntry(path: string, name: string): Promise<FsResult>
  trashEntry(path: string): Promise<FsResult>
  revealEntry(path: string): Promise<FsResult>
  createFolder(dirPath: string, name: string): Promise<FsResult>
  /** 监听当前浏览目录，传空字符串停止监听。 */
  watchDir(dirPath: string): Promise<{ ok: boolean }>
  onDirChanged(cb: (dirPath: string) => void): void
  onOpenPath(cb: (path: string) => void): void
  onConfigReset(cb: (kind: ResetKind) => void): void
  onTheme(cb: (theme: ThemeName) => void): void
}
