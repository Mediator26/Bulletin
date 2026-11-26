/**
 * Filet de récupération — contrainte C2 de la spécification.
 *
 * Tant qu'une classe a des modifications non enregistrées, une copie en est
 * tenue dans le stockage du navigateur. Si l'onglet se ferme, si le portable
 * s'éteint ou si le navigateur plante, l'accueil propose de la restaurer.
 *
 * Ce n'est **jamais** une source de vérité : en `file://`, ce stockage a une
 * origine opaque et peut être purgé à tout moment. Le fichier du Drive reste la
 * seule référence ; la copie disparaît dès que le fichier est enregistré.
 *
 * Chaque séance de travail a son propre emplacement, plutôt qu'un emplacement
 * par nom de fichier : rouvrir l'ancien fichier du Drive puis taper une note ne
 * doit pas écraser la copie, plus récente, qu'on n'a pas encore restaurée.
 */

const PREFIXE = 'bulletin.recuperation.';

/** Au-delà, les copies les plus anciennes cèdent la place. */
export const COPIES_MAXIMUM = 6;

/** Sous-ensemble de `Storage` utilisé : `localStorage` en vrai, un double en test. */
export interface Stockage {
  readonly length: number;
  key(index: number): string | null;
  getItem(cle: string): string | null;
  setItem(cle: string, valeur: string): void;
  removeItem(cle: string): void;
}

export interface Sauvetage {
  /** Emplacement de la séance de travail. */
  id: string;
  /** Nom du fichier de classe, reproposé à l'enregistrement après restauration. */
  nomFichier: string;
  /** Instant de la copie, ISO 8601. */
  horodatage: string;
  /** Résumé affiché à l'accueil, par exemple « 23 élèves ». */
  resume: string;
  /** Le fichier de classe sérialisé, relu par `chargerClasse` à la restauration. */
  contenu: string;
}

export function nouvelEmplacement(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function cles(stockage: Stockage): string[] {
  const trouvees: string[] = [];
  for (let i = 0; i < stockage.length; i++) {
    const cle = stockage.key(i);
    if (cle?.startsWith(PREFIXE)) trouvees.push(cle);
  }
  return trouvees;
}

function lire(stockage: Stockage, cle: string): Sauvetage | null {
  try {
    const objet = JSON.parse(stockage.getItem(cle) ?? '') as Partial<Sauvetage>;
    if (
      typeof objet.id !== 'string' ||
      typeof objet.nomFichier !== 'string' ||
      typeof objet.horodatage !== 'string' ||
      typeof objet.contenu !== 'string'
    ) {
      return null;
    }
    return { resume: '', ...objet } as Sauvetage;
  } catch {
    return null;
  }
}

/** Copies retrouvées, de la plus récente à la plus ancienne. Ne lève jamais. */
export function listerSauvetages(stockage: Stockage | null): Sauvetage[] {
  if (!stockage) return [];
  try {
    return cles(stockage)
      .map((cle) => lire(stockage, cle))
      .filter((s): s is Sauvetage => s !== null)
      .sort((a, b) => b.horodatage.localeCompare(a.horodatage));
  } catch {
    return [];
  }
}

export function retirerSauvetage(stockage: Stockage | null, id: string): void {
  try {
    stockage?.removeItem(PREFIXE + id);
  } catch {
    // Stockage inaccessible : il n'y a rien à retirer.
  }
}

/**
 * Dépose ou remplace la copie d'une séance. Si la place manque, les copies des
 * autres séances, de la plus ancienne à la plus récente, sont sacrifiées : la
 * séance en cours est celle qu'on risque de perdre maintenant.
 *
 * @returns `false` si la copie n'a pas pu être faite, ce qui n'empêche jamais
 *   de travailler — seul le filet manque.
 */
export function deposerSauvetage(stockage: Stockage | null, sauvetage: Sauvetage): boolean {
  if (!stockage) return false;
  const valeur = JSON.stringify(sauvetage);
  const autres = listerSauvetages(stockage).filter((s) => s.id !== sauvetage.id);

  // Une séance de plus que le maximum : la plus ancienne part d'office.
  while (autres.length >= COPIES_MAXIMUM) retirerSauvetage(stockage, autres.pop()!.id);

  for (;;) {
    try {
      stockage.setItem(PREFIXE + sauvetage.id, valeur);
      return true;
    } catch {
      const plusAncienne = autres.pop();
      if (!plusAncienne) return false;
      retirerSauvetage(stockage, plusAncienne.id);
    }
  }
}

/** « mardi 25 novembre à 14 h 32 », pour dire à l'enseignant de quand date une copie. */
export function decrireMoment(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'à une date inconnue';
  const jour = date.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' });
  const heure = `${date.getHours()} h ${String(date.getMinutes()).padStart(2, '0')}`;
  return `${jour} à ${heure}`;
}
