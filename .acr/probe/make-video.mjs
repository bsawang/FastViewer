import { mkdirSync, writeFileSync } from 'node:fs'
import { argv } from 'node:process'

const port = argv[2] ?? '9341'
const outDir = argv[3] ?? 'E:/work/ai/FastViewer/.acr/fixtures/m3'
const seconds = Number(argv[4] ?? 6)

const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const target = targets.find((t) => t.url.includes('127.0.0.1'))
if (!target) {
  console.error('no guest target')
  process.exit(1)
}

const expression = `(async () => {
  const supported = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  const mime = supported.find((m) => MediaRecorder.isTypeSupported(m))
  if (!mime) return { error: 'no webm encoder' }
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 180
  const ctx = canvas.getContext('2d')
  const stream = canvas.captureStream(10)
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 200000 })
  const chunks = []
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
  const done = new Promise((resolve) => { rec.onstop = resolve })
  const start = performance.now()
  const draw = () => {
    const t = (performance.now() - start) / 1000
    ctx.fillStyle = '#101018'
    ctx.fillRect(0, 0, 320, 180)
    ctx.fillStyle = '#4c8bf5'
    ctx.fillRect((t * 40) % 280, 60, 40, 40)
    ctx.fillStyle = '#e6e6ea'
    ctx.font = '20px sans-serif'
    ctx.fillText(t.toFixed(1) + 's', 12, 28)
  }
  const timer = setInterval(draw, 100)
  draw()
  rec.start(200)
  await new Promise((r) => setTimeout(r, ${seconds * 1000}))
  clearInterval(timer)
  rec.stop()
  stream.getTracks().forEach((t) => t.stop())
  await done
  const blob = new Blob(chunks, { type: mime })
  const dataUrl = await new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(blob)
  })
  return { mime, size: blob.size, b64: dataUrl.slice(dataUrl.indexOf(',') + 1) }
})()`

const ws = new WebSocket(target.webSocketDebuggerUrl)
const result = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('timeout')), 60000)
  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: { expression, awaitPromise: true, returnByValue: true },
    }))
  })
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(String(event.data))
    if (msg.id !== 1) return
    clearTimeout(timer)
    if (msg.error) reject(new Error(JSON.stringify(msg.error)))
    else resolve(msg.result)
  })
  ws.addEventListener('error', reject)
})

ws.close()
const value = result?.result?.value
if (!value || value.error) {
  console.error('record failed', JSON.stringify(result))
  process.exit(1)
}
mkdirSync(outDir, { recursive: true })
const file = `${outDir}/clip.${value.mime.startsWith('video/mp4') ? 'mp4' : 'webm'}`
writeFileSync(file, Buffer.from(value.b64, 'base64'))
console.log(JSON.stringify({ file, mime: value.mime, size: value.size }))
