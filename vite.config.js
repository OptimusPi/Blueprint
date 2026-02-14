import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process?.env?.BASE_PATH || '/Blueprint/',
  resolve: {
<<<<<<< Updated upstream
    alias: [
      // Mock Next.js navigation imports that nextstepjs might try to access
      {
        find: 'next/navigation',
        replacement: path.join(process.cwd(), 'src/mocks/next-navigation.ts'),
      },
    ]
=======
    alias: {
      'next/navigation': path.resolve(__dirname, 'src/mocks/next-navigation.ts'),
    },
  },
  base: env.BASE_PATH || './',
  server: {
    port: 3141,
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
    port: 3141,
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
>>>>>>> Stashed changes
  },
  ssr: {
    noExternal: ['nextstepjs', 'motion']
  }
})
