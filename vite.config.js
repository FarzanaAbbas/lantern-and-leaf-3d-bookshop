import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800, // three.js alone is ~650 kB minified
    rollupOptions: {
      output: {
        // keep three.js in its own long-cached chunk
        manualChunks: {
          three: ['three'],
          react: ['react', 'react-dom', '@react-three/fiber', 'motion'],
        },
      },
    },
  },
})
