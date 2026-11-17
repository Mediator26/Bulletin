/**
 * Statistiques de classe — section expérimentale, hors spécification.
 *
 * Ce module ne fait que relire ce que le moteur de calcul (§2.5) produit déjà :
 * aucune règle de score n'est réécrite ici. Chaque score d'élève vient de
 * `scoreRubriqueArbre`, donc du prorata des tests présentés ; les statistiques
 * ne font que les agréger à l'échelle de la classe.
 *
 * Deux conventions, les mêmes que partout ailleurs :
 *  · `null` n'est pas 0 — un élève sans aucune note dans une rubrique sort de
 *    la statistique de cette rubrique, il n'y pèse pas zéro ; une rubrique
 *    dont personne n'est coté a une moyenne `null`, imprimée « — » ;
 *  · tout est exprimé en pourcentage du maximum de la rubrique, seule façon de
 *    comparer Français (sur 100) et Néerlandais (sur 20).
 *
 * Comme le bulletin, ce module rend des structures, jamais du HTML : c'est ce
 * qui permet de vérifier une statistique sans ouvrir de navigateur.
 */

import { arrondiDixieme, enfantsDe, indexerTests, resultatsParRubrique, scoreRubriqueArbre } from './calcul.js';
import {
  ECHELLE,
  type Echelle,
  type Eleve,
  type FichierClasse,
  type Id,
  type Periode,
  type Rubrique,
  type Test,
} from './modele.js';

/** Seuil de réussite, en pourcentage du maximum : la moitié des points. */
export const SEUIL_REUSSITE = 50;

/**
 * Écart, en points de pourcentage, à partir duquel une évolution entre deux
 * périodes est signalée. En dessous, c'est du bruit de correction.
 */
export const SEUIL_EVOLUTION = 10;

/**
 * Tranches de la répartition des notes, en pourcentage. Bornes basses
 * incluses : 50 tombe dans « 50–59 », jamais dans l'échec.
 */
export const TRANCHES = [
  { libelle: 'moins de 50 %', min: 0 },
  { libelle: '50 à 59 %', min: 50 },
  { libelle: '60 à 69 %', min: 60 },
  { libelle: '70 à 79 %', min: 70 },
  { libelle: '80 % et plus', min: 80 },
] as const;

/** Rubrique rendue à plat, dans l'ordre du bulletin, avec sa profondeur. */
export interface RubriqueOrdonnee {
  rubrique: Rubrique;
  /** 0 pour une rubrique principale, 1 pour une sous-rubrique, etc. */
  niveau: number;
}

/** Statistique d'une rubrique en points, pour une période. */
export interface StatRubrique extends RubriqueOrdonnee {
  /** Élèves ayant au moins une note dans la rubrique. */
  cotes: number;
  /** Moyenne de la classe, en % du maximum ; `null` si personne n'est coté. */
  moyenne: number | null;
  mediane: number | null;
  min: number | null;
  max: number | null;
  /** Élèves sous `SEUIL_REUSSITE`, triés par note croissante. */
  enEchec: { eleve: Eleve; pourcentage: number }[];
  /** Nombre d'élèves par tranche de `TRANCHES`, dans le même ordre. */
  repartition: number[];
  /** Tests donnés dans la période, sous-rubriques comprises. */
  tests: number;
}

/** Moyenne de la classe d'une rubrique, période par période. */
export interface EvolutionRubrique extends RubriqueOrdonnee {
  /** Moyenne de classe en %, dans l'ordre de `periodesTriees`. */
  moyennes: (number | null)[];
  /**
   * Progression moyenne entre la période étudiée et la précédente, calculée
   * élève par élève sur ceux qui sont cotés aux deux : comparer deux moyennes
   * de classe mélangerait les progrès réels et les changements d'effectif.
   */
  ecart: number | null;
}

