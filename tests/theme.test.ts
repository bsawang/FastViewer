import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME, THEME_IDS, isThemeName } from '../src/shared/theme'

const tokens = readFileSync(join(process.cwd(), 'src/shared/tokens.css'), 'utf8')

describe('theme ids', () => {
  it('5 套皮肤：4 暗 1 浅，默认深空蓝，含暖色琥珀', () => {
    expect(THEME_IDS).toEqual(['midnight', 'obsidian', 'moss', 'ember', 'dawn'])
    expect(DEFAULT_THEME).toBe('midnight')
    expect(isThemeName('ember')).toBe(true)
    expect(isThemeName('unknown')).toBe(false)
    expect(isThemeName(null)).toBe(false)
  })
})

describe('tokens.css', () => {
  it('每套皮肤都定义完整颜色令牌', () => {
    for (const theme of THEME_IDS) {
      const selector = `:root[data-theme='${theme}']`
      expect(tokens).toContain(selector)
      const block = tokens.slice(tokens.indexOf(selector))
      const end = block.indexOf('}', block.indexOf('--fv-bg'))
      const body = block.slice(0, end)
      for (const name of [
        '--fv-bg',
        '--fv-panel',
        '--fv-overlay',
        '--fv-text',
        '--fv-muted',
        '--fv-accent',
        '--fv-line',
        '--fv-line-soft',
        '--fv-fill',
        '--fv-shadow',
      ]) {
        expect(body).toContain(`${name}:`)
      }
    }
  })

  it('默认深空蓝保留原始色值，晨雾为浅色 scheme，琥珀为暖色深色', () => {
    expect(tokens).toContain('--fv-bg: #0b0b0f;')
    expect(tokens).toContain('--fv-panel: #15151b;')
    expect(tokens).toContain('--fv-overlay: #1d1d25;')
    expect(tokens).toContain('--fv-text: #e6e6ea;')
    expect(tokens).toContain('--fv-muted: #a9a9b3;')
    expect(tokens).toContain('--fv-accent: #4c8bf5;')

    const ember = tokens.slice(tokens.indexOf(":root[data-theme='ember']"))
    const emberBody = ember.slice(0, ember.indexOf('}'))
    expect(emberBody).toContain('--fv-bg: #14100d;')
    expect(emberBody).toContain('--fv-panel: #1d1815;')
    expect(emberBody).toContain('--fv-accent: #f0a35e;')
    expect(emberBody).toContain('color-scheme: dark;')

    const dawn = tokens.slice(tokens.indexOf(":root[data-theme='dawn']"))
    expect(dawn.slice(0, dawn.indexOf('}'))).toContain('color-scheme: light;')
  })
})
