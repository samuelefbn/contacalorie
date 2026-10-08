import { defineConfig } from 'vitest/config'

// Test delle regole Firestore: richiedono l'emulatore (vedi `npm run test:rules`).
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.emu.ts'],
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
})
