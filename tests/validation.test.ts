import { describe, expect, it } from 'vitest';
import { normaliserSaisie, validerPoints } from '../src/domaine/validation.js';

const t = { maximum: 10, libelle: 'Dictée' };

describe('validerPoints', () => {
  it('accepte une valeur dans les bornes', () => {
    expect(validerPoints('7', t)).toEqual({ ok: true, valeur: 7 });
  });

  it('accepte la virgule décimale', () => {
    expect(validerPoints('7,5', t)).toEqual({ ok: true, valeur: 7.5 });
  });

  it('traite une saisie vide comme « non encodé », pas comme 0', () => {
    expect(validerPoints('  ', t)).toEqual({ ok: true, valeur: null });
  });

  it('accepte un 0 explicite', () => {
    expect(validerPoints('0', t)).toEqual({ ok: true, valeur: 0 });
  });

  it('refuse un dépassement du maximum du test', () => {
    expect(validerPoints('15', t).ok).toBe(false);
  });

  it('refuse une saisie non numérique', () => {
    expect(validerPoints('abc', t).ok).toBe(false);
  });

  it('refuse une valeur négative', () => {
    expect(validerPoints('-2', t).ok).toBe(false);
  });
});

describe('normaliserSaisie — remplacement d’une cellule marquée', () => {
  it('retire le marqueur d’absence avant la valeur tapée', () => {
    expect(normaliserSaisie('abs7,5')).toBe('7,5');
    expect(normaliserSaisie('disp8')).toBe('8');
  });

  it('laisse une saisie ordinaire intacte', () => {
    expect(normaliserSaisie('7,5')).toBe('7,5');
    expect(normaliserSaisie('')).toBe('');
  });

  it('permet à validerPoints d’accepter une valeur tapée sur une cellule marquée', () => {
    expect(validerPoints('abs7,5', t)).toEqual({ ok: true, valeur: 7.5 });
    expect(validerPoints('disp0', t)).toEqual({ ok: true, valeur: 0 });
  });

  it('vérifie toujours le maximum après nettoyage', () => {
    expect(validerPoints('abs15', t).ok).toBe(false);
  });
});
