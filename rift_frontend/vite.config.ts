import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        // Use environment variable or fallback to localhost
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => {
          // Strip /api prefix - backend doesn't expect it
          const newPath = path.replace(/^\/api/, '');
          console.log(`Proxying ${path} -> ${newPath}`);
          return newPath;
        },
        secure: false, // Set to false for localhost, true for https
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (_, req) => {
            console.log('Proxying request:', req.method, req.url);
          });
        }
      }
    }
  }
})
