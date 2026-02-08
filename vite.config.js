import { env } from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import motelyWasm from 'motely-wasm/vite-plugin'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    motelyWasm(),
  ],
  base: env.BASE_PATH || './',
  server: {
    port: 3141,
    host: true,
    cors: true,
    allowedHosts: true,
  },
  optimizeDeps: {
    exclude: ['@aspect-build/bazel-lib'],
  },
  assetsInclude: ['**/*.wasm'],
  build: {
    target: 'esnext',
  },
})

