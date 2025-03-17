import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/landing-page-dd/', // Assurez-vous que ce chemin est correct pour ton projet
  plugins: [react()],
});