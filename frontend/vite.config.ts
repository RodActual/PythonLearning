import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pyodideVersion: string = JSON.parse(
  readFileSync(new URL('./node_modules/pyodide/package.json', import.meta.url), 'utf8'),
).version;

export default defineConfig({
  plugins: [react()],
  define: {
    __PYODIDE_VERSION__: JSON.stringify(pyodideVersion),
  },
  build: {
    // Firebase's Firestore SDK alone is ~600 kB; it's split into its own cached chunk.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Separate long-lived vendor chunks so app updates don't force re-downloading them.
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'firebase';
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/scheduler')) return 'react';
          return undefined;
        },
      },
    },
  },
});
