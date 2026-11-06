import { readFileSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const cfg = 'E:/work/ai/FastViewer/.acr/userdata-m1.2/fastviewer-config.json'
const read = () => { try { return JSON.parse(readFileSync(cfg, 'utf8')).tileSize } catch { return null } }
const before = statSync(cfg).mtimeMs
const t0 = Date.now()
spawnSync(process.execPath, ['.acr/probe/cdp.mjs', '9341', 'eval-url', '127.0.0.1', "(()=>{const s=document.getElementById('tile-size');s.value='228';s.dispatchEvent(new Event('input',{bubbles:true}));return 1})()"], { cwd: 'E:/work/ai/FastViewer' })
for (let i = 0; i < 100; i += 1) {
  if (read() === 228 && statSync(cfg).mtimeMs > before) { console.log(`config tileSize=228 written ${Date.now() - t0}ms after dispatch`); process.exit(0) }
  await new Promise((r) => setTimeout(r, 5))
}
console.log('timeout')
