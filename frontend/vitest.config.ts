import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Test config kept separate from vite.config.ts so the production build's
// type-check (tsc) doesn't trip over Vitest's bundled Vite types.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
