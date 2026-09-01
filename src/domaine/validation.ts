/**
 * Validation de saisie — corrige le défaut n° 15 du classeur, où rien
 * n'empêchait 15 sur un test coté sur 10, ni une lettre dans une case de points.
 */

import type { Test } from './modele.js';

export type Validation =
  | { ok: true; valeur: number | null }
  | { ok: false; message: string };

/** Marqueurs affichés dans une cellule non cotée, qu'une nouvelle saisie remplace. */
const MARQUEURS = /^(abs|disp)/i;

/**
 * Retire le marqueur d'absence qu'une cellule affichait avant la frappe.
 *
 * Une cellule marquée « abs » sur laquelle l'enseignant tape 8 doit valoir 8,
 * jamais « abs8 » : le marqueur est un affichage, pas un contenu à compléter.
 * Traité ici plutôt que dans le composant, car selon la façon dont le texte
 * arrive dans le champ, la frappe ne passe pas toujours par un `keydown`.
 */
export function normaliserSaisie(brut: string): string {
  return brut.replace(MARQUEURS, '');
}

/**
 * Interprète une saisie brute de la grille pour un test donné.
 * Une chaîne vide signifie « non encodé » et vaut `null`, pas 0.
 */
export function validerPoints(saisie: string, test: Pick<Test, 'maximum' | 'libelle'>): Validation {
  const texte = normaliserSaisie(saisie).trim().replace(',', '.');
  if (texte === '') return { ok: true, valeur: null };

  if (!/^\d+(\.\d+)?$/.test(texte)) {
    return { ok: false, message: `« ${normaliserSaisie(saisie).trim()} » n'est pas un nombre.` };
  }

  const valeur = Number(texte);
  if (valeur > test.maximum) {
    return { ok: false, message: `Maximum ${test.maximum} pour « ${test.libelle} ».` };
  }
  return { ok: true, valeur };
}
