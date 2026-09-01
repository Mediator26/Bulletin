import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Contrainte absolue (§2.3) : aucun CDN, aucune ressource externe.
// Tout est inline, sinon l'outil ne fonctionne pas hors ligne en file://.
export default defineConfig({
  base: './',
  plugins: [svelte(), viteSingleFile()],
  define: {
    __VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    reportCompressedSize: false,
  },
});
