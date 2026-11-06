export interface KeyContext {
  fullscreen: boolean
  editing: boolean
  viewerOpen: boolean
  video: boolean
  shift: boolean
}
export type KeyAction =
  | 'none'
  | 'exit-fullscreen'
  | 'toggle-fullscreen'
  | 'toggle-detail'
  | 'prev'
  | 'next'
  | 'zoom-in'
  | 'zoom-out'
  | 'zoom-fit'
  | 'zoom-actual'
  | 'toggle-play'
  | 'seek-backward'
  | 'seek-forward'
  | 'volume-up'
  | 'volume-down'
  | 'toggle-mute'

export function resolveKeyAction(key: string, context: KeyContext): KeyAction {
  if (context.editing || !context.viewerOpen) return 'none'
  switch (key) {
    case ' ':
      return context.video ? 'toggle-play' : 'none'
    case 'Escape':
      return context.fullscreen ? 'exit-fullscreen' : 'none'
    case 'f':
    case 'F':
      return context.video ? 'none' : 'toggle-fullscreen'
    case 'i':
    case 'I':
      return 'toggle-detail'
    case 'ArrowLeft':
      return context.video && context.shift ? 'seek-backward' : 'prev'
    case 'ArrowRight':
      return context.video && context.shift ? 'seek-forward' : 'next'
    case 'ArrowUp':
      return context.video ? 'volume-up' : 'none'
    case 'ArrowDown':
      return context.video ? 'volume-down' : 'none'
    case 'm':
    case 'M':
      return context.video ? 'toggle-mute' : 'none'
    case '+':
    case '=':
      return 'zoom-in'
    case '-':
    case '_':
      return 'zoom-out'
    case '0':
      return 'zoom-fit'
    case '1':
      return 'zoom-actual'
    default:
      return 'none'
  }
}
