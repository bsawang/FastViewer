import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const PORT = 9341
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const guestTarget = targets.find((t) => t.type === 'webview' && t.url.includes('127.0.0.1'))
const shellTarget = targets.find((t) => t.url.startsWith('file://'))
if (!guestTarget || !shellTarget) throw new Error('missing targets')

async function connect(target) {
  const ws = new WebSocket(target.webSocketDebuggerUrl)
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
  return { ws, send, evalJs }
}

const guest = await connect(guestTarget)
const shell = await connect(shellTarget)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const rect = () =>
  execFileSync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', '.acr/probe/window.ps1', '-Action', 'rect'],
    { encoding: 'utf8' },
  ).trim()

const stateExpr = `(() => {
  const img = document.getElementById('viewer-image')
  const stage = document.getElementById('viewer-stage')
  const m = getComputedStyle(img).transform
  const n = m === 'none' ? [1, 0, 0] : m.slice(7, -1).split(',').map(Number)
  const fimg = document.getElementById('fs-image')
  const fm = getComputedStyle(fimg).transform
  const fn = fm === 'none' ? [1, 0, 0] : fm.slice(7, -1).split(',').map(Number)
  const modal = document.getElementById('fs-modal')
  const style = getComputedStyle(modal)
  return JSON.stringify({
    viewerScale: n[0],
    viewerTx: n[4],
    viewerTy: n[5],
    viewerActual: document.getElementById('zoom-actual').classList.contains('is-active'),
    viewerCounter: document.getElementById('viewer-counter').textContent,
    viewerItem: document.querySelector('.fv-tile.is-current .fv-name')?.textContent ?? null,
    modalHidden: modal.hidden,
    modal: {
      background: style.backgroundColor,
      backdrop: style.backdropFilter,
      chromeHidden: modal.classList.contains('fv-fs-modal--chrome-hidden'),
    },
    fsItem: document.getElementById('fs-name').textContent,
    fsCounter: document.getElementById('fs-counter').textContent,
    fsScale: fn[0],
    fsTx: fn[4],
    fsTy: fn[5],
    fsFitActive: document.getElementById('fs-zoom-fit').classList.contains('is-active'),
    fsActualActive: document.getElementById('fs-zoom-actual').classList.contains('is-active'),
    fsDetailHidden: document.getElementById('fs-detail').hidden,
    fsInfoHidden: document.getElementById('fs-info').hidden,
    fsStage: { w: document.getElementById('fs-stage').clientWidth, h: document.getElementById('fs-stage').clientHeight },
    fsNatural: { w: fimg.naturalWidth, h: fimg.naturalHeight },
    dataFullscreen: document.documentElement.dataset.fullscreen,
  })
})()`

const state = async () => JSON.parse(await guest.evalJs(stateExpr))
const barVisible = async () => shell.evalJs(`document.querySelector('#bar').offsetParent !== null`)

const pointer = async (selector, dx = 0, dy = 0, hold = 40) => {
  await guest.evalJs(`(() => {
    const stage = document.getElementById('${selector}')
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
    if (${dx} || ${dy}) {
      fire('pointermove', x + ${dx} / 2, y + ${dy} / 2, 1)
      fire('pointermove', x + ${dx}, y + ${dy}, 1)
    }
    fire('pointerup', x + ${dx}, y + ${dy}, 0)
  })()`)
  await sleep(hold)
}

