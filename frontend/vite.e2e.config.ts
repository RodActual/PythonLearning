// Build used by the Playwright tests: identical to the real app, except Firebase is
// replaced with in-memory test doubles (e2e/mocks) so tests need no network or accounts.
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';
import base from './vite.config';

const mock = (name: string) => fileURLToPath(new URL(`./e2e/mocks/${name}.ts`, import.meta.url));

export default mergeConfig(base, {
  resolve: {
    alias: {
      'firebase/app-check': mock('app-check'),
      'firebase/app': mock('app'),
      'firebase/auth': mock('auth'),
      'firebase/firestore': mock('firestore'),
    },
  },
  build: { outDir: 'dist-e2e' },
});
