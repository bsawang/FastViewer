import { readAscii, readFloatBE, readU16BE, readU32BE, readU64BE } from './binary'
import type { RangeSource } from './file-reader'

export interface VideoMeta {
  codec?: string
  fps?: number
  frames?: number
  framesApprox?: boolean
  audio?: string
}

interface Box {
  type: string
  dataStart: number
  end: number
}

const VIDEO_CODECS: Record<string, string> = {
  avc1: 'H.264',
  avc3: 'H.264',
  hev1: 'H.265',
  hvc1: 'H.265',
  vp09: 'VP9',
  av01: 'AV1',
  mp4v: 'MPEG-4',
}

const AUDIO_CODECS: Record<string, string> = {
  mp4a: 'AAC',
  Opus: 'Opus',
  'ac-3': 'AC-3',
  'ec-3': 'E-AC-3',
  alac: 'ALAC',
  fLaC: 'FLAC',
}

const WEBM_CODECS: Record<string, string> = {
  V_VP8: 'VP8',
  V_VP9: 'VP9',
  V_AV1: 'AV1',
  'V_MPEG4/ISO/AVC': 'H.264',
  'V_MPEGH/ISO/HEVC': 'H.265',
  A_OPUS: 'Opus',
  A_VORBIS: 'Vorbis',
  A_AAC: 'AAC',
  A_FLAC: 'FLAC',
}

function readBoxes(buffer: Uint8Array, start: number, end: number): Box[] {
  const boxes: Box[] = []
  let offset = start
  while (offset + 8 <= end && boxes.length < 2048) {
    const size32 = readU32BE(buffer, offset)
    let header = 8
    let size = size32
    if (size32 === 1) {
      if (offset + 16 > end) break
      size = readU64BE(buffer, offset + 8)
      header = 16
    } else if (size32 === 0) {
      size = end - offset
    }
    if (size < header || offset + size > end) break
    boxes.push({
      type: readAscii(buffer, offset + 4, 4),
      dataStart: offset + header,
      end: offset + size,
    })
    offset += size
  }
  return boxes
}

function childBox(boxes: Box[], type: string): Box | undefined {
  return boxes.find((box) => box.type === type)
}

function parseMdhd(buffer: Uint8Array, box: Box): { timescale: number; duration: number } | null {
  if (box.dataStart + 4 > box.end) return null
  const version = buffer[box.dataStart]
  if (version === 1) {
    if (box.dataStart + 32 > box.end) return null
    const timescale = readU32BE(buffer, box.dataStart + 20)
    const duration = readU64BE(buffer, box.dataStart + 24)
    return { timescale, duration: timescale > 0 ? duration / timescale : 0 }
  }
  if (box.dataStart + 20 > box.end) return null
  const timescale = readU32BE(buffer, box.dataStart + 12)
  const duration = readU32BE(buffer, box.dataStart + 16)
  return { timescale, duration: timescale > 0 ? duration / timescale : 0 }
}

function parseStts(
  buffer: Uint8Array,
  box: Box,
): { frames: number; delta: number | null } | null {
  if (box.dataStart + 8 > box.end) return null
  const entries = Math.min(readU32BE(buffer, box.dataStart + 4), 4096)
  let frames = 0
  let delta = 0
  let uniform = true
  for (let index = 0; index < entries; index += 1) {
    const offset = box.dataStart + 8 + index * 8
    if (offset + 8 > box.end) break
    const count = readU32BE(buffer, offset)
    const sampleDelta = readU32BE(buffer, offset + 4)
    frames += count
    if (index === 0) delta = sampleDelta
    else if (sampleDelta !== delta) uniform = false
  }
  return { frames, delta: uniform && delta > 0 ? delta : null }
}

interface SampleEntry {
  codec: string
  channels?: number
  sampleRate?: number
}

