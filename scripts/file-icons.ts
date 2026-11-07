import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import {
  ASSOCIATION_CATEGORIES,
  ASSOCIATION_EXTS,
  associationCategory,
  associationIconFileName,
} from '../src/shared/associations'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const outDir = join(root, 'build/file-icons')

const SIZES = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256]

const FONT_CANDIDATES = [
  { file: 'C:/Windows/Fonts/segoeuib.ttf', family: 'Segoe UI' },
  { file: 'C:/Windows/Fonts/arialbd.ttf', family: 'Arial' },
]

interface IcoImage {
  size: number
  png: Buffer
  rgba: Buffer
}

interface FontOptions {
  fontFiles?: string[]
  loadSystemFonts?: boolean
  defaultFontFamily?: string
}

function iconSvg(ext: string): string {
  const color = ASSOCIATION_CATEGORIES[associationCategory(ext)].color
  const fontSize = ext.length >= 4 ? 11.6 : 14.6
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
  <path d="M0 4 C0 1.791 1.791 0 4 0 L28 0 L40 12 L40 36 C40 38.209 38.209 40 36 40 L4 40 C1.791 40 0 38.209 0 36 Z" fill="${color}"/>
  <path d="M28 0 L40 12 L32 12 C29.791 12 28 10.209 28 8 Z" fill="#ffffff" opacity="0.3"/>
  <text x="20" y="33" text-anchor="middle" font-family="Segoe UI, system-ui, sans-serif" font-size="${fontSize}" font-weight="700" letter-spacing="0.2" fill="#ffffff">${ext.toUpperCase()}</text>
</svg>
`
}

function bmpImage(image: IcoImage): Buffer {
  const { size, rgba } = image
  const header = Buffer.alloc(40)
  header.writeUInt32LE(40, 0)
  header.writeInt32LE(size, 4)
  header.writeInt32LE(size * 2, 8)
  header.writeUInt16LE(1, 12)
  header.writeUInt16LE(32, 14)
  header.writeUInt32LE(size * size * 4, 20)

  const xor = Buffer.alloc(size * size * 4)
  const maskStride = Math.ceil(size / 32) * 4
  const and = Buffer.alloc(maskStride * size)

  for (let y = 0; y < size; y += 1) {
    const srcRow = (size - 1 - y) * size * 4
    const dstRow = y * size * 4
    for (let x = 0; x < size; x += 1) {
      const src = srcRow + x * 4
      const dst = dstRow + x * 4
      const alpha = rgba[src + 3]
      if (alpha === 0) {
        and[y * maskStride + Math.floor(x / 8)] |= 0x80 >> (x % 8)
        continue
      }
      const scale = 255 / alpha
      xor[dst] = Math.min(255, Math.round(rgba[src + 2] * scale))
      xor[dst + 1] = Math.min(255, Math.round(rgba[src + 1] * scale))
      xor[dst + 2] = Math.min(255, Math.round(rgba[src] * scale))
      xor[dst + 3] = alpha
    }
  }

  return Buffer.concat([header, xor, and])
}

function ico(images: IcoImage[]): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)

  const entries: Buffer[] = []
  const payloads: Buffer[] = []
  let offset = 6 + images.length * 16

  for (const image of images) {
    const payload = image.size >= 256 ? image.png : bmpImage(image)
    const entry = Buffer.alloc(16)
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 0)
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 1)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(payload.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += payload.length
    entries.push(entry)
    payloads.push(payload)
  }

  return Buffer.concat([header, ...entries, ...payloads])
}

function renderPixels(svg: string, size: number, font: FontOptions): IcoImage {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    font,
  })
  const rendered = resvg.render()
  return {
    size,
    png: rendered.asPng(),
    rgba: rendered.pixels,
  }
}

const fontFile = FONT_CANDIDATES.find((candidate) => existsSync(candidate.file))
const font: FontOptions = fontFile
  ? {
      fontFiles: [fontFile.file],
      loadSystemFonts: false,
      defaultFontFamily: fontFile.family,
    }
  : { loadSystemFonts: true, defaultFontFamily: 'Segoe UI' }

mkdirSync(outDir, { recursive: true })

for (const ext of ASSOCIATION_EXTS) {
  const svg = iconSvg(ext)
  writeFileSync(join(outDir, associationIconFileName(ext, 'svg')), svg, 'utf8')
  const images = SIZES.map((size) => renderPixels(svg, size, font))
  writeFileSync(join(outDir, associationIconFileName(ext, 'ico')), ico(images))
}

console.log(`生成 ${ASSOCIATION_EXTS.length} 组文件图标 → ${outDir}`)
