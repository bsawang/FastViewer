import { writeFileSync } from 'node:fs'
import { argv } from 'node:process'

const [, , port, urlPart, out] = argv
if (!port || !urlPart || !out) {
  console.error('usage: node shot-retry.mjs <debugPort> <matchUrlPart> <outFile>')
  process.exit(2)
}

async function capture() {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const target = targets.find((item) => item.url.includes(urlPart))
  if (!target) throw new Error(`no target matching ${urlPart}`)
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), 15000)
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }))
    })
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id === 1) {
        setTimeout(() => {
          ws.send(JSON.stringify({ id: 2, method: 'Page.captureScreenshot', params: { format: 'png' } }))
        }, 300)
      }
      if (msg.id !== 2) return
      clearTimeout(timer)
      ws.close()
      if (msg.error) reject(new Error(msg.error.message))
      else resolve(msg.result)
    })
    ws.addEventListener('error', reject)
  })
  writeFileSync(out, Buffer.from(result.data, 'base64'))
  console.log('saved', out)
}

for (let attempt = 1; attempt <= 4; attempt += 1) {
  try {
    await capture()
    process.exit(0)
  } catch (error) {
    console.error(`attempt ${attempt} failed: ${error instanceof Error ? error.message : error}`)
    await new Promise((resolve) => setTimeout(resolve, 800))
  }
}
process.exit(1)
