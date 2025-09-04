import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [
        wasm(),
      ],
      define: {
        'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      css: {
        postcss: './postcss.config.js',
      },
      server: {
        headers: {
          'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        }
      },
      build: { // Add this build configuration
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'), // Your main entry point
            sw: path.resolve(__dirname, 'sw.ts'), // Add sw.ts as a separate entry point
          },
          output: {
            entryFileNames: (chunkInfo) => {
              // This ensures sw.ts is output as sw.js
              if (chunkInfo.name === 'sw') {
                return '[name].js';
              }
              return 'assets/[name]-[hash].js';
            },
          },
        },
      },
    };
});
