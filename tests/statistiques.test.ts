import { beforeEach, describe, expect, it } from 'vitest';
import { classeVierge } from '../src/donnees/persistance.js';
import { periodesReference, rubriquesReference } from '../src/domaine/referentiel.js';
import {
  ajouterEleve,
  ajouterTest,
  definirCotation,
  definirResultat,
} from '../src/domaine/mutations.js';
import {
  construireStatistiques,
  faitsSaillants,
  trancheDe,
  type Statistiques,
} from '../src/domaine/statistiques.js';
import type { Eleve, FichierClasse } from '../src/domaine/modele.js';

let f: FichierClasse;
let a: Eleve;
let b: Eleve;
let c: Eleve;

beforeEach(() => {
  f = classeVierge({ libelleAnnee: '2025-2026', ecole: 'Momignies', titulaire: 'T', version: '0' });
  f.rubriques = rubriquesReference(f.annee.id);
  f.periodes = periodesReference(f.annee.id);
  a = ajouterEleve(f, { nom: 'Alpha', prenom: 'A' });
  b = ajouterEleve(f, { nom: 'Bravo', prenom: 'B' });
  c = ajouterEleve(f, { nom: 'Charlie', prenom: 'C' });
});

const p = (i: number) => f.periodes[i]!.id;
const PARLER = 'francais.parler';
const LIRE = 'francais.lire';
const ARITH = 'mathematiques.arithmetique';

/** Un test sur 10 et les notes données, dans l'ordre des élèves passés. */
function test(
  rubrique: string,
  periode: string,
  notes: [Eleve, number | 'abs' | 'disp'][],
  libelle = 'T',
) {
  const t = ajouterTest(f, { periode_id: periode, rubrique_id: rubrique, libelle, maximum: 10 });
  for (const [eleve, note] of notes) {
    if (note === 'abs') definirResultat(f, t.id, eleve.id, null, 'absent');
    else if (note === 'disp') definirResultat(f, t.id, eleve.id, null, 'dispense');
    else definirResultat(f, t.id, eleve.id, note);
  }
  return t;
}

const stats = (i = 0) => construireStatistiques(f, p(i))!;
const rub = (s: Statistiques, id: string) => s.rubriques.find((r) => r.rubrique.id === id)!;

describe('statistiques par rubrique', () => {
  it('rend null pour une période inconnue', () => {
    expect(construireStatistiques(f, 'inconnue')).toBeNull();
  });

  it('laisse la moyenne vide quand rien n’est encodé, jamais 0', () => {
    const r = rub(stats(), PARLER);
    expect(r.moyenne).toBeNull();
    expect(r.cotes).toBe(0);
    expect(r.enEchec).toEqual([]);
  });

  it('calcule moyenne, médiane, extrêmes en pourcentage', () => {
    test(PARLER, p(0), [[a, 4], [b, 6], [c, 9]]);
    const r = rub(stats(), PARLER);
    expect(r.moyenne).toBe(63.3);
    expect(r.mediane).toBe(60);
    expect(r.min).toBe(40);
    expect(r.max).toBe(90);
    expect(r.cotes).toBe(3);
  });

  it('compte en échec sous 50 %, et 50 % pile est une réussite', () => {
    test(PARLER, p(0), [[a, 4], [b, 5], [c, 2]]);
    const r = rub(stats(), PARLER);
    expect(r.enEchec.map((e) => [e.eleve.nom, e.pourcentage])).toEqual([
      ['Charlie', 20],
      ['Alpha', 40],
    ]);
  });

  it('sort un élève absent de la statistique au lieu de lui compter 0', () => {
    test(PARLER, p(0), [[a, 8], [b, 'abs'], [c, 6]]);
    const r = rub(stats(), PARLER);
    expect(r.cotes).toBe(2);
    expect(r.moyenne).toBe(70);
    expect(r.enEchec).toEqual([]);
  });

  it('compte un 0 encodé comme un vrai 0', () => {
    test(PARLER, p(0), [[a, 0], [b, 10]]);
    const r = rub(stats(), PARLER);
    expect(r.moyenne).toBe(50);
    expect(r.enEchec).toHaveLength(1);
  });

  it('agrège une branche par le même prorata que le bulletin', () => {
    // Seul « Parler » est évalué : Français vaut la réussite dans Parler.
    test(PARLER, p(0), [[a, 8]]);
    expect(rub(stats(), 'francais').moyenne).toBe(80);
  });

  it('compte les tests d’une branche à travers ses sous-rubriques', () => {
    test(PARLER, p(0), [[a, 5]]);
    test(LIRE, p(0), [[a, 5]]);
    test(LIRE, p(0), [[a, 5]]);
    test(LIRE, p(1), [[a, 5]]); // autre période : ignoré
    const s = stats();
    expect(rub(s, 'francais').tests).toBe(3);
    expect(rub(s, LIRE).tests).toBe(2);
  });

  it('répartit les élèves par tranches', () => {
    test(PARLER, p(0), [[a, 3], [b, 5], [c, 9]]);
    expect(rub(stats(), PARLER).repartition).toEqual([1, 1, 0, 0, 1]);
  });

  it('place les bornes des tranches dans la tranche supérieure', () => {
    expect(trancheDe(49.9)).toBe(0);
    expect(trancheDe(50)).toBe(1);
    expect(trancheDe(80)).toBe(4);
    expect(trancheDe(100)).toBe(4);
  });

  it('ne présente pas les rubriques cotées en échelle', () => {
    expect(stats().rubriques.some((r) => r.rubrique.type === 'echelle')).toBe(false);
  });
});

