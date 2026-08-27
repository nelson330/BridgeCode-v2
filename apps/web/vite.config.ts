import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@web': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, '../../shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api/ws': {
        target: 'ws://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: '../../dist/web',
    emptyOutDir: true,
  },
})
