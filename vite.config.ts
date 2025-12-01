// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
//    base: '/expense-manager/'
// })


import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The PostCSS plugins are needed for Tailwind compilation
import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/expense-manager/',
  css: {
    postcss: {
      // Explicitly define and load the plugins here
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
  },
  // Ensure Vite knows about the .tsx extension for development
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});