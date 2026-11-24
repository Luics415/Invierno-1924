import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    cssTarget: 'chrome90',
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /node_modules[\\/](react|react-dom|scheduler|zustand)/,
              priority: 20,
            },
            {
              name: 'vendor-icons',
              test: /node_modules[\\/]lucide-react/,
              priority: 15,
            },
            {
              name: 'case-data',
              test: /src[\\/]data[\\/](suspectsDirectory|storyDays)/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