/** Bilan d'un test de la période. */
export interface StatTest {
  test: Test;
  rubrique: Rubrique;
  /** Moyenne des élèves présents, en % du maximum du test. */
  moyenne: number | null;
  presents: number;
  enEchec: number;
  absents: number;
  dispenses: number;
  /** Élèves pour qui rien n'est encodé — ni note, ni absence, ni dispense. */
  nonEncodes: number;
}

/** Situation d'un élève sur la période, toutes rubriques principales confondues. */
export interface BilanEleve {
  eleve: Eleve;
  /**
   * Pourcentage global : Σ scores / Σ maxima des rubriques principales cotées.
   * Pondéré comme le bulletin — Français (100) pèse plus que Néerlandais (20).
   */
  global: number | null;
  /** Même calcul sur la période précédente, pour mesurer l'évolution. */
  globalPrecedent: number | null;
  /** Écart avec la période précédente, en points de pourcentage. */
  ecart: number | null;
  /** Rubriques principales sous le seuil de réussite. */
  echecs: { rubrique: Rubrique; pourcentage: number }[];
  /** Tests de la période où l'élève est noté absent. */
  absences: number;
}

/** Répartition des cotations littérales d'une rubrique en échelle. */
export interface StatEchelle {
  rubrique: Rubrique;
  /** Nombre d'élèves par cotation, dans l'ordre de `ECHELLE`. */
  comptes: number[];
  nonCotes: number;
}

/** Vue d'ensemble de la période. */
export interface Synthese {
  eleves: number;
  tests: number;
  /** Cases encodées / cases attendues (tests × élèves), en % ; `null` sans test. */
  completude: number | null;
  /** Moyenne des pourcentages globaux des élèves. */
  moyenneClasse: number | null;
  /** Élèves sous le seuil dans au moins une rubrique principale. */
  elevesEnEchec: number;
  /** Rubriques saisissables sans aucun test : elles s'imprimeront « — ». */
  rubriquesSansTest: Rubrique[];
}

export interface Statistiques {
  periode: Periode;
  /** Période précédente, ou `null` pour la première. */
  periodePrecedente: Periode | null;
  periodes: Periode[];
  synthese: Synthese;
  rubriques: StatRubrique[];
  evolution: EvolutionRubrique[];
  tests: StatTest[];
  eleves: BilanEleve[];
  echelles: StatEchelle[];
}

// ---------------------------------------------------------------------------
// Outils numériques
// ---------------------------------------------------------------------------

function moyenne(valeurs: readonly number[]): number | null {
  if (valeurs.length === 0) return null;
  return arrondiDixieme(valeurs.reduce((s, v) => s + v, 0) / valeurs.length);
}

function mediane(valeurs: readonly number[]): number | null {
  if (valeurs.length === 0) return null;
  const tries = [...valeurs].sort((a, b) => a - b);
  const milieu = Math.floor(tries.length / 2);
  return tries.length % 2
    ? tries[milieu]!
    : arrondiDixieme((tries[milieu - 1]! + tries[milieu]!) / 2);
}

function pourcentage(score: number, maximum: number): number {
  return arrondiDixieme((score / maximum) * 100);
}

/** Index de la tranche d'un pourcentage dans `TRANCHES`. */
export function trancheDe(pct: number): number {
  for (let i = TRANCHES.length - 1; i >= 0; i--) if (pct >= TRANCHES[i]!.min) return i;
  return 0;
}

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

export function periodesTriees(fichier: FichierClasse): Periode[] {
  return [...fichier.periodes].sort((a, b) => a.numero - b.numero);
}

/** Rubriques en points dans l'ordre du bulletin, chaque fille sous sa mère. */
export function rubriquesEnPoints(rubriques: readonly Rubrique[]): RubriqueOrdonnee[] {
  const sortie: RubriqueOrdonnee[] = [];
  const parcourir = (parent: Id | null, niveau: number) => {
    for (const r of enfantsDe(rubriques, parent)) {
      if (r.type !== 'points' || r.maximum <= 0) continue;
      sortie.push({ rubrique: r, niveau });
      parcourir(r.id, niveau + 1);
    }
  };
  parcourir(null, 0);
  return sortie;
}

