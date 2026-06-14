import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Vite 8 / rolldown requires manualChunks to be a function
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react'
            }
            if (id.includes('lucide') || id.includes('clsx')) {
              return 'vendor-ui'
            }
            if (id.includes('recharts') || id.includes('framer-motion')) {
              return 'vendor-charts'
            }
            if (id.includes('@tanstack')) {
              return 'vendor-query'
            }
          }
        },
      },
    },
  },
})
