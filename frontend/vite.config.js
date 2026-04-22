import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(), tailwindcss(),
  ],
  server: {
    fs: {
      allow: ['..'],
    },
    allowedHosts: [
      'localhost',
      '6432-2a02-6ea0-c90a-2-00-2.ngrok-free.app',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
