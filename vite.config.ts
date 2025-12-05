import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANTE: 'base: "./"' dice a Vite di cercare i file (js/css) nella cartella corrente
  // invece che alla radice del dominio. Questo risolve la pagina bianca su GitHub Pages.
  base: './',
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});