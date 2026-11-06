import { argv } from 'node:process'

const [, , port, urlPart, deltaY, countArg] = argv
if (!port || !urlPart || !deltaY) {
  console.error('usage: node wheel.mjs <debugPort> <matchUrlPart> <deltaY> [count]')
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
const result = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('timeout')), 20000)
  let nextId = 1
  const sendWheel = () => {
    if (nextId > count) {
      ws.send(
        JSON.stringify({
          id: 999,
          method: 'Runtime.evaluate',
          params: {
            expression:
              "JSON.stringify({tile:document.documentElement.dataset.tileSize,scale:visualViewport.scale})",
            returnByValue: true,
          },
        }),
      )
      return
    }
    ws.send(
      JSON.stringify({
        id: nextId,
        method: 'Input.dispatchMouseEvent',
        params: {
          type: 'mouseWheel',
          x: 700,
          y: 300,
          deltaX: 0,
          deltaY: Number(deltaY),
          modifiers: 2,
        },
      }),
    )
    nextId += 1
  }
  ws.addEventListener('open', () => {
    ws.send(
      JSON.stringify({
        id: 0,
        method: 'Runtime.evaluate',
        params: { expression: 'document.getElementById("wall").getBoundingClientRect().toJSON()', returnByValue: true },
      }),
    )
  })
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id === 0) {
      const rect = msg.result?.result?.value
      if (!rect || rect.width < 100) reject(new Error('wall not measurable'))
      sendWheel()
      return
    }
    if (msg.id === 999) {
      clearTimeout(timer)
      ws.close()
      resolve(msg.result?.result?.value)
      return
    }
    if (msg.id >= 1 && msg.id < 999) {
      setTimeout(sendWheel, 30)
    }
  })
  ws.addEventListener('error', reject)
})

console.log(result)
