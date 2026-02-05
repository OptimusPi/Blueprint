import { env } from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Manual motely-wasm setup (avoids CommonJS plugin issues)
    {
      name: 'motely-wasm-manual',
      configureServer(server) {
        const frameworkDir = path.join(process.cwd(), 'node_modules', 'motely-wasm', '_framework');
        if (!fs.existsSync(frameworkDir)) return;

        server.middlewares.use('/_framework', (req, res, next) => {
          const filePath = path.join(frameworkDir, req.url.split('?')[0]);
          if (!filePath.startsWith(frameworkDir)) return next();

          try {
            if (fs.statSync(filePath).isFile()) {
              res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
              res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
              const ext = path.extname(filePath);
              const types = { '.js': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json' };
              if (types[ext]) res.setHeader('Content-Type', types[ext]);
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          } catch { }
          next();
        });
      }
    }
  ],
  base: env.BASE_PATH || '/',
  server: {
    port: 3141,
    host: true,
    cors: true,
    allowedHosts: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['@aspect-build/bazel-lib'],
  },
  assetsInclude: ['**/*.wasm'],
  build: {
    target: 'esnext',
  },
})

