import { argv } from 'node:process'

const [, , port, urlPart, filePath] = argv
if (!port || !urlPart || !filePath) {
  console.error('usage: node drag.mjs <debugPort> <matchUrlPart> <filePath>')
  process.exit(2)
}

const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const target = targets.find((item) => item.url.includes(urlPart))
if (!target) {
  console.error(`no target matching ${urlPart}`)
  process.exit(1)
}

const data = {
  items: [],
  files: [filePath],
  dragOperationsMask: 1,
}

const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('timeout')), 15000)
  ws.addEventListener('open', () => {
    ws.send(
      JSON.stringify({
        id: 1,
        method: 'Input.dispatchDragEvent',
        params: { type: 'dragEnter', x: 600, y: 300, data },
      }),
    )
  })
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id === 1) {
      ws.send(
        JSON.stringify({
          id: 2,
          method: 'Input.dispatchDragEvent',
          params: { type: 'drop', x: 600, y: 300, data },
        }),
      )
      return
    }
    if (msg.id !== 2) return
    clearTimeout(timer)
    ws.close()
    resolve(msg)
  })
  ws.addEventListener('error', reject)
})

console.log('dropped', filePath)