function parseStsd(buffer: Uint8Array, box: Box, audio: boolean): SampleEntry | null {
  const entryStart = box.dataStart + 8
  if (entryStart + 8 > box.end) return null
  const entrySize = readU32BE(buffer, entryStart)
  const codec = readAscii(buffer, entryStart + 4, 4)
  const content = entryStart + 8
  if (audio && content + 28 <= Math.min(box.end, entryStart + entrySize)) {
    return {
      codec,
      channels: readU16BE(buffer, content + 16),
      sampleRate: readU32BE(buffer, content + 24) >>> 16,
    }
  }
  return { codec }
}

function formatSampleRate(rate: number | undefined): string | undefined {
  if (!rate || !Number.isFinite(rate)) return undefined
  const value = Number((rate / 1000).toFixed(1)).toString()
  return `${value} kHz`
}

function describeAudio(entry: SampleEntry): string {
  const name = AUDIO_CODECS[entry.codec] ?? entry.codec
  const parts = [name]
  if (entry.channels) parts.push(`${entry.channels} 声道`)
  const rate = formatSampleRate(entry.sampleRate)
  if (rate) parts.push(rate)
  return parts.join(' · ')
}

function parseMp4(buffer: Uint8Array): VideoMeta | null {
  const meta: VideoMeta = {}
  for (const trak of readBoxes(buffer, 0, buffer.length).filter((box) => box.type === 'trak')) {
    const mdia = childBox(readBoxes(buffer, trak.dataStart, trak.end), 'mdia')
    if (!mdia) continue
    const mdiaChildren = readBoxes(buffer, mdia.dataStart, mdia.end)
    const hdlr = childBox(mdiaChildren, 'hdlr')
    if (!hdlr || hdlr.dataStart + 12 > hdlr.end) continue
    const handler = readAscii(buffer, hdlr.dataStart + 8, 4)
    const mdhd = childBox(mdiaChildren, 'mdhd')
    const timing = mdhd ? parseMdhd(buffer, mdhd) : null
    const minf = childBox(mdiaChildren, 'minf')
    if (!minf) continue
    const stbl = childBox(readBoxes(buffer, minf.dataStart, minf.end), 'stbl')
    if (!stbl) continue
    const stblChildren = readBoxes(buffer, stbl.dataStart, stbl.end)
    const stsd = childBox(stblChildren, 'stsd')
    const stts = childBox(stblChildren, 'stts')
    if (!stsd) continue
    const audio = handler === 'soun'
    const entry = parseStsd(buffer, stsd, audio)
    if (!entry) continue

    if (handler === 'vide') {
      meta.codec = VIDEO_CODECS[entry.codec] ?? entry.codec
      const samples = stts ? parseStts(buffer, stts) : null
      if (samples) {
        meta.frames = samples.frames
        if (timing && samples.delta) {
          meta.fps = timing.timescale / samples.delta
        } else if (timing && timing.duration > 0) {
          meta.fps = samples.frames / timing.duration
        }
      }
    } else if (audio && !meta.audio) {
      meta.audio = describeAudio(entry)
    }
  }
  if (!meta.codec && !meta.audio) return null
  return meta
}

interface EbmlElement {
  id: number
  dataStart: number
  end: number
}

function readEbmlId(buffer: Uint8Array, offset: number): { id: number; length: number } | null {
  if (offset >= buffer.length) return null
  const first = buffer[offset] as number
  let length = 0
  for (let index = 0; index < 8; index += 1) {
    if ((first & (0x80 >> index)) !== 0) {
      length = index + 1
      break
    }
  }
  if (length === 0 || offset + length > buffer.length) return null
  let id = 0
  for (let index = 0; index < length; index += 1) id = id * 256 + (buffer[offset + index] as number)
  return { id, length }
}

