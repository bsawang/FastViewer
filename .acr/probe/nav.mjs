import { argv } from 'node:process'

const [, , port, urlPart, target] = argv
if (!port || !urlPart || !target) {
  console.error('usage: node nav.mjs <debugPort> <matchUrlPart> <targetUrl>')
  process.exit(2)
}

const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const page = targets.find((item) => item.url.includes(urlPart))
if (!page) {
  console.error(`no target matching ${urlPart}`)
  process.exit(1)
}

const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('timeout')), 10000)
  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ id: 1, method: 'Page.navigate', params: { url: target } }))
  })
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id !== 1) return
    clearTimeout(timer)
    ws.close()
    resolve()
  })
  ws.addEventListener('error', reject)
})
console.log('navigated', target)
