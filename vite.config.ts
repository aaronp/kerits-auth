import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { bufferBase64urlPolyfillPlugin } from './vite-buffer-polyfill-plugin';
import { patchBufferModulePlugin } from './vite-patch-buffer-module';

export default defineConfig({
  plugins: [
    patchBufferModulePlugin(),
    bufferBase64urlPolyfillPlugin(),
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util'],
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      fs: path.resolve(__dirname, './src/lib/fs-stub.ts'),
      path: path.resolve(__dirname, './src/lib/path-stub.ts'),
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    dedupe: ['react', 'react-dom', 'buffer'],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    commonjsOptions: { transformMixedEsModules: true },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
});