/**
 * Pourcentages de chaque élève dans chaque rubrique en points, pour une période.
 * Une seule passe sur les résultats par élève : c'est le calcul le plus coûteux
 * de l'écran, il ne doit pas être refait rubrique par rubrique.
 */
export function tableauPourcentages(
  fichier: FichierClasse,
  periode_id: Id,
): Map<Id, Map<Id, number | null>> {
  const tests = indexerTests(fichier.tests);
  const ordonnees = rubriquesEnPoints(fichier.rubriques);
  const tableau = new Map<Id, Map<Id, number | null>>();
  for (const eleve of fichier.eleves) {
    const index = resultatsParRubrique(eleve.id, periode_id, tests, fichier.resultats);
    const ligne = new Map<Id, number | null>();
    for (const { rubrique } of ordonnees) {
      const score = scoreRubriqueArbre(rubrique.id, fichier.rubriques, tests, index);
      ligne.set(rubrique.id, score === null ? null : pourcentage(score, rubrique.maximum));
    }
    tableau.set(eleve.id, ligne);
  }
  return tableau;
}

/**
 * Pourcentage global d'un élève : pondéré par les maxima des rubriques
 * principales réellement cotées, avec le même prorata que les branches.
 */
function pourcentageGlobal(
  ligne: ReadonlyMap<Id, number | null> | undefined,
  racines: readonly Rubrique[],
): number | null {
  if (!ligne) return null;
  let obtenu = 0;
  let base = 0;
  for (const r of racines) {
    const pct = ligne.get(r.id);
    if (pct === null || pct === undefined) continue; // non coté : hors base
    obtenu += (pct / 100) * r.maximum;
    base += r.maximum;
  }
  return base === 0 ? null : pourcentage(obtenu, base);
}

/** Tests de la période accrochés à la rubrique ou à l'une de ses descendantes. */
function nombreTests(rubrique_id: Id, rubriques: readonly Rubrique[], tests: readonly Test[]): number {
  const ids = new Set<Id>([rubrique_id]);
  let ajoute = true;
  while (ajoute) {
    ajoute = false;
    for (const r of rubriques) {
      if (r.parent_id !== null && ids.has(r.parent_id) && !ids.has(r.id)) {
        ids.add(r.id);
        ajoute = true;
      }
    }
  }
  return tests.filter((t) => ids.has(t.rubrique_id)).length;
}

// ---------------------------------------------------------------------------
// Statistiques de la période
// ---------------------------------------------------------------------------

