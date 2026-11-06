import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const target = process.argv[2]
const count = Number(process.argv[3] ?? '2000')

if (!target) {
  console.error('用法: node scripts/mkfixture.mjs <目录> [文件数]')
  process.exit(1)
}
if (!Number.isInteger(count) || count < 1) {
  console.error('文件数必须是正整数')
  process.exit(1)
}

mkdirSync(target, { recursive: true })

function makeSvg(index) {
  const hue = (index * 47) % 360
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 70% 58%)"/><stop offset="1" stop-color="hsl(${(hue + 48) % 360} 70% 38%)"/></linearGradient></defs><rect width="320" height="200" fill="url(#g)"/><circle cx="160" cy="100" r="46" fill="hsl(${(hue + 180) % 360} 80% 70%)" opacity="0.55"/></svg>`
}

const started = performance.now()
for (let i = 0; i < count; i += 1) {
  const id = String(i).padStart(5, '0')
  if (i % 50 === 0) {
    mkdirSync(join(target, `album-${id}`))
    continue
  }
  const name = i % 100 === 0 ? `clip-${id}.mp4` : `img-${id}.svg`
  const body = name.endsWith('.svg') ? Buffer.from(makeSvg(i)) : Buffer.alloc(0)
  writeFileSync(join(target, name), body)
}

const elapsed = Math.round(performance.now() - started)
console.log(`fixture ready: ${target} files=${count} elapsed=${elapsed}ms`)
