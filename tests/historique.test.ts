import { describe, expect, it } from 'vitest';
import { Historique } from '../src/etat/historique.js';

describe('Historique', () => {
  it('annule puis rétablit, en rendant les états dans l’ordre', () => {
    const h = new Historique();
    h.noter('A', { libelle: 'un' }, 0);
    h.noter('B', { libelle: 'deux' }, 1);
    // l’état actuel est C
    expect(h.aAnnuler).toBe('deux');
    expect(h.annuler('C')).toEqual({ etat: 'B', libelle: 'deux' });
    expect(h.annuler('B')).toEqual({ etat: 'A', libelle: 'un' });
    expect(h.annuler('A')).toBeNull();
    expect(h.retablir('A')).toEqual({ etat: 'B', libelle: 'un' });
    expect(h.retablir('B')).toEqual({ etat: 'C', libelle: 'deux' });
    expect(h.retablir('C')).toBeNull();
  });

  it('regroupe la frappe d’une même cellule en une seule étape', () => {
    const h = new Historique();
    h.noter('vide', { libelle: 'note', groupe: 'cellule-1' }, 0);
    h.noter('1', { libelle: 'note', groupe: 'cellule-1' }, 200);
    expect(h.annuler('15')).toEqual({ etat: 'vide', libelle: 'note' });
    expect(h.aAnnuler).toBeNull();
  });

  it('sépare deux cellules, et une reprise tardive de la même cellule', () => {
    const h = new Historique(50, 1000);
    h.noter('A', { libelle: 'x', groupe: 'c1' }, 0);
    h.noter('B', { libelle: 'y', groupe: 'c2' }, 10);
    h.noter('C', { libelle: 'y', groupe: 'c2' }, 5000);
    expect(h.annuler('D')?.etat).toBe('C');
    expect(h.annuler('C')?.etat).toBe('B');
    expect(h.annuler('B')?.etat).toBe('A');
  });

  it('ne regroupe pas une saisie qui suit une annulation', () => {
    const h = new Historique();
    h.noter('A', { libelle: 'x', groupe: 'c1' }, 0);
    h.annuler('B');
    h.noter('A', { libelle: 'x', groupe: 'c1' }, 10);
    expect(h.aAnnuler).toBe('x');
    expect(h.annuler('A2')?.etat).toBe('A');
  });

  it('oublie ce qui était à rétablir dès qu’une nouvelle action arrive', () => {
    const h = new Historique();
    h.noter('A', { libelle: 'x' }, 0);
    h.annuler('B');
    h.noter('A', { libelle: 'autre' }, 1);
    expect(h.aRetablir).toBeNull();
  });

  it('ne garde que les dernières étapes', () => {
    const h = new Historique(3);
    for (const [i, e] of ['A', 'B', 'C', 'D'].entries()) h.noter(e, { libelle: e }, i);
    expect(h.annuler('E')?.etat).toBe('D');
    expect(h.annuler('D')?.etat).toBe('C');
    expect(h.annuler('C')?.etat).toBe('B');
    expect(h.annuler('B')).toBeNull();
  });
});
