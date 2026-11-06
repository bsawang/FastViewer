import { writeFileSync } from 'node:fs'
import { argv } from 'node:process'

const [, , port, urlPart, out] = argv
if (!port || !urlPart || !out) {
  console.error('usage: node shot.mjs <debugPort> <matchUrlPart> <outFile>')
  process.exit(2)
}

const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const target = targets.find((item) => item.url.includes(urlPart))
if (!target) {
  console.error(`no target matching ${urlPart}`)
  process.exit(1)
}

const ws = new WebSocket(target.webSocketDebuggerUrl)
const result = await new Promise((resolve, reject) => {
  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ id: 1, method: 'Page.captureScreenshot', params: { format: 'png' } }))
  })
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id !== 1) return
    ws.close()
    if (msg.error) reject(new Error(msg.error.message))
    else resolve(msg.result)
  })
  ws.addEventListener('error', reject)
})

writeFileSync(out, Buffer.from(result.data, 'base64'))
console.log('saved', out)
