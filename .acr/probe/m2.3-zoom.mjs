const PORT = 9341

const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const page = targets.find((t) => t.type === 'webview' && t.url.includes('127.0.0.1'))
if (!page) throw new Error('no webview target')

const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let id = 0
const send = (method, params) =>
  new Promise((resolve, reject) => {
    const myId = ++id
    const timer = setTimeout(() => reject(new Error(`${method} timeout`)), 15000)
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
const evalJs = async (expression) => {
  const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (res.result?.exceptionDetails) throw new Error(res.result.exceptionDetails.text)
  return res.result?.result?.value
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const stateExpr = `(() => {
  const img = document.getElementById('viewer-image')
  const stage = document.getElementById('viewer-stage')
  const m = getComputedStyle(img).transform
  const nums = m === 'none' ? [1, 0, 0] : m.slice(7, -1).split(',').map(Number)
  return {
    scale: m === 'none' ? 1 : nums[0],
    tx: m === 'none' ? 0 : nums[4],
    ty: m === 'none' ? 0 : nums[5],
    counter: document.getElementById('viewer-counter').textContent,
    barHidden: document.getElementById('viewer-zoom').hidden,
    fitActive: document.getElementById('zoom-fit').classList.contains('is-active'),
    actualActive: document.getElementById('zoom-actual').classList.contains('is-active'),
    stage: { w: stage.clientWidth, h: stage.clientHeight },
    natural: { w: img.naturalWidth, h: img.naturalHeight },
    item: document.querySelector('.fv-tile.is-current .fv-name')?.textContent ?? null,
  }
})()`

for (let i = 0; i < 60; i += 1) {
  const s = await evalJs(stateExpr)
  if (!s.barHidden && s.natural.w > 0) break
  await sleep(250)
}
let s0 = await evalJs(stateExpr)
console.log('initial', JSON.stringify(s0))

const rect = JSON.parse(
  await evalJs(`JSON.stringify(document.getElementById('viewer-stage').getBoundingClientRect().toJSON())`),
)
const cx = rect.x + rect.width / 2
const cy = rect.y + rect.height / 2

const wheel = async (deltaY) => {
  await evalJs(`document.getElementById('viewer-stage').dispatchEvent(
    new WheelEvent('wheel', { clientX: ${cx}, clientY: ${cy}, deltaY: ${deltaY}, bubbles: true, cancelable: true })
  )`)
  await sleep(150)
}

await wheel(-100)
const s1 = await evalJs(stateExpr)
console.log('wheel', JSON.stringify(s1))
console.log('wheelFactor', (s1.scale / s0.scale).toFixed(4), 'fitActive', s1.fitActive)

const clickButton = async (selector) => {
  await evalJs(`document.getElementById('${selector}').click()`)
  await sleep(150)
}

await clickButton('zoom-actual')
const s2 = await evalJs(stateExpr)
console.log('actual', JSON.stringify(s2))
console.log(
  'actualCentered',
  Math.abs(s2.tx - (s2.stage.w - s2.natural.w) / 2) < 1 && Math.abs(s2.ty - (s2.stage.h - s2.natural.h) / 2) < 1,
)

const pan = async (dx, dy) => {
  await evalJs(`(() => {
    const stage = document.getElementById('viewer-stage')
    stage.setPointerCapture = () => {}
    stage.releasePointerCapture = () => {}
    stage.hasPointerCapture = () => false
    const fire = (type, x, y, buttons) => stage.dispatchEvent(new PointerEvent(type, {
      pointerId: 1, pointerType: 'mouse', isPrimary: true, button: type === 'pointerup' ? 0 : 0,
      buttons, clientX: x, clientY: y, bubbles: true, cancelable: true
    }))
    fire('pointerdown', ${cx}, ${cy}, 1)
    fire('pointermove', ${cx + dx / 2}, ${cy + dy / 2}, 1)
    fire('pointermove', ${cx + dx}, ${cy + dy}, 1)
    fire('pointerup', ${cx + dx}, ${cy + dy}, 0)
  })()`)
  await sleep(200)
}

await pan(80, 50)
const s3 = await evalJs(stateExpr)
console.log('pan', JSON.stringify(s3), 'delta', s3.tx - s2.tx, s3.ty - s2.ty)

await clickButton('zoom-fit')
const s4 = await evalJs(stateExpr)
console.log('fit', JSON.stringify(s4))

await evalJs(`document.getElementById('viewer-stage').dispatchEvent(
  new MouseEvent('dblclick', { clientX: ${cx}, clientY: ${cy}, bubbles: true })
)`)
await sleep(200)
const s5 = await evalJs(stateExpr)
console.log('dblclick', JSON.stringify(s5))

await evalJs(`document.getElementById('viewer-hot-next').click()`)
await sleep(800)
const s6 = await evalJs(stateExpr)
console.log('small', JSON.stringify(s6))
console.log('smallFitActive', s6.fitActive, 'smallActualActive', s6.actualActive)

await clickButton('zoom-actual')
const s7 = await evalJs(stateExpr)
console.log('smallActual', JSON.stringify(s7))

const shot = await send('Page.captureScreenshot', { format: 'png' })
const fs = await import('node:fs')
fs.writeFileSync('.acr/probe/m2.3-zoom.png', Buffer.from(shot.result.data, 'base64'))
console.log('shot saved .acr/probe/m2.3-zoom.png')
ws.close()
