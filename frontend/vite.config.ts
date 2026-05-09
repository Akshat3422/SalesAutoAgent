import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        // target: 'https://duplicate-gauze-explain.ngrok-free.dev',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
