import { describe, expect, it } from 'vitest';
import {
  chargerClasse,
  classeVierge,
  nomArchivePeriode,
  nomFichierPropose,
  serialiserClasse,
} from '../src/donnees/persistance.js';
import { SCHEMA_VERSION } from '../src/domaine/modele.js';

const vierge = () =>
  classeVierge({ libelleAnnee: '2025-2026', ecole: 'Momignies', titulaire: '', version: '0.1.0' });

describe('chargerClasse', () => {
  it('relit ce que serialiserClasse a écrit', () => {
    const r = chargerClasse(serialiserClasse(vierge(), '0.1.0'));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.fichier.annee.ecole).toBe('Momignies');
      expect(r.migre).toBe(false);
    }
  });

  it('refuse un fichier produit par une version plus récente (C4)', () => {
    const futur = { ...vierge(), schemaVersion: SCHEMA_VERSION + 1 };
    const r = chargerClasse(JSON.stringify(futur));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/plus récente/);
  });

  it('refuse un fichier sans schemaVersion', () => {
    const { schemaVersion: _, ...sansVersion } = vierge();
    expect(chargerClasse(JSON.stringify(sansVersion)).ok).toBe(false);
  });

  it("signale un JSON invalide plutôt que de planter — cas de l'application ouverte par erreur (C3)", () => {
    const r = chargerClasse('<!doctype html><html>');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/JSON invalide/);
  });

  it('refuse un fichier amputé d’une collection', () => {
    const { eleves: _, ...ampute } = vierge();
    const r = chargerClasse(JSON.stringify(ampute));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/eleves/);
  });

  it('refuse un JSON qui n’est pas un objet', () => {
    expect(chargerClasse('[1,2,3]').ok).toBe(false);
    expect(chargerClasse('"texte"').ok).toBe(false);
  });
});

describe('serialiserClasse', () => {
  it('force toujours le schéma courant et trace la version productrice', () => {
    const texte = serialiserClasse({ ...vierge(), schemaVersion: 0 }, '1.2.3');
    const r = chargerClasse(texte);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.fichier.schemaVersion).toBe(SCHEMA_VERSION);
      expect(r.fichier.produitPar).toBe('1.2.3');
    }
  });
});

describe('nommage des fichiers', () => {
  it('propose un nom stable et sans caractère interdit', () => {
    expect(nomFichierPropose('2025-2026', '4e A')).toBe('4e-A-2025-2026.json');
  });

  it('conserve les accents', () => {
    expect(nomFichierPropose('2025-2026', '3e maternelle éveil')).toBe(
      '3e-maternelle-éveil-2025-2026.json',
    );
  });

  it('construit le nom d’archive de clôture de période (C12)', () => {
    expect(nomArchivePeriode('2025-2026', '4eA', 2, '2026-02-21')).toBe(
      '4eA-2025-2026_P2-cloture_2026-02-21.json',
    );
  });
});

describe('classeVierge', () => {
  it('ne contient aucune donnée de démonstration (checklist §4.2)', () => {
    const c = vierge();
    expect(c.eleves).toEqual([]);
    expect(JSON.stringify(c)).not.toMatch(/Dupont|Julien/);
  });
});
