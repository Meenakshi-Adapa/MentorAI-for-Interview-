import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // This forces the build to target a modern browser environment
    // that supports import.meta.
    target: 'esnext'
  }
})

