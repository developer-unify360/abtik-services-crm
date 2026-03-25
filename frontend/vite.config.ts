import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Default to empty string for relative paths in production (behind Nginx)
  const apiBaseUrl = env.VITE_API_BASE_URL || ''

  return {
    base: apiBaseUrl ? (apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`) : '/',
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      hmr: {
        host: env.VITE_HMR_HOST || 'localhost',
        protocol: env.VITE_HMR_PROTOCOL || 'ws',
      },
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET || 'http://backend:8000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
        },
      },
    },
  }
})