function readEbmlSize(
  buffer: Uint8Array,
  offset: number,
): { size: number; length: number; unknown: boolean } | null {
  if (offset >= buffer.length) return null
  const first = buffer[offset] as number
  let length = 0
  for (let index = 0; index < 8; index += 1) {
    if ((first & (0x80 >> index)) !== 0) {
      length = index + 1
      break
    }
  }
  if (length === 0 || offset + length > buffer.length) return null
  let size = first & ((1 << (8 - length)) - 1)
  let allOnes = size === (1 << (8 - length)) - 1
  for (let index = 1; index < length; index += 1) {
    const byte = buffer[offset + index] as number
    size = size * 256 + byte
    if (byte !== 0xff) allOnes = false
  }
  return { size, length, unknown: allOnes }
}

function readEbmlElement(buffer: Uint8Array, offset: number, limit: number): EbmlElement | null {
  const id = readEbmlId(buffer, offset)
  if (!id) return null
  const size = readEbmlSize(buffer, offset + id.length)
  if (!size) return null
  const dataStart = offset + id.length + size.length
  const end = size.unknown ? limit : Math.min(limit, dataStart + size.size)
  if (dataStart > limit || end < dataStart) return null
  return { id: id.id, dataStart, end }
}

function ebmlChildren(buffer: Uint8Array, start: number, end: number): EbmlElement[] {
  const children: EbmlElement[] = []
  let offset = start
  while (offset < end && children.length < 1024) {
    const element = readEbmlElement(buffer, offset, end)
    if (!element) break
    children.push(element)
    offset = element.end
    if (offset <= element.dataStart) break
  }
  return children
}

function ebmlUint(buffer: Uint8Array, element: EbmlElement): number | undefined {
  const length = element.end - element.dataStart
  if (length <= 0 || length > 8) return undefined
  let value = 0
  for (let index = 0; index < length; index += 1) {
    value = value * 256 + (buffer[element.dataStart + index] as number)
  }
  return value
}

function ebmlFloat(buffer: Uint8Array, element: EbmlElement): number | undefined {
  const length = element.end - element.dataStart
  if (length !== 4 && length !== 8) return undefined
  return readFloatBE(buffer, element.dataStart, length)
}

function ebmlString(buffer: Uint8Array, element: EbmlElement): string {
  return readAscii(buffer, element.dataStart, element.end - element.dataStart).replace(/\0.*$/s, '').trim()
}

const ID_SEGMENT = 0x18538067
const ID_INFO = 0x1549a966
const ID_TRACKS = 0x1654ae6b
const ID_TRACK_ENTRY = 0xae
const ID_TRACK_TYPE = 0x83
const ID_CODEC = 0x86
const ID_DEFAULT_DURATION = 0x23e383
const ID_AUDIO = 0xe1
const ID_SAMPLING_FREQUENCY = 0xb5
const ID_CHANNELS = 0x9f
const ID_TIMECODE_SCALE = 0x2ad7b1
const ID_DURATION = 0x4489

