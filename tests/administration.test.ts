import { beforeEach, describe, expect, it } from 'vitest';
import {
  ajouterEleve,
  ajouterPeriode,
  ajouterRubrique,
  ajouterTest,
  definirCommentaire,
  definirCotation,
  definirResultat,
  deplacerRubrique,
  descendance,
  modifierRubrique,
  supprimerPeriode,
  supprimerRubrique,
  verifierReferentiel,
} from '../src/domaine/mutations.js';
import { classeVierge } from '../src/donnees/persistance.js';
import { periodesReference, rubriquesReference } from '../src/domaine/referentiel.js';
import { enfantsDe } from '../src/domaine/calcul.js';
import type { Eleve, FichierClasse } from '../src/domaine/modele.js';

let f: FichierClasse;
let eleve: Eleve;

beforeEach(() => {
  f = classeVierge({ libelleAnnee: '2025-2026', ecole: 'Momignies', titulaire: '', version: '0' });
  f.rubriques = rubriquesReference(f.annee.id);
  f.periodes = periodesReference(f.annee.id);
  eleve = ajouterEleve(f, { nom: 'Martin', prenom: 'Léa', annee_etude: 4 });
});

const p = (i: number) => f.periodes[i]!.id;

describe('périodes', () => {
  it('ajoute une quatrième période à la suite', () => {
    const quatrieme = ajouterPeriode(f);
    expect(quatrieme.numero).toBe(4);
    expect(f.periodes).toHaveLength(4);
  });

  it('emporte tests, résultats, cotations et commentaires de la période supprimée', () => {
    const test = ajouterTest(f, {
      periode_id: p(0),
      rubrique_id: 'francais.ecrire',
      libelle: 'D1',
      maximum: 10,
    });
    definirResultat(f, test.id, eleve.id, 8);
    definirCotation(f, 'comportement', eleve.id, p(0), 'TB');
    definirCommentaire(f, eleve.id, p(0), 'Bien.');

    supprimerPeriode(f, p(0));

    expect(f.periodes).toHaveLength(2);
    expect(f.tests).toHaveLength(0);
    expect(f.resultats).toHaveLength(0);
    expect(f.cotations).toHaveLength(0);
    expect(f.commentaires).toHaveLength(0);
  });

  it('laisse intactes les autres périodes', () => {
    const garde = ajouterTest(f, {
      periode_id: f.periodes[1]!.id,
      rubrique_id: 'francais.ecrire',
      libelle: 'D2',
      maximum: 10,
    });
    definirResultat(f, garde.id, eleve.id, 7);

    supprimerPeriode(f, p(0));

    expect(f.tests.map((t) => t.id)).toEqual([garde.id]);
    expect(f.resultats).toHaveLength(1);
  });
});

describe('rubriques — ajout et modification', () => {
  it('ajoute une sous-rubrique à la suite de ses sœurs', () => {
    const nouvelle = ajouterRubrique(f, {
      parent_id: 'francais',
      libelle: 'Orthographe',
      maximum: 10,
      type: 'points',
    });
    expect(nouvelle.ordre).toBe(6);
    expect(enfantsDe(f.rubriques, 'francais').at(-1)!.libelle).toBe('Orthographe');
  });

  it('ajoute une rubrique principale quand le parent est null', () => {
    const nouvelle = ajouterRubrique(f, {
      parent_id: null,
      libelle: 'Anglais',
      maximum: 20,
      type: 'points',
    });
    expect(nouvelle.parent_id).toBeNull();
    expect(enfantsDe(f.rubriques, null).at(-1)!.libelle).toBe('Anglais');
  });

  it('modifie libellé, maximum et type sans toucher au reste', () => {
    modifierRubrique(f, 'neerlandais', { libelle: 'Néerlandais oral', maximum: 30 });
    const r = f.rubriques.find((x) => x.id === 'neerlandais')!;
    expect(r.libelle).toBe('Néerlandais oral');
    expect(r.maximum).toBe(30);
    expect(r.type).toBe('points');
  });

  it('ignore silencieusement une rubrique inconnue', () => {
    expect(() => modifierRubrique(f, 'fantome', { maximum: 5 })).not.toThrow();
  });
});

