/**
 * Mutations du fichier de classe.
 *
 * Écrites en place sur l'objet `FichierClasse` : l'état Svelte l'enveloppe dans
 * un `$state` profond, si bien que l'interface se met à jour sans que ces
 * fonctions aient à connaître quoi que ce soit du framework. Elles restent donc
 * testables en Node pur.
 *
 * Invariant commun : supprimer une entité supprime tout ce qui en dépend. Un
 * résultat orphelin est ce qui, dans le classeur, faisait apparaître les points
 * d'un autre élève.
 */

import type {
  Echelle,
  Eleve,
  FichierClasse,
  Id,
  Resultat,
  Periode,
  Rubrique,
  Statut,
  TypeRubrique,
  Test,
} from './modele.js';

let compteur = 0;

/** Identifiant local, unique dans un fichier : rien n'est partagé entre classes. */
export function nouvelId(prefixe: string): Id {
  compteur += 1;
  return `${prefixe}-${Date.now().toString(36)}-${compteur.toString(36)}`;
}

export function ajouterEleve(
  fichier: FichierClasse,
  eleve: { nom: string; prenom: string },
): Eleve {
  const ordre = fichier.eleves.reduce((max, e) => Math.max(max, e.ordre), 0) + 1;
  const nouveau: Eleve = {
    id: nouvelId('eleve'),
    annee_id: fichier.annee.id,
    nom: eleve.nom.trim(),
    prenom: eleve.prenom.trim(),
    ordre,
  };
  fichier.eleves.push(nouveau);
  return nouveau;
}

/**
 * Corrige l'identité d'un élève encodée de travers.
 *
 * Seuls le nom et le prénom changent : l'`id` reste le même, si bien que les
 * résultats, cotations, commentaires et observations déjà saisis suivent
 * l'élève sans être touchés. Un nom vide est refusé — renommer ne doit pas
 * pouvoir faire disparaître une ligne de la liste.
 */
export function renommerEleve(
  fichier: FichierClasse,
  eleve_id: Id,
  identite: { nom: string; prenom: string },
): boolean {
  const eleve = fichier.eleves.find((e) => e.id === eleve_id);
  if (!eleve || !identite.nom.trim()) return false;
  eleve.nom = identite.nom.trim();
  eleve.prenom = identite.prenom.trim();
  return true;
}

export function supprimerEleve(fichier: FichierClasse, eleve_id: Id): void {
  fichier.eleves = fichier.eleves.filter((e) => e.id !== eleve_id);
  fichier.resultats = fichier.resultats.filter((r) => r.eleve_id !== eleve_id);
  fichier.cotations = fichier.cotations.filter((c) => c.eleve_id !== eleve_id);
  fichier.commentaires = fichier.commentaires.filter((c) => c.eleve_id !== eleve_id);
  fichier.observations = fichier.observations.filter((o) => o.eleve_id !== eleve_id);
}

/** Élèves dans l'ordre d'affichage de la grille : alphabétique, comme la feuille NOMS. */
export function elevesTries(fichier: FichierClasse): Eleve[] {
  return [...fichier.eleves].sort(
    (a, b) =>
      a.nom.localeCompare(b.nom, 'fr') ||
      a.prenom.localeCompare(b.prenom, 'fr') ||
      a.ordre - b.ordre,
  );
}

export function ajouterTest(
  fichier: FichierClasse,
  test: { periode_id: Id; rubrique_id: Id; libelle: string; maximum: number },
): Test {
  const ordre =
    fichier.tests
      .filter((t) => t.periode_id === test.periode_id && t.rubrique_id === test.rubrique_id)
      .reduce((max, t) => Math.max(max, t.ordre), 0) + 1;
  const nouveau: Test = {
    id: nouvelId('test'),
    periode_id: test.periode_id,
    rubrique_id: test.rubrique_id,
    libelle: test.libelle.trim(),
    maximum: test.maximum,
    ordre,
  };
  fichier.tests.push(nouveau);
  return nouveau;
}

