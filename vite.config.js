import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readdirSync } from 'fs';

// Helper to get all HTML files in src/pages
const getPagesEntries = () => {
  const pagesDir = resolve(__dirname, 'src/pages');
  const entries = {};

  try {
    const files = readdirSync(pagesDir);
    files.forEach(file => {
      if (file.endsWith('.html')) {
        const name = file.replace('.html', '');
        entries[name] = resolve(pagesDir, file);
      }
    });
  } catch (e) {
    console.error('Pages directory not found', e);
  }

  return entries;
};

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        ...getPagesEntries()
      }
    }
  }
});