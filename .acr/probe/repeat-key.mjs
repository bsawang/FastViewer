import { argv } from 'node:process'

const [, , port, urlPart, key, countArg, code, vk] = argv
if (!port || !urlPart || !key) {
  console.error('usage: node repeat-key.mjs <debugPort> <matchUrlPart> <key> <count> [code] [vk]')
  process.exit(2)
}
const count = Number(countArg ?? 1)

const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const target = targets.find((item) => item.url.includes(urlPart))
if (!target) {
  console.error(`no target matching ${urlPart}`)
  process.exit(1)
}

const ws = new WebSocket(target.webSocketDebuggerUrl)
let id = 0
const send = (method, params) =>
  new Promise((resolve, reject) => {
    const current = ++id
    const onMessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id !== current) return
      ws.removeEventListener('message', onMessage)
      if (msg.error) reject(new Error(msg.error.message))
      else resolve(msg.result)
    }
    ws.addEventListener('message', onMessage)
    ws.send(JSON.stringify({ id: current, method, params }))
  })

await new Promise((resolve) => ws.addEventListener('open', resolve))
const base = {
  key,
  code: code ?? key,
  windowsVirtualKeyCode: Number(vk ?? 39),
  nativeVirtualKeyCode: Number(vk ?? 39),
}
for (let i = 0; i < count; i += 1) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', ...base })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
}
console.log(`sent ${key} x${count}`)
ws.close()
