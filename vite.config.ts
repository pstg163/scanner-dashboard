import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { normalizeBase } from './src/lib/base.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const base = normalizeBase(process.env.VITE_BASE_PATH || env.VITE_BASE_PATH)

  return {
    base,
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 41731,
      strictPort: true,
    },
    preview: {
      host: '0.0.0.0',
      port: 41731,
      strictPort: true,
    },
  }
})
