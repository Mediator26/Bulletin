/**
 * Nouveautés de chaque version — contraintes C4 et C11 de la spécification.
 *
 * Source unique : la fenêtre « Nouveautés » de l'application les affiche, et
 * le build en tire le `CHANGELOG.txt` à poser à côté de l'application sur le
 * Drive. La première entrée est la version courante : un test vérifie qu'elle
 * correspond à `package.json`.
 *
 * Rédigé pour les titulaires, pas pour les développeurs : ce qui change pour
 * eux, en quelques points, sans détail technique.
 *
 * Les versions antérieures à 1.0.0 ont été numérotées après coup, en
 * regroupant l'historique par journée de livraison.
 */

export interface Version {
  version: string;
  /** Date de livraison, ISO `AAAA-MM-JJ`. */
  date: string;
  points: string[];
}

export const NOUVEAUTES: readonly Version[] = [
  {
    version: '1.0.0',
    date: '2026-11-26',
    points: [
      'Annuler et rétablir : Ctrl+Z et Ctrl+Y, ou les flèches à côté de « Enregistrer ».',
      'Travail non enregistré retrouvé à la réouverture, si l’onglet s’est fermé ou l’ordinateur éteint.',
      'Écran des bulletins : liste de ce qui manque avant d’imprimer (notes, cotes, commentaires, date).',
      'Une jauge sous le commentaire prévient avant que le verso déborde sur une page de plus.',
      'Les nouveautés de chaque version : cliquer sur le numéro de version, en haut à gauche.',
    ],
  },
  {
    version: '0.8.0',
    date: '2026-11-24',
    points: [
      'Nouvel onglet « Statistiques » : réussite par matière, élèves en difficulté, évolution entre périodes.',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-11-17',
    points: [
      'Le crayon en tête de colonne modifie le nom ou le maximum d’un test sans perdre ses notes.',
      'Quand le maximum change, les notes sont gardées telles quelles ou converties, au choix.',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-10-11',
    points: [
      'La cote retenue (TB, B, S, F, I) reste bien visible à l’impression.',
      'Rubriques des nouvelles classes alignées sur les intitulés de l’école ; ajout d’« Attitude face au travail ».',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-09-24',
    points: [
      'Le logo de l’école s’imprime en tête du bulletin, et chaque face occupe toute la feuille.',
      'Supprimer un test qui porte déjà des notes demande confirmation.',
      'L’année d’étude de l’élève est retirée du formulaire et du bulletin.',
      'L’application ne peut plus rien envoyer sur Internet : les données des élèves restent sur le poste.',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-09-21',
    points: [
      'Chaque bulletin rappelle les points, cotes et commentaires de toutes les périodes précédentes.',
      'Une sous-rubrique sans aucun test ne compte plus pour zéro dans sa matière.',
      'Le total général disparaît ; « Lire-écrire » devient « Lire ».',
      'À l’enregistrement, certains navigateurs proposent de choisir directement le dossier du Drive.',
      'Notice d’une page pour les titulaires.',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-09-05',
    points: [
      'Thème sombre au choix, par le bouton en haut à droite.',
      'Renommer un élève sans perdre ses résultats.',
      'Le bulletin de la dernière période rappelle les précédentes.',
      'Marges d’impression corrigées.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-09-04',
    points: [
      'Nouvelle présentation de toute l’application.',
      'À l’accueil, ouvrir une classe et en créer une sont proposés côte à côte.',
      'Bulletins et réglages consultables sur un petit écran.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-09-01',
    points: [
      'Première version : saisie des tests en grille, calcul au prorata des tests présentés, bulletins imprimables.',
      'Chaque classe est un fichier .json distinct, à conserver sur le Drive de l’école.',
    ],
  },
];

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** « 26 novembre 2026 ». */
export function dateEnClair(iso: string): string {
  const [annee, mois, jour] = iso.split('-').map(Number);
  return `${jour === 1 ? '1er' : jour} ${MOIS[(mois ?? 1) - 1]} ${annee}`;
}

/** Contenu du `CHANGELOG.txt` posé à côté de l'application sur le Drive (C11). */
export function texteChangelog(versions: readonly Version[] = NOUVEAUTES): string {
  const blocs = versions.map(
    (v) => `Version ${v.version} — ${dateEnClair(v.date)}\n${v.points.map((p) => `  - ${p}`).join('\n')}`,
  );
  return `Bulletin scolaire — nouveautés de chaque version\n\n${blocs.join('\n\n')}\n`;
}
