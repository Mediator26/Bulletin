import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { texteChangelog } from './src/nouveautes';

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

/**
 * `CHANGELOG.txt` à poser à côté de l'application dans le dossier
 * « Application » du Drive (C11). Tiré de `src/nouveautes.ts`, la même source
 * que la fenêtre « Nouveautés » : les deux ne peuvent pas diverger.
 */
function changelog(): Plugin {
  return {
    name: 'changelog',
    apply: 'build',
    // Après `viteSingleFile`, qui retire du bundle tout ce qui n'est pas la page.
    enforce: 'post',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'CHANGELOG.txt', source: texteChangelog() });
    },
  };
}

// Contrainte absolue (§2.3) : aucun CDN, aucune ressource externe.
// Tout est inline, sinon l'outil ne fonctionne pas hors ligne en file://.
export default defineConfig({
  base: './',
  plugins: [svelte(), viteSingleFile(), politiqueDeSecurite(), changelog()],
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
