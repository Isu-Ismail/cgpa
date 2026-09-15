import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    basicSsl(),
    svelte({
      configFile: './svelte.config.js'
    }),
    tailwindcss()
  ]
});
