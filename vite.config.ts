import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Politique de sécurité du contenu du fichier construit (§2.3, C10).
 *
 * La page n'a le droit de rien charger ni de rien envoyer : ni requête réseau,
 * ni image distante, ni formulaire. D'une part, un paquet compromis qui
 * glisserait du code dans le build ne pourrait pas expédier discrètement les
 * données des élèves ; d'autre part, la règle « aucune ressource externe » est
 * vérifiée par le navigateur lui-même — une dépendance qui chargerait quelque
 * chose échoue visiblement au lieu de casser l'outil hors ligne.
 *
 * `'unsafe-inline'` est inévitable : tout le code est inline (C8). En
 * développement, la politique n'est pas posée : le serveur Vite a besoin de son
 * WebSocket.
 */
const POLITIQUE = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data:',
  "form-action 'none'",
  "base-uri 'none'",
].join('; ');

function politiqueDeSecurite(): Plugin {
  return {
    name: 'politique-de-securite',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: POLITIQUE },
        // En tête : une politique ne couvre que ce qui la suit dans le document.
        injectTo: 'head-prepend',
      },
    ],
  };
}

// Contrainte absolue (§2.3) : aucun CDN, aucune ressource externe.
// Tout est inline, sinon l'outil ne fonctionne pas hors ligne en file://.
export default defineConfig({
  base: './',
  plugins: [svelte(), viteSingleFile(), politiqueDeSecurite()],
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
