/**
 * Historique d'annulation — Ctrl+Z / Ctrl+Y sur toute modification de la classe.
 *
 * Une étape est l'état *complet* du fichier sérialisé, et non l'inverse de
 * chaque mutation : les mutations du domaine écrivent en place et sont
 * nombreuses, leur écrire une à une une opération inverse multiplierait les
 * occasions d'en oublier une. Une classe pèse quelques centaines de Ko en JSON ;
 * en garder une cinquantaine d'états reste négligeable pour un poste de bureau.
 *
 * Module pur, sans Svelte ni DOM : `Classeur` lui confie ses états et l'horloge
 * est injectable, ce qui le rend testable en Node.
 */

/** Ce que vient de faire l'enseignant, tel qu'on le lui rappellera à l'annulation. */
export interface Action {
  /** Complète « Annuler : … » — par exemple « la note de Martin Léa ». */
  libelle: string;
  /**
   * Deux actions successives d'un même groupe ne forment qu'une étape : taper
   * « 1 » puis « 5 » dans une cellule, ou écrire un commentaire, s'annule d'un
   * seul coup et non caractère par caractère.
   */
  groupe?: string;
}

export interface Etape {
  etat: string;
  libelle: string;
}

export class Historique {
  readonly #passe: Etape[] = [];
  #futur: Etape[] = [];
  #groupe: string | null = null;
  #instant = 0;

  constructor(
    readonly limite = 50,
    /** Au-delà, une reprise de la même cellule redevient une étape distincte. */
    readonly delaiRegroupement = 60_000,
  ) {}

  /** Enregistre l'état qui précédait `action`. Toute nouvelle action efface les étapes à rétablir. */
  noter(avant: string, action: Action, maintenant = Date.now()): void {
    const regroupee =
      action.groupe !== undefined &&
      action.groupe === this.#groupe &&
      maintenant - this.#instant < this.delaiRegroupement &&
      this.#passe.length > 0;

    if (!regroupee) {
      this.#passe.push({ etat: avant, libelle: action.libelle });
      if (this.#passe.length > this.limite) this.#passe.shift();
    }
    this.#groupe = action.groupe ?? null;
    this.#instant = maintenant;
    this.#futur = [];
  }

  /** Rend l'état à restaurer, et garde `actuel` pour pouvoir le rétablir. */
  annuler(actuel: string): Etape | null {
    const etape = this.#passe.pop();
    if (!etape) return null;
    this.#futur.push({ etat: actuel, libelle: etape.libelle });
    this.#groupe = null;
    return etape;
  }

  retablir(actuel: string): Etape | null {
    const etape = this.#futur.pop();
    if (!etape) return null;
    this.#passe.push({ etat: actuel, libelle: etape.libelle });
    this.#groupe = null;
    return etape;
  }

  /** Libellé de ce que Ctrl+Z annulerait, ou `null` s'il n'y a rien à annuler. */
  get aAnnuler(): string | null {
    return this.#passe.at(-1)?.libelle ?? null;
  }

  get aRetablir(): string | null {
    return this.#futur.at(-1)?.libelle ?? null;
  }

  vider(): void {
    this.#passe.length = 0;
    this.#futur = [];
    this.#groupe = null;
  }
}
