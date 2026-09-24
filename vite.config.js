import { defineConfig } from 'vite';

// base './' makes the build work on GitHub Pages under any repo name.
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
});
