import { BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'node:path'
import type { WindowPlacement } from '../shared/config'
import { INITIAL_WINDOW_STATE, initialBounds, reduceWindowState, type WindowState } from '../shared/window-state'
import { placeWindow } from '../shared/window-placement'
import { logger } from './logger'

const PLACEMENT_DEBOUNCE_MS = 500

let state: WindowState = INITIAL_WINDOW_STATE

const flushPlacement = new WeakMap<BrowserWindow, () => void>()

export function flushWindowPlacement(): void {
  for (const win of BrowserWindow.getAllWindows()) flushPlacement.get(win)?.()
}

function emitState(win: BrowserWindow): void {
  if (!win.isDestroyed()) win.webContents.send('shell:window-state', state)
}

function registerIpc(): void {
  ipcMain.on('shell:window', (event, action: unknown) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || win.isDestroyed()) return
    if (action === 'minimize') win.minimize()
    else if (action === 'toggle-maximize') {
      if (win.isFullScreen()) return
      if (win.isMaximized()) win.unmaximize()
      else win.maximize()
    } else if (action === 'close') win.close()
  })
}

export interface MainWindowOptions {
  guestPreload: string
  allowedOrigin: string
  placement?: WindowPlacement | null
  onStateChange?: (state: WindowState) => void
  onPlacementChange?: (placement: WindowPlacement) => void
}

export function createMainWindow(options: MainWindowOptions): BrowserWindow {
  const placed = placeWindow(
    options.placement ?? null,
    screen.getAllDisplays().map((display) => display.workArea),
  )
  const bounds = placed?.bounds ?? initialBounds(screen.getPrimaryDisplay().workArea)

  const win = new BrowserWindow({
    ...bounds,
    minWidth: 720,
    minHeight: 480,
    show: false,
    transparent: true,
    backgroundColor: '#00000000',
    title: 'FastViewer',
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    icon: join(__dirname, '../shell/assets/icon.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/shell.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
      devTools: process.env.FV_DEBUG === '1',
    },
  })

  win.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    if (!params.src.startsWith(`${options.allowedOrigin}/`)) {
      event.preventDefault()
      return
    }
    webPreferences.preload = options.guestPreload
    webPreferences.nodeIntegration = false
    webPreferences.contextIsolation = true
    webPreferences.sandbox = false
  })

  const sync = (event: 'maximize' | 'unmaximize' | 'enter-full-screen' | 'leave-full-screen') => {
    state = reduceWindowState(state, event)
    logger.info(`window ${event}`, state)
    emitState(win)
    options.onStateChange?.(state)
  }
  win.on('maximize', () => sync('maximize'))
  win.on('unmaximize', () => sync('unmaximize'))
  win.on('enter-full-screen', () => sync('enter-full-screen'))
  win.on('leave-full-screen', () => sync('leave-full-screen'))

  let placementTimer: ReturnType<typeof setTimeout> | null = null
  const writePlacement = (): void => {
    if (win.isDestroyed()) return
    const normal = win.getNormalBounds()
    options.onPlacementChange?.({ ...normal, maximized: win.isMaximized() })
  }
  const schedulePlacement = (): void => {
    if (!options.onPlacementChange) return
    if (placementTimer !== null) clearTimeout(placementTimer)
    placementTimer = setTimeout(writePlacement, PLACEMENT_DEBOUNCE_MS)
  }
  flushPlacement.set(win, () => {
    if (placementTimer !== null) clearTimeout(placementTimer)
    placementTimer = null
    writePlacement()
  })
  win.on('move', schedulePlacement)
  win.on('resize', schedulePlacement)
  win.on('maximize', schedulePlacement)
  win.on('unmaximize', schedulePlacement)
  win.on('close', () => flushPlacement.get(win)?.())

  win.once('ready-to-show', () => {
    if (placed?.maximized) win.maximize()
    win.show()
  })

  void win.loadFile(join(__dirname, '../shell/index.html'))
  return win
}

export function setupWindowIpc(): void {
  registerIpc()
}

export function getWindowState(): WindowState {
  return state
}
