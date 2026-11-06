import type { ShellApi } from '../shared/api'

declare global {
  interface Window {
    fvShell: ShellApi
  }
}

export {}