describe('évolution entre périodes', () => {
  it('donne la moyenne de classe à chaque période', () => {
    test(PARLER, p(0), [[a, 4], [b, 6]]);
    test(PARLER, p(1), [[a, 8], [b, 8]]);
    const e = stats(1).evolution.find((x) => x.rubrique.id === PARLER)!;
    expect(e.moyennes).toEqual([50, 80, null]);
  });

  it('mesure la progression élève par élève, sur les seuls élèves cotés aux deux périodes', () => {
    test(PARLER, p(0), [[a, 4], [b, 6]]);
    // c n'apparaît qu'en période 2 : il ne doit pas gonfler la progression.
    test(PARLER, p(1), [[a, 6], [b, 7], [c, 10]]);
    const e = stats(1).evolution.find((x) => x.rubrique.id === PARLER)!;
    expect(e.ecart).toBe(15); // (+20 +10) / 2
  });

  it('ne calcule aucun écart sur la première période', () => {
    test(PARLER, p(0), [[a, 4]]);
    expect(stats(0).evolution.every((e) => e.ecart === null)).toBe(true);
  });
});

describe('bilan des tests', () => {
  it('compte présents, absents, dispensés et cases vides', () => {
    test(PARLER, p(0), [[a, 3], [b, 'abs']], 'Dictée');
    const t = stats().tests[0]!;
    expect(t.test.libelle).toBe('Dictée');
    expect(t.presents).toBe(1);
    expect(t.absents).toBe(1);
    expect(t.dispenses).toBe(0);
    expect(t.nonEncodes).toBe(1);
    expect(t.enEchec).toBe(1);
    expect(t.moyenne).toBe(30);
  });

  it('range les tests dans l’ordre du bulletin', () => {
    test(ARITH, p(0), [[a, 5]], 'Calcul');
    test(PARLER, p(0), [[a, 5]], 'Exposé');
    expect(stats().tests.map((t) => t.test.libelle)).toEqual(['Exposé', 'Calcul']);
  });
});

describe('bilan des élèves', () => {
  it('pondère le pourcentage global par les maxima des matières cotées', () => {
    // Français (100) à 80 %, Néerlandais (20) à 20 % : (80 + 4) / 120.
    test(PARLER, p(0), [[a, 8]]);
    test('neerlandais', p(0), [[a, 2]]);
    const bilan = stats().eleves.find((x) => x.eleve.id === a.id)!;
    expect(bilan.global).toBe(70);
    expect(bilan.echecs.map((e) => e.rubrique.id)).toEqual(['neerlandais']);
  });

  it('mesure l’écart avec la période précédente', () => {
    test(PARLER, p(0), [[a, 4]]);
    test(PARLER, p(1), [[a, 7]]);
    const bilan = stats(1).eleves.find((x) => x.eleve.id === a.id)!;
    expect(bilan.globalPrecedent).toBe(40);
    expect(bilan.ecart).toBe(30);
  });

  it('compte les absences de la seule période', () => {
    test(PARLER, p(0), [[a, 'abs']]);
    test(LIRE, p(0), [[a, 'abs']]);
    test(LIRE, p(1), [[a, 'abs']]);
    expect(stats().eleves.find((x) => x.eleve.id === a.id)!.absences).toBe(2);
  });

  it('laisse le global vide pour un élève sans aucune note', () => {
    expect(stats().eleves.every((x) => x.global === null && x.ecart === null)).toBe(true);
  });
});

