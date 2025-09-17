import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // IMPORTANT: set this to your repo name so assets load on Pages
  base: '/hockey-app/',
})
