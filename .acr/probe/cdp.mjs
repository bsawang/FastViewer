import { argv } from 'node:process'

const [, , portArg, mode, ...rest] = argv
if (!portArg) {
  console.error('usage: node cdp.mjs <port> [list | eval <expr> | eval-title <title> <expr> | eval-url <substr> <expr> | eval-reduced <expr>]')
  process.exit(2)
}

const targets = await (await fetch(`http://127.0.0.1:${portArg}/json/list`)).json()
if (mode === 'list' || !mode) {
  for (const t of targets) console.log(`${t.type}\t${t.title}\t${t.url}`)
  process.exit(0)
}

let title = null
let urlPart = null
let expr = null
if (mode === 'eval') expr = rest.join(' ')
else if (mode === 'eval-title') {
  title = rest[0]
  expr = rest.slice(1).join(' ')
} else if (mode === 'eval-url') {
  urlPart = rest[0]
  expr = rest.slice(1).join(' ')
} else if (mode === 'eval-reduced') {
  urlPart = null
  expr = rest.join(' ')
} else {
  console.error(`unknown mode: ${mode}`)
  process.exit(2)
}

const target = title
  ? targets.find((t) => t.type === 'page' && t.title.includes(title))
  : urlPart
    ? targets.find((t) => t.url.includes(urlPart))
    : targets.find((t) => t.type === 'page')

if (!target) {
  console.error(`no target matching ${title ?? urlPart ?? '<any>'}`)
  process.exit(1)
}

const ws = new WebSocket(target.webSocketDebuggerUrl)
const result = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('timeout')), 20000)
  let nextId = 1
  const evaluate = () => {
    ws.send(
      JSON.stringify({
        id: 3,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true, awaitPromise: true },
      }),
    )
  }
  ws.addEventListener('open', () => {
    if (mode === 'eval-reduced') {
      ws.send(
        JSON.stringify({
          id: 1,
          method: 'Emulation.setEmulatedMedia',
          params: { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] },
        }),
      )
    } else {
      evaluate()
    }
  })
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id === 1) {
      evaluate()
      return
    }
    if (msg.id !== 3) return
    clearTimeout(timer)
    ws.close()
    resolve(msg)
  })
  ws.addEventListener('error', reject)
})

if (result.error) console.error(JSON.stringify(result.error))
else if (result.result?.exceptionDetails) console.error(JSON.stringify(result.result.exceptionDetails))
else console.log(JSON.stringify(result.result?.result?.value))
