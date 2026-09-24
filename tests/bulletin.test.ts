import { beforeEach, describe, expect, it } from 'vitest';
import {
  afficherDate,
  afficherScore,
  construireBulletin,
  titrePdf,
} from '../src/domaine/bulletin.js';
import { classeVierge } from '../src/donnees/persistance.js';
import { periodesReference, rubriquesReference } from '../src/domaine/referentiel.js';
import {
  ajouterEleve,
  ajouterTest,
  definirCommentaire,
  definirCotation,
  definirResultat,
} from '../src/domaine/mutations.js';
import type { Eleve, FichierClasse } from '../src/domaine/modele.js';

let f: FichierClasse;
let eleve: Eleve;

beforeEach(() => {
  f = classeVierge({
    libelleAnnee: '2025-2026',
    ecole: 'Momignies',
    titulaire: 'C. Dubois',
    version: '0',
  });
  f.rubriques = rubriquesReference(f.annee.id);
  f.periodes = periodesReference(f.annee.id);
  eleve = ajouterEleve(f, { nom: 'Martin', prenom: 'Léa' });
});

const p = (index: number) => f.periodes[index]!.id;
const ligne = (b: ReturnType<typeof construireBulletin>, id: string) =>
  b!.lignes.find((l) => l.rubrique_id === id)!;

/** Encode un test « sur 10 » et le résultat de l'élève, pour une rubrique donnée. */
function coter(rubrique: string, periode: string, valeur: number | null, statut?: 'absent') {
  const test = ajouterTest(f, { periode_id: periode, rubrique_id: rubrique, libelle: 'T', maximum: 10 });
  definirResultat(f, test.id, eleve.id, valeur, statut ?? 'presente');
}

describe('récapitulatif des périodes précédentes', () => {
  it('ne rappelle rien sur le bulletin de la première période', () => {
    const b = construireBulletin(f, eleve.id, p(0))!;
    expect(b.periodesAnterieures).toEqual([]);
    expect(b.lignes.every((l) => l.scoresAnterieurs.length === 0)).toBe(true);
  });

  it('rappelle toutes les périodes précédentes, dès la deuxième', () => {
    expect(construireBulletin(f, eleve.id, p(1))!.periodesAnterieures.map((x) => x.numero)).toEqual([
      1,
    ]);
    expect(construireBulletin(f, eleve.id, p(2))!.periodesAnterieures.map((x) => x.numero)).toEqual([
      1, 2,
    ]);
  });

  it('reprend les points déjà cotés à côté de ceux de la période', () => {
    const parler = f.rubriques.find((r) => r.libelle === 'Parler')!;
    coter(parler.id, p(0), 6);
    coter(parler.id, p(1), 8);
    coter(parler.id, p(2), 9);

    const b = construireBulletin(f, eleve.id, p(2))!;
    const l = ligne(b, parler.id);
    // Le test vaut 10, la sous-rubrique aussi : le score est la note brute.
    expect(l.scoresAnterieurs).toEqual([6, 8]);
    expect(l.score).toBe(9);
  });

  it('laisse « — » à une période rappelée sans encodage, jamais 0', () => {
    coter('neerlandais', p(0), 5); // 5/10 × 20 = 10
    const b = construireBulletin(f, eleve.id, p(2))!;
    expect(ligne(b, 'neerlandais').scoresAnterieurs).toEqual([10, null]);
  });

  it('rappelle les cotations littérales des périodes précédentes', () => {
    definirCotation(f, 'comportement', eleve.id, p(0), 'TB');
    definirCotation(f, 'comportement', eleve.id, p(2), 'B');

    const b = construireBulletin(f, eleve.id, p(2))!;
    const l = ligne(b, 'comportement');
    expect(l.cotationsAnterieures).toEqual(['TB', null]);
    expect(l.cotation).toBe('B');
  });

  it('rappelle les commentaires des périodes précédentes, dans l’ordre', () => {
    definirCommentaire(f, eleve.id, p(0), 'Trimestre solide.');
    definirCommentaire(f, eleve.id, p(1), 'Doit persévérer.');
    definirCommentaire(f, eleve.id, p(2), 'Belle progression.');

    const b = construireBulletin(f, eleve.id, p(2))!;
    expect(b.commentairesAnterieurs.map((c) => [c.periode.numero, c.texte])).toEqual([
      [1, 'Trimestre solide.'],
      [2, 'Doit persévérer.'],
    ]);
    expect(b.commentaire).toBe('Belle progression.');
  });

  it('omet une période précédente restée sans commentaire', () => {
    definirCommentaire(f, eleve.id, p(1), 'Doit persévérer.');
    const b = construireBulletin(f, eleve.id, p(2))!;
    expect(b.commentairesAnterieurs.map((c) => c.periode.numero)).toEqual([2]);
  });
});

describe('construireBulletin — structure', () => {
  it('rend null pour un élève ou une période inconnus', () => {
    expect(construireBulletin(f, 'fantome', p(0))).toBeNull();
    expect(construireBulletin(f, eleve.id, 'p-inexistante')).toBeNull();
  });

  it('reprend l’identité de la classe', () => {
    const b = construireBulletin(f, eleve.id, p(0))!;
    expect(b.eleve.nom).toBe('Martin');
    expect(b.ecole).toBe('Momignies');
    expect(b.titulaire).toBe('C. Dubois');
    expect(b.anneeScolaire).toBe('2025-2026');
    expect(b.periode.numero).toBe(1);
  });

  it('imprime les sous-rubriques sous leur rubrique principale', () => {
    const b = construireBulletin(f, eleve.id, p(0))!;
    const index = b.lignes.findIndex((l) => l.rubrique_id === 'francais');
    expect(b.lignes[index]!.niveau).toBe(0);
    expect(b.lignes[index + 1]!.rubrique_id).toBe('francais.parler');
    expect(b.lignes[index + 1]!.niveau).toBe(1);
  });

  it('couvre toutes les rubriques du référentiel', () => {
    const b = construireBulletin(f, eleve.id, p(0))!;
    expect(b.lignes).toHaveLength(f.rubriques.length);
  });
});

