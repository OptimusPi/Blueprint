import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'wasm-mime',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.endsWith('.wasm')) res.setHeader('Content-Type', 'application/wasm');
          next();
        });
      }
    }
  ],
  base: process?.env?.BASE_PATH || './',
  server: {
    port: 3141,
    host: true,
    cors: true,
    allowedHosts: ['*.8pi.me*', 'motelyjaml-pi.8pi.me'],
  },
  preview: {
    port: 3000,
    host: true,
  },
  optimizeDeps: {
    exclude: ['motely-wasm'],
  },
  assetsInclude: ['**/*.wasm'],
  worker: {
    format: 'es',
  },
  build: {
    target: 'esnext',
  },
  ssr: {
    noExternal: ['motion']
  }
})
