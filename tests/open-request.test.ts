import { describe, expect, it } from 'vitest'
import { findMediaIndex, parentOf } from '../src/web/open-request'

describe('parentOf', () => {
  it('strips the file name on backslash paths', () => {
    expect(parentOf('E:\\pics\\a.jpg')).toBe('E:\\pics')
  })

  it('strips the file name on forward-slash paths', () => {
    expect(parentOf('E:/pics/a.jpg')).toBe('E:/pics')
  })

  it('keeps the drive root for files directly under a drive', () => {
    expect(parentOf('E:\\a.jpg')).toBe('E:\\')
  })

  it('returns null when the path has no separator above the file', () => {
    expect(parentOf('a.jpg')).toBeNull()
    expect(parentOf('/a.jpg')).toBeNull()
    expect(parentOf('')).toBeNull()
  })
})

describe('findMediaIndex', () => {
  const seq = [{ path: 'E:\\pics\\A.JPG' }, { path: 'E:\\pics\\b.png' }]

  it('finds the matching media entry', () => {
    expect(findMediaIndex(seq, 'E:\\pics\\b.png')).toBe(1)
  })

  it('matches case-insensitively', () => {
    expect(findMediaIndex(seq, 'e:\\pics\\a.jpg')).toBe(0)
  })

  it('returns -1 for a non-media or missing path', () => {
    expect(findMediaIndex(seq, 'E:\\pics\\notes.txt')).toBe(-1)
    expect(findMediaIndex([], 'E:\\pics\\b.png')).toBe(-1)
  })
})
