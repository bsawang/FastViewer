import { readFileSync } from 'node:fs'
const cfg = 'E:/work/ai/FastViewer/.acr/userdata-m1.2/fastviewer-config.json'
const read = () => JSON.parse(readFileSync(cfg, 'utf8')).splitRatio
const targets = await (await fetch('http://127.0.0.1:9341/json/list')).json()
const target = targets.find((t) => t.url.includes('127.0.0.1'))
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let id = 0
const send = (method, params) => new Promise((resolve, reject) => {
  const myId = ++id
  const timer = setTimeout(() => reject(new Error('timeout')), 10000)
  const onMessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id !== myId) return
    ws.removeEventListener('message', onMessage)
    clearTimeout(timer)
    resolve(msg)
  }
  ws.addEventListener('message', onMessage)
  ws.send(JSON.stringify({ id: myId, method, params }))
})
const evalJs = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.result?.value
const rect = JSON.parse(await evalJs("JSON.stringify(document.getElementById('split').getBoundingClientRect().toJSON())"))
const x = rect.x + rect.width / 2
const y = rect.y + 200
const before = read()
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
const t0 = Date.now()
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x - 120, y, button: 'left', buttons: 1 })
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x - 120, y, button: 'left', buttons: 0, clickCount: 1 })
while (Date.now() - t0 < 2000) {
  const now = read()
  if (Math.abs(now - before) > 0.0001) {
    console.log(`splitRatio ${before} -> ${now} written ${Date.now() - t0}ms after drag`)
    ws.close()
    process.exit(0)
  }
  await new Promise((r) => setTimeout(r, 5))
}
console.log('timeout')
ws.close()