/** Compose toutes les statistiques d'une période. `null` si la période est inconnue. */
export function construireStatistiques(fichier: FichierClasse, periode_id: Id): Statistiques | null {
  const periodes = periodesTriees(fichier);
  const rang = periodes.findIndex((p) => p.id === periode_id);
  if (rang < 0) return null;
  const periode = periodes[rang]!;
  const periodePrecedente = rang > 0 ? periodes[rang - 1]! : null;

  const eleves = [...fichier.eleves].sort(
    (a, b) => a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr'),
  );
  const ordonnees = rubriquesEnPoints(fichier.rubriques);
  const racines = ordonnees.filter((o) => o.niveau === 0).map((o) => o.rubrique);
  const testsPeriode = fichier.tests.filter((t) => t.periode_id === periode_id);

  // Un tableau de pourcentages par période : l'évolution en a besoin pour toutes.
  const tableaux = periodes.map((p) => tableauPourcentages(fichier, p.id));
  const courant = tableaux[rang]!;
  const precedent = rang > 0 ? tableaux[rang - 1]! : null;

  // --- Rubriques -----------------------------------------------------------
  const rubriques: StatRubrique[] = ordonnees.map(({ rubrique, niveau }) => {
    const notes: { eleve: Eleve; pourcentage: number }[] = [];
    for (const eleve of eleves) {
      const pct = courant.get(eleve.id)?.get(rubrique.id);
      if (pct !== null && pct !== undefined) notes.push({ eleve, pourcentage: pct });
    }
    const valeurs = notes.map((n) => n.pourcentage);
    const repartition = TRANCHES.map(() => 0);
    for (const v of valeurs) repartition[trancheDe(v)]!++;
    return {
      rubrique,
      niveau,
      cotes: notes.length,
      moyenne: moyenne(valeurs),
      mediane: mediane(valeurs),
      min: valeurs.length ? Math.min(...valeurs) : null,
      max: valeurs.length ? Math.max(...valeurs) : null,
      enEchec: notes
        .filter((n) => n.pourcentage < SEUIL_REUSSITE)
        .sort((a, b) => a.pourcentage - b.pourcentage),
      repartition,
      tests: nombreTests(rubrique.id, fichier.rubriques, testsPeriode),
    };
  });

  // --- Évolution -----------------------------------------------------------
  const evolution: EvolutionRubrique[] = ordonnees.map(({ rubrique, niveau }) => {
    const moyennes = tableaux.map((t) =>
      moyenne(
        eleves
          .map((e) => t.get(e.id)?.get(rubrique.id))
          .filter((v): v is number => v !== null && v !== undefined),
      ),
    );
    let ecart: number | null = null;
    if (precedent) {
      const ecarts: number[] = [];
      for (const e of eleves) {
        const avant = precedent.get(e.id)?.get(rubrique.id);
        const apres = courant.get(e.id)?.get(rubrique.id);
        if (avant !== null && avant !== undefined && apres !== null && apres !== undefined) {
          ecarts.push(apres - avant);
        }
      }
      ecart = moyenne(ecarts);
    }
    return { rubrique, niveau, moyennes, ecart };
  });

  // --- Tests ---------------------------------------------------------------
  const parTest = new Map<Id, typeof fichier.resultats>();
  for (const r of fichier.resultats) {
    const liste = parTest.get(r.test_id);
    if (liste) liste.push(r);
    else parTest.set(r.test_id, [r]);
  }
  const idsEleves = new Set(eleves.map((e) => e.id));
  const rubriqueParId = new Map(fichier.rubriques.map((r) => [r.id, r]));
  const rangRubrique = new Map(ordonnees.map((o, i) => [o.rubrique.id, i]));

  const tests: StatTest[] = testsPeriode
    .filter((t) => rubriqueParId.has(t.rubrique_id))
    .sort(
      (a, b) =>
        (rangRubrique.get(a.rubrique_id) ?? 0) - (rangRubrique.get(b.rubrique_id) ?? 0) ||
        a.ordre - b.ordre,
    )
    .map((test) => {
      const resultats = (parTest.get(test.id) ?? []).filter((r) => idsEleves.has(r.eleve_id));
      const notes = resultats
        .filter((r) => r.statut === 'presente' && r.valeur !== null)
        .map((r) => (test.maximum > 0 ? pourcentage(r.valeur!, test.maximum) : 0));
      return {
        test,
        rubrique: rubriqueParId.get(test.rubrique_id)!,
        moyenne: test.maximum > 0 ? moyenne(notes) : null,
        presents: notes.length,
        enEchec: notes.filter((n) => n < SEUIL_REUSSITE).length,
        absents: resultats.filter((r) => r.statut === 'absent').length,
        dispenses: resultats.filter((r) => r.statut === 'dispense').length,
        nonEncodes: eleves.length - resultats.length,
      };
    });

  // --- Élèves --------------------------------------------------------------
  const absencesParEleve = new Map<Id, number>();
  const idsTests = new Set(testsPeriode.map((t) => t.id));
  for (const r of fichier.resultats) {
    if (r.statut === 'absent' && idsTests.has(r.test_id)) {
      absencesParEleve.set(r.eleve_id, (absencesParEleve.get(r.eleve_id) ?? 0) + 1);
    }
  }

  const bilans: BilanEleve[] = eleves.map((eleve) => {
    const ligne = courant.get(eleve.id);
    const global = pourcentageGlobal(ligne, racines);
    const globalPrecedent = precedent ? pourcentageGlobal(precedent.get(eleve.id), racines) : null;
    const echecs: BilanEleve['echecs'] = [];
    for (const r of racines) {
      const pct = ligne?.get(r.id);
      if (pct !== null && pct !== undefined && pct < SEUIL_REUSSITE) {
        echecs.push({ rubrique: r, pourcentage: pct });
      }
    }
    return {
      eleve,
      global,
      globalPrecedent,
      ecart:
        global !== null && globalPrecedent !== null ? arrondiDixieme(global - globalPrecedent) : null,
      echecs,
      absences: absencesParEleve.get(eleve.id) ?? 0,
    };
  });

  // --- Cotations littérales -----------------------------------------------
  const echelles: StatEchelle[] = fichier.rubriques
    .filter((r) => r.type === 'echelle')
    .sort((a, b) => a.ordre - b.ordre)
    .map((rubrique) => {
      const comptes = ECHELLE.map(() => 0);
      let cotes = 0;
      for (const c of fichier.cotations) {
        if (c.rubrique_id !== rubrique.id || c.periode_id !== periode_id) continue;
        if (c.valeur === null || !idsEleves.has(c.eleve_id)) continue;
        comptes[ECHELLE.indexOf(c.valeur as Echelle)]!++;
        cotes++;
      }
      return { rubrique, comptes, nonCotes: eleves.length - cotes };
    });

  // --- Synthèse ------------------------------------------------------------
  const attendues = testsPeriode.length * eleves.length;
  const encodees = tests.reduce((s, t) => s + (eleves.length - t.nonEncodes), 0);
  const aDesEnfants = new Set(fichier.rubriques.map((r) => r.parent_id));
  const globaux = bilans.map((b) => b.global).filter((g): g is number => g !== null);

  const synthese: Synthese = {
    eleves: eleves.length,
    tests: testsPeriode.length,
    completude: attendues === 0 ? null : arrondiDixieme((encodees / attendues) * 100),
    moyenneClasse: moyenne(globaux),
    elevesEnEchec: bilans.filter((b) => b.echecs.length > 0).length,
    rubriquesSansTest: ordonnees
      .filter((o) => !aDesEnfants.has(o.rubrique.id))
      .filter((o) => !testsPeriode.some((t) => t.rubrique_id === o.rubrique.id))
      .map((o) => o.rubrique),
  };

  return {
    periode,
    periodePrecedente,
    periodes,
    synthese,
    rubriques,
    evolution,
    tests,
    eleves: bilans,
    echelles,
  };
}

