import { describe, expect, it } from 'vitest';
import paquet from '../package.json';
import { dateEnClair, NOUVEAUTES, texteChangelog } from '../src/nouveautes.js';

/** « 1.10.0 » se compare nombre à nombre, pas comme du texte. */
const comparer = (a: string, b: string) => {
  const [x, y] = [a, b].map((v) => v.split('.').map(Number));
  for (let i = 0; i < 3; i++) if (x![i] !== y![i]) return x![i]! - y![i]!;
  return 0;
};

describe('nouveautés', () => {
  it('commencent par la version de package.json, celle qu’affiche l’application', () => {
    expect(NOUVEAUTES[0]!.version).toBe(paquet.version);
  });

  it('vont de la plus récente à la plus ancienne, sans doublon', () => {
    for (let i = 1; i < NOUVEAUTES.length; i++) {
      expect(comparer(NOUVEAUTES[i - 1]!.version, NOUVEAUTES[i]!.version)).toBeGreaterThan(0);
      expect(NOUVEAUTES[i - 1]!.date >= NOUVEAUTES[i]!.date).toBe(true);
    }
  });

  it('restent courtes : au plus cinq points par version', () => {
    for (const v of NOUVEAUTES) {
      expect(v.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(v.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(v.points.length).toBeGreaterThan(0);
      expect(v.points.length).toBeLessThanOrEqual(5);
    }
  });

  it('écrivent la date en clair', () => {
    expect(dateEnClair('2026-11-26')).toBe('26 novembre 2026');
    expect(dateEnClair('2026-09-01')).toBe('1er septembre 2026');
  });

  it('produisent le CHANGELOG.txt du Drive', () => {
    const texte = texteChangelog([
      { version: '1.1.0', date: '2027-01-08', points: ['Un.', 'Deux.'] },
      { version: '1.0.0', date: '2026-11-26', points: ['Trois.'] },
    ]);
    expect(texte).toBe(
      'Bulletin scolaire — nouveautés de chaque version\n\n'
        + 'Version 1.1.0 — 8 janvier 2027\n  - Un.\n  - Deux.\n\n'
        + 'Version 1.0.0 — 26 novembre 2026\n  - Trois.\n',
    );
  });
});
