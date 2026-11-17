import { describe, expect, it } from 'vitest';
import { accesStatistiques, estRaccourciStatistiques } from '../src/etat/acces.svelte.js';

const touche = (o: Partial<KeyboardEvent>) =>
  estRaccourciStatistiques({ ctrlKey: false, altKey: false, metaKey: false, repeat: false, code: '', ...o });

describe('accès discret aux statistiques', () => {
  it('reconnaît Ctrl + Alt + S, quelle que soit la disposition du clavier', () => {
    expect(touche({ ctrlKey: true, altKey: true, code: 'KeyS' })).toBe(true);
    expect(touche({ ctrlKey: true, code: 'KeyS' })).toBe(false);
    expect(touche({ altKey: true, code: 'KeyS' })).toBe(false);
    expect(touche({ ctrlKey: true, altKey: true, code: 'KeyD' })).toBe(false);
    expect(touche({ ctrlKey: true, altKey: true, code: 'KeyS', repeat: true })).toBe(false);
  });

  it('bascule après cinq touches rapides sur la version, pas avant', () => {
    const avant = accesStatistiques.actif;
    for (let i = 0; i < 4; i++) expect(accesStatistiques.toucherVersion(1000 + i * 200)).toBe(false);
    expect(accesStatistiques.toucherVersion(1800)).toBe(true);
    expect(accesStatistiques.actif).toBe(!avant);
  });

  it('oublie les touches trop espacées', () => {
    const avant = accesStatistiques.actif;
    for (let i = 0; i < 5; i++) expect(accesStatistiques.toucherVersion(10_000 + i * 3000)).toBe(false);
    expect(accesStatistiques.actif).toBe(avant);
  });
});
