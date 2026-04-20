import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process?.env?.BASE_PATH || './',
  server: {
    port: 3000,
    host: true,
    cors: true,
    allowedHosts: ['*.8pi.me*', 'motelyjaml-pi.8pi.me'],
  },
  preview: {
    port: 3000,
    host: true,
  },
  optimizeDeps: {
    exclude: ['@aspect-build/bazel-lib'],
  },
  assetsInclude: ['**/*.wasm'],
  build: {
    target: 'esnext',
  },
  ssr: {
    noExternal: ['motion']
  }
})
