import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  const apiTarget = env.VITE_API_TARGET || process.env.VITE_API_TARGET || 'http://crm.abtikservices.in'

  if (!env.VITE_API_TARGET && !process.env.VITE_API_TARGET) {
    console.warn('[vite] VITE_API_TARGET is unset; using default:', apiTarget)
  }

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      hmr: {
        host: env.VITE_HMR_HOST || 'crm.abtikservices.in',
        protocol: env.VITE_HMR_PROTOCOL || 'wss',
      },
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
