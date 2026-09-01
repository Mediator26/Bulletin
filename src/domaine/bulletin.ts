/**
 * Composition d'un bulletin — §2.6 de la spécification, étape 4.
 *
 * Ce module ne rend rien : il produit la structure exacte à imprimer, ligne à
 * ligne. Le composant n'a plus qu'à la parcourir. C'est ce qui permet de tester
 * le contenu d'un bulletin — les totaux, les vides, la moyenne — sans ouvrir de
 * navigateur, là où le classeur exigeait de lire 30 feuilles à l'œil.
 */

import { moyenneAnnuelle, resultatsParRubrique, scoreRubriqueArbre } from './calcul.js';
import type {
  Echelle,
  Eleve,
  FichierClasse,
  Id,
  Periode,
  Rubrique,
  TypeRubrique,
} from './modele.js';
import { enfantsDe } from './calcul.js';
import { indexerTests } from './calcul.js';

export interface LigneBulletin {
  rubrique_id: Id;
  libelle: string;
  /** 0 pour une rubrique principale, 1 pour une sous-rubrique. */
  niveau: number;
  type: TypeRubrique;
  /** Maximum en points ; 0 pour une rubrique cotée en échelle. */
  maximum: number;
  /** Score de la période, ou `null` quand rien n'est encodé — imprimé « — ». */
  score: number | null;
  /** Cotation littérale, pour les rubriques de type `echelle`. */
  cotation: Echelle | null;
  /** Moyenne des périodes complétées ; vide tant qu'il n'y en a qu'une. */
  moyenne: number | null;
}

export interface Bulletin {
  eleve: Eleve;
  periode: Periode;
  ecole: string;
  titulaire: string;
  anneeScolaire: string;
  lignes: LigneBulletin[];
  commentaire: string;
  /** Total général sur 100 des rubriques principales cotées en points. */
  total: number | null;
  totalMaximum: number;
}

/** Indique si la rubrique est une racine à imprimer, avec ses filles en dessous. */
function racines(rubriques: readonly Rubrique[]): Rubrique[] {
  return enfantsDe(rubriques, null);
}

function cotationDe(
  fichier: FichierClasse,
  rubrique_id: Id,
  eleve_id: Id,
  periode_id: Id,
): Echelle | null {
  return (
    fichier.cotations.find(
      (c) => c.rubrique_id === rubrique_id && c.eleve_id === eleve_id && c.periode_id === periode_id,
    )?.valeur ?? null
  );
}

/**
 * Score d'une rubrique pour une période donnée, en repartant des résultats bruts.
 * Isolé ici parce que la moyenne annuelle a besoin de le rejouer sur chaque période.
 */
function scorePourPeriode(
  fichier: FichierClasse,
  rubrique_id: Id,
  eleve_id: Id,
  periode_id: Id,
): number | null {
  const tests = indexerTests(fichier.tests);
  const index = resultatsParRubrique(eleve_id, periode_id, tests, fichier.resultats);
  return scoreRubriqueArbre(rubrique_id, fichier.rubriques, tests, index);
}

/** Compose le bulletin d'un élève pour une période. */
export function construireBulletin(
  fichier: FichierClasse,
  eleve_id: Id,
  periode_id: Id,
): Bulletin | null {
  const eleve = fichier.eleves.find((e) => e.id === eleve_id);
  const periode = fichier.periodes.find((p) => p.id === periode_id);
  if (!eleve || !periode) return null;

  const lignes: LigneBulletin[] = [];

  const ajouterLigne = (rubrique: Rubrique, niveau: number) => {
    const enEchelle = rubrique.type === 'echelle';
    const score = enEchelle ? null : scorePourPeriode(fichier, rubrique.id, eleve.id, periode.id);

    lignes.push({
      rubrique_id: rubrique.id,
      libelle: rubrique.libelle,
      niveau,
      type: rubrique.type,
      maximum: rubrique.maximum,
      score,
      cotation: enEchelle ? cotationDe(fichier, rubrique.id, eleve.id, periode.id) : null,
      moyenne: enEchelle
        ? null
        : moyenneAnnuelle(
            fichier.periodes.map((p) => scorePourPeriode(fichier, rubrique.id, eleve.id, p.id)),
          ),
    });

    for (const enfant of enfantsDe(fichier.rubriques, rubrique.id)) ajouterLigne(enfant, niveau + 1);
  };

  for (const racine of racines(fichier.rubriques)) ajouterLigne(racine, 0);

  // Le total ne porte que sur les rubriques principales cotées en points : les
  // sous-rubriques y sont déjà comprises, et une échelle littérale ne s'additionne pas.
  const principales = lignes.filter((l) => l.niveau === 0 && l.type === 'points');
  const cotees = principales.filter((l) => l.score !== null);

  return {
    eleve,
    periode,
    ecole: fichier.annee.ecole,
    titulaire: fichier.annee.titulaire,
    anneeScolaire: fichier.annee.libelle,
    lignes,
    commentaire:
      fichier.commentaires.find((c) => c.eleve_id === eleve.id && c.periode_id === periode.id)
        ?.texte ?? '',
    total:
      cotees.length === 0
        ? null
        : Math.round(cotees.reduce((s, l) => s + (l.score ?? 0), 0) * 10) / 10,
    totalMaximum: principales.reduce((s, l) => s + l.maximum, 0),
  };
}

/**
 * Nom proposé au navigateur pour l'export PDF, via `document.title` (§2.6).
 * Donne un nommage automatique sans aucune bibliothèque.
 */
export function titrePdf(eleve: Eleve, periode: Periode): string {
  const propre = (s: string) => s.trim().replace(/\s+/g, '-');
  return `Bulletin-P${periode.numero}-${propre(eleve.nom)}-${propre(eleve.prenom)}`.replace(/-+$/, '');
}

/** Affichage d'un score : « — » quand rien n'est encodé, virgule décimale française. */
export function afficherScore(score: number | null): string {
  return score === null ? '—' : String(score).replace('.', ',');
}

/** Date du bulletin au format belge, ou chaîne vide si le titulaire ne l'a pas fixée. */
export function afficherDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [annee, mois, jour] = iso.split('-');
  return `${jour}/${mois}/${annee}`;
}
