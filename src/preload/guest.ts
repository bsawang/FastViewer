import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { HostApi } from '../shared/api'
import type { ConfigPatch } from '../shared/config'
import type { ThemeName } from '../shared/theme'

const fvHost: HostApi = {
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),
  getConfig: () => ipcRenderer.invoke('fv:get-config'),
  patchConfig: (patch: ConfigPatch) => ipcRenderer.invoke('fv:patch-config', patch),
  getStartupPath: () => ipcRenderer.invoke('fv:startup-path'),
  setFolderTitle: (title: string): void => {
    ipcRenderer.send('fv:set-folder-title', title)
  },
  setImmersive: (on: boolean): void => {
    ipcRenderer.send('fv:set-immersive', on)
  },
  copyEntries: (paths: string[], mode: 'copy' | 'cut') =>
    ipcRenderer.invoke('fv:fs-copy', paths, mode),
  pasteEntry: (dirPath: string) => ipcRenderer.invoke('fv:fs-paste', dirPath),
  renameEntry: (path: string, name: string) => ipcRenderer.invoke('fv:fs-rename', path, name),
  trashEntry: (path: string) => ipcRenderer.invoke('fv:fs-trash', path),
  revealEntry: (path: string) => ipcRenderer.invoke('fv:fs-reveal', path),
  createFolder: (dirPath: string, name: string) =>
    ipcRenderer.invoke('fv:fs-mkdir', dirPath, name),
  onOpenPath: (cb: (path: string) => void): void => {
    ipcRenderer.on('fv:open-path', (_event, path: string) => cb(path))
  },
  onConfigReset: (cb: (kind: 'layout' | 'prefs') => void): void => {
    ipcRenderer.on('fv:config-reset', (_event, kind: unknown) => {
      cb(kind === 'prefs' ? 'prefs' : 'layout')
    })
  },
  onTheme: (cb: (theme: ThemeName) => void): void => {
    ipcRenderer.on('fv:theme', (_event, theme: ThemeName) => cb(theme))
  },
}

contextBridge.exposeInMainWorld('fvHost', fvHost)
