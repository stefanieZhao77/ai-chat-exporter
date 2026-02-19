import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [
    crx({ manifest }),
  ],
  build: {
    rollupOptions: {
      input: {
        background: 'background.js',
        popup: 'popup/popup.html',
        options: 'options/options.html',
      },
    },
  },
});