describe('descendance et suppression en cascade', () => {
  it('rassemble une rubrique et toutes ses filles', () => {
    const d = descendance(f.rubriques, 'francais');
    expect(d.has('francais')).toBe(true);
    expect(d.has('francais.parler')).toBe(true);
    expect(d.has('mathematiques')).toBe(false);
    expect(d.size).toBe(6); // la branche et ses cinq sous-rubriques
  });

  it('se réduit à elle-même pour une feuille', () => {
    expect(descendance(f.rubriques, 'neerlandais').size).toBe(1);
  });

  it('supprime la branche, ses filles, leurs tests et leurs résultats', () => {
    const test = ajouterTest(f, {
      periode_id: p(0),
      rubrique_id: 'francais.parler',
      libelle: 'Exposé',
      maximum: 10,
    });
    definirResultat(f, test.id, eleve.id, 8);
    const ailleurs = ajouterTest(f, {
      periode_id: p(0),
      rubrique_id: 'neerlandais',
      libelle: 'Vocabulaire',
      maximum: 10,
    });
    definirResultat(f, ailleurs.id, eleve.id, 6);

    supprimerRubrique(f, 'francais');

    expect(f.rubriques.some((r) => r.id.startsWith('francais'))).toBe(false);
    expect(f.tests.map((t) => t.id)).toEqual([ailleurs.id]);
    expect(f.resultats.map((r) => r.test_id)).toEqual([ailleurs.id]);
  });

  it('emporte les cotations d’une rubrique à échelle supprimée', () => {
    definirCotation(f, 'comportement', eleve.id, p(0), 'TB');
    supprimerRubrique(f, 'comportement');
    expect(f.cotations).toHaveLength(0);
  });
});

describe('deplacerRubrique', () => {
  it('remonte une rubrique parmi ses sœurs', () => {
    deplacerRubrique(f, 'francais.ecouter', 'haut');
    expect(enfantsDe(f.rubriques, 'francais').map((r) => r.libelle)).toEqual([
      'Écouter',
      'Parler',
      'Lire-écrire',
      'Écrire',
      'Expression écrite',
    ]);
  });

  it('descend une rubrique parmi ses sœurs', () => {
    deplacerRubrique(f, 'francais.parler', 'bas');
    expect(enfantsDe(f.rubriques, 'francais')[0]!.libelle).toBe('Écouter');
  });

  it('ne fait rien en bout de liste', () => {
    const avant = enfantsDe(f.rubriques, 'francais').map((r) => r.id);
    deplacerRubrique(f, 'francais.parler', 'haut');
    expect(enfantsDe(f.rubriques, 'francais').map((r) => r.id)).toEqual(avant);
  });

  it('ne mélange pas deux branches différentes', () => {
    deplacerRubrique(f, 'mathematiques.arithmetique', 'haut');
    expect(enfantsDe(f.rubriques, 'francais')[0]!.id).toBe('francais.parler');
  });

  it('ignore une rubrique inconnue', () => {
    expect(() => deplacerRubrique(f, 'fantome', 'bas')).not.toThrow();
  });
});

describe('verifierReferentiel', () => {
  it('ne signale rien sur le référentiel de référence d’origine', () => {
    expect(verifierReferentiel(f.rubriques)).toEqual([]);
  });

  it('signale une branche dont les filles ne totalisent pas son maximum', () => {
    modifierRubrique(f, 'francais.parler', { maximum: 15 });
    const anomalies = verifierReferentiel(f.rubriques);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]!.rubrique_id).toBe('francais');
    expect(anomalies[0]!.message).toContain('105');
  });

  it('signale une rubrique en points dont le maximum est nul', () => {
    modifierRubrique(f, 'neerlandais', { maximum: 0 });
    expect(verifierReferentiel(f.rubriques).some((a) => a.rubrique_id === 'neerlandais')).toBe(true);
  });

  it('laisse les rubriques à échelle tranquilles, leur maximum n’a pas de sens', () => {
    expect(verifierReferentiel(f.rubriques).some((a) => a.rubrique_id === 'comportement')).toBe(
      false,
    );
  });
});
