import { describe, expect, it } from 'vitest';
import {
  deplacer,
  estToucheDeNavigation,
  idCellule,
  reborner,
  type Dimensions,
} from '../src/domaine/navigation.js';

const grille: Dimensions = { lignes: 3, colonnes: 4 }; // 3 élèves, 4 tests
const en = (ligne: number, colonne: number) => ({ ligne, colonne });

describe('deplacer — flèches', () => {
  it('se déplace dans les quatre directions', () => {
    expect(deplacer(en(1, 1), { key: 'ArrowUp' }, grille)).toEqual(en(0, 1));
    expect(deplacer(en(1, 1), { key: 'ArrowDown' }, grille)).toEqual(en(2, 1));
    expect(deplacer(en(1, 1), { key: 'ArrowLeft' }, grille)).toEqual(en(1, 0));
    expect(deplacer(en(1, 1), { key: 'ArrowRight' }, grille)).toEqual(en(1, 2));
  });

  it('bute sur les bords sans enrouler', () => {
    expect(deplacer(en(0, 0), { key: 'ArrowUp' }, grille)).toEqual(en(0, 0));
    expect(deplacer(en(0, 0), { key: 'ArrowLeft' }, grille)).toEqual(en(0, 0));
    expect(deplacer(en(2, 3), { key: 'ArrowDown' }, grille)).toEqual(en(2, 3));
    expect(deplacer(en(2, 3), { key: 'ArrowRight' }, grille)).toEqual(en(2, 3));
  });
});

describe('deplacer — Entrée descend dans la colonne', () => {
  it("passe à l'élève suivant pour le même test", () => {
    expect(deplacer(en(0, 2), { key: 'Enter' }, grille)).toEqual(en(1, 2));
  });

  it('repart en haut de la colonne suivante en bas de classe', () => {
    expect(deplacer(en(2, 1), { key: 'Enter' }, grille)).toEqual(en(0, 2));
  });

  it('reste sur la dernière cellule à la fin de la grille', () => {
    expect(deplacer(en(2, 3), { key: 'Enter' }, grille)).toEqual(en(2, 3));
  });

  it('remonte avec Maj+Entrée, y compris vers la colonne précédente', () => {
    expect(deplacer(en(1, 2), { key: 'Enter', shiftKey: true }, grille)).toEqual(en(0, 2));
    expect(deplacer(en(0, 2), { key: 'Enter', shiftKey: true }, grille)).toEqual(en(2, 1));
    expect(deplacer(en(0, 0), { key: 'Enter', shiftKey: true }, grille)).toEqual(en(0, 0));
  });
});

describe('deplacer — Tab parcourt la ligne', () => {
  it('passe au test suivant du même élève', () => {
    expect(deplacer(en(1, 0), { key: 'Tab' }, grille)).toEqual(en(1, 1));
  });

  it("enroule vers l'élève suivant en fin de ligne", () => {
    expect(deplacer(en(1, 3), { key: 'Tab' }, grille)).toEqual(en(2, 0));
  });

  it('revient en arrière avec Maj+Tab', () => {
    expect(deplacer(en(1, 0), { key: 'Tab', shiftKey: true }, grille)).toEqual(en(0, 3));
    expect(deplacer(en(0, 0), { key: 'Tab', shiftKey: true }, grille)).toEqual(en(0, 0));
  });
});

describe('deplacer — raccourcis de bord', () => {
  it('Home et End parcourent la ligne, Ctrl les étend à la grille', () => {
    expect(deplacer(en(1, 2), { key: 'Home' }, grille)).toEqual(en(1, 0));
    expect(deplacer(en(1, 2), { key: 'End' }, grille)).toEqual(en(1, 3));
    expect(deplacer(en(1, 2), { key: 'Home', ctrlKey: true }, grille)).toEqual(en(0, 0));
    expect(deplacer(en(1, 2), { key: 'End', ctrlKey: true }, grille)).toEqual(en(2, 3));
  });

  it('PageUp et PageDown parcourent la colonne', () => {
    expect(deplacer(en(1, 2), { key: 'PageUp' }, grille)).toEqual(en(0, 2));
    expect(deplacer(en(1, 2), { key: 'PageDown' }, grille)).toEqual(en(2, 2));
  });
});

describe('deplacer — cas limites', () => {
  it('rend null pour une touche de saisie, que le composant laisse passer', () => {
    expect(deplacer(en(0, 0), { key: '7' }, grille)).toBeNull();
    expect(deplacer(en(0, 0), { key: 'Backspace' }, grille)).toBeNull();
  });

  it('rend null sur une grille vide, sans élève ni test', () => {
    expect(deplacer(en(0, 0), { key: 'ArrowDown' }, { lignes: 0, colonnes: 0 })).toBeNull();
    expect(deplacer(en(0, 0), { key: 'Tab' }, { lignes: 3, colonnes: 0 })).toBeNull();
  });

  it('reconnaît les touches prises en charge', () => {
    expect(estToucheDeNavigation({ key: 'ArrowDown' }, grille)).toBe(true);
    expect(estToucheDeNavigation({ key: 'a' }, grille)).toBe(false);
  });
});

describe('reborner', () => {
  it("ramène la sélection dans la grille après suppression d'un élève", () => {
    expect(reborner(en(9, 9), grille)).toEqual(en(2, 3));
  });

  it('ne descend jamais sous zéro sur une grille vide', () => {
    expect(reborner(en(2, 2), { lignes: 0, colonnes: 0 })).toEqual(en(0, 0));
  });
});

describe('idCellule', () => {
  it('produit un identifiant stable', () => {
    expect(idCellule(en(2, 5))).toBe('cellule-grille-2-5');
    expect(idCellule(en(2, 5), 'francais')).toBe('cellule-francais-2-5');
    expect(idCellule(en(0, 0), 'francais')).not.toBe(idCellule(en(0, 0), 'maths'));
  });
});

describe('cohabitation avec les raccourcis du navigateur', () => {
  it('laisse passer Ctrl+A, qui sélectionne le contenu de la cellule', () => {
    expect(deplacer(en(0, 0), { key: 'a', ctrlKey: true }, grille)).toBeNull();
  });
});
