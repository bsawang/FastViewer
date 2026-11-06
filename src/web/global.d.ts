import type { HostApi } from '../shared/api'

declare global {
  interface Window {
    fvHost: HostApi
  }
}

export {}
