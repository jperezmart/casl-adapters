import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 3200 },
  preview: { port: 3200 },
  plugins: [
    tanstackStart({
      // Readable server function URLs (`/_serverFn/getArticle`), which the
      // HTTP tests call. Without it, Start hashes the ids.
      serverFns: {
        generateFunctionId: ({ functionName }) =>
          functionName.replace(/_createServerFn_handler$/, ''),
      },
    }),
    react(),
  ],
});
