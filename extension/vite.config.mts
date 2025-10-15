/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    react()
  ],
  root: resolve(__dirname, 'src/ui'),
  publicDir: false,
  build: {
    outDir: resolve(__dirname, '../dist/extension/'),
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: {
        connect: resolve(__dirname, 'src/ui/connect.tsx'),
        status: resolve(__dirname, 'src/ui/status.tsx')
      },
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`
    },
    rollupOptions: {
      // React inclus dans le bundle pour l'extension
      output: {
        manualChunks: undefined, // Tout dans un seul fichier pour éviter les imports relatifs
        entryFileNames: '[name].js'
      }
    }
  }
});