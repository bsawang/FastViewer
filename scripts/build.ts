import { build } from 'esbuild'
import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ASSOCIATION_EXTS, associationIconFileName } from '../src/shared/associations'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const dist = join(root, 'dist')

rmSync(dist, { recursive: true, force: true })
for (const dir of ['main', 'preload', 'shell', 'shell/assets', 'web/assets']) {
  mkdirSync(join(dist, dir), { recursive: true })
}

async function main(): Promise<void> {
  await build({
    entryPoints: [join(root, 'src/main/index.ts')],
    outfile: join(dist, 'main/index.js'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    external: ['electron'],
    sourcemap: true,
    logLevel: 'info',
  })

  for (const name of ['shell', 'guest']) {
    await build({
      entryPoints: [join(root, `src/preload/${name}.ts`)],
      outfile: join(dist, `preload/${name}.js`),
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node20',
      external: ['electron'],
      sourcemap: true,
      logLevel: 'info',
    })
  }

  await build({
    entryPoints: [join(root, 'src/shell/index.ts')],
    outfile: join(dist, 'shell/shell.js'),
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: 'chrome130',
    sourcemap: true,
    logLevel: 'info',
  })

  await build({
    entryPoints: [join(root, 'src/web/app.ts')],
    outfile: join(dist, 'web/assets/app.js'),
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: 'chrome130',
    sourcemap: true,
    logLevel: 'info',
  })

  for (const file of ['index.html', 'style.css']) {
    cpSync(join(root, 'src/shell', file), join(dist, 'shell', file))
  }
  cpSync(join(root, 'src/web/index.html'), join(dist, 'web/index.html'))
  cpSync(join(root, 'src/web/app.css'), join(dist, 'web/assets/app.css'))
  cpSync(join(root, 'src/shared/tokens.css'), join(dist, 'shell/tokens.css'))
  cpSync(join(root, 'src/shared/tokens.css'), join(dist, 'web/assets/tokens.css'))
  cpSync(join(root, 'src/web/assets/fonts'), join(dist, 'web/assets/fonts'), { recursive: true })
  cpSync(join(root, 'src/web/assets/fonts'), join(dist, 'shell/assets/fonts'), { recursive: true })
  cpSync(join(root, 'build/icon.ico'), join(dist, 'shell/assets/icon.ico'))
  cpSync(join(root, 'build/icon.png'), join(dist, 'shell/assets/icon.png'))
  mkdirSync(join(dist, 'shell/assets/file-icons'), { recursive: true })
  for (const ext of ASSOCIATION_EXTS) {
    cpSync(
      join(root, 'build/file-icons', associationIconFileName(ext, 'svg')),
      join(dist, 'shell/assets/file-icons', associationIconFileName(ext, 'svg')),
    )
  }
}

void main()
