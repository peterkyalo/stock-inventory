import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error, trying fallback port...');
            // If connection fails, try the fallback port
            const fallbackProxy = require('http-proxy-middleware').createProxyMiddleware({
              target: 'http://127.0.0.1:3002',
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, '/api')
            });
            fallbackProxy(req, res);
          });
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});