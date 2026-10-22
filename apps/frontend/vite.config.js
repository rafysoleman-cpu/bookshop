import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
      '@components': path.resolve(process.cwd(), './src/components'),
      '@pages': path.resolve(process.cwd(), './src/pages'),
      '@features': path.resolve(process.cwd(), './src/features'),
      '@hooks': path.resolve(process.cwd(), './src/hooks'),
      '@services': path.resolve(process.cwd(), './src/services'),
      '@store': path.resolve(process.cwd(), './src/store'),
      '@layouts': path.resolve(process.cwd(), './src/layouts'),
      '@utils': path.resolve(process.cwd(), './src/utils'),
      '@bookshop/shared/product': path.resolve(process.cwd(), '../../packages/shared/src/product.js')
    }
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        ws: true
      }
    }
  },
  preview: {
    port: 3001
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
