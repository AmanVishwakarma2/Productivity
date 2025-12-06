import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'https://productivity-backend-mq31.onrender.com',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
