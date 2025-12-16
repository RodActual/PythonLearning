// frontend/vite.config.js

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const FLASK_SERVER_URL = 'http://127.0.0.1:5000'; 

export default defineConfig({
  plugins: [react()],
  
  build: {
    outDir: 'dist',
  },
  
  server: {
    proxy: {
      '/api': {
        target: FLASK_SERVER_URL,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