export function supprimerTest(fichier: FichierClasse, test_id: Id): void {
  fichier.tests = fichier.tests.filter((t) => t.id !== test_id);
  fichier.resultats = fichier.resultats.filter((r) => r.test_id !== test_id);
}

/**
 * Ce que deviennent les points déjà encodés quand le maximum d'un test change.
 *
 * Les deux lectures sont légitimes, et seul l'enseignant sait laquelle est la
 * bonne — l'application ne choisit jamais à sa place :
 *  · `conserver`     — les points tapés étaient les vrais points de la copie,
 *                      c'est le maximum qui était faux (8 / 10 devient 8 / 20) ;
 *  · `proportionnel` — les copies étaient bien corrigées sur l'ancien maximum,
 *                      le test doit simplement peser plus ou moins : la réussite
 *                      est gardée par une règle de trois (8 / 10 devient 16 / 20).
 */
export type ConversionPoints = 'conserver' | 'proportionnel';

/** Une note encodée, et ce qu'elle deviendrait selon chaque conversion. */
export interface NoteConvertie {
  eleve_id: Id;
  avant: number;
  conserver: number;
  proportionnel: number;
}

export interface ImpactMaximum {
  ancienMaximum: number;
  nouveauMaximum: number;
  /** Notes chiffrées déjà encodées, dans l'ordre de la grille. Absences et dispenses n'y sont pas : elles ne changent jamais. */
  notes: NoteConvertie[];
  /** Notes qui dépasseraient le nouveau maximum si on les gardait telles quelles. */
  depassements: NoteConvertie[];
}

/**
 * Règle de trois, arrondie au centième : assez fin pour ne pas déplacer un
 * score de rubrique (arrondi au dixième, §2.5), assez court pour rester lisible
 * dans une cellule de la grille. Jamais au-delà du nouveau maximum.
 */
export function convertirPoints(valeur: number, ancienMaximum: number, nouveauMaximum: number): number {
  const converti = Math.round(((valeur * nouveauMaximum) / ancienMaximum) * 100) / 100;
  return Math.min(converti, nouveauMaximum);
}

/**
 * Ce qu'un changement de maximum ferait aux notes déjà encodées, pour chaque
 * conversion possible. C'est de quoi montrer à l'enseignant, avec les notes de
 * sa propre classe, la conséquence de son choix avant qu'il le fasse.
 */
export function impactChangementMaximum(
  fichier: FichierClasse,
  test_id: Id,
  nouveauMaximum: number,
): ImpactMaximum | null {
  const test = fichier.tests.find((t) => t.id === test_id);
  if (!test) return null;

  const notes: NoteConvertie[] = [];
  for (const eleve of elevesTries(fichier)) {
    const resultat = resultatDe(fichier, test_id, eleve.id);
    if (!resultat || resultat.statut !== 'presente' || resultat.valeur === null) continue;
    notes.push({
      eleve_id: eleve.id,
      avant: resultat.valeur,
      conserver: resultat.valeur,
      proportionnel: convertirPoints(resultat.valeur, test.maximum, nouveauMaximum),
    });
  }

  return {
    ancienMaximum: test.maximum,
    nouveauMaximum,
    notes,
    depassements: notes.filter((n) => n.avant > nouveauMaximum),
  };
}

export type ModificationTest = { ok: true } | { ok: false; message: string };

/**
 * Corrige un test encodé de travers : son nom, son maximum, ou les deux.
 *
 * Comme `renommerEleve`, l'`id` ne change pas : les résultats restent attachés
 * au test, là où le supprimer puis le recréer les faisait tous perdre. Quand le
 * maximum change et que des notes sont déjà encodées, `conversion` dit ce
 * qu'elles deviennent ; sans elle, rien n'est modifié.
 *
 * Garder des points qui dépasseraient le nouveau maximum est refusé : ce serait
 * réintroduire, par la bande, le 15 sur 10 que la validation de saisie
 * empêche (défaut n° 15). Le refus nomme les élèves concernés.
 */
