import { argv } from 'node:process'

const [, , port, urlPart, x1, y1, x2, y2] = argv
if (!port || !urlPart || !x1 || !y1 || !x2 || !y2) {
  console.error('usage: node pointer.mjs <debugPort> <matchUrlPart> <x1> <y1> <x2> <y2>')
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

await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve)
  ws.addEventListener('error', reject)
})

const ax = Number(x1)
const ay = Number(y1)
const bx = Number(x2)
const by = Number(y2)
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: ax, y: ay, button: 'none' })
await send('Input.dispatchMouseEvent', {
  type: 'mousePressed',
  x: ax,
  y: ay,
  button: 'left',
  buttons: 1,
  clickCount: 1,
})
for (let step = 1; step <= 6; step += 1) {
  await send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: ax + ((bx - ax) * step) / 6,
    y: ay + ((by - ay) * step) / 6,
    button: 'left',
    buttons: 1,
  })
}
await send('Input.dispatchMouseEvent', {
  type: 'mouseReleased',
  x: bx,
  y: by,
  button: 'left',
  buttons: 0,
  clickCount: 1,
})
ws.close()
console.log(`pointer ${ax},${ay} -> ${bx},${by}`)
