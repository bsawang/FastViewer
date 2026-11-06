import { readFileSync } from 'node:fs'
const cfg = 'E:/work/ai/FastViewer/.acr/userdata-m1.2/fastviewer-config.json'
const read = () => { try { return JSON.parse(readFileSync(cfg, 'utf8')).tileSize } catch { return null } }
const targets = await (await fetch('http://127.0.0.1:9341/json/list')).json()
const target = targets.find((t) => t.url.includes('127.0.0.1'))
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
const t0 = Date.now()
ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: "(()=>{const s=document.getElementById('tile-size');s.value='244';s.dispatchEvent(new Event('input',{bubbles:true}));return performance.now()})()", returnByValue: true } }))
while (Date.now() - t0 < 2000) {
  if (read() === 244) { console.log(`config tileSize=244 written ${Date.now() - t0}ms after dispatch`); ws.close(); process.exit(0) }
  await new Promise((r) => setTimeout(r, 5))
}
console.log('timeout'); ws.close()
