/**
 * État de l'application — le fichier de classe ouvert et son cycle de vie.
 *
 * Traduit la contrainte C1 : en `file://`, rien ne s'écrit dans le fichier
 * d'origine. Le cycle est *ouvrir → travailler en mémoire → réenregistrer par
 * téléchargement*, et l'enseignant replace ensuite le fichier sur le Drive.
 * D'où le drapeau `modifie`, qui n'est pas un agrément mais le garde-fou
 * contre la perte de données.
 *
 * Toute modification passe par `toucher()`. C'est là que se branchent les deux
 * filets qui la suivent : l'historique d'annulation (Ctrl+Z) et la copie de
 * récupération dans le stockage du navigateur (C2). Ni l'un ni l'autre ne
 * demande quoi que ce soit aux mutations du domaine, qui continuent d'écrire en
 * place.
 */

import type { FichierClasse, Id } from '../domaine/modele.js';
import { periodesReference, rubriquesReference } from '../domaine/referentiel.js';
import {
  chargerClasse,
  classeVierge,
  nomFichierPropose,
  serialiserClasse,
} from '../donnees/persistance.js';
import {
  decrireMoment,
  deposerSauvetage,
  listerSauvetages,
  nouvelEmplacement,
  retirerSauvetage,
  type Sauvetage,
  type Stockage,
} from '../donnees/recuperation.js';
import { Historique, type Action } from './historique.js';

export const VERSION = __VERSION__;
export const DATE_BUILD = __BUILD_DATE__;

/** Délai entre la dernière frappe et la copie de récupération. */
const DELAI_SAUVETAGE = 1500;

export interface Message {
  ton: 'info' | 'attention' | 'erreur';
  texte: string;
  /** Bouton proposé dans le bandeau, par exemple « Restaurer ». */
  action?: { libelle: string; executer: () => void };
}

/** `localStorage`, ou `null` quand le navigateur le refuse (navigation privée, réglages). */
function stockageNavigateur(): Stockage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function resumer(fichier: FichierClasse): string {
  const n = fichier.eleves.length;
  return n === 0 ? 'aucun élève' : n === 1 ? '1 élève' : `${n} élèves`;
}

class Classeur {
  fichier = $state<FichierClasse | null>(null);
  /** Modifications non enregistrées : affiché en permanence et gardé par `beforeunload`. */
  modifie = $state(false);
  /** Nom du fichier ouvert, reproposé tel quel à l'enregistrement. */
  nomFichier = $state('');
  message = $state<Message | null>(null);
  periodeCourante = $state<Id | null>(null);

  /** Ce que Ctrl+Z et Ctrl+Y défairaient ou referaient, pour les infobulles. */
  aAnnuler = $state<string | null>(null);
  aRetablir = $state<string | null>(null);

  /** Copies de récupération proposées à l'accueil. */
  sauvetages = $state<Sauvetage[]>(listerSauvetages(stockageNavigateur()));

  readonly #historique = new Historique();
  /** Le fichier tel qu'il est maintenant, sérialisé : l'état « avant » de la prochaine action. */
  #reference = '';
  /** Le fichier tel qu'il a été ouvert ou enregistré pour la dernière fois. */
  #enregistre = '';
  /** Emplacement de récupération de cette séance de travail. */
  #emplacement = nouvelEmplacement();
  #minuterie: ReturnType<typeof setTimeout> | null = null;

  get ouvert(): boolean {
    return this.fichier !== null;
  }

