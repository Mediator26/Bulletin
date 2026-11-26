/**
 * Place des commentaires au verso du bulletin.
 *
 * Le verso est cumulatif (§2.6) : le bulletin de la dernière période rappelle
 * les commentaires de toutes les précédentes. Trop de texte, et le verso
 * déborde sur une troisième page — ce qui décale tous les bulletins suivants
 * d'une impression recto verso. Rien ne le signalait avant l'impression.
 *
 * L'estimation se fait en lignes imprimées, pas en caractères : un retour à la
 * ligne consomme une ligne entière, même pour un seul mot.
 *
 * Calibrage — impressions PDF sous Chromium (police Inter), classe de 24 élèves
 * au référentiel de base :
 *   · un commentaire seul tient jusqu'à 51 lignes, soit ≈ 5 800 caractères ;
 *   · au bulletin de la 3ᵉ période, trois commentaires de 14 lignes chacun,
 *     soit ≈ 1 600 caractères chacun ;
 *   · une ligne de texte compte ≈ 114 caractères.
 * Chaque bloc de période en plus coûte donc ≈ 4,5 lignes (intitulé, cadre,
 * espacement). `CARACTERES_PAR_LIGNE` est pris un peu sous la mesure : d'un
 * poste à l'autre, la police système diffère, et mieux vaut prévenir un peu tôt.
 */

import type { Bulletin } from './bulletin.js';

/** Lignes de commentaire que le verso peut porter, tous blocs confondus. */
export const LIGNES_VERSO = 51;

export const CARACTERES_PAR_LIGNE = 110;

/** Coût d'un bloc de période supplémentaire : intitulé, cadre et espacement. */
export const LIGNES_PAR_BLOC = 4.5;

/** Lignes qu'occupera un texte une fois imprimé ; 0 pour un commentaire vide. */
export function lignesCommentaire(texte: string): number {
  if (texte.trim() === '') return 0;
  return texte
    .replace(/\s+$/, '')
    .split('\n')
    .reduce((total, paragraphe) => total + Math.max(1, Math.ceil(paragraphe.length / CARACTERES_PAR_LIGNE)), 0);
}

/** Lignes occupées au verso d'un bulletin, commentaires rappelés compris. */
export function lignesVerso(bulletin: Pick<Bulletin, 'commentaire' | 'commentairesAnterieurs'>): number {
  const textes = [...bulletin.commentairesAnterieurs.map((c) => c.texte), bulletin.commentaire];
  const blocs = bulletin.commentairesAnterieurs.length + 1;
  return textes.reduce((s, t) => s + lignesCommentaire(t), 0) + LIGNES_PAR_BLOC * (blocs - 1);
}

export function versoDeborde(bulletin: Pick<Bulletin, 'commentaire' | 'commentairesAnterieurs'>): boolean {
  return lignesVerso(bulletin) > LIGNES_VERSO;
}

/**
 * Part du verso à laquelle un commentaire peut prétendre pour que le bulletin
 * de la dernière période, qui les rappelle tous, tienne encore sur sa feuille.
 * Avec trois périodes : 14 lignes, ≈ 1 500 caractères.
 */
export function lignesConseillees(nombrePeriodes: number): number {
  const n = Math.max(1, nombrePeriodes);
  return Math.floor((LIGNES_VERSO - LIGNES_PAR_BLOC * (n - 1)) / n);
}

export type Encombrement = 'ok' | 'long' | 'deborde';

/**
 * Verdict affiché sous le champ de commentaire :
 *   · `deborde` — le verso du bulletin de cette période ne tiendra pas sur sa feuille ;
 *   · `long` — il tient, mais le commentaire dépasse sa part et risque de faire
 *     déborder le bulletin d'une période suivante.
 */
export function encombrement(
  texte: string,
  bulletin: Pick<Bulletin, 'commentaire' | 'commentairesAnterieurs'>,
  nombrePeriodes: number,
): Encombrement {
  if (versoDeborde(bulletin)) return 'deborde';
  return lignesCommentaire(texte) > lignesConseillees(nombrePeriodes) ? 'long' : 'ok';
}
