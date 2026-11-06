const targets = await (await fetch('http://127.0.0.1:9341/json/list')).json()
const guestTarget = targets.find((t) => t.type === 'webview' && t.url.includes('127.0.0.1'))
if (!guestTarget) throw new Error('missing guest')
const ws = new WebSocket(guestTarget.webSocketDebuggerUrl)
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
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data)
  if (msg.method === 'Runtime.consoleAPICalled') {
    console.log('console:', msg.params.args.map((a) => a.value ?? a.description).join(' '))
  }
})
await send('Runtime.enable', {})
const evalJs = async (expression) => {
  const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (res.result?.exceptionDetails) throw new Error(res.result.exceptionDetails.text)
  return res.result?.result?.value
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const state = async () =>
  evalJs(`(() => {
    const img = document.getElementById('viewer-image')
    const m = getComputedStyle(img).transform
    const n = m === 'none' ? [1, 0, 0] : m.slice(7, -1).split(',').map(Number)
    return JSON.stringify({
      counter: document.getElementById('viewer-counter').textContent,
      scale: n[0],
      actual: document.getElementById('zoom-actual').classList.contains('is-active'),
      fit: document.getElementById('zoom-fit').classList.contains('is-active'),
      modalHidden: document.getElementById('fs-modal').hidden,
      fsCounter: document.getElementById('fs-counter').textContent,
    })
  })()`).then(JSON.parse)

const clickTile = async (name) =>
  evalJs(`(() => {
    const tile = [...document.querySelectorAll('.fv-tile')].find((t) => t.querySelector('.fv-name')?.textContent === ${JSON.stringify(name)})
    tile?.click()
    return !!tile
  })()`)

await clickTile('返回上级')
await sleep(1200)
console.log('m2.3 tile', await clickTile('m2.3'))
await sleep(1500)
console.log('after-nav', await state())

await evalJs(`document.getElementById('zoom-actual').click()`)
await sleep(300)
console.log('after-actual', await state())

await evalJs(`(() => {
  const stage = document.getElementById('viewer-stage')
  stage.setPointerCapture = () => {}
  stage.releasePointerCapture = () => {}
  stage.hasPointerCapture = () => false
  const r = stage.getBoundingClientRect()
  const x = r.left + r.width / 2, y = r.top + r.height / 2
  const fire = (type, px, py, buttons) => stage.dispatchEvent(new PointerEvent(type, {
    pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0,
    buttons, clientX: px, clientY: py, bubbles: true, cancelable: true
  }))
  fire('pointerdown', x, y, 1)
  fire('pointerup', x, y, 0)
})()`)
await sleep(700)
console.log('modal-open', await state())

for (let i = 0; i < 3; i += 1) {
  await evalJs(`document.getElementById('fs-next').click()`)
  await sleep(800)
  console.log(`after-next-${i + 1}`, await state())
}

ws.close()
