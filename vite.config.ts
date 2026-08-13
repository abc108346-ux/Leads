import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/overpass': {
          target: 'https://overpass-api.de',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/overpass/, '/api/interpreter')
        }
      }
    },
  };
});
