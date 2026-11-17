/**
 * Accès discret à l'écran « Statistiques », encore en évaluation.
 *
 * Tant que sa pertinence n'est pas confirmée, l'onglet n'apparaît pas : il se
 * déverrouille par un geste que seul celui qui le connaît fera.
 *  · au clavier : Ctrl + Alt + S (Ctrl + Option + S sur Mac) ;
 *  · au doigt ou à la souris : cinq touches rapides sur le numéro de version,
 *    en haut à gauche.
 * Le même geste le reverrouille.
 *
 * Le choix est mémorisé dans `localStorage`, comme le thème : c'est un réglage
 * d'affichage propre à ce navigateur, pas une donnée de classe (C2) — sa perte
 * ne fait que recacher l'onglet.
 */

const CLE = 'bulletin.statistiques';

/** Nombre de touches sur la version, et délai maximal pour les enchaîner. */
const TOUCHES_REQUISES = 5;
const DELAI_MS = 2500;

function etatInitial(): boolean {
  try {
    return localStorage.getItem(CLE) === 'oui';
  } catch {
    return false;
  }
}

/** Reconnaît le raccourci clavier, indépendamment de la disposition (AZERTY, QWERTY). */
export function estRaccourciStatistiques(e: Pick<KeyboardEvent, 'ctrlKey' | 'altKey' | 'metaKey' | 'code' | 'repeat'>): boolean {
  return e.ctrlKey && e.altKey && !e.metaKey && !e.repeat && e.code === 'KeyS';
}

class AccesStatistiques {
  actif = $state(etatInitial());
  #touches: number[] = [];

  basculer(): void {
    this.actif = !this.actif;
    try {
      if (this.actif) localStorage.setItem(CLE, 'oui');
      else localStorage.removeItem(CLE);
    } catch {
      // Sans stockage, l'accès vaut pour la session seulement.
    }
  }

  /**
   * Une touche sur la version. Rend `true` quand la série est complète et que
   * l'accès vient de basculer.
   */
  toucherVersion(maintenant = Date.now()): boolean {
    this.#touches = [...this.#touches, maintenant].filter((t) => maintenant - t <= DELAI_MS);
    if (this.#touches.length < TOUCHES_REQUISES) return false;
    this.#touches = [];
    this.basculer();
    return true;
  }
}

export const accesStatistiques = new AccesStatistiques();
