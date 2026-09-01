/**
 * Persistance — étape 2 de la feuille de route, et traitement de la
 * contrainte C4 (dérive de version).
 *
 * Le fichier de classe posé sur le Drive est la seule source de vérité. Chaque
 * fichier porte un `schemaVersion` : une version plus ancienne est migrée, une
 * version plus récente est refusée explicitement plutôt que lue de travers.
 */

import { SCHEMA_VERSION, type FichierClasse } from '../domaine/modele.js';

export type Chargement =
  | { ok: true; fichier: FichierClasse; migre: boolean }
  | { ok: false; message: string };

/** Migrations successives, indexées par la version dont elles partent. */
const MIGRATIONS: Record<number, (brut: Record<string, unknown>) => Record<string, unknown>> = {
  // 0: (brut) => ({ ...brut, schemaVersion: 1, cotations: [] }),
};

const COLLECTIONS = [
  'periodes',
  'eleves',
  'rubriques',
  'tests',
  'resultats',
  'cotations',
  'commentaires',
  'observations',
] as const;

/**
 * Lit le contenu texte d'un fichier de classe.
 * Ne lève jamais : toute anomalie revient sous forme de message affichable.
 */
export function chargerClasse(texte: string): Chargement {
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    return {
      ok: false,
      message: "Ce fichier n'est pas un fichier de classe lisible (JSON invalide). "
        + "Vérifiez que vous avez bien ouvert un fichier de données, et non l'application elle‑même.",
    };
  }

  if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) {
    return { ok: false, message: "Le contenu du fichier n'est pas un fichier de classe." };
  }

  let objet = brut as Record<string, unknown>;
  const version = objet['schemaVersion'];

  if (typeof version !== 'number' || !Number.isInteger(version)) {
    return { ok: false, message: 'Fichier sans numéro de version de schéma : il ne peut pas être ouvert.' };
  }

  if (version > SCHEMA_VERSION) {
    return {
      ok: false,
      message: `Ce fichier a été enregistré par une version plus récente de l'application `
        + `(schéma ${version}, cette version en connaît ${SCHEMA_VERSION}). `
        + `Récupérez la dernière version dans le dossier « Application » du Drive avant de l'ouvrir.`,
    };
  }

  const migre = version < SCHEMA_VERSION;
  for (let v = version; v < SCHEMA_VERSION; v++) {
    const migration = MIGRATIONS[v];
    if (!migration) {
      return {
        ok: false,
        message: `Aucune migration connue depuis le schéma ${v} : ce fichier est trop ancien.`,
      };
    }
    objet = migration(objet);
  }

  const manquantes = COLLECTIONS.filter((c) => !Array.isArray(objet[c]));
  if (typeof objet['annee'] !== 'object' || objet['annee'] === null || manquantes.length > 0) {
    return {
      ok: false,
      message: `Fichier de classe incomplet (section manquante : ${['annee', ...manquantes].join(', ')}).`,
    };
  }

  return { ok: true, fichier: objet as unknown as FichierClasse, migre };
}

/** Sérialise un fichier de classe, en fixant toujours le schéma courant. */
export function serialiserClasse(fichier: FichierClasse, version: string): string {
  const sortie: FichierClasse = { ...fichier, schemaVersion: SCHEMA_VERSION, produitPar: version };
  return JSON.stringify(sortie, null, 2);
}

/**
 * Nom de fichier proposé à l'enregistrement.
 * Il doit rester identique à l'original (C1) pour que l'enseignant écrase
 * simplement l'ancien fichier sur le Drive.
 */
export function nomFichierPropose(libelleAnnee: string, classe: string): string {
  const propre = (s: string) => s.trim().replace(/[^\p{L}\p{N}-]+/gu, '-').replace(/^-|-$/g, '');
  return `${propre(classe)}-${propre(libelleAnnee)}.json`;
}

/** Nom d'archive horodatée de fin de période (C12). */
export function nomArchivePeriode(
  libelleAnnee: string,
  classe: string,
  numeroPeriode: number,
  date: string,
): string {
  return nomFichierPropose(libelleAnnee, classe).replace(
    /\.json$/,
    `_P${numeroPeriode}-cloture_${date}.json`,
  );
}

/** Fichier de classe vierge, sans aucune donnée de démonstration (checklist §4.2). */
export function classeVierge(params: {
  libelleAnnee: string;
  ecole: string;
  titulaire: string;
  version: string;
}): FichierClasse {
  return {
    schemaVersion: SCHEMA_VERSION,
    produitPar: params.version,
    annee: {
      id: 'annee-1',
      libelle: params.libelleAnnee,
      ecole: params.ecole,
      titulaire: params.titulaire,
    },
    periodes: [],
    eleves: [],
    rubriques: [],
    tests: [],
    resultats: [],
    cotations: [],
    commentaires: [],
    observations: [],
  };
}
