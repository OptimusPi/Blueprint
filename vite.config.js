import { env } from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      'next/navigation': path.resolve(__dirname, 'src/mocks/next-navigation.ts'),
    },
  },
  base: env.BASE_PATH || './',
  server: {
    port: 3141,
    host: true,
    cors: true,
    allowedHosts: ['*.8pi.me*', 'motelyjaml-pi.8pi.me']
  },
  optimizeDeps: {
    exclude: ['@aspect-build/bazel-lib', 'motely-wasm'],
  },
  build: {
    target: 'esnext',
  },
})

