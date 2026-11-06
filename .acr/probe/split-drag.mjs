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
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x - 150, y, button: 'left', buttons: 1 })
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x - 200, y, button: 'left', buttons: 1 })
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x - 200, y, button: 'left', buttons: 0, clickCount: 1 })
await new Promise((r) => setTimeout(r, 400))
const dragged = JSON.parse(await evalJs("JSON.stringify({browserW:document.getElementById('browser').getBoundingClientRect().width,ratio:document.documentElement.dataset.splitRatio,contentW:document.getElementById('content').clientWidth})"))
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x - 200, y, button: 'left', buttons: 1, clickCount: 1 })
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x - 200, y, button: 'left', buttons: 1, clickCount: 2 })
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x - 200, y, button: 'left', buttons: 0, clickCount: 2 })
await new Promise((r) => setTimeout(r, 400))
const reset = JSON.parse(await evalJs("JSON.stringify({browserW:document.getElementById('browser').getBoundingClientRect().width,ratio:document.documentElement.dataset.splitRatio,contentW:document.getElementById('content').clientWidth})"))
console.log(JSON.stringify({ start: rect, dragged, reset }))
ws.close()
