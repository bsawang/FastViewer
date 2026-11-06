import { argv } from 'node:process'

const [, , port, urlPart, x, y] = argv
if (!port || !urlPart || !x || !y) {
  console.error('usage: node dblclick.mjs <debugPort> <matchUrlPart> <x> <y>')
  process.exit(2)
}

const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const target = targets.find((item) => item.url.includes(urlPart))
if (!target) {
  console.error(`no target matching ${urlPart}`)
  process.exit(1)
}

const ws = new WebSocket(target.webSocketDebuggerUrl)
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
const base = { x: Number(x), y: Number(y), button: 'left', buttons: 1 }
for (const clickCount of [1, 2]) {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...base, clickCount })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...base, buttons: 0, clickCount })
}
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...base, buttons: 0 })
console.log(`double-click ${x},${y}`)
ws.close()
