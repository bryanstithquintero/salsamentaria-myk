import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En producción la app se publica en GitHub Pages bajo /salsamentaria-myk/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/salsamentaria-myk/' : '/',
  plugins: [react()],
  server: { port: 5173 },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        // Separa librerías grandes en archivos propios para aprovechar la caché del navegador.
        // (Chart.js no se agrupa aquí: se carga solo cuando se abre una pantalla con gráficas).
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.js',
    css: false,
  },
}));
