/**
 * Vérification avant impression.
 *
 * Le classeur imprimait sans rien dire un bulletin auquel il manquait une note,
 * une cote ou le commentaire : on le découvrait au moment de le remettre. Ce
 * module dresse, pour une période, la liste de ce qui s'imprimerait vide ou de
 * travers. Il ne bloque rien — un élève arrivé en cours d'année a légitimement
 * des cases vides —, il fait voir.
 *
 * Comme `bulletin.ts`, il rend une structure et non du HTML : il se teste sans
 * navigateur, et l'écran des bulletins n'a qu'à l'afficher.
 *
 * Il est recalculé à chaque frappe d'un commentaire, pour toute la classe : il
 * relit donc les scores des seules matières de la période, sans composer de
 * bulletin complet (périodes rappelées, moyennes) qu'il n'utiliserait pas.
 */

import { commentairesDuVerso } from './bulletin.js';
import { enfantsDe, indexerTests, resultatsParRubrique, scoreRubriqueArbre } from './calcul.js';
import { versoDeborde } from './commentaire.js';
import type { Eleve, FichierClasse, Id, Rubrique, Test } from './modele.js';
import { cheminLibelle } from './referentiel.js';

export interface Constat {
  /**
   * `erreur` : la feuille sortira de travers (verso qui déborde).
   * `attention` : quelque chose s'imprimera vide ou « — ».
   */
  gravite: 'erreur' | 'attention';
  texte: string;
}

export interface VerificationEleve {
  eleve: Eleve;
  constats: Constat[];
}

export interface Verification {
  /** Constats valables pour toute la classe : date, rubriques sans aucun test. */
  classe: Constat[];
  /** Élèves dont le bulletin appelle une vérification, dans l'ordre reçu. */
  eleves: VerificationEleve[];
}

/** Nombre de noms cités avant de passer à « … ». */
const CITES = 3;

function enumerer(noms: string[]): string {
  return noms.length <= CITES ? noms.join(', ') : `${noms.slice(0, CITES).join(', ')}…`;
}

function pluriel(n: number, singulier: string, pluriel: string): string {
  return `${n} ${n > 1 ? pluriel : singulier}`;
}

/** Rubriques d'une branche, racine comprise. */
function branche(rubriques: readonly Rubrique[], racine: Rubrique): Rubrique[] {
  return [racine, ...enfantsDe(rubriques, racine.id).flatMap((r) => branche(rubriques, r))];
}

/**
 * Rubriques en points sans aucun test sur la période, au plus haut niveau :
 * si toute une matière est vide, on la cite elle, pas chacune de ses filles.
 */
function rubriquesSansTest(fichier: FichierClasse, tests: readonly Test[]): Rubrique[] {
  const avecTest = new Set(tests.map((t) => t.rubrique_id));
  const vides: Rubrique[] = [];
  const parcourir = (parent_id: Id | null) => {
    for (const rubrique of enfantsDe(fichier.rubriques, parent_id)) {
      if (rubrique.type !== 'points') continue;
      if (!branche(fichier.rubriques, rubrique).some((r) => avecTest.has(r.id))) vides.push(rubrique);
      else parcourir(rubrique.id);
    }
  };
  parcourir(null);
  return vides;
}

export function verifierAvantImpression(
  fichier: FichierClasse,
  periode_id: Id,
  eleves: readonly Eleve[],
): Verification {
  const periode = fichier.periodes.find((p) => p.id === periode_id);
  if (!periode) return { classe: [], eleves: [] };

  const tests = fichier.tests.filter((t) => t.periode_id === periode_id);
  const index = indexerTests(fichier.tests);
  const racines = enfantsDe(fichier.rubriques, null).filter((r) => r.type === 'points');
  const rubriqueDe = new Map(fichier.rubriques.map((r) => [r.id, r]));
  const echelles = fichier.rubriques.filter((r) => r.type === 'echelle');

  const resultats = new Map(fichier.resultats.map((r) => [`${r.test_id}|${r.eleve_id}`, r]));
  const cotations = new Map(
    fichier.cotations
      .filter((c) => c.periode_id === periode_id)
      .map((c) => [`${c.rubrique_id}|${c.eleve_id}`, c.valeur]),
  );

  // ---------- Toute la classe ----------
  const classe: Constat[] = [];
  if (!periode.date_bulletin) {
    classe.push({
      gravite: 'attention',
      texte: `La date du bulletin ${periode.numero} n'est pas fixée : elle s'imprimera vide.`,
    });
  }
  const vides = rubriquesSansTest(fichier, tests);
  if (vides.length > 0) {
    const noms = vides.map((r) => cheminLibelle(r, fichier.rubriques));
    classe.push({
      gravite: 'attention',
      texte: `Aucun test cette période en ${enumerer(noms)} : `
        + `${vides.length > 1 ? 'ces lignes s’imprimeront' : 'cette ligne s’imprimera'} « — » pour toute la classe.`,
    });
  }

  // ---------- Élève par élève ----------
  const parEleve: VerificationEleve[] = [];
  for (const eleve of eleves) {
    const constats: Constat[] = [];
    const verso = commentairesDuVerso(fichier, eleve.id, periode);

    if (versoDeborde(verso)) {
      constats.push({
        gravite: 'erreur',
        texte: 'Le verso déborde sur une page de plus : commentaires trop longs.',
      });
    }

    const manquants = tests.filter((t) => {
      const r = resultats.get(`${t.id}|${eleve.id}`);
      return !r || (r.statut === 'presente' && r.valeur === null);
    });
    if (manquants.length > 0) {
      const noms = manquants.map((t) => `${t.libelle} (${rubriqueDe.get(t.rubrique_id)?.libelle ?? '?'})`);
      constats.push({
        gravite: 'attention',
        texte: `${pluriel(manquants.length, 'note manquante', 'notes manquantes')} : ${enumerer(noms)}`,
      });
    }

    // Une matière entière sans note retenue alors que des tests existent :
    // l'élève était absent ou dispensé partout. Signalé seulement si ce
    // n'est pas déjà expliqué par une note manquante.
    const testsManquants = new Set(manquants.map((t) => t.rubrique_id));
    const parRubrique = resultatsParRubrique(eleve.id, periode_id, index, fichier.resultats);
    for (const racine of racines) {
      const ids = new Set(branche(fichier.rubriques, racine).map((r) => r.id));
      if (!tests.some((t) => ids.has(t.rubrique_id))) continue; // déjà signalé pour la classe
      if ([...ids].some((id) => testsManquants.has(id))) continue; // déjà expliqué
      if (scoreRubriqueArbre(racine.id, fichier.rubriques, index, parRubrique) === null) {
        constats.push({
          gravite: 'attention',
          texte: `Absent ou dispensé à tous les tests de ${racine.libelle} : imprimé « — ».`,
        });
      }
    }

    const sansCote = echelles.filter((r) => !cotations.get(`${r.id}|${eleve.id}`));
    if (sansCote.length > 0) {
      constats.push({
        gravite: 'attention',
        texte: `${sansCote.length > 1 ? 'Cotes manquantes' : 'Cote manquante'} : ${enumerer(sansCote.map((r) => r.libelle))}`,
      });
    }

    if (!verso.commentaire.trim()) {
      constats.push({ gravite: 'attention', texte: 'Pas de commentaire au verso.' });
    }

    if (constats.length > 0) parEleve.push({ eleve, constats });
  }

  return { classe, eleves: parEleve };
}
