import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process?.env?.BASE_PATH || './',
  resolve: {
    alias: {
      'next/navigation': path.resolve(process.cwd(), 'src/mocks/next-navigation.ts'),
    },
  },
  server: {
    port: 3000,
    host: true,
    cors: true,
    allowedHosts: ['*.8pi.me*', 'motelyjaml-pi.8pi.me'],
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    }
  },
  preview: {
    port: 3000,
    host: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    }
  },
  optimizeDeps: {
    exclude: ['@aspect-build/bazel-lib'],
  },
  assetsInclude: ['**/*.wasm'],
  build: {
    target: 'esnext',
  },
  ssr: {
    noExternal: ['nextstepjs', 'motion']
  }
})
