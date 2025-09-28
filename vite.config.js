import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/hockey-app/',
  plugins: [react()],
  // Optional: quiet HMR noise under subpath during dev
  // server: { hmr: { path: '/hockey-app/' } }
})
