/**
 * Navigation clavier de la grille de saisie — §4.1, étape 3.
 *
 * Logique volontairement séparée du composant : c'est ce qui rend le
 * comportement « comme un tableur » testable sans navigateur. Le composant
 * n'a plus qu'à déplacer le focus vers la cellule retournée.
 *
 * Convention : lignes = élèves, colonnes = tests. Les flèches butent sur les
 * bords ; Tab et Entrée enroulent vers la cellule suivante, comme dans un
 * tableur, pour qu'une classe entière s'encode sans jamais toucher la souris.
 */

export interface Cellule {
  ligne: number;
  colonne: number;
}

export interface Dimensions {
  lignes: number;
  colonnes: number;
}

export interface ToucheGrille {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
}

const borne = (valeur: number, maximum: number) => Math.min(Math.max(valeur, 0), maximum);

/**
 * Cellule cible pour une touche donnée, ou `null` si la touche ne concerne pas
 * la navigation — le composant laisse alors l'événement suivre son cours.
 */
export function deplacer(
  depuis: Cellule,
  touche: ToucheGrille,
  dimensions: Dimensions,
): Cellule | null {
  const { lignes, colonnes } = dimensions;
  if (lignes === 0 || colonnes === 0) return null;

  const derniereLigne = lignes - 1;
  const derniereColonne = colonnes - 1;
  const { ligne, colonne } = depuis;

  switch (touche.key) {
    case 'ArrowUp':
      return { ligne: borne(ligne - 1, derniereLigne), colonne };
    case 'ArrowDown':
      return { ligne: borne(ligne + 1, derniereLigne), colonne };
    case 'ArrowLeft':
      return { ligne, colonne: borne(colonne - 1, derniereColonne) };
    case 'ArrowRight':
      return { ligne, colonne: borne(colonne + 1, derniereColonne) };

    case 'Home':
      return touche.ctrlKey ? { ligne: 0, colonne: 0 } : { ligne, colonne: 0 };
    case 'End':
      return touche.ctrlKey
        ? { ligne: derniereLigne, colonne: derniereColonne }
        : { ligne, colonne: derniereColonne };

    case 'PageUp':
      return { ligne: 0, colonne };
    case 'PageDown':
      return { ligne: derniereLigne, colonne };

    // Entrée descend dans la colonne : on encode un test pour toute la classe,
    // puis on repart en haut de la colonne suivante.
    case 'Enter':
      return touche.shiftKey ? precedentEnColonne(depuis, dimensions) : suivantEnColonne(depuis, dimensions);

    case 'Tab':
      return touche.shiftKey ? precedentEnLigne(depuis, dimensions) : suivantEnLigne(depuis, dimensions);

    default:
      return null;
  }
}

/** La touche est-elle prise en charge par la grille ? (le composant doit alors bloquer le défaut) */
export function estToucheDeNavigation(touche: ToucheGrille, dimensions: Dimensions): boolean {
  return deplacer({ ligne: 0, colonne: 0 }, touche, dimensions) !== null;
}

function suivantEnColonne(depuis: Cellule, { lignes, colonnes }: Dimensions): Cellule {
  if (depuis.ligne < lignes - 1) return { ligne: depuis.ligne + 1, colonne: depuis.colonne };
  if (depuis.colonne < colonnes - 1) return { ligne: 0, colonne: depuis.colonne + 1 };
  return { ligne: lignes - 1, colonne: colonnes - 1 }; // dernière cellule : on y reste
}

function precedentEnColonne(depuis: Cellule, { lignes, colonnes }: Dimensions): Cellule {
  if (depuis.ligne > 0) return { ligne: depuis.ligne - 1, colonne: depuis.colonne };
  if (depuis.colonne > 0) return { ligne: lignes - 1, colonne: depuis.colonne - 1 };
  return { ligne: 0, colonne: 0 };
}

function suivantEnLigne(depuis: Cellule, { lignes, colonnes }: Dimensions): Cellule {
  if (depuis.colonne < colonnes - 1) return { ligne: depuis.ligne, colonne: depuis.colonne + 1 };
  if (depuis.ligne < lignes - 1) return { ligne: depuis.ligne + 1, colonne: 0 };
  return { ligne: lignes - 1, colonne: colonnes - 1 };
}

function precedentEnLigne(depuis: Cellule, { lignes, colonnes }: Dimensions): Cellule {
  if (depuis.colonne > 0) return { ligne: depuis.ligne, colonne: depuis.colonne - 1 };
  if (depuis.ligne > 0) return { ligne: depuis.ligne - 1, colonne: colonnes - 1 };
  return { ligne: 0, colonne: 0 };
}

/** Identifiant DOM stable d'une cellule, partagé entre le rendu et le focus. */
/**
 * L'écran de saisie empile une grille par rubrique : `zone` les sépare, sans
 * quoi deux cellules de même coordonnée porteraient le même identifiant et le
 * déplacement du focus atterrirait dans la mauvaise rubrique.
 */
export function idCellule(cellule: Cellule, zone = 'grille'): string {
  return `cellule-${zone}-${cellule.ligne}-${cellule.colonne}`;
}

/** Ramène une position dans les bornes après suppression d'un élève ou d'un test. */
export function reborner(cellule: Cellule, { lignes, colonnes }: Dimensions): Cellule {
  return {
    ligne: borne(cellule.ligne, Math.max(lignes - 1, 0)),
    colonne: borne(cellule.colonne, Math.max(colonnes - 1, 0)),
  };
}
