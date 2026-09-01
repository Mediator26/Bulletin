/**
 * État de l'application — le fichier de classe ouvert et son cycle de vie.
 *
 * Traduit la contrainte C1 : en `file://`, rien ne s'écrit dans le fichier
 * d'origine. Le cycle est *ouvrir → travailler en mémoire → réenregistrer par
 * téléchargement*, et l'enseignant replace ensuite le fichier sur le Drive.
 * D'où le drapeau `modifie`, qui n'est pas un agrément mais le garde-fou
 * contre la perte de données.
 */

import type { FichierClasse, Id } from '../domaine/modele.js';
import { periodesReference, rubriquesReference } from '../domaine/referentiel.js';
import {
  chargerClasse,
  classeVierge,
  nomFichierPropose,
  serialiserClasse,
} from '../donnees/persistance.js';

export const VERSION = __VERSION__;
export const DATE_BUILD = __BUILD_DATE__;

class Classeur {
  fichier = $state<FichierClasse | null>(null);
  /** Modifications non enregistrées : affiché en permanence et gardé par `beforeunload`. */
  modifie = $state(false);
  /** Nom du fichier ouvert, reproposé tel quel à l'enregistrement. */
  nomFichier = $state('');
  message = $state<{ ton: 'info' | 'erreur'; texte: string } | null>(null);
  periodeCourante = $state<Id | null>(null);

  get ouvert(): boolean {
    return this.fichier !== null;
  }

  /** Marque une modification. Toute action de saisie passe par là. */
  toucher(): void {
    this.modifie = true;
  }

  creerClasse(params: { classe: string; libelleAnnee: string; ecole: string; titulaire: string }): void {
    const fichier = classeVierge({ ...params, version: VERSION });
    fichier.rubriques = rubriquesReference(fichier.annee.id);
    fichier.periodes = periodesReference(fichier.annee.id);

    this.fichier = fichier;
    this.nomFichier = nomFichierPropose(params.libelleAnnee, params.classe);
    this.periodeCourante = fichier.periodes[0]?.id ?? null;
    this.modifie = true;
    this.message = {
      ton: 'info',
      texte: 'Classe créée. Ajoutez les élèves, puis enregistrez le fichier sur le Drive.',
    };
  }

  /** Ouvre un fichier choisi par l'enseignant. N'écrase jamais un travail non enregistré sans accord. */
  async ouvrir(fichierChoisi: File): Promise<void> {
    const resultat = chargerClasse(await fichierChoisi.text());

    if (!resultat.ok) {
      this.message = { ton: 'erreur', texte: resultat.message };
      return;
    }

    this.fichier = resultat.fichier;
    this.nomFichier = fichierChoisi.name;
    this.periodeCourante = resultat.fichier.periodes[0]?.id ?? null;
    this.modifie = resultat.migre;
    this.message = resultat.migre
      ? {
          ton: 'info',
          texte:
            'Ce fichier a été mis à jour vers le format de cette version. '
            + 'Enregistrez-le pour conserver la conversion.',
        }
      : null;
  }

  /**
   * Enregistre par téléchargement. Le fichier atterrit dans « Téléchargements » :
   * l'enseignant doit ensuite le déplacer sur le Drive en écrasant l'ancien.
   */
  enregistrer(): void {
    if (!this.fichier) return;

    const contenu = serialiserClasse($state.snapshot(this.fichier) as FichierClasse, VERSION);
    const url = URL.createObjectURL(new Blob([contenu], { type: 'application/json' }));
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = this.nomFichier || 'classe.json';
    lien.click();
    URL.revokeObjectURL(url);

    this.modifie = false;
    this.message = {
      ton: 'info',
      texte: `« ${lien.download} » a été téléchargé. Replacez-le sur le Drive en écrasant l'ancien.`,
    };
  }

  fermer(): void {
    this.fichier = null;
    this.nomFichier = '';
    this.periodeCourante = null;
    this.modifie = false;
    this.message = null;
  }
}

export const classeur = new Classeur();
