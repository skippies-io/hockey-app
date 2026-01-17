import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/hockey-app/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
  server: {
    hmr: { path: '/hockey-app/' },
    allowedHosts: true,      // ← allow all external tunneling hosts
    host: true,               // ← allow LAN access + tunnels
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
