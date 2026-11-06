export const THEME_IDS = ['midnight', 'obsidian', 'moss', 'ember', 'dawn'] as const

export type ThemeName = (typeof THEME_IDS)[number]

export const DEFAULT_THEME: ThemeName = 'midnight'

export const THEME_LABELS: Record<ThemeName, string> = {
  midnight: '深空蓝',
  obsidian: '曜石黑',
  moss: '墨绿',
  ember: '琥珀',
  dawn: '晨雾',
}

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value)
}
