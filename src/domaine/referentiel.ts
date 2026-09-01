/**
 * Référentiel de référence — le barème du §1.1 de la spécification, celui du
 * classeur remplacé.
 *
 * Il est copié dans le fichier de classe à sa création, jamais lu depuis
 * l'application à l'affichage : chaque année fige son référentiel, de sorte que
 * modifier les pondérations en 2027 ne corrompt pas les bulletins de 2025
 * (§2.4, décision 4). L'écran d'administration (étape 6) permettra de l'amender
 * classe par classe.
 */

import type { Id, Periode, Rubrique, TypeRubrique } from './modele.js';

interface Modele {
  cle: string;
  libelle: string;
  maximum: number;
  type: TypeRubrique;
  enfants?: Modele[];
}

const MODELE: Modele[] = [
  {
    cle: 'francais',
    libelle: 'Français',
    maximum: 100,
    type: 'points',
    enfants: [
      { cle: 'parler', libelle: 'Parler', maximum: 10, type: 'points' },
      { cle: 'ecouter', libelle: 'Écouter', maximum: 10, type: 'points' },
      { cle: 'lire-ecrire', libelle: 'Lire-écrire', maximum: 40, type: 'points' },
      { cle: 'ecrire', libelle: 'Écrire', maximum: 20, type: 'points' },
      { cle: 'expression-ecrite', libelle: 'Expression écrite', maximum: 20, type: 'points' },
    ],
  },
  {
    cle: 'mathematiques',
    libelle: 'Mathématiques',
    maximum: 100,
    type: 'points',
    enfants: [
      { cle: 'arithmetique', libelle: 'Arithmétique', maximum: 50, type: 'points' },
      { cle: 'geometrie', libelle: 'Géométrie', maximum: 20, type: 'points' },
      { cle: 'grandeurs', libelle: 'Grandeurs', maximum: 30, type: 'points' },
    ],
  },
  {
    cle: 'eveil',
    libelle: 'Éveil',
    maximum: 100,
    type: 'points',
    enfants: [
      { cle: 'histoire-geo', libelle: 'Histoire-géographie', maximum: 50, type: 'points' },
      { cle: 'sciences', libelle: 'Sciences', maximum: 50, type: 'points' },
    ],
  },
  { cle: 'education-physique', libelle: 'Éducation physique', maximum: 20, type: 'points' },
  { cle: 'neerlandais', libelle: 'Néerlandais', maximum: 20, type: 'points' },
  { cle: 'religion-epc', libelle: 'Religion / EPC', maximum: 0, type: 'echelle' },
  { cle: 'peca-fmtt', libelle: 'PECA / FMTT', maximum: 0, type: 'echelle' },
  { cle: 'comportement', libelle: 'Comportement', maximum: 0, type: 'echelle' },
];

/** Construit les rubriques de l'année, à plat, avec leurs liens parent/enfant. */
export function rubriquesReference(annee_id: Id): Rubrique[] {
  const sortie: Rubrique[] = [];

  const ajouter = (modeles: Modele[], parent_id: Id | null) => {
    modeles.forEach((m, index) => {
      const id = parent_id ? `${parent_id}.${m.cle}` : m.cle;
      sortie.push({
        id,
        annee_id,
        parent_id,
        libelle: m.libelle,
        maximum: m.maximum,
        type: m.type,
        ordre: index + 1,
      });
      if (m.enfants) ajouter(m.enfants, id);
    });
  };

  ajouter(MODELE, null);
  return sortie;
}

/**
 * Les trois périodes de l'année. Les dates restent vides à la création : c'est
 * le titulaire qui les fixe, ce qui évite de reconduire une date en dur — la
 * cause de l'erreur n° 5 du classeur (21/02/2024 imprimé sur 30 bulletins).
 */
export function periodesReference(annee_id: Id): Periode[] {
  return [1, 2, 3].map((numero) => ({
    id: `${annee_id}.p${numero}`,
    annee_id,
    numero,
    date_bulletin: '',
  }));
}

/** Rubriques cotées en points sur lesquelles on peut accrocher un test. */
export function rubriquesSaisissables(rubriques: readonly Rubrique[]): Rubrique[] {
  const aDesEnfants = new Set(rubriques.map((r) => r.parent_id).filter((p): p is Id => p !== null));
  return rubriques
    .filter((r) => r.type === 'points' && !aDesEnfants.has(r.id))
    .sort((a, b) => cheminOrdre(a, rubriques).localeCompare(cheminOrdre(b, rubriques)));
}

/** Clé de tri qui respecte la hiérarchie : « 01.03 » pour Français → Lire-écrire. */
function cheminOrdre(rubrique: Rubrique, rubriques: readonly Rubrique[]): string {
  const segments: string[] = [];
  let courante: Rubrique | undefined = rubrique;
  while (courante) {
    segments.unshift(String(courante.ordre).padStart(2, '0'));
    const parent: Id | null = courante.parent_id;
    courante = parent === null ? undefined : rubriques.find((r) => r.id === parent);
  }
  return segments.join('.');
}

/** Libellé complet d'une rubrique, parents compris : « Français › Lire-écrire ». */
export function cheminLibelle(rubrique: Rubrique, rubriques: readonly Rubrique[]): string {
  const segments: string[] = [];
  let courante: Rubrique | undefined = rubrique;
  while (courante) {
    segments.unshift(courante.libelle);
    const parent: Id | null = courante.parent_id;
    courante = parent === null ? undefined : rubriques.find((r) => r.id === parent);
  }
  return segments.join(' › ');
}
