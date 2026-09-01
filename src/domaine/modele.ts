/**
 * Modèle de données — §2.4 de la spécification.
 *
 * Principe directeur : la structure n'est plus codée dans la géométrie des
 * cellules. Le nombre d'élèves, de tests et de périodes est une donnée, pas une
 * plage figée — ce qui supprime par construction la désynchronisation
 * 35 / 32 / 29 / 30 du classeur Excel (défaut n° 1).
 */

export type Id = string;

/** Cotation littérale TB‑B‑S‑F‑I (Religion/EPC, PECA/FMTT, comportement). */
export type Echelle = 'TB' | 'B' | 'S' | 'F' | 'I';

export const ECHELLE: readonly Echelle[] = ['TB', 'B', 'S', 'F', 'I'] as const;

/**
 * `statut` est distinct de `valeur` : un 0 légitime entre dans le prorata,
 * une absence en sort. C'est ce qui corrige le défaut n° 8 (`IF(S5>0;1;0)`).
 */
export type Statut = 'presente' | 'absent' | 'dispense';

export interface AnneeScolaire {
  id: Id;
  libelle: string;
  ecole: string;
  titulaire: string;
}

export interface Periode {
  id: Id;
  annee_id: Id;
  numero: number;
  /** Date imprimée sur le bulletin, au format ISO `AAAA-MM-JJ`. */
  date_bulletin: string;
}

export interface Eleve {
  id: Id;
  annee_id: Id;
  nom: string;
  prenom: string;
  /** Année d'étude (1 à 6). À ne pas confondre avec le numéro de période. */
  annee_etude: number;
  ordre: number;
}

export type TypeRubrique = 'points' | 'echelle';

export interface Rubrique {
  id: Id;
  annee_id: Id;
  /** `null` pour une rubrique racine (Français, Mathématiques, …). */
  parent_id: Id | null;
  libelle: string;
  /** Maximum de la rubrique en points ; ignoré pour le type `echelle`. */
  maximum: number;
  type: TypeRubrique;
  ordre: number;
}

export interface Test {
  id: Id;
  periode_id: Id;
  rubrique_id: Id;
  libelle: string;
  maximum: number;
  ordre: number;
}

export interface Resultat {
  test_id: Id;
  eleve_id: Id;
  /** `null` = non encodé. Un 0 encodé est un vrai 0, pas une absence. */
  valeur: number | null;
  statut: Statut;
}

export interface CotationEchelle {
  rubrique_id: Id;
  eleve_id: Id;
  periode_id: Id;
  valeur: Echelle | null;
}

export interface Commentaire {
  eleve_id: Id;
  periode_id: Id;
  texte: string;
}

/** Observation privée du titulaire — jamais imprimée sur le bulletin. */
export interface Observation {
  eleve_id: Id;
  texte: string;
}

/** Version du schéma de fichier — voir C4 (dérive de version). */
export const SCHEMA_VERSION = 1;

export interface FichierClasse {
  schemaVersion: number;
  /** Version de l'application qui a produit le fichier, pour diagnostic. */
  produitPar: string;
  annee: AnneeScolaire;
  periodes: Periode[];
  eleves: Eleve[];
  rubriques: Rubrique[];
  tests: Test[];
  resultats: Resultat[];
  cotations: CotationEchelle[];
  commentaires: Commentaire[];
  observations: Observation[];
}
