// frontend/vite.config.js

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const FLASK_SERVER_URL = 'http://127.0.0.1:5000'; 

export default defineConfig({
  plugins: [react()],
  
  // *** NEW CRITICAL CONFIGURATION: Explicitly set the project root ***
  // This tells Vite that its base directory for locating index.html is the frontend directory.
  root: './', 
  
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