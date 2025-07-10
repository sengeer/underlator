import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { lingui } from '@lingui/vite-plugin';

export default defineConfig({
  base: './',
  publicDir: 'public',
  plugins: [
    react({
      babel: {
        plugins: ['@lingui/babel-plugin-lingui-macro'],
      },
    }),
    lingui(),
  ],
  server: {
    port: 8000,
    strictPort: true,
    open: true,
  },
});