export function modifierTest(
  fichier: FichierClasse,
  test_id: Id,
  modification: { libelle: string; maximum: number },
  conversion?: ConversionPoints,
): ModificationTest {
  const test = fichier.tests.find((t) => t.id === test_id);
  if (!test) return { ok: false, message: 'Ce test n’existe plus. Rechargez la page de saisie.' };

  const libelle = modification.libelle.trim();
  if (!libelle) return { ok: false, message: 'Donnez un nom au test.' };

  const maximum = modification.maximum;
  if (!Number.isFinite(maximum) || maximum <= 0) {
    return { ok: false, message: 'Le maximum doit être un nombre plus grand que 0.' };
  }

  if (maximum !== test.maximum) {
    const impact = impactChangementMaximum(fichier, test_id, maximum)!;
    if (impact.notes.length > 0) {
      if (!conversion) {
        return {
          ok: false,
          message: 'Des notes sont déjà encodées : choisissez ce qu’elles deviennent avec le nouveau maximum.',
        };
      }
      if (conversion === 'conserver' && impact.depassements.length > 0) {
        return { ok: false, message: messageDepassements(fichier, impact) };
      }
      if (conversion === 'proportionnel') {
        for (const note of impact.notes) {
          resultatDe(fichier, test_id, note.eleve_id)!.valeur = note.proportionnel;
        }
      }
    }
  }

  test.libelle = libelle;
  test.maximum = maximum;
  return { ok: true };
}

/** « Martin Léa a 15 et Dubois Tom a 12, plus que le nouveau maximum (10). » */
export function messageDepassements(fichier: FichierClasse, impact: ImpactMaximum): string {
  const noms = impact.depassements.map((n) => {
    const eleve = fichier.eleves.find((e) => e.id === n.eleve_id);
    const nom = eleve ? `${eleve.nom} ${eleve.prenom}`.trim() : 'Un élève';
    return `${nom} a ${String(n.avant).replace('.', ',')}`;
  });
  const liste =
    noms.length === 1 ? noms[0]! : `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]!}`;
  return (
    `Impossible de garder les points tels quels : ${liste}, plus que le nouveau maximum ` +
    `(${String(impact.nouveauMaximum).replace('.', ',')}). Corrigez ces notes dans la grille, ` +
    'ou choisissez de convertir les points.'
  );
}

/**
 * Nombre de résultats encodés pour un test, absences et dispenses comprises :
 * c'est ce que sa suppression ferait perdre. Une cellule vidée ne compte pas,
 * `definirResultat` ne la conserve pas.
 */
export function nombreResultats(fichier: FichierClasse, test_id: Id): number {
  return fichier.resultats.filter((r) => r.test_id === test_id).length;
}

/** Tests d'une période, dans l'ordre des colonnes de la grille. */
export function testsDeLaPeriode(
  fichier: FichierClasse,
  periode_id: Id,
  rubrique_id?: Id,
): Test[] {
  return fichier.tests
    .filter((t) => t.periode_id === periode_id && (!rubrique_id || t.rubrique_id === rubrique_id))
    .sort((a, b) => a.rubrique_id.localeCompare(b.rubrique_id) || a.ordre - b.ordre);
}

export function resultatDe(
  fichier: FichierClasse,
  test_id: Id,
  eleve_id: Id,
): Resultat | undefined {
  return fichier.resultats.find((r) => r.test_id === test_id && r.eleve_id === eleve_id);
}

/**
 * Fixe un résultat, en créant l'enregistrement au besoin.
 *
 * Un résultat `presente` sans valeur ne sert à rien : il est retiré, ce qui
 * évite d'accumuler des lignes vides à chaque passage dans une cellule.
 * Une absence, elle, est une information et se conserve sans valeur.
 */
export function definirResultat(
  fichier: FichierClasse,
  test_id: Id,
  eleve_id: Id,
  valeur: number | null,
  statut: Statut = 'presente',
): void {
  const existant = resultatDe(fichier, test_id, eleve_id);
  const inutile = statut === 'presente' && valeur === null;

  if (inutile) {
    if (existant) fichier.resultats = fichier.resultats.filter((r) => r !== existant);
    return;
  }

  if (existant) {
    existant.valeur = statut === 'presente' ? valeur : null;
    existant.statut = statut;
    return;
  }

  fichier.resultats.push({
    test_id,
    eleve_id,
    valeur: statut === 'presente' ? valeur : null,
    statut,
  });
}

