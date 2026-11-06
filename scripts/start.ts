import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const electronPath = require('electron') as string
const root = dirname(dirname(fileURLToPath(import.meta.url)))

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const child = spawn(electronPath, [root], { stdio: 'inherit', env })
child.on('close', (code) => process.exit(code ?? 0))
