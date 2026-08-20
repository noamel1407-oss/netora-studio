import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        // Keeps the 3D stack out of the initial bundle so the page can paint
        // before three.js is parsed.
        manualChunks(id) {
          if (/node_modules[\\/](three|@react-three|three-stdlib)[\\/]/.test(id)) return 'three';
          return undefined;
        },
      },
    },
  },
});
