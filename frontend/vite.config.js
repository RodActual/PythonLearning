import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Must match the port the Flask app runs on locally
const FLASK_SERVER_URL = 'http://127.0.0.1:5000'; 

export default defineConfig({
  plugins: [react()],
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