function parseWebm(buffer: Uint8Array): VideoMeta | null {
  const root = readEbmlElement(buffer, 0, buffer.length)
  if (!root || root.id !== 0x1a45dfa3) return null
  const segment = readEbmlElement(buffer, root.end, buffer.length)
  if (!segment || segment.id !== ID_SEGMENT) return null

  let timecodeScale = 1_000_000
  let duration = 0
  let codec: string | undefined
  let defaultDuration: number | undefined
  let audioChannels: number | undefined
  let audioRate: number | undefined
  let audioCodec: string | undefined

  for (const section of ebmlChildren(buffer, segment.dataStart, segment.end)) {
    if (section.id === ID_INFO) {
      for (const item of ebmlChildren(buffer, section.dataStart, section.end)) {
        if (item.id === ID_TIMECODE_SCALE) timecodeScale = ebmlUint(buffer, item) ?? timecodeScale
        if (item.id === ID_DURATION) duration = ebmlFloat(buffer, item) ?? duration
      }
    } else if (section.id === ID_TRACKS) {
      for (const entry of ebmlChildren(buffer, section.dataStart, section.end)) {
        if (entry.id !== ID_TRACK_ENTRY) continue
        let trackType = 0
        let trackCodec = ''
        let trackDefaultDuration: number | undefined
        let channels: number | undefined
        let rate: number | undefined
        for (const field of ebmlChildren(buffer, entry.dataStart, entry.end)) {
          if (field.id === ID_TRACK_TYPE) trackType = ebmlUint(buffer, field) ?? 0
          if (field.id === ID_CODEC) trackCodec = ebmlString(buffer, field)
          if (field.id === ID_DEFAULT_DURATION) {
            trackDefaultDuration = ebmlUint(buffer, field)
          }
          if (field.id === ID_AUDIO) {
            for (const audioField of ebmlChildren(buffer, field.dataStart, field.end)) {
              if (audioField.id === ID_CHANNELS) channels = ebmlUint(buffer, audioField)
              if (audioField.id === ID_SAMPLING_FREQUENCY) {
                rate = ebmlFloat(buffer, audioField)
              }
            }
          }
        }
        if (trackType === 1 && !codec) {
          codec = WEBM_CODECS[trackCodec] ?? trackCodec
          defaultDuration = trackDefaultDuration
        } else if (trackType === 2 && !audioCodec) {
          audioCodec = WEBM_CODECS[trackCodec] ?? trackCodec
          audioChannels = channels
          audioRate = rate
        }
      }
    }
  }

  const seconds = duration * timecodeScale / 1_000_000_000
  const meta: VideoMeta = {}
  if (codec) meta.codec = codec
  if (defaultDuration) meta.fps = 1_000_000_000 / defaultDuration
  if (meta.fps && seconds > 0) {
    meta.frames = Math.round(meta.fps * seconds)
    meta.framesApprox = true
  }
  if (audioCodec) {
    const parts = [audioCodec]
    if (audioChannels) parts.push(`${audioChannels} 声道`)
    const kHz = formatSampleRate(audioRate)
    if (kHz) parts.push(kHz)
    meta.audio = parts.join(' · ')
  }
  if (!meta.codec && !meta.audio) return null
  return meta
}

async function readMp4(reader: RangeSource): Promise<VideoMeta | null> {
  let offset = 0
  for (let index = 0; index < 64 && offset + 8 <= reader.size; index += 1) {
    const header = await reader.read(offset, 16)
    const size32 = readU32BE(header, 0)
    const type = readAscii(header, 4, 4)
    let headerSize = 8
    let size = size32
    if (size32 === 1) {
      headerSize = 16
      size = readU64BE(header, 8)
    } else if (size32 === 0) {
      size = reader.size - offset
    }
    if (size < headerSize || offset + size > reader.size) return null
    if (type === 'moov') {
      const cap = Math.min(size - headerSize, 32 * 1024 * 1024)
      const buffer = await reader.read(offset + headerSize, cap)
      return parseMp4(buffer)
    }
    offset += size
  }
  return null
}

async function readWebm(reader: RangeSource): Promise<VideoMeta | null> {
  const cap = Math.min(reader.size, 4 * 1024 * 1024)
  const buffer = await reader.read(0, cap)
  return parseWebm(buffer)
}

export async function readVideoMeta(reader: RangeSource): Promise<VideoMeta | null> {
  if (reader.size < 16) return null
  const head = await reader.read(0, 16)
  if (readU32BE(head, 4) === 0x66747970) return readMp4(reader)
  if (readU32BE(head, 0) === 0x1a45dfa3) return readWebm(reader)
  return null
}

export function videoRows(meta: VideoMeta): Array<[string, string]> {
  const rows: Array<[string, string]> = []
  if (meta.codec) rows.push(['视频编码', meta.codec])
  if (meta.fps && Number.isFinite(meta.fps)) {
    rows.push(['帧率', `${Number(meta.fps.toFixed(2))} fps`])
  }
  if (meta.frames && meta.frames > 0) {
    rows.push(['帧数', `${meta.framesApprox ? '≈ ' : ''}${meta.frames} 帧`])
  }
  if (meta.audio) rows.push(['音频流', meta.audio])
  return rows
}
