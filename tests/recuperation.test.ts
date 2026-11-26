import { describe, expect, it } from 'vitest';
import {
  COPIES_MAXIMUM,
  decrireMoment,
  deposerSauvetage,
  listerSauvetages,
  retirerSauvetage,
  type Sauvetage,
  type Stockage,
} from '../src/donnees/recuperation.js';

/** Double de `localStorage`, avec une capacité en caractères pour simuler un stockage plein. */
class StockageMemoire implements Stockage {
  readonly donnees = new Map<string, string>();
  constructor(private readonly capacite = Infinity) {}
  get length() {
    return this.donnees.size;
  }
  key(i: number) {
    return [...this.donnees.keys()][i] ?? null;
  }
  getItem(c: string) {
    return this.donnees.get(c) ?? null;
  }
  setItem(c: string, v: string) {
    const occupe = [...this.donnees].reduce((s, [k, x]) => s + (k === c ? 0 : x.length), 0);
    if (occupe + v.length > this.capacite) throw new DOMException('plein', 'QuotaExceededError');
    this.donnees.set(c, v);
  }
  removeItem(c: string) {
    this.donnees.delete(c);
  }
}

const copie = (id: string, heure: number, contenu = '{}'): Sauvetage => ({
  id,
  nomFichier: `${id}.json`,
  horodatage: new Date(Date.UTC(2026, 10, 25, heure)).toISOString(),
  resume: '3 élèves',
  contenu,
});

describe('filet de récupération (C2)', () => {
  it('liste les copies de la plus récente à la plus ancienne', () => {
    const s = new StockageMemoire();
    deposerSauvetage(s, copie('a', 8));
    deposerSauvetage(s, copie('b', 10));
    deposerSauvetage(s, copie('c', 9));
    expect(listerSauvetages(s).map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });

  it('remplace la copie d’une même séance au lieu d’en empiler', () => {
    const s = new StockageMemoire();
    deposerSauvetage(s, copie('a', 8, '{"v":1}'));
    deposerSauvetage(s, copie('a', 9, '{"v":2}'));
    const liste = listerSauvetages(s);
    expect(liste).toHaveLength(1);
    expect(liste[0]!.contenu).toBe('{"v":2}');
  });

  it('retire une copie', () => {
    const s = new StockageMemoire();
    deposerSauvetage(s, copie('a', 8));
    retirerSauvetage(s, 'a');
    expect(listerSauvetages(s)).toEqual([]);
  });

  it('ignore les autres clés et les entrées illisibles', () => {
    const s = new StockageMemoire();
    s.setItem('bulletin.theme', 'sombre');
    s.setItem('bulletin.recuperation.x', 'pas du json');
    deposerSauvetage(s, copie('a', 8));
    expect(listerSauvetages(s).map((x) => x.id)).toEqual(['a']);
  });

  it(`ne garde pas plus de ${COPIES_MAXIMUM} séances, en sacrifiant les plus anciennes`, () => {
    const s = new StockageMemoire();
    for (let i = 0; i < COPIES_MAXIMUM + 2; i++) deposerSauvetage(s, copie(`s${i}`, i));
    const ids = listerSauvetages(s).map((x) => x.id);
    expect(ids).toHaveLength(COPIES_MAXIMUM);
    expect(ids).not.toContain('s0');
    expect(ids).not.toContain('s1');
  });

  it('fait de la place quand le stockage est plein, au détriment des autres séances', () => {
    const gros = 'x'.repeat(400);
    const s = new StockageMemoire(1200);
    deposerSauvetage(s, copie('ancienne', 1, gros));
    deposerSauvetage(s, copie('recente', 2, gros));
    expect(deposerSauvetage(s, copie('courante', 3, gros))).toBe(true);
    expect(listerSauvetages(s).map((x) => x.id)).toEqual(['courante', 'recente']);
  });

  it('renonce sans lever quand même seule la copie ne tient pas', () => {
    const s = new StockageMemoire(10);
    expect(deposerSauvetage(s, copie('a', 1, 'x'.repeat(100)))).toBe(false);
  });

  it('ne lève jamais sans stockage', () => {
    expect(deposerSauvetage(null, copie('a', 1))).toBe(false);
    expect(listerSauvetages(null)).toEqual([]);
    expect(() => retirerSauvetage(null, 'a')).not.toThrow();
  });

  it('décrit le moment d’une copie en français', () => {
    const iso = new Date(2026, 10, 24, 14, 5).toISOString();
    expect(decrireMoment(iso)).toBe('mardi 24 novembre à 14 h 05');
  });
});
