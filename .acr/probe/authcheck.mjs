import { request } from 'node:http'

const list = await (await fetch('http://127.0.0.1:9341/json/list')).json()
const guest = list.find((t) => t.type === 'webview')
if (!guest) throw new Error('no webview target')
const url = new URL(guest.url)
const port = Number(url.port)
const token = url.searchParams.get('t')

function get(path, headers) {
  return new Promise((resolve, reject) => {
    const req = request(
      { host: '127.0.0.1', port, path, method: 'GET', headers },
      (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (c) => (body += c))
        res.on('end', () => {
          let code = ''
          try {
            code = JSON.parse(body).error.code
          } catch {
            code = ''
          }
          resolve(`${res.statusCode} ${code}`)
        })
      },
    )
    req.on('error', reject)
    req.end()
  })
}

const self = `127.0.0.1:${port}`
console.log('no-cookie      /api/dir ->', await get('/api/dir?path=E%3A%5C', { host: self }))
console.log('host-evil      /api/dir ->', await get('/api/dir?path=E%3A%5C', { host: 'evil.com' }))
console.log('origin-cross   /api/dir ->', await get('/api/dir?path=E%3A%5C', { host: self, cookie: `fv=${token}`, origin: 'https://evil.example' }))
console.log('origin-self    /assets/app.js ->', await get('/assets/app.js', { host: self, cookie: `fv=${token}`, origin: `http://${self}` }))
console.log('cookie-ok      /api/dir ->', await get('/api/dir?path=E%3A%5C', { host: self, cookie: `fv=${token}` }))
console.log('wrong-token    /?t=dead ->', await get('/?t=dead', { host: self }))