describe('synthèse', () => {
  it('mesure la complétude de l’encodage', () => {
    test(PARLER, p(0), [[a, 5], [b, 'disp']]); // 2 cases sur 3
    test(LIRE, p(0), [[a, 5], [b, 5], [c, 5]]); // 3 sur 3
    const s = stats().synthese;
    expect(s.tests).toBe(2);
    expect(s.completude).toBe(83.3);
  });

  it('laisse la complétude vide sans aucun test', () => {
    expect(stats().synthese.completude).toBeNull();
  });

  it('signale les rubriques saisissables restées sans test', () => {
    test(PARLER, p(0), [[a, 5]]);
    const ids = stats().synthese.rubriquesSansTest.map((r) => r.id);
    expect(ids).not.toContain(PARLER);
    expect(ids).toContain(LIRE);
    expect(ids).not.toContain('francais'); // une branche n'accueille pas de test
  });

  it('compte les élèves en échec dans au moins une matière', () => {
    test(PARLER, p(0), [[a, 2], [b, 8]]);
    test(ARITH, p(0), [[a, 2], [b, 3]]);
    expect(stats().synthese.elevesEnEchec).toBe(2);
  });
});

describe('cotations littérales', () => {
  it('répartit les cotations et compte les élèves non cotés', () => {
    definirCotation(f, 'comportement', a.id, p(0), 'TB');
    definirCotation(f, 'comportement', b.id, p(0), 'TB');
    definirCotation(f, 'comportement', c.id, p(1), 'I'); // autre période
    const e = stats().echelles.find((x) => x.rubrique.id === 'comportement')!;
    expect(e.comptes).toEqual([2, 0, 0, 0, 0]);
    expect(e.nonCotes).toBe(1);
  });
});

describe('faits saillants', () => {
  it('ne dit rien quand rien n’est encodé', () => {
    expect(faitsSaillants(stats())).toEqual([]);
  });

  it('nomme la matière la plus et la moins réussie', () => {
    test(PARLER, p(0), [[a, 9], [b, 8]]);
    test(ARITH, p(0), [[a, 3], [b, 4]]);
    const faits = faitsSaillants(stats());
    expect(faits.find((x) => x.titre === 'Matière la mieux réussie')!.valeur).toBe('Français');
    const bas = faits.find((x) => x.titre === 'Matière la moins réussie')!;
    expect(bas.valeur).toBe('Mathématiques');
    expect(bas.ton).toBe('alerte');
  });

  it('nomme la plus forte progression et le plus fort recul', () => {
    test(PARLER, p(0), [[a, 4]]);
    test(PARLER, p(1), [[a, 8]]);
    test(ARITH, p(0), [[a, 9]]);
    test(ARITH, p(1), [[a, 6]]);
    const faits = faitsSaillants(stats(1));
    expect(faits.find((x) => x.titre === 'Plus forte progression')!.valeur).toBe('Français');
    expect(faits.find((x) => x.titre === 'Plus fort recul')!.valeur).toBe('Mathématiques');
  });

  it('nomme le test le plus difficile et la matière la plus évaluée', () => {
    test(PARLER, p(0), [[a, 9]], 'Exposé');
    test(LIRE, p(0), [[a, 2]], 'Lecture silencieuse');
    test(ARITH, p(0), [[a, 6]], 'Calcul');
    const faits = faitsSaillants(stats());
    expect(faits.find((x) => x.titre === 'Test le plus difficile')!.valeur).toBe(
      'Lecture silencieuse',
    );
    const evalue = faits.find((x) => x.titre === 'Matière la plus évaluée')!;
    expect(evalue.valeur).toBe('Français');
    expect(evalue.detail).toBe('2 tests sur 3 cette période');
  });
});
