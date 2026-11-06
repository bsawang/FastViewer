export interface WindowState {
  maximized: boolean
  fullscreen: boolean
}

export type WindowStateEvent =
  | 'maximize'
  | 'unmaximize'
  | 'enter-full-screen'
  | 'leave-full-screen'

export const INITIAL_WINDOW_STATE: WindowState = { maximized: false, fullscreen: false }

export function reduceWindowState(state: WindowState, event: WindowStateEvent): WindowState {
  switch (event) {
    case 'maximize':
      return { ...state, maximized: true }
    case 'unmaximize':
      return { ...state, maximized: false }
    case 'enter-full-screen':
      return { ...state, fullscreen: true }
    case 'leave-full-screen':
      return { ...state, fullscreen: false }
  }
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

const MIN_WIDTH = 720
const MIN_HEIGHT = 480
const MAX_WIDTH = 1280
const MAX_HEIGHT = 860

export function initialBounds(workArea: Rect): Rect {
  const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(workArea.width * 0.8)))
  const height = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(workArea.height * 0.8)))
  return {
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2),
    width,
    height,
  }
}
