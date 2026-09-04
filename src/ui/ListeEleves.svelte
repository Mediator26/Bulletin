<!--
  Liste d'élèves — le même objet visuel dans la saisie et dans les bulletins.

  Les deux écrans affichaient jusqu'ici la même liste de deux façons différentes
  (une `ul` avec une croix d'un côté, une pile de boutons de l'autre) : mêmes
  noms, deux hauteurs de ligne, deux états de survol. Un seul composant, deux
  usages selon les rappels fournis :
    · `onSelection` → les lignes deviennent cliquables et l'une est retenue ;
    · `onSuppression` → chaque ligne porte son bouton de retrait.

  Aucune règle métier ici : l'ordre des élèves vient de `mutations.elevesTries`.
-->
<script lang="ts">
  import type { Eleve, Id } from '../domaine/modele.js';

  interface Props {
    eleves: Eleve[];
    /** Élève retenu, quand la liste sert à choisir. */
    selectionId?: Id | null;
    onSelection?: (id: Id) => void;
    onSuppression?: (eleve: Eleve) => void;
    /** Texte affiché quand la classe est vide. */
    vide?: string;
  }

  const { eleves, selectionId = null, onSelection, onSuppression, vide }: Props = $props();

  /** Monogramme : deux lettres suffisent à repérer une ligne sans la lire. */
  function initiales(eleve: Eleve): string {
    return ((eleve.nom[0] ?? '') + (eleve.prenom[0] ?? '')).toUpperCase();
  }
</script>

{#if eleves.length === 0}
  <p class="vide">{vide ?? 'Aucun élève dans cette classe.'}</p>
{:else}
  <ul class="liste" class:selectionnable={!!onSelection}>
    {#each eleves as eleve (eleve.id)}
      <li class:retenu={selectionId === eleve.id}>
        {#if onSelection}
          <button
            type="button"
            class="ligne"
            aria-current={selectionId === eleve.id ? 'true' : undefined}
            onclick={() => onSelection(eleve.id)}
          >
            <span class="monogramme" aria-hidden="true">{initiales(eleve)}</span>
            <span class="nom">{eleve.nom} {eleve.prenom}</span>
          </button>
        {:else}
          <span class="ligne">
            <span class="monogramme" aria-hidden="true">{initiales(eleve)}</span>
            <span class="nom">{eleve.nom} {eleve.prenom}</span>
          </span>
        {/if}

        {#if onSuppression}
          <button
            type="button"
            class="retirer"
            aria-label="Supprimer {eleve.nom} {eleve.prenom}"
            title="Supprimer {eleve.nom} {eleve.prenom}"
            onclick={() => onSuppression(eleve)}
          >
            ×
          </button>
        {/if}
      </li>
    {/each}
  </ul>
{/if}

<style>
  .liste {
    list-style: none;
    margin: 0;
    padding: var(--e1);
    max-height: 38vh;
    overflow: auto;
    border: 1px solid var(--trait);
    border-radius: var(--r-md);
    background: var(--surface);
  }

  li {
    display: flex;
    align-items: center;
    gap: var(--e1);
    border-radius: var(--r-sm);
  }

  li:hover {
    background: var(--surface-douce);
  }

  li.retenu {
    background: var(--accent-doux);
  }

  /* La ligne entière est la cible du clic, pas seulement le texte : viser un nom
     de trois lettres dans une liste de vingt-cinq est une perte de temps. */
  .ligne {
    display: flex;
    flex: 1;
    align-items: center;
    gap: var(--e3);
    min-width: 0;
    padding: 0.28rem 0.4rem;
    border: 0;
    border-radius: var(--r-sm);
    background: none;
    box-shadow: none;
    font-size: var(--t-md);
    font-weight: 500;
    text-align: left;
  }

  .selectionnable .ligne {
    cursor: pointer;
  }

  .ligne:hover:not(:disabled) {
    background: none;
  }

  .monogramme {
    display: grid;
    place-items: center;
    flex: none;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: var(--r-max);
    background: var(--surface-appuyee);
    color: var(--encre-douce);
    font-size: var(--t-xs);
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .retenu .monogramme {
    background: var(--accent);
    color: var(--sur-accent);
  }

  .retenu .nom {
    font-weight: 650;
    color: var(--accent-fort);
  }

  .nom {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Le retrait détruit des résultats : il reste discret tant qu'on ne le vise
     pas, mais jamais invisible — un bouton qui n'apparaît qu'au survol est
     introuvable au clavier. */
  .retirer {
    flex: none;
    padding: 0 var(--e2);
    border: 0;
    background: none;
    box-shadow: none;
    color: var(--encre-tenue);
    font-size: var(--t-lg);
    line-height: 1;
  }

  .retirer:hover:not(:disabled) {
    background: var(--alerte-fond);
    color: var(--alerte);
  }

  .vide {
    margin: 0;
    padding: var(--e4);
    border: 1px dashed var(--trait-fort);
    border-radius: var(--r-md);
    color: var(--encre-douce);
    font-size: var(--t-md);
    text-align: center;
  }
</style>
