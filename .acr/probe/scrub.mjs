import { argv } from 'node:process'

const [, , port, urlPart, targetRatio] = argv
if (!port || !urlPart || !targetRatio) {
  console.error('usage: node scrub.mjs <debugPort> <matchUrlPart> <targetRatio 0..1>')
  process.exit(2)
}

const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const target = targets.find((item) => item.url.includes(urlPart))
if (!target) {
  console.error('no target matching', urlPart)
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

const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  return result.result?.value
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const rect = await evaluate(`(() => {
  const el = document.querySelector('#video-track')
  const r = el.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})()`)
if (!rect || rect.w <= 0) {
  console.error('track not visible', JSON.stringify(rect))
  process.exit(1)
}

const y = rect.y + rect.h / 2
const x0 = rect.x + rect.w * 0.08
const x1 = rect.x + rect.w * Number(targetRatio)
const state = () => evaluate(`(() => {
  const v = document.querySelector('#viewer-video')
  return {
    currentTime: Math.round(v.currentTime * 1000) / 1000,
    paused: v.paused,
    seeks: window.__fvSeeks ?? -1,
    label: document.querySelector('#video-time').textContent,
    played: document.querySelector('#video-played').style.width,
  }
})()`)

await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x0, y, button: 'none' })
await send('Input.dispatchMouseEvent', {
  type: 'mousePressed',
  x: x0,
  y,
  button: 'left',
  buttons: 1,
  clickCount: 1,
})
await sleep(150)
await send('Input.dispatchMouseEvent', {
  type: 'mouseMoved',
  x: x0 + (x1 - x0) / 2,
  y,
  button: 'left',
  buttons: 1,
})
await sleep(250)
const mid = await state()
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1, y, button: 'left', buttons: 1 })
await sleep(250)
const mid2 = await state()
await send('Input.dispatchMouseEvent', {
  type: 'mouseReleased',
  x: x1,
  y,
  button: 'left',
  buttons: 0,
  clickCount: 1,
})
const atRelease = await state()
await sleep(400)
const after = await state()
console.log(JSON.stringify({ rect, mid, mid2, atRelease, after }))
ws.close()
