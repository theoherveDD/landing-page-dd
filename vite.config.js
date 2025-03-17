import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/landing-page-dd/', // spécifie le chemin de base de ton projet
  plugins: [react()],
});