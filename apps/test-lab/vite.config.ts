import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Minimal in-memory webhook sink so the Lab runs entirely on the Vite dev/preview server (single port).
const createWebhookMiddleware = () => {
  const parseBody = (req: any): Promise<any> => new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      const contentType = (req.headers['content-type'] || '') as string
      try {
        if (contentType.includes('application/json')) {
          resolve(raw ? JSON.parse(raw) : {})
          return
        }
        if (contentType.includes('application/x-www-form-urlencoded')) {
          const params = new URLSearchParams(raw)
          const obj: Record<string, string> = {}
          for (const [key, value] of params.entries()) obj[key] = value
          resolve(obj)
          return
        }
        resolve(raw)
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })

  let webhooks: any[] = []
  const MAX_WEBHOOKS = 50

  return {
    handle: (req: any, res: any, next: any) => {
      if (req.method === 'POST' && req.url.startsWith('/webhook')) {
        parseBody(req).then((body) => {
          const entry = {
            id: Date.now() + Math.random().toString(36).slice(2),
            timestamp: new Date().toISOString(),
            method: req.method,
            headers: req.headers,
            body,
            query: req.query
          }

          webhooks.unshift(entry)
          if (webhooks.length > MAX_WEBHOOKS) {
            webhooks.pop()
          }

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ status: 'received', id: entry.id }))
        }).catch((err) => {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Invalid webhook payload', message: err?.message }))
        })
        return
      }

      if (req.method === 'GET' && req.url.startsWith('/api/webhooks')) {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(webhooks))
        return
      }

      if (req.method === 'DELETE' && req.url.startsWith('/api/webhooks')) {
        webhooks = []
        res.statusCode = 204
        res.end()
        return
      }

      next()
    }
  }
}

const webhookPlugin = (): Plugin => ({
  name: 'lab-webhook-middleware',
  configureServer(server) {
    const middleware = createWebhookMiddleware()
    server.middlewares.use(middleware.handle)
  },
  configurePreviewServer(server) {
    const middleware = createWebhookMiddleware()
    server.middlewares.use(middleware.handle)
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    webhookPlugin(),
  ],
  server: {
    port: 4200,
    host: true,
  },
  preview: {
    port: 4200,
    host: true,
  }
})
