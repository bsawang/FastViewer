import { contextBridge, ipcRenderer } from 'electron'
import type { AboutInfo, BootInfo, ShellApi, WindowAction } from '../shared/api'
import type { ThemeName } from '../shared/theme'
import type { WindowState } from '../shared/window-state'

const fvShell: ShellApi = {
  bootInfo: (): Promise<BootInfo> => ipcRenderer.invoke('shell:boot-info'),
  window: (action: WindowAction): void => {
    ipcRenderer.send('shell:window', action)
  },
  onWindowState: (cb: (state: WindowState) => void): void => {
    ipcRenderer.on('shell:window-state', (_event, state: WindowState) => cb(state))
  },
  onImmersive: (cb: (on: boolean) => void): void => {
    ipcRenderer.on('shell:immersive', (_event, on: unknown) => cb(Boolean(on)))
  },
  about: (): Promise<AboutInfo> => ipcRenderer.invoke('shell:about'),
  revealConfig: (): Promise<string> => ipcRenderer.invoke('shell:reveal-config'),
  resetLayout: (): Promise<void> => ipcRenderer.invoke('shell:reset-layout'),
  resetPrefs: (): Promise<void> => ipcRenderer.invoke('shell:reset-prefs'),
  associations: () => ipcRenderer.invoke('shell:associations'),
  setAssociations: (exts: string[], enabled: boolean) =>
    ipcRenderer.invoke('shell:set-associations', exts, enabled),
  openDefaultApps: (): Promise<void> => ipcRenderer.invoke('shell:open-default-apps'),
  getTheme: (): Promise<ThemeName> => ipcRenderer.invoke('shell:get-theme'),
  setTheme: (theme: ThemeName): Promise<void> => ipcRenderer.invoke('shell:set-theme', theme),
  onTheme: (cb: (theme: ThemeName) => void): void => {
    ipcRenderer.on('shell:theme', (_event, theme: ThemeName) => cb(theme))
  },
}

contextBridge.exposeInMainWorld('fvShell', fvShell)
