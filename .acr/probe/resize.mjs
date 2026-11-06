import { argv } from 'node:process'

const [, , port, widthArg, heightArg] = argv
if (!port || !widthArg || !heightArg) {
  console.error('usage: node resize.mjs <debugPort> <width> <height>')
  process.exit(2)
}

const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const page = targets.find((t) => t.type === 'page')
if (!page) {
  console.error('no page target')
  process.exit(1)
}

const ws = new WebSocket(version.webSocketDebuggerUrl)
let id = 0
const send = (method, params) =>
  new Promise((resolve, reject) => {
    const current = ++id
    const onMessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id !== current) return
      ws.removeEventListener('message', onMessage)
      if (msg.error) reject(new Error(msg.error.message))
      else resolve(msg.result)
    }
    ws.addEventListener('message', onMessage)
    ws.send(JSON.stringify({ id: current, method, params }))
  })

await new Promise((resolve) => ws.addEventListener('open', resolve))
const { windowId } = await send('Browser.getWindowForTarget', { targetId: page.id })
await send('Browser.setWindowBounds', {
  windowId,
  bounds: { width: Number(widthArg), height: Number(heightArg) },
})
const { bounds } = await send('Browser.getWindowBounds', { windowId })
console.log(JSON.stringify(bounds))
ws.close()
