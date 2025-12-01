import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // Importar 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Alias @ para src
    },
  },
})
