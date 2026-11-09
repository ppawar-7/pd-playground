import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/pd-playground/',
  server: {
    port: 5173,
  },
});