/** Cotation littérale TB‑B‑S‑F‑I d'une rubrique à échelle. */
export function definirCotation(
  fichier: FichierClasse,
  rubrique_id: Id,
  eleve_id: Id,
  periode_id: Id,
  valeur: Echelle | null,
): void {
  const existante = fichier.cotations.find(
    (c) => c.rubrique_id === rubrique_id && c.eleve_id === eleve_id && c.periode_id === periode_id,
  );
  if (valeur === null) {
    if (existante) fichier.cotations = fichier.cotations.filter((c) => c !== existante);
    return;
  }
  if (existante) existante.valeur = valeur;
  else fichier.cotations.push({ rubrique_id, eleve_id, periode_id, valeur });
}

export function definirCommentaire(
  fichier: FichierClasse,
  eleve_id: Id,
  periode_id: Id,
  texte: string,
): void {
  const existant = fichier.commentaires.find(
    (c) => c.eleve_id === eleve_id && c.periode_id === periode_id,
  );
  if (texte.trim() === '') {
    if (existant) fichier.commentaires = fichier.commentaires.filter((c) => c !== existant);
    return;
  }
  if (existant) existant.texte = texte;
  else fichier.commentaires.push({ eleve_id, periode_id, texte });
}

/* --------------------------------------------------------------------------
 * Administration — étape 6.
 *
 * Le nombre de périodes et l'arborescence des rubriques sont des données : les
 * modifier est une opération ordinaire, là où le classeur imposait de recopier
 * des formules dans 30 feuilles. Chaque suppression descend en cascade, seule
 * garantie qu'aucun résultat orphelin ne subsiste.
 * ----------------------------------------------------------------------- */

export function ajouterPeriode(fichier: FichierClasse): Periode {
  const numero = fichier.periodes.reduce((max, p) => Math.max(max, p.numero), 0) + 1;
  const nouvelle: Periode = {
    id: nouvelId('periode'),
    annee_id: fichier.annee.id,
    numero,
    date_bulletin: '',
  };
  fichier.periodes.push(nouvelle);
  return nouvelle;
}

/** Supprime une période, ses tests, les résultats de ces tests et ses annexes. */
export function supprimerPeriode(fichier: FichierClasse, periode_id: Id): void {
  const testsRetires = new Set(
    fichier.tests.filter((t) => t.periode_id === periode_id).map((t) => t.id),
  );

  fichier.periodes = fichier.periodes.filter((p) => p.id !== periode_id);
  fichier.tests = fichier.tests.filter((t) => t.periode_id !== periode_id);
  fichier.resultats = fichier.resultats.filter((r) => !testsRetires.has(r.test_id));
  fichier.cotations = fichier.cotations.filter((c) => c.periode_id !== periode_id);
  fichier.commentaires = fichier.commentaires.filter((c) => c.periode_id !== periode_id);
}

export function ajouterRubrique(
  fichier: FichierClasse,
  rubrique: { parent_id: Id | null; libelle: string; maximum: number; type: TypeRubrique },
): Rubrique {
  const ordre =
    fichier.rubriques
      .filter((r) => r.parent_id === rubrique.parent_id)
      .reduce((max, r) => Math.max(max, r.ordre), 0) + 1;

  const nouvelle: Rubrique = {
    id: nouvelId('rubrique'),
    annee_id: fichier.annee.id,
    parent_id: rubrique.parent_id,
    libelle: rubrique.libelle.trim(),
    maximum: rubrique.maximum,
    type: rubrique.type,
    ordre,
  };
  fichier.rubriques.push(nouvelle);
  return nouvelle;
}

