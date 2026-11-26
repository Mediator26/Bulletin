import { beforeEach, describe, expect, it } from 'vitest';
import { verifierAvantImpression } from '../src/domaine/verification.js';
import { classeVierge } from '../src/donnees/persistance.js';
import { periodesReference, rubriquesReference, rubriquesSaisissables } from '../src/domaine/referentiel.js';
import {
  ajouterEleve,
  ajouterTest,
  definirCommentaire,
  definirCotation,
  definirResultat,
} from '../src/domaine/mutations.js';
import type { Eleve, FichierClasse, Test } from '../src/domaine/modele.js';

let f: FichierClasse;
let lea: Eleve;
let tom: Eleve;
const P1 = () => f.periodes[0]!.id;

beforeEach(() => {
  f = classeVierge({ libelleAnnee: '2025-2026', ecole: '', titulaire: '', version: '0' });
  f.rubriques = rubriquesReference(f.annee.id);
  f.periodes = periodesReference(f.annee.id);
  f.periodes[0]!.date_bulletin = '2025-11-20';
  lea = ajouterEleve(f, { nom: 'Martin', prenom: 'Léa' });
  tom = ajouterEleve(f, { nom: 'Dubois', prenom: 'Tom' });
});

/** Un test par sous-rubrique saisissable, et tout encodé pour les deux élèves. */
function classeComplete(): Test[] {
  const tests = rubriquesSaisissables(f.rubriques).map((r) =>
    ajouterTest(f, { periode_id: P1(), rubrique_id: r.id, libelle: `Test ${r.libelle}`, maximum: 10 }),
  );
  for (const eleve of [lea, tom]) {
    for (const t of tests) definirResultat(f, t.id, eleve.id, 7);
    for (const r of f.rubriques.filter((r) => r.type === 'echelle')) definirCotation(f, r.id, eleve.id, P1(), 'B');
    definirCommentaire(f, eleve.id, P1(), 'Bon trimestre.');
  }
  return tests;
}

const textes = (v: ReturnType<typeof verifierAvantImpression>, eleve: Eleve) =>
  v.eleves.find((e) => e.eleve.id === eleve.id)?.constats.map((c) => c.texte) ?? [];

describe('vérification avant impression', () => {
  it('ne signale rien sur une classe complète', () => {
    classeComplete();
    expect(verifierAvantImpression(f, P1(), [lea, tom])).toEqual({ classe: [], eleves: [] });
  });

  it('signale une note manquante, avec le test et sa rubrique', () => {
    const tests = classeComplete();
    const lire = tests.find((t) => t.rubrique_id === 'francais.lire')!;
    definirResultat(f, lire.id, lea.id, null);
    const v = verifierAvantImpression(f, P1(), [lea, tom]);
    expect(textes(v, lea)).toEqual(['1 note manquante : Test Lire (Lire)']);
    expect(textes(v, tom)).toEqual([]);
  });

  it('ne compte pas une absence comme une note manquante', () => {
    const tests = classeComplete();
    definirResultat(f, tests[0]!.id, lea.id, null, 'absent');
    expect(verifierAvantImpression(f, P1(), [lea]).eleves).toEqual([]);
  });

  it('signale une matière imprimée « — » parce que l’élève a été absent partout', () => {
    const tests = classeComplete();
    for (const t of tests.filter((t) => t.rubrique_id === 'neerlandais')) {
      definirResultat(f, t.id, lea.id, null, 'absent');
    }
    expect(textes(verifierAvantImpression(f, P1(), [lea]), lea)).toEqual([
      'Absent ou dispensé à tous les tests de Néerlandais : imprimé « — ».',
    ]);
  });

  it('abrège une longue liste de notes manquantes', () => {
    const t = ['A', 'B', 'C', 'D'].map((l) =>
      ajouterTest(f, { periode_id: P1(), rubrique_id: 'neerlandais', libelle: l, maximum: 10 }),
    );
    const v = verifierAvantImpression(f, P1(), [lea]);
    expect(textes(v, lea)[0]).toBe('4 notes manquantes : A (Néerlandais), B (Néerlandais), C (Néerlandais)…');
    expect(t).toHaveLength(4);
  });

  it('signale les cotes et le commentaire manquants', () => {
    classeComplete();
    definirCotation(f, 'religion-epc', lea.id, P1(), null);
    definirCommentaire(f, lea.id, P1(), '   ');
    expect(textes(verifierAvantImpression(f, P1(), [lea]), lea)).toEqual([
      'Cote manquante : Religion / EPC',
      'Pas de commentaire au verso.',
    ]);
  });

  it('signale en erreur un verso qui déborde', () => {
    classeComplete();
    definirCommentaire(f, lea.id, P1(), 'Bien.\n'.repeat(60));
    const constat = verifierAvantImpression(f, P1(), [lea]).eleves[0]!.constats[0]!;
    expect(constat.gravite).toBe('erreur');
    expect(constat.texte).toMatch(/verso déborde/);
  });

  it('signale pour la classe la date absente et les matières sans aucun test', () => {
    const tests = classeComplete();
    f.periodes[0]!.date_bulletin = '';
    // Toute la matière Néerlandais, et la seule sous-rubrique Parler.
    f.tests = f.tests.filter(
      (t) => t.rubrique_id !== 'neerlandais' && t.rubrique_id !== 'francais.parler',
    );
    expect(tests.length).toBeGreaterThan(f.tests.length);
    const v = verifierAvantImpression(f, P1(), [lea, tom]);
    expect(v.classe.map((c) => c.texte)).toEqual([
      "La date du bulletin 1 n'est pas fixée : elle s'imprimera vide.",
      'Aucun test cette période en Français › Parler, Néerlandais : '
        + 'ces lignes s’imprimeront « — » pour toute la classe.',
    ]);
    expect(v.eleves).toEqual([]);
  });

  it('cite une matière vide entière plutôt que chacune de ses sous-rubriques', () => {
    classeComplete();
    f.tests = f.tests.filter((t) => !t.rubrique_id.startsWith('mathematiques'));
    const v = verifierAvantImpression(f, P1(), [lea]);
    expect(v.classe[0]!.texte).toMatch(/^Aucun test cette période en Mathématiques : cette ligne/);
  });
});
