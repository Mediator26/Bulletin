/**
 * Moteur de calcul — §2.5 de la spécification.
 *
 * Règle centrale reprise à l'identique du classeur : le prorata des tests
 * réellement présentés.
 *
 *   score_rubrique = arrondi( points_obtenus / Σ(max_test × présence_test) × max_rubrique , 1)
 *
 * Convention transversale : `null` signifie « rien à afficher » (imprimé « — »)
 * et ne vaut jamais 0. C'est la distinction que le classeur ne faisait pas.
 */

import type { Id, Resultat, Rubrique, Test } from './modele.js';

/** Arrondi à une décimale, sans l'erreur de représentation de `Math.round(x*10)/10`. */
export function arrondiDixieme(valeur: number): number {
  return Math.round((valeur + Number.EPSILON) * 10) / 10;
}

/**
 * Score d'une rubrique feuille, au prorata des seuls tests présentés.
 * Retourne `null` si aucun test n'a été présenté ou encodé.
 */
export function scoreRubrique(
  resultats: readonly Resultat[],
  tests: ReadonlyMap<Id, Test>,
  maxRubrique: number,
): number | null {
  const presents = resultats.filter((r) => r.statut === 'presente' && r.valeur !== null);
  if (presents.length === 0) return null;

  const obtenu = presents.reduce((s, r) => s + r.valeur!, 0);
  const base = presents.reduce((s, r) => s + (tests.get(r.test_id)?.maximum ?? 0), 0);
  if (base === 0) return null;

  return arrondiDixieme((obtenu / base) * maxRubrique);
}

/** Index des rubriques filles d'une rubrique donnée, triées par `ordre`. */
export function enfantsDe(rubriques: readonly Rubrique[], parent_id: Id | null): Rubrique[] {
  return rubriques
    .filter((r) => r.parent_id === parent_id)
    .sort((a, b) => a.ordre - b.ordre);
}

/**
 * Score d'une rubrique quelconque, feuille ou branche.
 *
 * Une branche est la somme de ses filles — une agrégation, pas une formule
 * recopiée (§2.4, décision 3). Si aucune fille n'a de score, la branche vaut
 * `null` : un bulletin sans encodage reste vide au lieu d'afficher 0.
 */
export function scoreRubriqueArbre(
  rubriqueId: Id,
  rubriques: readonly Rubrique[],
  tests: ReadonlyMap<Id, Test>,
  resultatsParRubrique: ReadonlyMap<Id, readonly Resultat[]>,
): number | null {
  const rubrique = rubriques.find((r) => r.id === rubriqueId);
  if (!rubrique || rubrique.type === 'echelle') return null;

  const enfants = enfantsDe(rubriques, rubriqueId);
  if (enfants.length === 0) {
    return scoreRubrique(resultatsParRubrique.get(rubriqueId) ?? [], tests, rubrique.maximum);
  }

  let total = 0;
  let auMoinsUn = false;
  for (const enfant of enfants) {
    const score = scoreRubriqueArbre(enfant.id, rubriques, tests, resultatsParRubrique);
    if (score !== null) {
      total += score;
      auMoinsUn = true;
    }
  }
  return auMoinsUn ? arrondiDixieme(total) : null;
}

/**
 * Regroupe les résultats d'un élève par rubrique, pour une période donnée.
 * Les tests d'une autre période sont ignorés.
 */
export function resultatsParRubrique(
  eleveId: Id,
  periodeId: Id,
  tests: ReadonlyMap<Id, Test>,
  resultats: readonly Resultat[],
): Map<Id, Resultat[]> {
  const index = new Map<Id, Resultat[]>();
  for (const r of resultats) {
    if (r.eleve_id !== eleveId) continue;
    const test = tests.get(r.test_id);
    if (!test || test.periode_id !== periodeId) continue;
    const liste = index.get(test.rubrique_id);
    if (liste) liste.push(r);
    else index.set(test.rubrique_id, [r]);
  }
  return index;
}

/**
 * Moyenne annuelle d'une rubrique sur les périodes complétées.
 *
 * Reprend la règle `IF(S7<2;"")` du classeur : tant qu'une seule période est
 * complétée, la moyenne reste vide — une moyenne sur un seul bulletin
 * n'est pas une moyenne.
 */
export function moyenneAnnuelle(scoresPeriodes: readonly (number | null)[]): number | null {
  const remplis = scoresPeriodes.filter((s): s is number => s !== null);
  if (remplis.length < 2) return null;
  return arrondiDixieme(remplis.reduce((s, v) => s + v, 0) / remplis.length);
}

/** Indexe une collection par son `id`, pour les recherches du moteur. */
export function indexerTests(tests: readonly Test[]): Map<Id, Test> {
  return new Map(tests.map((t) => [t.id, t]));
}
