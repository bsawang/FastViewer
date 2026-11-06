import { describe, expect, it } from 'vitest'
import { formatTime } from '../src/web/video-controls'

describe('formatTime', () => {
  it.each([
    [0, '0:00'],
    [4, '0:04'],
    [6, '0:06'],
    [59.9, '0:59'],
    [65, '1:05'],
    [600, '10:00'],
    [3600, '60:00'],
  ])('formats %s as %s', (seconds, expected) => {
    expect(formatTime(seconds)).toBe(expected)
  })

  it('falls back to 0:00 for invalid values', () => {
    expect(formatTime(Number.NaN)).toBe('0:00')
    expect(formatTime(Number.POSITIVE_INFINITY)).toBe('0:00')
    expect(formatTime(-3)).toBe('0:00')
  })
})
