<!--
  Écran d'impression : le verso s'y remplit (commentaire, cotations littérales)
  et la classe entière s'imprime d'un seul geste.

  Le nommage du PDF passe par `document.title` (§2.6) : le navigateur le
  propose comme nom de fichier, ce qui donne « Bulletin-P2-Martin-Léa.pdf »
  sans aucune bibliothèque.
-->
<script lang="ts">
  import { construireBulletin, titrePdf } from '../domaine/bulletin.js';
  import { definirCommentaire, definirCotation } from '../domaine/mutations.js';
  import { ECHELLE, type Echelle, type Eleve, type FichierClasse, type Id } from '../domaine/modele.js';
  import BulletinImprimable from './Bulletin.svelte';

  interface Props {
    fichier: FichierClasse;
    eleves: Eleve[];
    periodeId: Id;
    onModification: () => void;
  }

  const { fichier, eleves, periodeId, onModification }: Props = $props();

  let eleveChoisi = $state<Id | null>(null);
  let touteLaClasse = $state(false);

  const eleveActif = $derived(eleves.find((e) => e.id === (eleveChoisi ?? eleves[0]?.id)) ?? null);
  const aImprimer = $derived(touteLaClasse ? eleves : eleveActif ? [eleveActif] : []);
  const bulletins = $derived(
    aImprimer
      .map((e) => construireBulletin(fichier, e.id, periodeId))
      .filter((b) => b !== null),
  );

  const echelles = $derived(fichier.rubriques.filter((r) => r.type === 'echelle'));

  const commentaire = $derived(
    eleveActif
      ? (fichier.commentaires.find((c) => c.eleve_id === eleveActif.id && c.periode_id === periodeId)
          ?.texte ?? '')
      : '',
  );

  function cotationDe(rubrique_id: Id): Echelle | '' {
    if (!eleveActif) return '';
    return (
      fichier.cotations.find(
        (c) =>
          c.rubrique_id === rubrique_id &&
          c.eleve_id === eleveActif.id &&
          c.periode_id === periodeId,
      )?.valeur ?? ''
    );
  }

  /**
   * Le titre est fixé juste avant l'impression puis restauré : c'est lui que le
   * navigateur propose comme nom de PDF. Pour une classe entière, un nom de
   * fichier unique n'aurait pas de sens — on reste sur celui de la classe.
   */
  function imprimer(): void {
    const titreInitial = document.title;
    const bulletinUnique = !touteLaClasse && bulletins[0];
    if (bulletinUnique) document.title = titrePdf(bulletinUnique.eleve, bulletinUnique.periode);
    window.print();
    document.title = titreInitial;
  }
</script>

<div class="ecran">
  <aside class="no-print">
    <div class="choix">
      <label class="classe-entiere">
        <input type="checkbox" bind:checked={touteLaClasse} />
        Imprimer toute la classe ({eleves.length})
      </label>

      <ul class="liste">
        {#each eleves as eleve (eleve.id)}
          <li>
            <button
              class:actif={eleveActif?.id === eleve.id}
              onclick={() => (eleveChoisi = eleve.id)}
            >
              {eleve.nom} {eleve.prenom}
            </button>
          </li>
        {/each}
      </ul>

      <button class="principal imprimer" disabled={bulletins.length === 0} onclick={imprimer}>
        Imprimer {touteLaClasse ? `les ${eleves.length} bulletins` : 'ce bulletin'}
      </button>
      <p class="rappel">
        Dans la boîte d'impression, décochez « En-têtes et pieds de page », sinon l'adresse du
        fichier s'imprime sur le bulletin.
      </p>
    </div>

    {#if eleveActif}
      <div class="verso">
        <h3>Verso — {eleveActif.nom} {eleveActif.prenom}</h3>

        <label class="plein">
          Commentaire imprimé
          <textarea
            rows="5"
            value={commentaire}
            oninput={(e) => {
              definirCommentaire(
                fichier,
                eleveActif.id,
                periodeId,
                (e.currentTarget as HTMLTextAreaElement).value,
              );
              onModification();
            }}
          ></textarea>
        </label>

        {#each echelles as rubrique (rubrique.id)}
          <label class="plein">
            {rubrique.libelle}
            <select
              value={cotationDe(rubrique.id)}
              onchange={(e) => {
                const choix = (e.currentTarget as HTMLSelectElement).value;
                definirCotation(
                  fichier,
                  rubrique.id,
                  eleveActif.id,
                  periodeId,
                  choix === '' ? null : (choix as Echelle),
                );
                onModification();
              }}
            >
              <option value="">— non coté —</option>
              {#each ECHELLE as cote (cote)}
                <option value={cote}>{cote}</option>
              {/each}
            </select>
          </label>
        {/each}
      </div>
    {/if}
  </aside>

  <div class="apercu">
    {#if bulletins.length === 0}
      <p class="vide no-print">Aucun élève à imprimer.</p>
    {:else}
      {#each bulletins as bulletin (bulletin.eleve.id)}
        <BulletinImprimable {bulletin} />
      {/each}
    {/if}
  </div>
</div>

<style>
  .ecran {
    display: grid;
    grid-template-columns: 17rem minmax(0, 1fr);
    gap: 1.5rem;
    align-items: start;
  }

  .choix,
  .verso {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .verso {
    margin-top: 1.2rem;
    padding-top: 0.8rem;
    border-top: 1px solid var(--trait);
  }

  h3 {
    margin: 0;
    font-size: 0.9rem;
  }

  .classe-entiere {
    flex-direction: row;
    align-items: center;
    gap: 0.4rem;
    color: var(--encre);
    font-size: 0.87rem;
  }

  .liste {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 32vh;
    overflow: auto;
    border: 1px solid var(--trait);
    border-radius: 6px;
  }

  .liste button {
    display: block;
    width: 100%;
    border: 0;
    border-radius: 0;
    text-align: left;
    font-size: 0.85rem;
    padding: 0.25rem 0.5rem;
  }

  .liste button.actif {
    background: var(--accent);
    color: #fff;
  }

  .rappel {
    margin: 0;
    font-size: 0.75rem;
    color: var(--encre-douce);
    line-height: 1.35;
  }

  .plein {
    width: 100%;
  }

  .plein textarea,
  .plein select {
    width: 100%;
  }

  .apercu {
    background: var(--fond-doux);
    padding: 1rem;
    border-radius: 6px;
  }

  .vide {
    margin: 0;
    color: var(--encre-douce);
    font-size: 0.85rem;
  }

  @media print {
    .ecran {
      display: block;
    }

    .apercu {
      background: none;
      padding: 0;
    }
  }
</style>
