<!--
  Écran de saisie : toutes les rubriques de la période, empilées.

  Le titulaire encode une période entière en descendant la page, sans jamais
  choisir une rubrique dans un menu. Chaque rubrique porte sa propre grille et
  son propre champ d'ajout de test ; la navigation clavier reste interne à la
  rubrique, d'où la `zone` transmise à chaque grille.

  Mise en forme : une rubrique = une carte. Empilées sans cadre, douze grilles
  se confondaient en un seul long tableau ; l'encadré redonne à chaque rubrique
  un début et une fin, et son en-tête reste collé en haut pendant qu'on descend
  dans une grille longue.
-->
<script lang="ts">
  import type { Eleve, FichierClasse, Id, Rubrique } from '../domaine/modele.js';
  import { cheminLibelle, rubriquesSaisissables, SEPARATEUR_CHEMIN } from '../domaine/referentiel.js';
  import { ajouterTest, testsDeLaPeriode } from '../domaine/mutations.js';
  import Grille from './Grille.svelte';

  interface Props {
    fichier: FichierClasse;
    eleves: Eleve[];
    periodeId: Id;
    onModification: () => void;
  }

  const { fichier, eleves, periodeId, onModification }: Props = $props();

  const feuilles = $derived(rubriquesSaisissables(fichier.rubriques));

  /** Un brouillon de nouveau test par rubrique : les formulaires n'interfèrent pas. */
  let libelles = $state<Record<Id, string>>({});
  let maxima = $state<Record<Id, number>>({});

  /**
   * Découpe « Français › Lire-écrire » en parents + feuille, pour n'appuyer
   * typographiquement que sur la rubrique réellement saisie.
   */
  function chemin(rubrique: Rubrique): { parents: string; feuille: string } {
    const segments = cheminLibelle(rubrique, fichier.rubriques).split(SEPARATEUR_CHEMIN);
    const feuille = segments.pop() ?? rubrique.libelle;
    return { parents: segments.join(SEPARATEUR_CHEMIN), feuille };
  }

  function ajouter(evenement: SubmitEvent, rubrique_id: Id): void {
    evenement.preventDefault();
    const libelle = libelles[rubrique_id]?.trim();
    if (!libelle) return;

    ajouterTest(fichier, {
      periode_id: periodeId,
      rubrique_id,
      libelle,
      maximum: maxima[rubrique_id] ?? 10,
    });
    libelles = { ...libelles, [rubrique_id]: '' };
    onModification();
  }
</script>