const key = async (value) => {
  await guest.evalJs(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(value)}, bubbles: true, cancelable: true }))`)
  await sleep(400)
}

for (let i = 0; i < 60; i += 1) {
  const s = await state()
  if (!s.viewerCounter.includes('·') && s.viewerCounter) break
  await sleep(250)
}
await sleep(600)
const rectBefore = rect()
const barBefore = await barVisible()
await guest.evalJs(`document.getElementById('zoom-actual').click()`)
await sleep(300)
const beforeZoom = await state()
console.log('resident-before', JSON.stringify(beforeZoom), 'bar', barBefore, 'rect', rectBefore)

// click image -> modal opens after 250 ms click delay
await pointer('viewer-stage', 0, 0, 700)
const opened = await state()
const barOpened = await barVisible()
const rectOpened = rect()
console.log('click-open', JSON.stringify(opened), 'bar', barOpened, 'rect', rectOpened)

// close with floating close button, resident zoom must stay 1:1
await guest.evalJs(`document.getElementById('fs-close').click()`)
await sleep(400)
const afterClose = await state()
console.log('close-button', JSON.stringify(afterClose), 'bar', await barVisible(), 'rect', rect())

// F opens again
await key('f')
const openedF = await state()
console.log('F-open', JSON.stringify(openedF), 'bar', await barVisible(), 'rect', rect())

// arrows: 2 items, next from big -> small, next again wraps to big
await guest.evalJs(`document.getElementById('fs-next').click()`)
await sleep(500)
const next1 = await state()
await guest.evalJs(`document.getElementById('fs-next').click()`)
await sleep(500)
const next2 = await state()
console.log('arrow-next', next1.fsItem, next1.fsCounter, '->', next2.fsItem, next2.fsCounter, 'viewerNow', next2.viewerItem)

// detail close leaves info, reopen via info
await guest.evalJs(`document.getElementById('fs-detail-close').click()`)
await sleep(200)
const detailClosed = await state()
await guest.evalJs(`document.getElementById('fs-info').click()`)
await sleep(200)
const detailReopened = await state()
console.log('detail', detailClosed.fsDetailHidden, detailClosed.fsInfoHidden, '->', detailReopened.fsDetailHidden, detailReopened.fsInfoHidden)

// modal 1:1 button
await guest.evalJs(`document.getElementById('fs-zoom-actual').click()`)
await sleep(200)
const fsActual = await state()
console.log(
  'fs-actual',
  fsActual.fsScale,
  fsActual.fsActualActive,
  fsActual.fsFitActive,
  'centered',
  Math.abs(fsActual.fsTx - (fsActual.fsStage.w - fsActual.fsNatural.w) / 2) < 1 &&
    Math.abs(fsActual.fsTy - (fsActual.fsStage.h - fsActual.fsNatural.h) / 2) < 1,
)

// idle chrome hide after 2.5 s, move wakes
await sleep(3000)
const idle = await state()
await guest.evalJs(`document.getElementById('fs-modal').dispatchEvent(new PointerEvent('pointermove', { bubbles: true }))`)
await sleep(200)
const woke = await state()
console.log('idle', idle.modal.chromeHidden, '-> woke', woke.modal.chromeHidden)

const shot = await guest.send('Page.captureScreenshot', { format: 'png' })
writeFileSync('.acr/probe/m2.4-modal.png', Buffer.from(shot.result.data, 'base64'))

// Esc closes only modal; viewer keeps current item and its zoom
const beforeEsc = await state()
await key('Escape')
const closedEsc = await state()
console.log(
  'esc',
  JSON.stringify({ modalHidden: closedEsc.modalHidden, viewerItem: closedEsc.viewerItem, viewerScale: closedEsc.viewerScale }),
  'wasViewerScale',
  beforeEsc.viewerScale,
  'bar',
  await barVisible(),
  'rect',
  rect(),
)

// second Esc is a no-op
await key('Escape')
console.log('esc-again modalHidden', (await state()).modalHidden)

// drag on resident viewer must not open the modal
await pointer('viewer-stage', 80, 40, 600)
console.log('drag-no-open modalHidden', (await state()).modalHidden)

// video: navigate to m3 and verify click / F do nothing
await guest.evalJs(`(() => {
  const tile = [...document.querySelectorAll('.fv-tile')].find((t) => t.querySelector('.fv-name')?.textContent === '返回上级')
  tile?.click()
})()`)
await sleep(1200)
await guest.evalJs(`(() => {
  const tile = [...document.querySelectorAll('.fv-tile')].find((t) => t.querySelector('.fv-name')?.textContent === 'm3')
  tile?.click()
})()`)
await sleep(1500)
const videoState = await guest.evalJs(`(() => {
  const v = document.getElementById('viewer-video')
  return JSON.stringify({
    videoVisible: !v.hidden,
    src: v.currentSrc.includes('clip.mp4') || v.currentSrc.includes('sample.mp4'),
    counter: document.getElementById('viewer-counter').textContent,
    modalHidden: document.getElementById('fs-modal').hidden,
  })
})()`)
await pointer('viewer-stage', 0, 0, 600)
const afterVideoClick = await state()
await key('f')
const afterVideoF = await state()
console.log('video', videoState, 'clickModalHidden', afterVideoClick.modalHidden, 'FModalHidden', afterVideoF.modalHidden)
guest.ws.close()
shell.ws.close()
