import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const useProxy = mode === 'development'

  const apiTarget = env.VITE_API_TARGET || process.env.VITE_API_TARGET || 'http://crm.abtikservices.in'

  console.log(`[vite] Mode: ${mode}, Using proxy: ${useProxy}`)

  const proxyConfig: Record<string, any> = {}

  if (useProxy) {
    proxyConfig['/api'] = {
      target: apiTarget,
      changeOrigin: true,
    }
  } else {
    proxyConfig['/api'] = {
      target: 'http://localhost',
      changeOrigin: true,
      bypass(req: any) {
        return undefined
      },
    }
  }

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      hmr: {
        host: env.VITE_HMR_HOST || 'localhost',
        protocol: env.VITE_HMR_PROTOCOL || 'ws',
      },
      proxy: proxyConfig,
    },
  }
})
