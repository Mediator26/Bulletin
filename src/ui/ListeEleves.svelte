<!--
  Liste d'élèves — le même objet visuel dans la saisie et dans les bulletins.

  Les deux écrans affichaient jusqu'ici la même liste de deux façons différentes
  (une `ul` avec une croix d'un côté, une pile de boutons de l'autre) : mêmes
  noms, deux hauteurs de ligne, deux états de survol. Un seul composant, deux
  usages selon les rappels fournis :
    · `onSelection` → les lignes deviennent cliquables et l'une est retenue ;
    · `onSuppression` → chaque ligne porte son bouton de retrait ;
    · `onRenommage` → chaque ligne porte un crayon qui la transforme en un
      petit formulaire nom/prénom, sur place. Corriger une faute de frappe ne
      doit pas obliger à supprimer l'élève puis à le recréer : la suppression
      emporte tous ses résultats, le renommage n'en touche aucun.

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
    /** Reçoit l'identité corrigée ; la ligne quitte l'édition si le rappel renvoie `true`. */
    onRenommage?: (eleve: Eleve, identite: { nom: string; prenom: string }) => boolean;
    /** Texte affiché quand la classe est vide. */
    vide?: string;
  }

  const {
    eleves,
    selectionId = null,
    onSelection,
    onSuppression,
    onRenommage,
    vide,
  }: Props = $props();

  /** Élève en cours de correction — un seul à la fois. */
  let enEdition = $state<Id | null>(null);
  let nomEdite = $state('');
  let prenomEdite = $state('');

  function ouvrirEdition(eleve: Eleve): void {
    enEdition = eleve.id;
    nomEdite = eleve.nom;
    prenomEdite = eleve.prenom;
  }

  function valider(eleve: Eleve): void {
    if (onRenommage?.(eleve, { nom: nomEdite, prenom: prenomEdite })) enEdition = null;
  }

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
        {#if enEdition === eleve.id}
          <form
            class="edition"
            onsubmit={(e) => {
              e.preventDefault();
              valider(eleve);
            }}
          >
            <!-- svelte-ignore a11y_autofocus -->
            <input
              bind:value={nomEdite}
              autofocus
              required
              aria-label="Nom"
              placeholder="Nom"
              onkeydown={(e) => e.key === 'Escape' && (enEdition = null)}
            />
            <input
              bind:value={prenomEdite}
              aria-label="Prénom"
              placeholder="Prénom"
              onkeydown={(e) => e.key === 'Escape' && (enEdition = null)}
            />
            <button type="submit" title="Enregistrer le nom">Renommer</button>
            <button type="button" class="discret" onclick={() => (enEdition = null)}>
              Annuler
            </button>
          </form>
        {:else if onSelection}
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

        {#if onRenommage && enEdition !== eleve.id}
          <button
            type="button"
            class="crayon"
            aria-label="Renommer {eleve.nom} {eleve.prenom}"
            title="Renommer {eleve.nom} {eleve.prenom}"
            onclick={() => ouvrirEdition(eleve)}
          >
            ✎
          </button>
        {/if}

        {#if onSuppression && enEdition !== eleve.id}
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
  /* Le crayon ne détruit rien : il reste neutre, à côté de la croix rouge. */
  .crayon {
    flex: none;
    padding: 0 var(--e2);
    border: 0;
    background: none;
    box-shadow: none;
    color: var(--encre-tenue);
    font-size: var(--t-md);
    line-height: 1;
  }

  .crayon:hover:not(:disabled) {
    background: var(--surface-appuyee);
    color: var(--accent-fort);
  }

  .edition {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--e1);
    min-width: 0;
    padding: 0.2rem 0.3rem;
  }

  .edition input {
    flex: 1 1 5rem;
    min-width: 0;
    font-size: var(--t-sm);
  }

  .edition button {
    font-size: var(--t-xs);
  }

  .edition .discret {
    border: 0;
    background: none;
    box-shadow: none;
    color: var(--encre-douce);
  }

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
