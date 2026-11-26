<!--
  Fenêtre « Nouveautés » : ce que chaque mise à jour a apporté (C4, C11).

  S'ouvre d'un clic sur le numéro de version, ou depuis le bandeau affiché une
  fois après une mise à jour. La version installée est mise en avant ; les précédentes
  restent lisibles en dessous, pour qui a sauté une mise à jour.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { dateEnClair, NOUVEAUTES } from '../nouveautes.js';

  interface Props {
    versionInstallee: string;
    onFermer: () => void;
  }

  const { versionInstallee, onFermer }: Props = $props();

  let dialogue: HTMLDialogElement;

  onMount(() => dialogue.showModal());
</script>

<dialog
  bind:this={dialogue}
  aria-labelledby="titre-nouveautes"
  oncancel={(e) => {
    e.preventDefault();
    onFermer();
  }}
  onclick={(e) => {
    // Un clic sur le voile, hors de la fenêtre, la ferme aussi.
    if (e.target === dialogue) onFermer();
  }}
>
  <div class="contenu">
    <header>
      <h2 id="titre-nouveautes">Nouveautés</h2>
      <button class="discret fermer" aria-label="Fermer" onclick={onFermer}>×</button>
    </header>

    <ol class="versions">
      {#each NOUVEAUTES as v (v.version)}
        <li class:installee={v.version === versionInstallee}>
          <h3>
            Version {v.version}
            <span class="date">{dateEnClair(v.date)}</span>
            {#if v.version === versionInstallee}<span class="badge">installée</span>{/if}
          </h3>
          <ul>
            {#each v.points as point (point)}
              <li>{point}</li>
            {/each}
          </ul>
        </li>
      {/each}
    </ol>
  </div>
</dialog>

<style>
  dialog {
    width: min(38rem, calc(100vw - 2rem));
    max-height: calc(100vh - 4rem);
    padding: 0;
    border: 1px solid var(--trait);
    border-radius: var(--r-lg);
    background: var(--surface);
    color: var(--encre);
    box-shadow: var(--ombre-3);
  }

  dialog::backdrop {
    background: rgb(26 23 19 / 40%);
  }

  .contenu {
    display: flex;
    flex-direction: column;
    gap: var(--e4);
    padding: var(--e6);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  header h2 {
    margin: 0;
    font-size: var(--t-xl);
  }

  .fermer {
    font-size: var(--t-xl);
    line-height: 1;
  }

  .versions {
    display: flex;
    flex-direction: column;
    gap: var(--e5);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  h3 {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: var(--e3);
    margin: 0 0 var(--e2);
    font-size: var(--t-base);
  }

  .date {
    color: var(--encre-douce);
    font-size: var(--t-xs);
    font-weight: 500;
  }

  .badge {
    padding: 0.05rem 0.45rem;
    border-radius: var(--r-max);
    background: var(--accent-doux);
    color: var(--accent-fort);
    font-size: var(--t-xs);
  }

  ul {
    margin: 0;
    padding-left: 1.1rem;
    color: var(--encre-douce);
    font-size: var(--t-md);
    line-height: 1.55;
  }

  /* La version installée se lit en premier ; les précédentes passent au second plan. */
  .installee {
    padding: var(--e4);
    border: 1px solid var(--accent-trait);
    border-radius: var(--r-md);
    background: var(--accent-doux);
  }

  .installee ul {
    color: var(--encre);
  }
</style>