// ---------------------------------------------------------------------------
// Faits saillants — ce qu'un titulaire voudrait lire en premier
// ---------------------------------------------------------------------------

export interface FaitSaillant {
  titre: string;
  valeur: string;
  detail: string;
  ton: 'ok' | 'alerte' | 'neutre';
}

const pct = (v: number) => `${String(v).replace('.', ',')} %`;
const ecartTexte = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${String(Math.abs(v)).replace('.', ',')} pts`;

/**
 * Les constats qui méritent d'être lus avant les tableaux : matière la plus et
 * la moins réussie, sous-domaine le plus fragile, plus forte progression et
 * plus fort recul, test le plus difficile. Rien n'est inventé quand les
 * données manquent : un constat sans matière à le fonder est omis.
 */
export function faitsSaillants(stats: Statistiques): FaitSaillant[] {
  const faits: FaitSaillant[] = [];
  const cotees = (niveau: (n: number) => boolean) =>
    stats.rubriques.filter((r) => niveau(r.niveau) && r.moyenne !== null);

  const principales = cotees((n) => n === 0).sort((a, b) => b.moyenne! - a.moyenne!);
  if (principales.length >= 2) {
    const haut = principales[0]!;
    const bas = principales[principales.length - 1]!;
    faits.push({
      titre: 'Matière la mieux réussie',
      valeur: haut.rubrique.libelle,
      detail: `${pct(haut.moyenne!)} de moyenne · ${haut.enEchec.length} en échec`,
      ton: 'ok',
    });
    faits.push({
      titre: 'Matière la moins réussie',
      valeur: bas.rubrique.libelle,
      detail: `${pct(bas.moyenne!)} de moyenne · ${bas.enEchec.length} en échec`,
      ton: bas.moyenne! < SEUIL_REUSSITE ? 'alerte' : 'neutre',
    });
  }

  const sousDomaines = cotees((n) => n > 0).sort((a, b) => a.moyenne! - b.moyenne!);
  const fragile = sousDomaines[0];
  if (fragile) {
    faits.push({
      titre: 'Sous-domaine le plus fragile',
      valeur: fragile.rubrique.libelle,
      detail: `${pct(fragile.moyenne!)} de moyenne · ${fragile.enEchec.length} élève${fragile.enEchec.length > 1 ? 's' : ''} sous ${SEUIL_REUSSITE} %`,
      ton: fragile.moyenne! < SEUIL_REUSSITE ? 'alerte' : 'neutre',
    });
  }

  if (stats.periodePrecedente) {
    const evolutions = stats.evolution
      .filter((e) => e.ecart !== null);
    // À écart égal, la matière principale l'emporte sur sa sous-rubrique :
    // quand un seul domaine de Français est évalué, c'est Français qui bouge.
    const progres = [...evolutions].sort((a, b) => b.ecart! - a.ecart! || a.niveau - b.niveau)[0];
    const recul = [...evolutions].sort((a, b) => a.ecart! - b.ecart! || a.niveau - b.niveau)[0];
    if (progres && progres.ecart! > 0) {
      faits.push({
        titre: 'Plus forte progression',
        valeur: progres.rubrique.libelle,
        detail: `${ecartTexte(progres.ecart!)} par élève depuis la période ${stats.periodePrecedente.numero}`,
        ton: progres.ecart! >= SEUIL_EVOLUTION ? 'ok' : 'neutre',
      });
    }
    if (recul && recul.ecart! < 0) {
      faits.push({
        titre: 'Plus fort recul',
        valeur: recul.rubrique.libelle,
        detail: `${ecartTexte(recul.ecart!)} par élève depuis la période ${stats.periodePrecedente.numero}`,
        // Un recul de deux points n'est pas une alerte : le ton suit le même
        // seuil que les flèches du tableau d'évolution.
        ton: recul.ecart! <= -SEUIL_EVOLUTION ? 'alerte' : 'neutre',
      });
    }
  }

  const difficile = stats.tests
    .filter((t) => t.moyenne !== null)
    .sort((a, b) => a.moyenne! - b.moyenne!)[0];
  if (difficile && stats.tests.length >= 2) {
    faits.push({
      titre: 'Test le plus difficile',
      valeur: difficile.test.libelle || 'Sans titre',
      detail: `${difficile.rubrique.libelle} · ${pct(difficile.moyenne!)} de moyenne`,
      ton: difficile.moyenne! < SEUIL_REUSSITE ? 'alerte' : 'neutre',
    });
  }

  const plusTeste = stats.rubriques
    .filter((r) => r.niveau === 0 && r.tests > 0)
    .sort((a, b) => b.tests - a.tests)[0];
  if (plusTeste) {
    faits.push({
      titre: 'Matière la plus évaluée',
      valeur: plusTeste.rubrique.libelle,
      detail: `${plusTeste.tests} test${plusTeste.tests > 1 ? 's' : ''} sur ${stats.synthese.tests} cette période`,
      ton: 'neutre',
    });
  }

  return faits;
}