export function modifierRubrique(
  fichier: FichierClasse,
  rubrique_id: Id,
  champs: Partial<Pick<Rubrique, 'libelle' | 'maximum' | 'type'>>,
): void {
  const rubrique = fichier.rubriques.find((r) => r.id === rubrique_id);
  if (!rubrique) return;
  if (champs.libelle !== undefined) rubrique.libelle = champs.libelle;
  if (champs.maximum !== undefined) rubrique.maximum = champs.maximum;
  if (champs.type !== undefined) rubrique.type = champs.type;
}

/** Identifiants d'une rubrique et de toute sa descendance. */
export function descendance(rubriques: readonly Rubrique[], rubrique_id: Id): Set<Id> {
  const retenus = new Set<Id>([rubrique_id]);
  let ajout = true;
  while (ajout) {
    ajout = false;
    for (const r of rubriques) {
      if (r.parent_id !== null && retenus.has(r.parent_id) && !retenus.has(r.id)) {
        retenus.add(r.id);
        ajout = true;
      }
    }
  }
  return retenus;
}

/** Supprime une rubrique, ses sous-rubriques, leurs tests et tous leurs résultats. */
export function supprimerRubrique(fichier: FichierClasse, rubrique_id: Id): void {
  const retirees = descendance(fichier.rubriques, rubrique_id);
  const testsRetires = new Set(
    fichier.tests.filter((t) => retirees.has(t.rubrique_id)).map((t) => t.id),
  );

  fichier.rubriques = fichier.rubriques.filter((r) => !retirees.has(r.id));
  fichier.tests = fichier.tests.filter((t) => !retirees.has(t.rubrique_id));
  fichier.resultats = fichier.resultats.filter((r) => !testsRetires.has(r.test_id));
  fichier.cotations = fichier.cotations.filter((c) => !retirees.has(c.rubrique_id));
}

/** Remonte ou descend une rubrique parmi ses sœurs, en échangeant les ordres. */
export function deplacerRubrique(
  fichier: FichierClasse,
  rubrique_id: Id,
  sens: 'haut' | 'bas',
): void {
  const rubrique = fichier.rubriques.find((r) => r.id === rubrique_id);
  if (!rubrique) return;

  const soeurs = fichier.rubriques
    .filter((r) => r.parent_id === rubrique.parent_id)
    .sort((a, b) => a.ordre - b.ordre);

  const index = soeurs.findIndex((r) => r.id === rubrique_id);
  const voisine = soeurs[sens === 'haut' ? index - 1 : index + 1];
  if (!voisine) return; // déjà en bout de liste

  const ordre = rubrique.ordre;
  rubrique.ordre = voisine.ordre;
  voisine.ordre = ordre;
}

export interface Incoherence {
  rubrique_id: Id;
  message: string;
}

/**
 * Contrôles du référentiel signalés à l'écran d'administration.
 *
 * Ce ne sont pas des erreurs bloquantes : le titulaire reste maître de son
 * barème. Mais une branche dont les sous-rubriques ne totalisent pas son
 * maximum produit des bulletins faux sans rien signaler — exactement le genre
 * de dérive silencieuse que le classeur laissait passer.
 */
export function verifierReferentiel(rubriques: readonly Rubrique[]): Incoherence[] {
  const anomalies: Incoherence[] = [];

  for (const rubrique of rubriques) {
    const enfants = rubriques.filter((r) => r.parent_id === rubrique.id);
    if (enfants.length === 0) {
      if (rubrique.type === 'points' && rubrique.maximum <= 0) {
        anomalies.push({
          rubrique_id: rubrique.id,
          message: `« ${rubrique.libelle} » est cotée en points mais son maximum est ${rubrique.maximum}.`,
        });
      }
      continue;
    }

    const somme = enfants.reduce((s, r) => s + r.maximum, 0);
    if (rubrique.type === 'points' && somme !== rubrique.maximum) {
      anomalies.push({
        rubrique_id: rubrique.id,
        message:
          `« ${rubrique.libelle} » vaut ${rubrique.maximum}, `
          + `mais ses sous-rubriques totalisent ${somme}.`,
      });
    }
  }

  return anomalies;
}
