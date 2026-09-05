/**
 * Thème de l'interface — clair par défaut, sombre au choix de l'utilisateur.
 *
 * Le choix est mémorisé dans `localStorage` : c'est un confort d'affichage,
 * pas une donnée de classe, donc C2 est respecté — rien ici n'est source de
 * vérité et sa perte n'a aucune conséquence.
 */

export type Theme = 'clair' | 'sombre';

const CLE = 'bulletin.theme';

function themeInitial(): Theme {
  try {
    const memorise = localStorage.getItem(CLE);
    if (memorise === 'clair' || memorise === 'sombre') return memorise;
  } catch {
    // Navigation privée ou stockage refusé : on retombe sur le thème clair.
  }
  return 'clair';
}

class Apparence {
  theme = $state<Theme>(themeInitial());

  /** Applique le thème au document ; appelé une fois au démarrage puis à chaque bascule. */
  appliquer(): void {
    document.documentElement.dataset.theme = this.theme;
  }

  basculer(): void {
    this.theme = this.theme === 'clair' ? 'sombre' : 'clair';
    this.appliquer();
    try {
      localStorage.setItem(CLE, this.theme);
    } catch {
      // Sans stockage, le choix vaut pour la session seulement.
    }
  }
}

export const apparence = new Apparence();
