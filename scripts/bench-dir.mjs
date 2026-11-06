import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const target = process.argv[2]
const coldRuns = Number(process.argv[3] ?? '20')

if (!target) {
  console.error('用法: node scripts/bench-dir.mjs <目录> [冷启动轮数]')
  process.exit(1)
}

const fixture = resolve(target)
const outdir = mkdtempSync(join(tmpdir(), 'fv-bench-'))
const bundle = join(outdir, 'dir-index.mjs')
await build({
  entryPoints: ['src/main/dir-index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: bundle,
  logLevel: 'silent',
})
const { DirIndex } = await import(pathToFileURL(bundle).href)

function percentile(values, ratio) {
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)
  return sorted[index]
}

const cold = []
let total = 0
for (let i = 0; i < coldRuns; i += 1) {
  const index = new DirIndex()
  const started = performance.now()
  const page = await index.get(fixture, { sort: 'name', order: 'asc', offset: 0, limit: 500 })
  cold.push(performance.now() - started)
  total = page.total
}

const warmIndex = new DirIndex()
const warmPage = await warmIndex.get(fixture, { sort: 'name', order: 'asc', offset: 0, limit: 500 })
const warm = []
for (let i = 0; i < coldRuns; i += 1) {
  const started = performance.now()
  await warmIndex.get(fixture, { sort: 'name', order: 'asc', offset: 0, limit: 500 })
  warm.push(performance.now() - started)
}

const coldP50 = percentile(cold, 0.5)
const coldP95 = percentile(cold, 0.95)
const warmP50 = percentile(warm, 0.5)
const warmP95 = percentile(warm, 0.95)

console.log(`dir=${fixture} total=${total} page=${warmPage.entries.length}`)
console.log(
  `cold p50=${coldP50.toFixed(1)}ms p95=${coldP95.toFixed(1)}ms max=${Math.max(...cold).toFixed(1)}ms`,
)
console.log(`cached p50=${warmP50.toFixed(2)}ms p95=${warmP95.toFixed(2)}ms`)

const ok = coldP95 < 800 && warmP95 < 50
console.log(ok ? 'PASS cold.p95 < 800ms && cached.p95 < 50ms' : 'FAIL budget exceeded')
process.exit(ok ? 0 : 1)
