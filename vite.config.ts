import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync, unlinkSync } from 'fs'
import { resolve } from 'path'

function fileWriterPlugin(): Plugin {
  return {
    name: 'file-writer',
    configureServer(server) {
      server.middlewares.use('/api/write-file', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const { filename, content } = JSON.parse(body) as { filename: string; content: string };
            const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            writeFileSync(resolve(process.cwd(), safeName), content, 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(e) }));
          }
        });
      });

      server.middlewares.use('/api/delete-file', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const { filename } = JSON.parse(body) as { filename: string };
            const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            unlinkSync(resolve(process.cwd(), safeName));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          } catch {
            // File may not exist — not an error
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), fileWriterPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
})
