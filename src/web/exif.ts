import { readAscii, readU16BE, readU32BE, readU32LE } from './binary'
import type { RangeSource } from './file-reader'

export interface ExifSummary {
  camera?: string
  lens?: string
  taken?: string
  exposure?: string
  aperture?: string
  iso?: string
  focal?: string
}

type ByteOrder = 'be' | 'le'

interface IfdEntry {
  type: number
  count: number
  byteLength: number
  valueOffset: number
}

const TYPE_SIZE: Record<number, number> = {
  1: 1,
  2: 1,
  3: 2,
  4: 4,
  5: 8,
  7: 1,
  9: 4,
  10: 8,
}

const TAG_MAKE = 0x010f
const TAG_MODEL = 0x0110
const TAG_DATETIME = 0x0132
const TAG_EXIF_IFD = 0x8769
const TAG_EXPOSURE = 0x829a
const TAG_APERTURE = 0x829d
const TAG_ISO = 0x8827
const TAG_DATETIME_ORIGINAL = 0x9003
const TAG_FOCAL = 0x920a
const TAG_LENS = 0xa434

function u16(data: Uint8Array, offset: number, order: ByteOrder): number {
  const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength)
  return dataView.getUint16(offset, order === 'le')
}

function u32(data: Uint8Array, offset: number, order: ByteOrder): number {
  const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength)
  return dataView.getUint32(offset, order === 'le')
}

function i32(data: Uint8Array, offset: number, order: ByteOrder): number {
  const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength)
  return dataView.getInt32(offset, order === 'le')
}

function readIfd(data: Uint8Array, offset: number, order: ByteOrder): Map<number, IfdEntry> {
  const entries = new Map<number, IfdEntry>()
  if (offset <= 0 || offset + 2 > data.length) return entries
  const count = u16(data, offset, order)
  for (let index = 0; index < count; index += 1) {
    const entryOffset = offset + 2 + index * 12
    if (entryOffset + 12 > data.length) break
    const tag = u16(data, entryOffset, order)
    const type = u16(data, entryOffset + 2, order)
    const itemCount = u32(data, entryOffset + 4, order)
    const unit = TYPE_SIZE[type]
    if (!unit || itemCount === 0) continue
    const byteLength = Math.min(unit * itemCount, data.length)
    const valueOffset =
      unit * itemCount <= 4 ? entryOffset + 8 : u32(data, entryOffset + 8, order)
    if (valueOffset < 0 || valueOffset + byteLength > data.length) continue
    entries.set(tag, { type, count: itemCount, byteLength, valueOffset })
  }
  return entries
}

function entryBytes(data: Uint8Array, entry: IfdEntry): Uint8Array {
  return data.subarray(entry.valueOffset, entry.valueOffset + entry.byteLength)
}

function asciiTag(data: Uint8Array, entries: Map<number, IfdEntry>, tag: number): string | undefined {
  const entry = entries.get(tag)
  if (!entry || entry.type !== 2) return undefined
  const value = new TextDecoder('utf-8')
    .decode(entryBytes(data, entry))
    .replace(/\0.*$/s, '')
    .trim()
  return value.length > 0 ? value : undefined
}

function numberTag(
  data: Uint8Array,
  entries: Map<number, IfdEntry>,
  tag: number,
  order: ByteOrder,
): number | undefined {
  const entry = entries.get(tag)
  if (!entry) return undefined
  if (entry.type === 3) return u16(data, entry.valueOffset, order)
  if (entry.type === 4) return u32(data, entry.valueOffset, order)
  if (entry.type === 9) return i32(data, entry.valueOffset, order)
  return undefined
}

function rationalTag(
  data: Uint8Array,
  entries: Map<number, IfdEntry>,
  tag: number,
  order: ByteOrder,
): number | undefined {
  const entry = entries.get(tag)
  if (!entry || (entry.type !== 5 && entry.type !== 10)) return undefined
  const numerator = entry.type === 5 ? u32(data, entry.valueOffset, order) : i32(data, entry.valueOffset, order)
  const denominator = entry.type === 5
    ? u32(data, entry.valueOffset + 4, order)
    : i32(data, entry.valueOffset + 4, order)
  if (denominator === 0) return undefined
  return numerator / denominator
}

function trimmed(value: number, digits = 2): string {
  return Number(value.toFixed(digits)).toString()
}

const MAX_TEXT_LENGTH = 64

