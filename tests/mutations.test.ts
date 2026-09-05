import { beforeEach, describe, expect, it } from 'vitest';
import {
  ajouterEleve,
  ajouterTest,
  definirCommentaire,
  definirCotation,
  definirResultat,
  elevesTries,
  nouvelId,
  renommerEleve,
  resultatDe,
  supprimerEleve,
  supprimerTest,
  testsDeLaPeriode,
} from '../src/domaine/mutations.js';
import { classeVierge } from '../src/donnees/persistance.js';
import { periodesReference, rubriquesReference } from '../src/domaine/referentiel.js';
import type { FichierClasse } from '../src/domaine/modele.js';

let f: FichierClasse;

beforeEach(() => {
  f = classeVierge({ libelleAnnee: '2025-2026', ecole: 'Momignies', titulaire: '', version: '0' });
  f.rubriques = rubriquesReference(f.annee.id);
  f.periodes = periodesReference(f.annee.id);
});

const p1 = () => f.periodes[0]!.id;

describe('nouvelId', () => {
  it('ne se répète pas', () => {
    const ids = new Set(Array.from({ length: 500 }, () => nouvelId('x')));
    expect(ids.size).toBe(500);
  });
});

describe('renommerEleve', () => {
  it('corrige l’identité sans toucher aux résultats déjà encodés', () => {
    const eleve = ajouterEleve(f, { nom: 'Martn', prenom: 'Lea', annee_etude: 4 });
    const rubrique = f.rubriques[0]!;
    const t = ajouterTest(f, {
      periode_id: p1(),
      rubrique_id: rubrique.id,
      libelle: 'Test 1',
      maximum: 10,
    });
    definirResultat(f, t.id, eleve.id, 8);

    expect(renommerEleve(f, eleve.id, { nom: '  Martin ', prenom: ' Léa ' })).toBe(true);
    expect(f.eleves[0]!.nom).toBe('Martin');
    expect(f.eleves[0]!.prenom).toBe('Léa');
    expect(resultatDe(f, t.id, eleve.id)?.valeur).toBe(8);
  });

  it('refuse un nom vide et un élève inconnu', () => {
    const eleve = ajouterEleve(f, { nom: 'Martin', prenom: 'Léa', annee_etude: 4 });
    expect(renommerEleve(f, eleve.id, { nom: '   ', prenom: 'Léa' })).toBe(false);
    expect(renommerEleve(f, 'eleve-inconnu', { nom: 'X', prenom: 'Y' })).toBe(false);
    expect(f.eleves[0]!.nom).toBe('Martin');
  });
});

describe('élèves', () => {
  it('numérote les élèves dans leur ordre d’ajout', () => {
    ajouterEleve(f, { nom: 'Martin', prenom: 'Léa', annee_etude: 4 });
    const second = ajouterEleve(f, { nom: 'Abel', prenom: 'Tom', annee_etude: 4 });
    expect(second.ordre).toBe(2);
  });

  it('affiche la classe par ordre alphabétique, comme la feuille NOMS', () => {
    ajouterEleve(f, { nom: 'Martin', prenom: 'Léa', annee_etude: 4 });
    ajouterEleve(f, { nom: 'Abel', prenom: 'Tom', annee_etude: 4 });
    ajouterEleve(f, { nom: 'Étienne', prenom: 'Zoé', annee_etude: 4 });
    expect(elevesTries(f).map((e) => e.nom)).toEqual(['Abel', 'Étienne', 'Martin']);
  });

  it('départage deux homonymes par le prénom', () => {
    ajouterEleve(f, { nom: 'Martin', prenom: 'Zoé', annee_etude: 4 });
    ajouterEleve(f, { nom: 'Martin', prenom: 'Ana', annee_etude: 4 });
    expect(elevesTries(f).map((e) => e.prenom)).toEqual(['Ana', 'Zoé']);
  });

  it('supprime avec l’élève tout ce qui le concerne, sans laisser d’orphelin', () => {
    const eleve = ajouterEleve(f, { nom: 'Martin', prenom: 'Léa', annee_etude: 4 });
    const autre = ajouterEleve(f, { nom: 'Abel', prenom: 'Tom', annee_etude: 4 });
    const test = ajouterTest(f, { periode_id: p1(), rubrique_id: 'francais.ecrire', libelle: 'Dictée', maximum: 10 });
    definirResultat(f, test.id, eleve.id, 8);
    definirResultat(f, test.id, autre.id, 6);
    definirCotation(f, 'comportement', eleve.id, p1(), 'TB');
    definirCommentaire(f, eleve.id, p1(), 'Beau trimestre.');

    supprimerEleve(f, eleve.id);

    expect(f.eleves).toHaveLength(1);
    expect(f.resultats.every((r) => r.eleve_id === autre.id)).toBe(true);
    expect(f.cotations).toHaveLength(0);
    expect(f.commentaires).toHaveLength(0);
  });
});

