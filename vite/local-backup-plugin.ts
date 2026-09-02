import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage } from 'node:http'
import type { Plugin } from 'vite'

const BACKUP_DIR = 'data'
const BACKUP_FILE = 'vov-backup.json'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

export function localBackupPlugin(): Plugin {
  return {
    name: 'vov-local-backup',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/__vov/backup' || req.method !== 'POST') {
          next()
          return
        }

        const send = (status: number, body: object) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(body))
        }

        try {
          const raw = await readBody(req)
          JSON.parse(raw)

          const dir = path.resolve(server.config.root, BACKUP_DIR)
          await fs.promises.mkdir(dir, { recursive: true })

          const filePath = path.join(dir, BACKUP_FILE)
          const tmpPath = `${filePath}.tmp`
          await fs.promises.writeFile(tmpPath, raw, 'utf8')
          await fs.promises.rename(tmpPath, filePath)

          send(200, { ok: true, path: `${BACKUP_DIR}/${BACKUP_FILE}` })
        } catch (err) {
          send(500, { ok: false, error: err instanceof Error ? err.message : String(err) })
        }
      })
    },
  }
}
