import { describe, expect, it } from 'vitest'
import { exifRows, extractExif, parseTiff } from '../src/web/exif'
import type { RangeSource } from '../src/web/file-reader'

function ascii(data: Uint8Array, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) data[offset + index] = value.charCodeAt(index)
  data[offset + value.length] = 0
}

function u16le(data: Uint8Array, offset: number, value: number): void {
  data[offset] = value & 0xff
  data[offset + 1] = (value >>> 8) & 0xff
}

function u32le(data: Uint8Array, offset: number, value: number): void {
  for (let index = 0; index < 4; index += 1) data[offset + index] = (value >>> (8 * index)) & 0xff
}

function buildTiff(): Uint8Array {
  const data = new Uint8Array(174)
  data[0] = 0x49
  data[1] = 0x49
  u16le(data, 2, 42)
  u32le(data, 4, 8)

  u16le(data, 8, 3)
  // Make / Model / Exif IFD 指针
  u16le(data, 10, 0x010f)
  u16le(data, 12, 2)
  u32le(data, 14, 6)
  u32le(data, 18, 50)
  u16le(data, 22, 0x0110)
  u16le(data, 24, 2)
  u32le(data, 26, 7)
  u32le(data, 30, 56)
  u16le(data, 34, 0x8769)
  u16le(data, 36, 4)
  u32le(data, 38, 1)
  u32le(data, 42, 64)
  u32le(data, 46, 0)
  ascii(data, 50, 'Canon')
  ascii(data, 56, 'EOS R5')

  u16le(data, 64, 5)
  u16le(data, 66, 0x9003)
  u16le(data, 68, 2)
  u32le(data, 70, 20)
  u32le(data, 74, 130)
  u16le(data, 78, 0x829a)
  u16le(data, 80, 5)
  u32le(data, 82, 1)
  u32le(data, 86, 150)
  u16le(data, 90, 0x829d)
  u16le(data, 92, 5)
  u32le(data, 94, 1)
  u32le(data, 98, 158)
  u16le(data, 102, 0x8827)
  u16le(data, 104, 3)
  u32le(data, 106, 1)
  u16le(data, 110, 400)
  u16le(data, 114, 0x920a)
  u16le(data, 116, 5)
  u32le(data, 118, 1)
  u32le(data, 122, 166)
  u32le(data, 126, 0)
  ascii(data, 130, '2024:05:01 12:00:00')
  u32le(data, 150, 1)
  u32le(data, 154, 125)
  u32le(data, 158, 28)
  u32le(data, 162, 10)
  u32le(data, 166, 50)
  u32le(data, 170, 1)
  return data
}

function memoryReader(data: Uint8Array): RangeSource {
  return {
    size: data.length,
    read: async (offset, length) => data.subarray(offset, offset + length),
  }
}

function buildMakeTiff(value: string): Uint8Array {
  const count = value.length + 1
  const data = new Uint8Array(26 + count)
  data[0] = 0x49
  data[1] = 0x49
  u16le(data, 2, 42)
  u32le(data, 4, 8)
  u16le(data, 8, 1)
  u16le(data, 10, 0x010f)
  u16le(data, 12, 2)
  u32le(data, 14, count)
  u32le(data, 18, 26)
  u32le(data, 22, 0)
  ascii(data, 26, value)
  return data
}

describe('parseTiff', () => {
  it('解析相机、镜头与拍摄参数', () => {
    const summary = parseTiff(buildTiff())
    expect(summary).toEqual({
      camera: 'Canon EOS R5',
      lens: undefined,
      taken: '2024-05-01 12:00:00',
      exposure: '1/125 s',
      aperture: 'f/2.8',
      iso: '400',
      focal: '50 mm',
    })
  })

  it('非 TIFF 数据返回 null', () => {
    expect(parseTiff(new Uint8Array(0))).toBeNull()
    expect(parseTiff(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toBeNull()
  })

  it('过滤写进 Make 的 Prompt / JSON 文本', () => {
    expect(parseTiff(buildMakeTiff('Canon'))?.camera).toBe('Canon')
    expect(parseTiff(buildMakeTiff('Prompt: {"53": {"inputs": {"seed": 1}}}'))).toBeNull()
    expect(parseTiff(buildMakeTiff('a'.repeat(80)))).toBeNull()
  })
})

describe('exifRows', () => {
  it('按固定顺序输出非空字段', () => {
    const summary = parseTiff(buildTiff())
    expect(summary).not.toBeNull()
    expect(exifRows(summary!)).toEqual([
      ['拍摄时间', '2024-05-01 12:00:00'],
      ['相机', 'Canon EOS R5'],
      ['光圈', 'f/2.8'],
      ['快门', '1/125 s'],
      ['ISO', '400'],
      ['焦距', '50 mm'],
    ])
  })
})

describe('extractExif', () => {
  it('从 JPEG APP1 中提取', async () => {
    const tiff = buildTiff()
    const segmentLength = 2 + 6 + tiff.length
    const jpeg = new Uint8Array(4 + segmentLength + 2)
    jpeg[0] = 0xff
    jpeg[1] = 0xd8
    jpeg[2] = 0xff
    jpeg[3] = 0xe1
    jpeg[4] = (segmentLength >>> 8) & 0xff
    jpeg[5] = segmentLength & 0xff
    jpeg.set([0x45, 0x78, 0x69, 0x66, 0x00, 0x00], 6)
    jpeg.set(tiff, 12)
    jpeg[jpeg.length - 2] = 0xff
    jpeg[jpeg.length - 1] = 0xd9

    const summary = await extractExif(memoryReader(jpeg))
    expect(summary?.camera).toBe('Canon EOS R5')
    expect(summary?.iso).toBe('400')
  })

  it('不支持的类型返回 null', async () => {
    expect(await extractExif(memoryReader(new Uint8Array(32)))).toBeNull()
  })
})
