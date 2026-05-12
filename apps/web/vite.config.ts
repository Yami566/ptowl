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
        // Function form — Rollup's tightened TS types in newer versions
        // reject the object literal form when type inference is ambiguous.
        // Function form is universally supported and forward-compatible.
        manualChunks(id) {
          if (id.includes('node_modules/@fullcalendar/')) return 'calendar';
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router/') ||
            id.includes('node_modules/react-router-dom/')
          ) {
            return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
});
