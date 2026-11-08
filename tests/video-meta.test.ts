import { describe, expect, it } from 'vitest'
import type { RangeSource } from '../src/web/file-reader'
import { readVideoMeta, videoRows } from '../src/web/video-meta'

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

function box(type: string, content: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + content.length)
  new DataView(out.buffer).setUint32(0, out.length)
  for (let index = 0; index < 4; index += 1) out[4 + index] = type.charCodeAt(index)
  out.set(content, 8)
  return out
}

function u32(...values: number[]): Uint8Array {
  const out = new Uint8Array(values.length * 4)
  const view = new DataView(out.buffer)
  values.forEach((value, index) => view.setUint32(index * 4, value))
  return out
}

function buildMp4(): Uint8Array {
  const hdlr = new Uint8Array(12)
  for (let index = 0; index < 4; index += 1) hdlr[8 + index] = 'vide'.charCodeAt(index)
  const mdhd = concat([new Uint8Array(12), u32(1000, 4000), new Uint8Array(8)])
  const avc1 = box('avc1', new Uint8Array(8))
  const stsd = box('stsd', concat([new Uint8Array(4), u32(1), avc1]))
  const stts = box('stts', concat([new Uint8Array(4), u32(1), u32(100, 40)]))
  const stbl = box('stbl', concat([stsd, stts]))
  const minf = box('minf', stbl)
  const mdia = box('mdia', concat([box('hdlr', hdlr), box('mdhd', mdhd), minf]))
  const moov = box('moov', box('trak', mdia))
  const ftyp = box('ftyp', concat([new Uint8Array([0x69, 0x73, 0x6f, 0x6d]), u32(0)]))
  return concat([ftyp, moov])
}

function ebml(id: number[], payload: Uint8Array): Uint8Array {
  const size = payload.length
  if (size > 126) throw new Error('测试仅支持单字节长度')
  return concat([new Uint8Array([...id, 0x80 | size]), payload])
}

function beUint(value: number): Uint8Array {
  const bytes: number[] = []
  let rest = value
  while (rest > 0) {
    bytes.unshift(rest & 0xff)
    rest = Math.floor(rest / 256)
  }
  return new Uint8Array(bytes.length > 0 ? bytes : [0])
}

function beFloat(value: number): Uint8Array {
  const out = new Uint8Array(4)
  new DataView(out.buffer).setFloat32(0, value)
  return out
}

function asciiBytes(value: string): Uint8Array {
  const out = new Uint8Array(value.length)
  for (let index = 0; index < value.length; index += 1) out[index] = value.charCodeAt(index)
  return out
}

function buildWebm(): Uint8Array {
  const info = ebml([0x15, 0x49, 0xa9, 0x66], concat([
    ebml([0x44, 0x89], beFloat(4000)),
  ]))
  const video = ebml([0xae], concat([
    ebml([0x83], beUint(1)),
    ebml([0x86], asciiBytes('V_VP9')),
    ebml([0x23, 0xe3, 0x83], beUint(33333333)),
  ]))
  const audio = ebml([0xae], concat([
    ebml([0x83], beUint(2)),
    ebml([0x86], asciiBytes('A_OPUS')),
    ebml([0xe1], concat([
      ebml([0xb5], beFloat(48000)),
      ebml([0x9f], beUint(2)),
    ])),
  ]))
  const tracks = ebml([0x16, 0x54, 0xae, 0x6b], concat([video, audio]))
  const segment = ebml([0x18, 0x53, 0x80, 0x67], concat([info, tracks]))
  return concat([ebml([0x1a, 0x45, 0xdf, 0xa3], new Uint8Array(0)), segment])
}

function memoryReader(data: Uint8Array): RangeSource {
  return {
    size: data.length,
    read: async (offset, length) => data.subarray(offset, offset + length),
  }
}

describe('readVideoMeta', () => {
  it('解析 MP4 编码、帧率与帧数', async () => {
    const meta = await readVideoMeta(memoryReader(buildMp4()))
    expect(meta).toEqual({ codec: 'H.264', frames: 100, fps: 25 })
  })

  it('解析 WebM 编码与音频流', async () => {
    const meta = await readVideoMeta(memoryReader(buildWebm()))
    expect(meta?.codec).toBe('VP9')
    expect(meta?.fps).toBeCloseTo(30, 3)
    expect(meta?.frames).toBe(120)
    expect(meta?.framesApprox).toBe(true)
    expect(meta?.audio).toBe('Opus · 2 声道 · 48 kHz')
  })

  it('未知容器返回 null', async () => {
    expect(await readVideoMeta(memoryReader(new Uint8Array(32)))).toBeNull()
  })
})

describe('videoRows', () => {
  it('按固定顺序输出流信息', () => {
    expect(
      videoRows({ codec: 'H.264', fps: 24.5, frames: 7354, audio: 'AAC · 2 声道 · 44.1 kHz' }),
    ).toEqual([
      ['视频编码', 'H.264'],
      ['帧率', '24.5 fps'],
      ['帧数', '7354 帧'],
      ['音频流', 'AAC · 2 声道 · 44.1 kHz'],
    ])
  })

  it('估算帧数标注约等于号', () => {
    expect(videoRows({ frames: 120, framesApprox: true })).toEqual([['帧数', '≈ 120 帧']])
  })
})