{#if eleves.length === 0}
  <div class="etat-vide">
    <h2>La classe est vide</h2>
    <p>Ajoutez les élèves dans le panneau de gauche : les grilles de saisie apparaîtront ici.</p>
  </div>
{:else}
  <!-- Les raccourcis ne se devinent pas, et l'aide en ligne d'un outil ouvert en
       file:// n'existe pas : la légende reste à l'écran, en clair. -->
  <aside class="legende">
    <ul>
      <li><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> se déplacer</li>
      <li><kbd>Entrée</kbd> élève suivant</li>
      <li><kbd>Tab</kbd> test suivant</li>
      <li><kbd>a</kbd> absent</li>
      <li><kbd>d</kbd> dispensé</li>
      <li><kbd>Suppr</kbd> effacer</li>
    </ul>
    <p>
      <strong>Une case vide n'est pas un zéro :</strong> elle sort du calcul, un 0 y entre.
    </p>
  </aside>

  {#each feuilles as rubrique (rubrique.id)}
    {@const tests = testsDeLaPeriode(fichier, periodeId, rubrique.id)}
    {@const libelle = chemin(rubrique)}
    <section class="rubrique">
      <div class="entete">
        <h3>
          {#if libelle.parents}
            <span class="parents">{libelle.parents}{SEPARATEUR_CHEMIN}</span>
          {/if}<span class="feuille">{libelle.feuille}</span>
          <span class="sur">sur {rubrique.maximum}</span>
        </h3>

        <form onsubmit={(e) => ajouter(e, rubrique.id)}>
          <input
            class="libelle-test"
            placeholder="Nouveau test"
            aria-label="Nouveau test en {cheminLibelle(rubrique, fichier.rubriques)}"
            value={libelles[rubrique.id] ?? ''}
            oninput={(e) =>
              (libelles = {
                ...libelles,
                [rubrique.id]: (e.currentTarget as HTMLInputElement).value,
              })}
          />
          <div class="sur-champ">
            <span aria-hidden="true">/</span>
            <input
              type="number"
              min="1"
              step="1"
              class="maximum"
              aria-label="Maximum du test"
              value={maxima[rubrique.id] ?? 10}
              oninput={(e) =>
                (maxima = {
                  ...maxima,
                  [rubrique.id]: Number((e.currentTarget as HTMLInputElement).value),
                })}
            />
          </div>
          <!-- Le libellé visible reste court, mais douze boutons « Ajouter »
               empilés ne se distinguent pas à la lecture d'écran : chacun dit
               dans quelle rubrique il ajoute. -->
          <button
            type="submit"
            aria-label="Ajouter ce test en {cheminLibelle(rubrique, fichier.rubriques)}"
          >
            Ajouter
          </button>
        </form>
      </div>

      <Grille {fichier} {eleves} {tests} zone={rubrique.id} {onModification} />
    </section>
  {/each}
{/if}

<style>
  .rubrique {
    margin-bottom: var(--e5);
    border: 1px solid var(--trait);
    border-radius: var(--r-lg);
    background: var(--surface);
    box-shadow: var(--ombre-1);
  }

  /* L'en-tête suit la descente dans une grille de vingt-cinq élèves : on sait
     toujours dans quelle rubrique on encode. */
  .entete {
    position: sticky;
    top: 3.2rem;
    z-index: 5;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--e4);
    padding: var(--e3) var(--e4);
    border-bottom: 1px solid var(--trait);
    border-radius: var(--r-lg) var(--r-lg) 0 0;
    background: var(--surface-douce);
  }

  h3 {
    margin: 0;
    font-size: var(--t-md);
    font-weight: 500;
  }

  .parents {
    color: var(--encre-tenue);
  }

  .feuille {
    font-weight: 700;
    color: var(--encre);
  }

  .sur {
    margin-left: var(--e2);
    padding: 0.05rem 0.4rem;
    border-radius: var(--r-max);
    background: var(--surface-appuyee);
    color: var(--encre-douce);
    font-size: var(--t-xs);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  form {
    display: flex;
    align-items: center;
    gap: var(--e2);
  }

  .libelle-test {
    width: 11rem;
  }

  /* « / 10 » se lit comme une seule expression : le slash appartient au champ,
     pas au libellé du test. */
  .sur-champ {
    display: flex;
    align-items: center;
    gap: var(--e1);
    color: var(--encre-tenue);
  }

  .maximum {
    width: 4rem;
    text-align: right;
  }

  .legende {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--e3) var(--e5);
    margin-bottom: var(--e5);
    padding: var(--e3) var(--e4);
    border: 1px solid var(--trait);
    border-radius: var(--r-md);
    background: var(--surface-douce);
    color: var(--encre-douce);
    font-size: var(--t-sm);
  }

  .legende ul {
    display: flex;
    flex-wrap: wrap;
    gap: var(--e2) var(--e4);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .legende li {
    display: flex;
    align-items: center;
    gap: 0.2rem;
  }

  .legende p {
    margin: 0;
    padding-left: var(--e4);
    border-left: 1px solid var(--trait-fort);
  }

  .legende strong {
    color: var(--encre);
  }

  .etat-vide {
    padding: var(--e8) var(--e5);
    border: 1px dashed var(--trait-fort);
    border-radius: var(--r-lg);
    background: var(--surface);
    text-align: center;
  }

  .etat-vide h2 {
    margin: 0 0 var(--e3);
    font-size: var(--t-lg);
  }

  .etat-vide p {
    margin: 0;
    color: var(--encre-douce);
    font-size: var(--t-md);
  }

  @media (max-width: 720px) {
    .entete {
      position: static;
    }

    .legende p {
      padding-left: 0;
      border-left: 0;
    }
  }
</style>
