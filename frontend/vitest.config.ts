import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Node's built-in Web Storage defines a global localStorage that is undefined
// without --localstorage-file, and it shadows happy-dom's. Turning it off in the
// test workers leaves happy-dom's storage in place. Node versions without Web
// Storage don't know the flag, so it is passed only where Node lists it.
const disableNodeWebStorage = '--no-experimental-webstorage';
const workerExecArgv = process.allowedNodeEnvironmentFlags.has(disableNodeWebStorage)
  ? [disableNodeWebStorage]
  : [];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    poolOptions: {
      forks: { execArgv: workerExecArgv },
      threads: { execArgv: workerExecArgv },
    },
  },
});
