import { describe, expect, it } from 'vitest';
import {
  cheminLibelle,
  periodesReference,
  rubriquesReference,
  rubriquesSaisissables,
} from '../src/domaine/referentiel.js';
import { scoreRubriqueArbre } from '../src/domaine/calcul.js';

const rubriques = rubriquesReference('a1');
const parCle = (id: string) => rubriques.find((r) => r.id === id)!;

describe('rubriquesReference — barème du §1.1', () => {
  it('respecte les maxima des branches', () => {
    expect(parCle('francais').maximum).toBe(100);
    expect(parCle('mathematiques').maximum).toBe(100);
    expect(parCle('eveil').maximum).toBe(100);
    expect(parCle('education-physique').maximum).toBe(20);
    expect(parCle('neerlandais').maximum).toBe(20);
  });

  it('a des sous-rubriques dont la somme fait le maximum de la branche', () => {
    for (const branche of ['francais', 'mathematiques', 'eveil']) {
      const somme = rubriques
        .filter((r) => r.parent_id === branche)
        .reduce((s, r) => s + r.maximum, 0);
      expect(somme, branche).toBe(parCle(branche).maximum);
    }
  });

  it('détaille le Français en cinq sous-rubriques', () => {
    const enfants = rubriques.filter((r) => r.parent_id === 'francais');
    expect(enfants.map((r) => r.maximum)).toEqual([10, 10, 40, 20, 20]);
  });

  it('cote en échelle littérale Religion/EPC, PECA/FMTT et le comportement', () => {
    const echelles = rubriques.filter((r) => r.type === 'echelle').map((r) => r.id);
    expect(echelles).toEqual(['religion-epc', 'peca-fmtt', 'comportement']);
  });

  it('rattache toutes les rubriques à l’année demandée', () => {
    expect(rubriques.every((r) => r.annee_id === 'a1')).toBe(true);
  });

  it('ne référence que des parents existants', () => {
    const ids = new Set(rubriques.map((r) => r.id));
    expect(rubriques.every((r) => r.parent_id === null || ids.has(r.parent_id))).toBe(true);
  });

  it('produit un référentiel indépendant à chaque appel', () => {
    const autre = rubriquesReference('a2');
    expect(autre[0]).not.toBe(rubriques[0]);
    expect(autre.every((r) => r.annee_id === 'a2')).toBe(true);
  });
});

describe('rubriquesSaisissables', () => {
  const feuilles = rubriquesSaisissables(rubriques);

  it('exclut les branches, qui sont des agrégations', () => {
    const ids = feuilles.map((r) => r.id);
    expect(ids).not.toContain('francais');
    expect(ids).toContain('francais.parler');
  });

  it('exclut les rubriques cotées en échelle', () => {
    expect(feuilles.some((r) => r.type === 'echelle')).toBe(false);
  });

  it('garde les rubriques de premier niveau sans enfant', () => {
    expect(feuilles.map((r) => r.id)).toContain('education-physique');
  });

  it('trie selon la hiérarchie, Français avant Mathématiques', () => {
    const ids = feuilles.map((r) => r.id);
    expect(ids.indexOf('francais.parler')).toBeLessThan(ids.indexOf('mathematiques.arithmetique'));
    expect(ids.indexOf('francais.parler')).toBeLessThan(ids.indexOf('francais.ecrire'));
  });
});

describe('cheminLibelle', () => {
  it('affiche le chemin complet depuis la racine', () => {
    expect(cheminLibelle(parCle('francais.lire-ecrire'), rubriques)).toBe('Français › Lire-écrire');
  });

  it('se réduit au libellé pour une racine', () => {
    expect(cheminLibelle(parCle('neerlandais'), rubriques)).toBe('Néerlandais');
  });
});

describe('périodes', () => {
  it('crée les trois périodes de l’année', () => {
    expect(periodesReference('a1').map((p) => p.numero)).toEqual([1, 2, 3]);
  });

  it('laisse les dates vides, pour ne pas reconduire une date en dur (erreur n° 5)', () => {
    expect(periodesReference('a1').every((p) => p.date_bulletin === '')).toBe(true);
  });
});

describe('intégration référentiel + moteur', () => {
  it('agrège un Français vide en null, jamais en 0', () => {
    expect(scoreRubriqueArbre('francais', rubriques, new Map(), new Map())).toBeNull();
  });

  it('additionne les sous-rubriques cotées du Français', () => {
    const tests = new Map([
      ['t1', { id: 't1', periode_id: 'p1', rubrique_id: 'francais.parler', libelle: 'Exposé', maximum: 20, ordre: 1 }],
      ['t2', { id: 't2', periode_id: 'p1', rubrique_id: 'francais.ecrire', libelle: 'Dictée', maximum: 10, ordre: 1 }],
    ]);
    const resultats = new Map([
      ['francais.parler', [{ test_id: 't1', eleve_id: 'e1', valeur: 15, statut: 'presente' as const }]],
      ['francais.ecrire', [{ test_id: 't2', eleve_id: 'e1', valeur: 5, statut: 'presente' as const }]],
    ]);
    // Parler : 15/20 × 10 = 7,5 · Écrire : 5/10 × 20 = 10
    expect(scoreRubriqueArbre('francais', rubriques, tests, resultats)).toBe(17.5);
  });
});
