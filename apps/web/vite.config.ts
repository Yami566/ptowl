import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // SECURITY: Never expose source maps in production
    target: 'es2020', // Browser compat: Chrome 80+, Safari 14+, Firefox 80+
    rollupOptions: {
      output: {
        manualChunks: {
          calendar: [
            '@fullcalendar/core',
            '@fullcalendar/react',
            '@fullcalendar/daygrid',
            '@fullcalendar/timegrid',
            '@fullcalendar/interaction',
          ],
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
