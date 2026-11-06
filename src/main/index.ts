import { randomBytes } from 'node:crypto'
import { statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, BrowserWindow, ipcMain, Menu, screen, shell, webContents } from 'electron'
import type { WindowPlacement } from '../shared/config'
import { buildAboutInfo } from '../shared/about'
import { resetPatch, type ResetKind } from '../shared/reset'
import { isThemeName, type ThemeName } from '../shared/theme'
import { initialBounds } from '../shared/window-state'
import { ConfigStore } from './config'
import { logger } from './logger'
import { firstOpenTarget, type PathProbe } from './open-target'
import { listPlaces, listQuickAccessPlaces, mergePlaces } from './places'
import { startLocalServer, type LocalServer } from './server'
import { createMainWindow, flushWindowPlacement, getWindowState, setupWindowIpc } from './window'

app.commandLine.appendSwitch('enable-features', 'OverlayScrollbar')
app.commandLine.appendSwitch('autoplay-policy', 'document-user-activation-required')

const debugPort = process.env.FV_DEBUG_PORT
if (debugPort) app.commandLine.appendSwitch('remote-debugging-port', debugPort)

let server: LocalServer | null = null
let pendingOpenPath: string | null = null
let startupPath: string | null = null

const pathProbe: PathProbe = {
  kind(path) {
    try {
      return statSync(path).isDirectory() ? 'dir' : 'file'
    } catch {
      return 'missing'
    }
  },
}

function cliPath(argv: string[]): string | null {
  const target = firstOpenTarget(argv.slice(app.isPackaged ? 1 : 2), pathProbe)
  return target?.path ?? null
}

function guestContents(): Electron.WebContents | null {
  return webContents.getAllWebContents().find((contents) => contents.getType() === 'webview') ?? null
}

function deliverOpenPath(path: string): void {
  const guest = guestContents()
  if (!guest || guest.isLoading()) {
    pendingOpenPath = path
    return
  }
  guest.send('fv:open-path', path)
}

function isAllowedNavigation(url: string): boolean {
  if (url.startsWith('file://')) return true
  return server !== null && url.startsWith(`http://127.0.0.1:${server.port}/`)
}

app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
  contents.on('context-menu', (event) => event.preventDefault())
  contents.on('devtools-opened', () => logger.warn('devtools opened'))
  const block = (event: Electron.Event, url: string) => {
    if (!isAllowedNavigation(url)) {
      logger.warn('navigation blocked', url)
      event.preventDefault()
    }
  }
  contents.on('will-navigate', block)
  contents.on('will-redirect', block)
  if (contents.getType() === 'webview') {
    contents.on('did-finish-load', () => {
      if (!pendingOpenPath) return
      logger.info('open-path relay', pendingOpenPath)
      contents.send('fv:open-path', pendingOpenPath)
      pendingOpenPath = null
    })
    contents.on('destroyed', () => {
      const win = BrowserWindow.getAllWindows()[0]
      if (win && !win.isDestroyed()) win.webContents.send('shell:immersive', false)
    })
  }
})

const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
} else {
  setupWindowIpc()
  Menu.setApplicationMenu(null)

  app.on('second-instance', (_event, argv) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
    const path = cliPath(argv)
    if (path) deliverOpenPath(path)
  })

  void app.whenReady().then(async () => {
    logger.info('FastViewer starting')
    const guestPreload = join(__dirname, '../preload/guest.js')
    try {
      server = await startLocalServer({
        webDir: join(__dirname, '../web'),
        token: randomBytes(32).toString('hex'),
        placeLister: async () =>
          mergePlaces(
            listPlaces({ pathFor: (id) => app.getPath(id) }),
            await listQuickAccessPlaces(),
          ),
      })
    } catch (error) {
      logger.error('local server failed to start', String(error))
      app.quit()
      return
    }
    ipcMain.handle('shell:boot-info', () => ({
      appUrl: server?.url ?? '',
      guestPreloadUrl: pathToFileURL(guestPreload).href,
    }))
    const config = new ConfigStore(
      join(app.getPath('userData'), 'fastviewer-config.json'),
      (message) => logger.warn(message),
    )
    ipcMain.handle('fv:get-config', () => config.get())
    ipcMain.handle('fv:patch-config', (_event, patch) => config.patch(patch))
    const broadcastTheme = (theme: ThemeName): void => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) win.webContents.send('shell:theme', theme)
      }
      const guest = guestContents()
      if (guest && !guest.isDestroyed()) guest.send('fv:theme', theme)
    }
    ipcMain.handle('shell:get-theme', () => config.get().theme)
    ipcMain.handle('shell:set-theme', (_event, theme: unknown) => {
      if (!isThemeName(theme)) return
      config.patch({ theme })
      broadcastTheme(theme)
    })
    ipcMain.handle('shell:about', () =>
      buildAboutInfo(
        {
          app: app.getVersion(),
          electron: process.versions.electron,
          chromium: process.versions.chrome,
        },
        app.getPath('userData'),
      ),
    )
    ipcMain.handle('shell:reveal-config', () => shell.openPath(app.getPath('userData')))
    const resetWindow = (): void => {
      const win = BrowserWindow.getAllWindows()[0]
      if (!win || win.isDestroyed()) return
      if (win.isFullScreen()) win.setFullScreen(false)
      if (win.isMaximized()) win.unmaximize()
      win.setBounds(initialBounds(screen.getPrimaryDisplay().workArea))
      win.webContents.send('shell:window-state', getWindowState())
    }
    const applyReset = (kind: ResetKind): void => {
      config.patch(resetPatch(kind))
      if (kind === 'prefs') broadcastTheme(config.get().theme)
      resetWindow()
      const guest = guestContents()
      if (guest && !guest.isDestroyed()) guest.send('fv:config-reset', kind)
    }
    ipcMain.handle('shell:reset-layout', () => applyReset('layout'))
    ipcMain.handle('shell:reset-prefs', () => applyReset('prefs'))
    ipcMain.handle('fv:startup-path', () => {
      const path = startupPath
      startupPath = null
      return path
    })
    ipcMain.on('fv:set-folder-title', (_event, title: unknown) => {
      const name = typeof title === 'string' ? title : ''
      const win = BrowserWindow.getAllWindows()[0]
      if (!win) return
      win.setTitle(name ? `${name} — FastViewer` : 'FastViewer')
    })
    ipcMain.on('fv:set-immersive', (_event, on: unknown) => {
      const win = BrowserWindow.getAllWindows()[0]
      if (!win || win.isDestroyed()) return
      win.webContents.send('shell:immersive', Boolean(on))
    })
    const initialPath = cliPath(process.argv)
    if (initialPath) logger.info('cli path', initialPath)
    startupPath = initialPath
    pendingOpenPath = initialPath ?? pendingOpenPath
    const persistPlacement = (placement: WindowPlacement): void => {
      config.patch({ window: placement })
    }
    createMainWindow({
      guestPreload,
      allowedOrigin: `http://127.0.0.1:${server.port}`,
      placement: config.get().window,
      onPlacementChange: persistPlacement,
    })
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow({
          guestPreload,
          allowedOrigin: `http://127.0.0.1:${server?.port ?? 0}`,
          placement: config.get().window,
          onPlacementChange: persistPlacement,
        })
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', () => {
    flushWindowPlacement()
    void server?.close()
  })
}
