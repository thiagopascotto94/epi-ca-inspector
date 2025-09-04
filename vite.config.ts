import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [
        wasm(),
        topLevelAwait()
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
      build: {
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
            sw: path.resolve(__dirname, 'sw.ts'),
          },
          output: {
            entryFileNames: (chunkInfo) => {
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
