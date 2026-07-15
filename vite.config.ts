import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Base path resolution:
//   - dev:              '/' (Vite default)
//   - CI (GitHub Pages): '/jisr-overtime-planning/' (repo-name subpath)
//   - override:         set via VITE_BASE_PATH env var
const customBase = process.env.VITE_BASE_PATH
const isCI = process.env.GITHUB_ACTIONS === 'true'

export default defineConfig({
  plugins: [react()],
  base: customBase ?? (isCI ? '/jisr-overtime-planning/' : '/'),
  resolve: {
    alias: {
      // Shim @jisr-hr/ds-web → local DS mocks that mirror the real package API.
      // When the real package is available, remove this alias and install @jisr-hr/ds-web.
      '@jisr-hr/ds-web': resolve(__dirname, 'src/ds/index.ts'),
    },
  },
})
