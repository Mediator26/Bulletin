import { describe, expect, it } from 'vitest';
import {
  encombrement,
  lignesCommentaire,
  lignesConseillees,
  lignesVerso,
  versoDeborde,
} from '../src/domaine/commentaire.js';
import type { Periode } from '../src/domaine/modele.js';

const PHRASE =
  'Léa progresse bien en lecture et participe volontiers aux activités de la classe. ';
const texte = (n: number) => PHRASE.repeat(Math.ceil(n / PHRASE.length)).slice(0, n);
const periode = (numero: number): Periode => ({ id: `p${numero}`, annee_id: 'a', numero, date_bulletin: '' });

/** Verso du bulletin de la période `commentaires.length`, les précédents rappelés. */
const verso = (...commentaires: string[]) => ({
  commentaire: commentaires.at(-1)!,
  commentairesAnterieurs: commentaires
    .slice(0, -1)
    .map((t, i) => ({ periode: periode(i + 1), texte: t }))
    .filter((c) => c.texte.trim() !== ''),
});

describe('place des commentaires au verso', () => {
  it('un commentaire vide n’occupe rien, un mot occupe une ligne', () => {
    expect(lignesCommentaire('')).toBe(0);
    expect(lignesCommentaire('  \n ')).toBe(0);
    expect(lignesCommentaire('Bien.')).toBe(1);
  });

  it('un retour à la ligne consomme une ligne entière', () => {
    expect(lignesCommentaire('Bien.\nTrès bien.\nParfait.')).toBe(3);
    expect(lignesCommentaire('Bien.\n\nParfait.')).toBe(3);
  });

  it('un long paragraphe se replie', () => {
    expect(lignesCommentaire(texte(500))).toBe(5);
  });

  it('compte le surcoût des blocs rappelés', () => {
    expect(lignesVerso(verso('Bien.'))).toBe(1);
    expect(lignesVerso(verso('Bien.', 'Bien.', 'Bien.'))).toBe(3 + 2 * 4.5);
  });

  // Cas relevés sur de vraies impressions PDF (voir l'en-tête du module).
  describe('calibrage sur impression réelle', () => {
    it('51 lignes courtes tiennent seules, 52 débordent', () => {
      const lignes = (k: number) => Array.from({ length: k }, () => 'Bien.').join('\n');
      expect(versoDeborde(verso(lignes(51)))).toBe(false);
      expect(versoDeborde(verso(lignes(52)))).toBe(true);
    });

    it('trois commentaires de 14 lignes tiennent au bulletin de la 3ᵉ période, pas de 15', () => {
      const lignes = (k: number) => Array.from({ length: k }, () => 'Bien.').join('\n');
      expect(versoDeborde(verso(lignes(14), lignes(14), lignes(14)))).toBe(false);
      expect(versoDeborde(verso(lignes(15), lignes(15), lignes(15)))).toBe(true);
    });

    it('prévient un peu avant la limite mesurée, jamais après', () => {
      // Mesuré : un commentaire seul déborde au-delà de ≈ 5 835 caractères.
      expect(versoDeborde(verso(texte(5500)))).toBe(false);
      expect(versoDeborde(verso(texte(5900)))).toBe(true);
      // Mesuré : trois commentaires débordent au-delà de ≈ 1 609 caractères chacun.
      expect(versoDeborde(verso(texte(1500), texte(1500), texte(1500)))).toBe(false);
      expect(versoDeborde(verso(texte(1650), texte(1650), texte(1650)))).toBe(true);
    });
  });

  it('conseille une part qui laisse tenir le bulletin de la dernière période', () => {
    expect(lignesConseillees(3)).toBe(14);
    expect(lignesConseillees(1)).toBe(51);
    const part = Array.from({ length: lignesConseillees(3) }, () => 'Bien.').join('\n');
    expect(versoDeborde(verso(part, part, part))).toBe(false);
  });

  it('distingue un commentaire long d’un verso qui déborde', () => {
    expect(encombrement('Bien.', verso('Bien.'), 3)).toBe('ok');
    expect(encombrement(texte(2000), verso(texte(2000)), 3)).toBe('long');
    expect(encombrement(texte(3000), verso(texte(3000), texte(3000)), 3)).toBe('deborde');
  });
});
