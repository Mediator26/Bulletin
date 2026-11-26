import { describe, expect, it, beforeEach } from 'vitest';
import { classeur } from '../src/etat/classeur.svelte.js';
import { ajouterEleve, ajouterPeriode, definirCommentaire } from '../src/domaine/mutations.js';

/**
 * Le cycle annulation / indicateur « non enregistré », sur l'état réel de
 * l'application. Le stockage du navigateur est absent en Node : le filet de
 * récupération s'y efface sans erreur.
 */
function nouvelleClasse() {
  classeur.creerClasse({ classe: '4e A', libelleAnnee: '2025-2026', ecole: '', titulaire: '' });
  return classeur.fichier!;
}

describe('Classeur — annulation', () => {
  beforeEach(() => classeur.fermer());

  it('annule et rétablit un ajout d’élève', () => {
    const f = nouvelleClasse();
    ajouterEleve(f, { nom: 'Martin', prenom: 'Léa' });
    classeur.toucher({ libelle: 'l’ajout de Martin Léa' });
    expect(classeur.aAnnuler).toBe('l’ajout de Martin Léa');

    classeur.annuler();
    expect(classeur.fichier!.eleves).toHaveLength(0);
    expect(classeur.message?.texte).toMatch(/Annulé : l’ajout de Martin Léa/);

    classeur.retablir();
    expect(classeur.fichier!.eleves.map((e) => e.nom)).toEqual(['Martin']);
  });

  it('ne crée pas d’étape quand rien n’a changé', () => {
    nouvelleClasse();
    classeur.toucher();
    expect(classeur.aAnnuler).toBeNull();
  });

  it('regroupe un commentaire tapé lettre à lettre', () => {
    const f = nouvelleClasse();
    ajouterEleve(f, { nom: 'Martin', prenom: 'Léa' });
    classeur.toucher({ libelle: 'ajout' });
    const eleve = f.eleves[0]!;
    const periode = f.periodes[0]!.id;
    for (const texte of ['B', 'Bo', 'Bon', 'Bon travail']) {
      definirCommentaire(classeur.fichier!, eleve.id, periode, texte);
      classeur.toucher({ libelle: 'le commentaire', groupe: `commentaire:${eleve.id}` });
    }
    classeur.annuler();
    expect(classeur.fichier!.commentaires.find((c) => c.eleve_id === eleve.id)?.texte ?? '').toBe('');
    expect(classeur.aAnnuler).toBe('ajout');
  });

  it('revient à la première période quand la période affichée disparaît', () => {
    const f = nouvelleClasse();
    const ajoutee = ajouterPeriode(f);
    classeur.toucher({ libelle: 'l’ajout d’une période' });
    classeur.periodeCourante = ajoutee.id;
    classeur.annuler();
    expect(classeur.periodeCourante).toBe(classeur.fichier!.periodes[0]!.id);
  });
});

describe('Classeur — indicateur « non enregistré »', () => {
  beforeEach(() => classeur.fermer());

  it('redevient « enregistré » quand on annule jusqu’à l’état du fichier ouvert', async () => {
    const f = nouvelleClasse();
    const { serialiserClasse } = await import('../src/donnees/persistance.js');
    const texte = serialiserClasse(JSON.parse(JSON.stringify(f)), '0.0.0');
    await classeur.ouvrir(new File([texte], '4e-A-2025-2026.json'));
    expect(classeur.modifie).toBe(false);

    ajouterEleve(classeur.fichier!, { nom: 'Martin', prenom: 'Léa' });
    classeur.toucher();
    expect(classeur.modifie).toBe(true);

    classeur.annuler();
    expect(classeur.modifie).toBe(false);
    classeur.retablir();
    expect(classeur.modifie).toBe(true);
  });
});