describe('tests', () => {
  it('numérote les tests par rubrique et par période', () => {
    ajouterTest(f, { periode_id: p1(), rubrique_id: 'francais.ecrire', libelle: 'D1', maximum: 10 });
    const b = ajouterTest(f, { periode_id: p1(), rubrique_id: 'francais.ecrire', libelle: 'D2', maximum: 10 });
    const autreRubrique = ajouterTest(f, { periode_id: p1(), rubrique_id: 'francais.parler', libelle: 'Exposé', maximum: 10 });
    expect(b.ordre).toBe(2);
    expect(autreRubrique.ordre).toBe(1);
  });

  it('ne retient que les tests de la période demandée', () => {
    ajouterTest(f, { periode_id: p1(), rubrique_id: 'francais.ecrire', libelle: 'D1', maximum: 10 });
    ajouterTest(f, { periode_id: f.periodes[1]!.id, rubrique_id: 'francais.ecrire', libelle: 'D2', maximum: 10 });
    expect(testsDeLaPeriode(f, p1())).toHaveLength(1);
  });

  it('filtre par rubrique quand on la précise', () => {
    ajouterTest(f, { periode_id: p1(), rubrique_id: 'francais.ecrire', libelle: 'D1', maximum: 10 });
    ajouterTest(f, { periode_id: p1(), rubrique_id: 'mathematiques.geometrie', libelle: 'G1', maximum: 20 });
    expect(testsDeLaPeriode(f, p1(), 'francais.ecrire').map((t) => t.libelle)).toEqual(['D1']);
  });

  it('emporte les résultats du test supprimé, et eux seuls', () => {
    const eleve = ajouterEleve(f, { nom: 'Martin', prenom: 'Léa', annee_etude: 4 });
    const t1 = ajouterTest(f, { periode_id: p1(), rubrique_id: 'francais.ecrire', libelle: 'D1', maximum: 10 });
    const t2 = ajouterTest(f, { periode_id: p1(), rubrique_id: 'francais.ecrire', libelle: 'D2', maximum: 10 });
    definirResultat(f, t1.id, eleve.id, 8);
    definirResultat(f, t2.id, eleve.id, 6);

    supprimerTest(f, t1.id);

    expect(f.resultats.map((r) => r.test_id)).toEqual([t2.id]);
  });
});

describe('definirResultat', () => {
  const contexte = () => {
    const eleve = ajouterEleve(f, { nom: 'Martin', prenom: 'Léa', annee_etude: 4 });
    const test = ajouterTest(f, { periode_id: p1(), rubrique_id: 'francais.ecrire', libelle: 'Dictée', maximum: 10 });
    return { eleve, test };
  };

  it('crée puis met à jour sans dupliquer', () => {
    const { eleve, test } = contexte();
    definirResultat(f, test.id, eleve.id, 8);
    definirResultat(f, test.id, eleve.id, 9);
    expect(f.resultats).toHaveLength(1);
    expect(resultatDe(f, test.id, eleve.id)!.valeur).toBe(9);
  });

  it('conserve un 0 encodé, qui n’est pas une absence', () => {
    const { eleve, test } = contexte();
    definirResultat(f, test.id, eleve.id, 0);
    expect(resultatDe(f, test.id, eleve.id)).toEqual({
      test_id: test.id,
      eleve_id: eleve.id,
      valeur: 0,
      statut: 'presente',
    });
  });

  it('n’enregistre rien pour une cellule laissée vide', () => {
    const { eleve, test } = contexte();
    definirResultat(f, test.id, eleve.id, null);
    expect(f.resultats).toHaveLength(0);
  });

  it('efface un résultat qu’on vide', () => {
    const { eleve, test } = contexte();
    definirResultat(f, test.id, eleve.id, 8);
    definirResultat(f, test.id, eleve.id, null);
    expect(f.resultats).toHaveLength(0);
  });

  it('conserve une absence, qui est une information', () => {
    const { eleve, test } = contexte();
    definirResultat(f, test.id, eleve.id, null, 'absent');
    expect(resultatDe(f, test.id, eleve.id)!.statut).toBe('absent');
  });

  it('efface la valeur quand la cellule passe en absence', () => {
    const { eleve, test } = contexte();
    definirResultat(f, test.id, eleve.id, 8);
    definirResultat(f, test.id, eleve.id, null, 'dispense');
    const r = resultatDe(f, test.id, eleve.id)!;
    expect(r).toMatchObject({ valeur: null, statut: 'dispense' });
  });
});

describe('cotations et commentaires', () => {
  it('remplace une cotation sans dupliquer et l’efface avec null', () => {
    const eleve = ajouterEleve(f, { nom: 'Martin', prenom: 'Léa', annee_etude: 4 });
    definirCotation(f, 'comportement', eleve.id, p1(), 'B');
    definirCotation(f, 'comportement', eleve.id, p1(), 'TB');
    expect(f.cotations).toHaveLength(1);
    expect(f.cotations[0]!.valeur).toBe('TB');

    definirCotation(f, 'comportement', eleve.id, p1(), null);
    expect(f.cotations).toHaveLength(0);
  });

  it('cloisonne les cotations par période', () => {
    const eleve = ajouterEleve(f, { nom: 'Martin', prenom: 'Léa', annee_etude: 4 });
    definirCotation(f, 'comportement', eleve.id, p1(), 'B');
    definirCotation(f, 'comportement', eleve.id, f.periodes[1]!.id, 'S');
    expect(f.cotations).toHaveLength(2);
  });

  it('n’enregistre pas un commentaire vide', () => {
    const eleve = ajouterEleve(f, { nom: 'Martin', prenom: 'Léa', annee_etude: 4 });
    definirCommentaire(f, eleve.id, p1(), '   ');
    expect(f.commentaires).toHaveLength(0);
  });
});
