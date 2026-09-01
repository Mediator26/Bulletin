import { describe, expect, it } from 'vitest';
import {
  arrondiDixieme,
  indexerTests,
  moyenneAnnuelle,
  resultatsParRubrique,
  scoreRubrique,
  scoreRubriqueArbre,
} from '../src/domaine/calcul.js';
import type { Resultat, Rubrique, Test } from '../src/domaine/modele.js';

const test = (id: string, maximum: number, rubrique_id = 'r', periode_id = 'p1'): Test => ({
  id,
  periode_id,
  rubrique_id,
  libelle: id,
  maximum,
  ordre: 0,
});

const resultat = (
  test_id: string,
  valeur: number | null,
  statut: Resultat['statut'] = 'presente',
  eleve_id = 'e1',
): Resultat => ({ test_id, eleve_id, valeur, statut });

describe('scoreRubrique — prorata des tests présentés', () => {
  const tests = indexerTests([test('t1', 10), test('t2', 10), test('t3', 20)]);

  it('rapporte les points obtenus au maximum de la rubrique', () => {
    const r = [resultat('t1', 8), resultat('t2', 6), resultat('t3', 14)];
    // 28 / 40 × 40 = 28
    expect(scoreRubrique(r, tests, 40)).toBe(28);
  });

  it('exclut de la base un test non présenté', () => {
    const r = [resultat('t1', 8), resultat('t2', null, 'absent'), resultat('t3', 14)];
    // 22 / 30 × 40 = 29,3
    expect(scoreRubrique(r, tests, 40)).toBe(29.3);
  });

  it('exclut aussi une dispense', () => {
    const r = [resultat('t1', 8), resultat('t3', null, 'dispense')];
    // 8 / 10 × 40 = 32
    expect(scoreRubrique(r, tests, 40)).toBe(32);
  });

  it('compte un 0 légitime dans la base (défaut n° 8 du classeur)', () => {
    const r = [resultat('t1', 0), resultat('t2', 10)];
    // 10 / 20 × 40 = 20 — le classeur, lui, sortait le 0 de la base et donnait 40
    expect(scoreRubrique(r, tests, 40)).toBe(20);
  });

  it('rend null pour un élève entièrement absent, jamais 0', () => {
    const r = [resultat('t1', null, 'absent'), resultat('t2', null, 'absent')];
    expect(scoreRubrique(r, tests, 40)).toBeNull();
  });

  it('rend null pour une rubrique sans aucun test encodé', () => {
    expect(scoreRubrique([], tests, 40)).toBeNull();
  });

  it('rend null si la base est nulle (tests de maximum 0)', () => {
    const zero = indexerTests([test('t0', 0)]);
    expect(scoreRubrique([resultat('t0', 0)], zero, 40)).toBeNull();
  });

  it('arrondit à une décimale', () => {
    const t = indexerTests([test('t1', 3)]);
    // 1 / 3 × 10 = 3,333… → 3,3
    expect(scoreRubrique([resultat('t1', 1)], t, 10)).toBe(3.3);
  });
});

describe('arrondiDixieme', () => {
  it("ne subit pas l'erreur de représentation binaire", () => {
    expect(arrondiDixieme(0.45)).toBe(0.5);
    expect(arrondiDixieme(1.25)).toBe(1.3);
  });
});

describe('scoreRubriqueArbre — agrégation Français → sous-rubriques', () => {
  const rubriques: Rubrique[] = [
    { id: 'fr', annee_id: 'a', parent_id: null, libelle: 'Français', maximum: 100, type: 'points', ordre: 1 },
    { id: 'parler', annee_id: 'a', parent_id: 'fr', libelle: 'Parler', maximum: 10, type: 'points', ordre: 1 },
    { id: 'ecouter', annee_id: 'a', parent_id: 'fr', libelle: 'Écouter', maximum: 10, type: 'points', ordre: 2 },
    { id: 'lire', annee_id: 'a', parent_id: 'fr', libelle: 'Lire-écrire', maximum: 40, type: 'points', ordre: 3 },
    { id: 'compo', annee_id: 'a', parent_id: null, libelle: 'Comportement', maximum: 0, type: 'echelle', ordre: 9 },
  ];
  const tests = indexerTests([
    test('tp', 10, 'parler'),
    test('te', 20, 'ecouter'),
    test('tl', 40, 'lire'),
  ]);

  it('somme les sous-rubriques cotées', () => {
    const index = new Map([
      ['parler', [resultat('tp', 9)]],
      ['ecouter', [resultat('te', 15)]], // 15/20 × 10 = 7,5
      ['lire', [resultat('tl', 30)]],
    ]);
    expect(scoreRubriqueArbre('fr', rubriques, tests, index)).toBe(46.5);
  });

  it('ignore une sous-rubrique non encodée sans annuler le total', () => {
    const index = new Map([['parler', [resultat('tp', 9)]]]);
    expect(scoreRubriqueArbre('fr', rubriques, tests, index)).toBe(9);
  });

  it("rend null quand aucune sous-rubrique n'est encodée", () => {
    expect(scoreRubriqueArbre('fr', rubriques, tests, new Map())).toBeNull();
  });

  it('rend null pour une rubrique à échelle littérale', () => {
    expect(scoreRubriqueArbre('compo', rubriques, tests, new Map())).toBeNull();
  });

  it('rend null pour une rubrique inconnue', () => {
    expect(scoreRubriqueArbre('inexistante', rubriques, tests, new Map())).toBeNull();
  });
});

describe('resultatsParRubrique — cloisonnement élève et période', () => {
  const tests = indexerTests([test('t1', 10, 'r', 'p1'), test('t2', 10, 'r', 'p2')]);

  it('ne mélange pas les résultats de deux élèves (défaut n° 1 du classeur)', () => {
    const tous = [resultat('t1', 8, 'presente', 'e1'), resultat('t1', 3, 'presente', 'e2')];
    const index = resultatsParRubrique('e2', 'p1', tests, tous);
    expect(index.get('r')).toEqual([tous[1]]);
  });

  it('rend une table vide pour un élève sans résultat, jamais ceux du voisin', () => {
    const tous = [resultat('t1', 8, 'presente', 'e1')];
    expect(resultatsParRubrique('e33', 'p1', tests, tous).size).toBe(0);
  });

  it("écarte les tests d'une autre période", () => {
    const tous = [resultat('t1', 8), resultat('t2', 2)];
    expect(resultatsParRubrique('e1', 'p1', tests, tous).get('r')).toEqual([tous[0]]);
  });

  it('ignore un résultat orphelin dont le test a été supprimé', () => {
    expect(resultatsParRubrique('e1', 'p1', tests, [resultat('disparu', 5)]).size).toBe(0);
  });
});

describe('moyenneAnnuelle', () => {
  it('reste vide avec une seule période complétée', () => {
    expect(moyenneAnnuelle([62, null, null])).toBeNull();
  });

  it('moyenne les seules périodes complétées', () => {
    expect(moyenneAnnuelle([60, 70, null])).toBe(65);
  });

  it('reste vide sans aucune période', () => {
    expect(moyenneAnnuelle([null, null, null])).toBeNull();
  });

  it('arrondit à une décimale', () => {
    expect(moyenneAnnuelle([60, 65, 71])).toBe(65.3);
  });
});
