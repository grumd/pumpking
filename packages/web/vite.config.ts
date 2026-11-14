import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  worker: {
    plugins: () => [tsconfigPaths()],
  },
  server: {
    port: 3000,
    proxy: {
      '/trpc': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/results': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/admin/files': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: true,
    outDir: './build',
  },
});