// 部分生成工具会把整段 Prompt / JSON 塞进 Make、Lens 等文本标签，直接过滤掉
function usableText(value: string | undefined): string | undefined {
  if (!value) return undefined
  const text = value.replace(/\s+/g, ' ').trim()
  if (!text || text.length > MAX_TEXT_LENGTH) return undefined
  if (/[{}\[\]"]/.test(text) || /^prompt\s*:/i.test(text)) return undefined
  return text
}

function describeExposure(value: number | undefined): string | undefined {
  if (value === undefined || value <= 0) return undefined
  if (value >= 1) return `${trimmed(value)} s`
  return `1/${Math.round(1 / value)} s`
}

function describeDate(value: string | undefined): string | undefined {
  if (!value) return undefined
  const match = /^(\d{4}):(\d{2}):(\d{2})(?: (\d{2}:\d{2}:\d{2}))?/.exec(value)
  if (!match) return undefined
  return `${match[1]}-${match[2]}-${match[3]}${match[4] ? ` ${match[4]}` : ''}`
}

function describeCamera(make?: string, model?: string): string | undefined {
  if (make && model) {
    return model.toLowerCase().startsWith(make.toLowerCase()) ? model : `${make} ${model}`
  }
  return model ?? make
}

export function parseTiff(data: Uint8Array): ExifSummary | null {
  if (data.length < 8) return null
  let order: ByteOrder | null = null
  if (data[0] === 0x49 && data[1] === 0x49) order = 'le'
  else if (data[0] === 0x4d && data[1] === 0x4d) order = 'be'
  if (!order) return null
  if (u16(data, 2, order) !== 42) return null
  const ifd0 = readIfd(data, u32(data, 4, order), order)
  let exif = new Map<number, IfdEntry>()
  const exifPointer = ifd0.get(TAG_EXIF_IFD)
  if (exifPointer) exif = readIfd(data, u32(data, exifPointer.valueOffset, order), order)

  const tags = new Map<number, IfdEntry>([...ifd0, ...exif])
  const make = usableText(asciiTag(data, ifd0, TAG_MAKE))
  const model = usableText(asciiTag(data, ifd0, TAG_MODEL))
  const taken = describeDate(asciiTag(data, tags, TAG_DATETIME_ORIGINAL) ?? asciiTag(data, ifd0, TAG_DATETIME))
  const exposure = describeExposure(rationalTag(data, tags, TAG_EXPOSURE, order))
  const aperture = rationalTag(data, tags, TAG_APERTURE, order)
  const iso = numberTag(data, tags, TAG_ISO, order)
  const focal = rationalTag(data, tags, TAG_FOCAL, order)

  const summary: ExifSummary = {
    camera: describeCamera(make, model),
    lens: usableText(asciiTag(data, tags, TAG_LENS)),
    taken,
    exposure,
    aperture: aperture === undefined ? undefined : `f/${trimmed(aperture)}`,
    iso: iso === undefined ? undefined : String(Math.round(iso)),
    focal: focal === undefined ? undefined : `${trimmed(focal)} mm`,
  }
  return Object.values(summary).some((value) => value !== undefined) ? summary : null
}

async function readJpegExif(reader: RangeSource): Promise<Uint8Array | null> {
  const limit = Math.min(reader.size, 256 * 1024)
  const data = await reader.read(0, limit)
  let offset = 2
  while (offset + 4 <= data.length) {
    if (data[offset] !== 0xff) {
      offset += 1
      continue
    }
    let marker = data[offset + 1] as number
    while (marker === 0xff && offset + 2 < data.length) {
      offset += 1
      marker = data[offset + 1] as number
    }
    if (marker === 0xda || marker === 0xd9) return null
    const length = readU16BE(data, offset + 2)
    if (length < 2) return null
    const segmentStart = offset + 4
    const segmentEnd = offset + 2 + length
    if (marker === 0xe1 && length >= 8 && readAscii(data, segmentStart, 4) === 'Exif') {
      return data.subarray(segmentStart + 6, segmentEnd)
    }
    offset = segmentEnd
  }
  return null
}

async function readPngExif(reader: RangeSource): Promise<Uint8Array | null> {
  let offset = 8
  for (let index = 0; index < 64 && offset + 8 <= reader.size; index += 1) {
    const header = await reader.read(offset, 8)
    const length = readU32BE(header, 0)
    const type = readAscii(header, 4, 4)
    if (type === 'IDAT' || type === 'IEND') return null
    if (type === 'eXIf') {
      const cap = Math.min(length, 1024 * 1024)
      return reader.read(offset + 8, cap)
    }
    offset += 12 + length
  }
  return null
}

async function readWebpExif(reader: RangeSource): Promise<Uint8Array | null> {
  let offset = 12
  for (let index = 0; index < 32 && offset + 8 <= reader.size; index += 1) {
    const header = await reader.read(offset, 8)
    const type = readAscii(header, 0, 4)
    const length = readU32LE(header, 4)
    if (type === 'EXIF') {
      const data = await reader.read(offset + 8, Math.min(length, 1024 * 1024))
      if (readAscii(data, 0, 4) === 'Exif') return data.subarray(6)
      return data
    }
    offset += 8 + length + (length % 2)
  }
  return null
}

export async function extractExif(reader: RangeSource): Promise<ExifSummary | null> {
  if (reader.size < 12) return null
  const head = await reader.read(0, 12)
  let tiff: Uint8Array | null = null
  if (head[0] === 0xff && head[1] === 0xd8) {
    tiff = await readJpegExif(reader)
  } else if (readAscii(head, 0, 4) === 'RIFF' && readAscii(head, 8, 4) === 'WEBP') {
    tiff = await readWebpExif(reader)
  } else if (head[0] === 0x89 && readAscii(head, 1, 3) === 'PNG') {
    tiff = await readPngExif(reader)
  }
  return tiff ? parseTiff(tiff) : null
}

export function exifRows(exif: ExifSummary): Array<[string, string]> {
  const rows: Array<[string, string]> = []
  if (exif.taken) rows.push(['拍摄时间', exif.taken])
  if (exif.camera) rows.push(['相机', exif.camera])
  if (exif.lens) rows.push(['镜头', exif.lens])
  if (exif.aperture) rows.push(['光圈', exif.aperture])
  if (exif.exposure) rows.push(['快门', exif.exposure])
  if (exif.iso) rows.push(['ISO', exif.iso])
  if (exif.focal) rows.push(['焦距', exif.focal])
  return rows
}
