import { argv, env } from 'node:process'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const [, , port, urlPart, deltaY] = argv
if (!port || !urlPart || !deltaY) {
  console.error('usage: node persist-timing.mjs <debugPort> <matchUrlPart> <deltaY>')
  process.exit(2)
}

const configPath = join(env.APPDATA ?? '', 'fastviewer', 'fastviewer-config.json')
const before = JSON.parse(readFileSync(configPath, 'utf8'))

const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const target = targets.find((item) => item.url.includes(urlPart))
if (!target) {
  console.error(`no target matching ${urlPart}`)
  process.exit(1)
}

const ws = new WebSocket(target.webSocketDebuggerUrl)
const t0 = Date.now()
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('timeout')), 10000)
  ws.addEventListener('open', () => {
    ws.send(
      JSON.stringify({
        id: 1,
        method: 'Input.dispatchMouseEvent',
        params: { type: 'mouseWheel', x: 700, y: 300, deltaX: 0, deltaY: Number(deltaY), modifiers: 2 },
      }),
    )
  })
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id !== 1) return
    clearTimeout(timer)
    ws.close()
    resolve()
  })
  ws.addEventListener('error', reject)
})

await new Promise((resolve) => setTimeout(resolve, 300))
const after = JSON.parse(readFileSync(configPath, 'utf8'))
const afterMtime = statSync(configPath).mtimeMs

console.log(
  JSON.stringify({
    configBefore: before.tileSize,
    configAfter: after.tileSize,
    mtimeDeltaMs: Math.round(afterMtime - t0),
    within300: after.tileSize !== before.tileSize && afterMtime - t0 <= 320,
  }),
)
