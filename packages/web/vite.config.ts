import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  worker: {
    plugins: () => [tsconfigPaths()],
  },
  server: {
    port: 3000,
    proxy: {
      // Forward tRPC calls to the API so the web app works same-origin
      // (e.g. when accessed through a public tunnel like cloudflared).
      '/trpc': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Screenshot links (GET /results/:id/screenshot)
      '/results': {
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