  #serialiser(): string {
    // Directement sur l'état réactif : passer par `$state.snapshot` clonerait
    // tout le fichier avant de le sérialiser, pour rien.
    return this.fichier ? JSON.stringify(this.fichier) : '';
  }

  /** Point d'entrée commun à l'ouverture, la création et la restauration d'une classe. */
  #installer(fichier: FichierClasse, nomFichier: string, dejaEnregistre: boolean): void {
    this.#ecrireSauvetageMaintenant();
    this.fichier = fichier;
    this.nomFichier = nomFichier;
    this.periodeCourante = fichier.periodes[0]?.id ?? null;
    this.#reference = this.#serialiser();
    this.#enregistre = dejaEnregistre ? this.#reference : '';
    this.modifie = !dejaEnregistre;
    this.#emplacement = nouvelEmplacement();
    this.#historique.vider();
    this.#majHistorique();
    if (this.modifie) this.#planifierSauvetage();
  }

  /**
   * Marque une modification. Toute action de saisie passe par là, *après* avoir
   * modifié le fichier : l'état d'avant est celui qu'on avait gardé la fois
   * précédente.
   */
  toucher(action: Action = { libelle: 'la dernière modification' }): void {
    if (!this.fichier) return;
    const apres = this.#serialiser();
    if (apres === this.#reference) return; // rien n'a réellement changé

    this.#historique.noter(this.#reference, action);
    this.#reference = apres;
    this.modifie = apres !== this.#enregistre;
    this.#majHistorique();
    this.#planifierSauvetage();
  }

  annuler(): void {
    const etape = this.#historique.annuler(this.#reference);
    if (!etape) return;
    this.#retablirEtat(etape.etat);
    this.message = { ton: 'info', texte: `Annulé : ${etape.libelle}. Ctrl+Y pour rétablir.` };
  }

  retablir(): void {
    const etape = this.#historique.retablir(this.#reference);
    if (!etape) return;
    this.#retablirEtat(etape.etat);
    this.message = { ton: 'info', texte: `Rétabli : ${etape.libelle}.` };
  }

  #retablirEtat(etat: string): void {
    this.fichier = JSON.parse(etat) as FichierClasse;
    this.#reference = etat;
    // Annuler jusqu'à l'état enregistré, c'est n'avoir plus rien à enregistrer.
    this.modifie = etat !== this.#enregistre;
    // La période affichée a pu disparaître (annulation de son ajout).
    if (!this.fichier.periodes.some((p) => p.id === this.periodeCourante)) {
      this.periodeCourante = this.fichier.periodes[0]?.id ?? null;
    }
    this.#majHistorique();
    this.#planifierSauvetage();
  }

  #majHistorique(): void {
    this.aAnnuler = this.#historique.aAnnuler;
    this.aRetablir = this.#historique.aRetablir;
  }

  // ---------- Filet de récupération (C2) ----------

  #planifierSauvetage(): void {
    if (this.#minuterie) clearTimeout(this.#minuterie);
    this.#minuterie = setTimeout(() => this.#ecrireSauvetageMaintenant(), DELAI_SAUVETAGE);
  }

  /**
   * Écrit la copie tout de suite. Appelé aussi à la fermeture de l'onglet et
   * quand il passe en arrière-plan : la minuterie n'aurait pas le temps d'expirer.
   */
  ecrireSauvetage(): void {
    this.#ecrireSauvetageMaintenant();
  }

  #ecrireSauvetageMaintenant(): void {
    if (this.#minuterie) clearTimeout(this.#minuterie);
    this.#minuterie = null;
    if (!this.fichier) return;

    const stockage = stockageNavigateur();
    if (!this.modifie) {
      retirerSauvetage(stockage, this.#emplacement);
      return;
    }
    deposerSauvetage(stockage, {
      id: this.#emplacement,
      nomFichier: this.nomFichier,
      horodatage: new Date().toISOString(),
      resume: resumer(this.fichier),
      contenu: this.#reference,
    });
  }

  #rafraichirSauvetages(): void {
    this.sauvetages = listerSauvetages(stockageNavigateur());
  }

  /** Restaure une copie de récupération. Elle reste en place jusqu'au prochain enregistrement. */
  restaurer(sauvetage: Sauvetage): void {
    const resultat = chargerClasse(sauvetage.contenu);
    if (!resultat.ok) {
      this.message = {
        ton: 'erreur',
        texte: `Cette copie ne peut pas être restaurée : ${resultat.message}`,
      };
      return;
    }
    this.#installer(resultat.fichier, sauvetage.nomFichier, false);
    // La séance restaurée reprend l'emplacement de sa copie : pas de doublon à l'accueil.
    retirerSauvetage(stockageNavigateur(), this.#emplacement);
    this.#emplacement = sauvetage.id;
    this.#ecrireSauvetageMaintenant();
    this.#rafraichirSauvetages();
    this.message = {
      ton: 'info',
      texte: `Travail du ${decrireMoment(sauvetage.horodatage)} restauré. `
        + `Enregistrez-le, puis replacez le fichier sur le Drive.`,
    };
  }

  /** Abandonne définitivement une copie de récupération. */
  ecarter(sauvetage: Sauvetage): void {
    retirerSauvetage(stockageNavigateur(), sauvetage.id);
    this.#rafraichirSauvetages();
  }

  // ---------- Cycle du fichier ----------

  creerClasse(params: { classe: string; libelleAnnee: string; ecole: string; titulaire: string }): void {
    const fichier = classeVierge({ ...params, version: VERSION });
    fichier.rubriques = rubriquesReference(fichier.annee.id);
    fichier.periodes = periodesReference(fichier.annee.id);

    this.#installer(fichier, nomFichierPropose(params.libelleAnnee, params.classe), false);
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

    this.#installer(resultat.fichier, fichierChoisi.name, !resultat.migre);
    this.message = resultat.migre
      ? {
          ton: 'info',
          texte:
            'Ce fichier a été mis à jour vers le format de cette version. '
            + 'Enregistrez-le pour conserver la conversion.',
        }
      : null;

    // Une copie de ce même fichier, plus récente que lui, signale presque
    // toujours un travail perdu avant d'avoir été enregistré.
    this.#rafraichirSauvetages();
    const plusRecente = this.sauvetages.find(
      (s) => s.nomFichier === fichierChoisi.name && Date.parse(s.horodatage) > fichierChoisi.lastModified,
    );
    if (plusRecente) {
      this.message = {
        ton: 'attention',
        texte: `Ce navigateur garde une version plus récente de « ${plusRecente.nomFichier} », `
          + `non enregistrée, du ${decrireMoment(plusRecente.horodatage)}.`,
        action: { libelle: 'La restaurer', executer: () => this.restaurer(plusRecente) },
      };
    }
  }

  /**
   * Enregistre le fichier. Quand le navigateur expose la File System Access API
   * (hors `file://`, qui n'est pas un contexte sécurisé), une fenêtre native
   * laisse l'enseignant choisir le dossier de destination — typiquement le
   * Drive directement, sans passer par « Téléchargements ». Sinon, on revient
   * au téléchargement classique.
   */
  async enregistrer(): Promise<void> {
    if (!this.fichier) return;

    const nom = this.nomFichier || 'classe.json';
    const etat = this.#reference;
    const contenu = serialiserClasse($state.snapshot(this.fichier) as FichierClasse, VERSION);

    if (window.showSaveFilePicker) {
      try {
        const poignee = await window.showSaveFilePicker({
          suggestedName: nom,
          types: [{ description: 'Fichier de classe', accept: { 'application/json': ['.json'] } }],
        });
        const flux = await poignee.createWritable();
        await flux.write(contenu);
        await flux.close();

        this.nomFichier = poignee.name;
        this.#marquerEnregistre(etat);
        this.message = { ton: 'info', texte: `« ${poignee.name} » a été enregistré.` };
      } catch (erreur) {
        if (erreur instanceof DOMException && erreur.name === 'AbortError') return;
        this.message = { ton: 'erreur', texte: "L'enregistrement a échoué. Réessayez." };
      }
      return;
    }

    const url = URL.createObjectURL(new Blob([contenu], { type: 'application/json' }));
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = nom;
    lien.click();
    URL.revokeObjectURL(url);

    this.#marquerEnregistre(etat);
    this.message = {
      ton: 'info',
      texte: `« ${lien.download} » a été téléchargé. Replacez-le sur le Drive en écrasant l'ancien.`,
    };
  }

  /** `etat` : ce qui a été écrit, et non ce qui a pu être tapé pendant la fenêtre d'enregistrement. */
  #marquerEnregistre(etat: string): void {
    this.#enregistre = etat;
    this.modifie = this.#reference !== etat;
    this.#ecrireSauvetageMaintenant();
  }

  fermer(): void {
    this.#ecrireSauvetageMaintenant();
    this.fichier = null;
    this.nomFichier = '';
    this.periodeCourante = null;
    this.modifie = false;
    this.message = null;
    this.#historique.vider();
    this.#majHistorique();
    this.#rafraichirSauvetages();
  }
}

export const classeur = new Classeur();
