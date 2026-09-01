<!--
  Écran de saisie : toutes les rubriques de la période, empilées.

  Le titulaire encode une période entière en descendant la page, sans jamais
  choisir une rubrique dans un menu. Chaque rubrique porte sa propre grille et
  son propre champ d'ajout de test ; la navigation clavier reste interne à la
  rubrique, d'où la `zone` transmise à chaque grille.
-->
<script lang="ts">
  import type { Eleve, FichierClasse, Id } from '../domaine/modele.js';
  import { cheminLibelle, rubriquesSaisissables } from '../domaine/referentiel.js';
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
  <p class="vide">Aucun élève dans cette classe. Ajoutez-en à gauche pour commencer la saisie.</p>
{:else}
  <p class="aide">
    Déplacement : flèches · <kbd>Entrée</kbd> élève suivant · <kbd>Tab</kbd> test suivant ·
    <kbd>a</kbd> absent · <kbd>d</kbd> dispensé · <kbd>Suppr</kbd> efface. Une case vide n'est pas
    un zéro : elle sort du calcul, un 0 y entre.
  </p>

  {#each feuilles as rubrique (rubrique.id)}
    {@const tests = testsDeLaPeriode(fichier, periodeId, rubrique.id)}
    <section class="rubrique">
      <div class="entete">
        <h3>
          {cheminLibelle(rubrique, fichier.rubriques)}
          <span class="sur">sur {rubrique.maximum}</span>
        </h3>

        <form onsubmit={(e) => ajouter(e, rubrique.id)}>
          <input
            placeholder="Nouveau test"
            aria-label="Nouveau test en {cheminLibelle(rubrique, fichier.rubriques)}"
            value={libelles[rubrique.id] ?? ''}
            oninput={(e) =>
              (libelles = {
                ...libelles,
                [rubrique.id]: (e.currentTarget as HTMLInputElement).value,
              })}
          />
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
          <button type="submit">Ajouter</button>
        </form>
      </div>

      <Grille {fichier} {eleves} {tests} zone={rubrique.id} {onModification} />
    </section>
  {/each}
{/if}

<style>
  .rubrique {
    margin-bottom: 1.4rem;
  }

  .entete {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    margin-bottom: 0.35rem;
  }

  h3 {
    margin: 0;
    font-size: 0.92rem;
  }

  .sur {
    color: var(--encre-douce);
    font-weight: 400;
    font-size: 0.8rem;
  }

  form {
    display: flex;
    gap: 0.35rem;
  }

  form input {
    font-size: 0.85rem;
  }

  .maximum {
    width: 4.5rem;
  }

  .aide,
  .vide {
    margin: 0 0 1rem;
    color: var(--encre-douce);
    font-size: 0.82rem;
  }

  kbd {
    border: 1px solid var(--trait);
    border-radius: 3px;
    padding: 0 0.25rem;
    background: var(--fond-doux);
    font-family: inherit;
    font-size: 0.78rem;
  }
</style>