describe('construireBulletin — scores', () => {
  it('laisse un bulletin vierge entièrement vide, sans aucun 0', () => {
    const b = construireBulletin(f, eleve.id, p(0))!;
    expect(b.lignes.every((l) => l.score === null)).toBe(true);
  });

  it('cote une matière au prorata de ses seules sous-rubriques évaluées', () => {
    coter('francais.ecrire', p(0), 8); // « Écrire » vaut 20 : 8/10 → 16/20
    const b = construireBulletin(f, eleve.id, p(0))!;
    expect(ligne(b, 'francais.ecrire').score).toBe(16);
    // Rien d'autre n'a été évalué en français : 16/20 se lit 80/100.
    expect(ligne(b, 'francais').score).toBe(80);
  });

  it('laisse les sous-rubriques non évaluées vides, sans les compter pour zéro', () => {
    coter('francais.ecrire', p(0), 8);
    const b = construireBulletin(f, eleve.id, p(0))!;
    expect(ligne(b, 'francais.parler').score).toBeNull();
    expect(ligne(b, 'francais.lire').score).toBeNull();
  });

  it('sort un test non présenté du calcul sans le transformer en 0', () => {
    coter('neerlandais', p(0), null, 'absent');
    const b = construireBulletin(f, eleve.id, p(0))!;
    expect(ligne(b, 'neerlandais').score).toBeNull();
  });

  it('laisse un 0 encodé peser dans la rubrique', () => {
    coter('neerlandais', p(0), 0);
    expect(ligne(construireBulletin(f, eleve.id, p(0)), 'neerlandais').score).toBe(0);
  });
});

describe('construireBulletin — moyenne annuelle', () => {
  it('reste vide au premier bulletin', () => {
    coter('neerlandais', p(0), 8);
    const b = construireBulletin(f, eleve.id, p(0))!;
    expect(ligne(b, 'neerlandais').moyenne).toBeNull();
  });

  it('apparaît dès la deuxième période complétée', () => {
    coter('neerlandais', p(0), 8); // 16 / 20
    coter('neerlandais', p(1), 6); // 12 / 20
    const b = construireBulletin(f, eleve.id, p(1))!;
    expect(ligne(b, 'neerlandais').score).toBe(12);
    expect(ligne(b, 'neerlandais').moyenne).toBe(14);
  });

  it('reste identique quelle que soit la période imprimée', () => {
    coter('neerlandais', p(0), 8);
    coter('neerlandais', p(1), 6);
    expect(ligne(construireBulletin(f, eleve.id, p(0)), 'neerlandais').moyenne).toBe(14);
  });
});

describe('construireBulletin — échelles et commentaires', () => {
  it('reporte la cotation littérale de la période', () => {
    definirCotation(f, 'comportement', eleve.id, p(0), 'TB');
    definirCotation(f, 'comportement', eleve.id, p(1), 'S');
    const b = construireBulletin(f, eleve.id, p(0))!;
    expect(ligne(b, 'comportement').cotation).toBe('TB');
    expect(ligne(b, 'comportement').score).toBeNull();
    expect(ligne(b, 'comportement').moyenne).toBeNull();
  });

  it('reporte le commentaire de la période dans la zone du jour', () => {
    definirCommentaire(f, eleve.id, p(0), 'Trimestre solide.');
    definirCommentaire(f, eleve.id, p(1), 'Doit persévérer.');
    expect(construireBulletin(f, eleve.id, p(0))!.commentaire).toBe('Trimestre solide.');
    expect(construireBulletin(f, eleve.id, p(1))!.commentaire).toBe('Doit persévérer.');
  });

  it('n’imprime jamais les observations privées', () => {
    f.observations.push({ eleve_id: eleve.id, texte: 'Note interne au titulaire.' });
    const b = construireBulletin(f, eleve.id, p(0))!;
    expect(JSON.stringify(b)).not.toContain('Note interne');
  });

  it('ne mélange pas deux élèves', () => {
    const autre = ajouterEleve(f, { nom: 'Abel', prenom: 'Tom' });
    coter('neerlandais', p(0), 8);
    expect(ligne(construireBulletin(f, autre.id, p(0)), 'neerlandais').score).toBeNull();
  });
});

describe('titrePdf', () => {
  it('nomme le PDF automatiquement', () => {
    expect(titrePdf(eleve, f.periodes[1]!)).toBe('Bulletin-P2-Martin-Léa');
  });

  it('supporte un prénom composé et un prénom vide', () => {
    const composé = { ...eleve, prenom: 'Marie Claire' };
    expect(titrePdf(composé, f.periodes[0]!)).toBe('Bulletin-P1-Martin-Marie-Claire');
    expect(titrePdf({ ...eleve, prenom: '' }, f.periodes[0]!)).toBe('Bulletin-P1-Martin');
  });
});

describe('affichage', () => {
  it('imprime un tiret pour un score absent, jamais 0', () => {
    expect(afficherScore(null)).toBe('—');
    expect(afficherScore(0)).toBe('0');
    expect(afficherScore(29.3)).toBe('29,3');
  });

  it('met la date au format belge, et rien si elle n’est pas fixée', () => {
    expect(afficherDate('2026-02-21')).toBe('21/02/2026');
    expect(afficherDate('')).toBe('');
  });
});
