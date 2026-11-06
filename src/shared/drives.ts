export type DriveType = 'fixed' | 'removable'

export interface DriveInfo {
  path: string
  name: string
  label: string
  type: DriveType
}
