<!--
  Écran d'impression : le verso s'y remplit (commentaire, cotations littérales)
  et la classe entière s'imprime d'un seul geste.

  Le nommage du PDF passe par `document.title` (§2.6) : le navigateur le
  propose comme nom de fichier, ce qui donne « Bulletin-P2-Martin-Léa.pdf »
  sans aucune bibliothèque.

  Mise en forme : trois panneaux à gauche — qui, quoi imprimer, et le verso à
  remplir — et l'aperçu à droite posé sur un fond sourd, pour que la feuille
  blanche se lise comme une feuille et non comme le fond de l'application.
  L'aperçu garde son papier blanc même en thème sombre : c'est ce qui sortira
  de l'imprimante.
-->
<script lang="ts">
  import { construireBulletin, titrePdf } from '../domaine/bulletin.js';
  import { definirCommentaire, definirCotation } from '../domaine/mutations.js';
  import { ECHELLE, type Echelle, type Eleve, type FichierClasse, type Id } from '../domaine/modele.js';
  import BulletinImprimable from './Bulletin.svelte';
  import ListeEleves from './ListeEleves.svelte';

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
    <section class="panneau">
      <h3>Élève</h3>
      <ListeEleves
        {eleves}
        selectionId={eleveActif?.id ?? null}
        onSelection={(id) => (eleveChoisi = id)}
        vide="Aucun élève à imprimer."
      />
    </section>

    <section class="panneau">
      <h3>Impression</h3>

      <!-- Interrupteur plutôt que case à cocher : l'action est lourde (vingt-cinq
           bulletins) et doit se voir avant qu'on appuie sur « Imprimer ». -->
      <label class="bascule">
        <input type="checkbox" bind:checked={touteLaClasse} />
        <span class="rail" aria-hidden="true"><span class="galet"></span></span>
        <span class="etiquette">
          Toute la classe
          <span class="detail">{eleves.length} bulletin{eleves.length > 1 ? 's' : ''}</span>
        </span>
      </label>

      <button class="principal imprimer" disabled={bulletins.length === 0} onclick={imprimer}>
        Imprimer {touteLaClasse ? `les ${eleves.length} bulletins` : 'ce bulletin'}
      </button>

      <p class="rappel">
        <strong>Avant d'imprimer :</strong> dans la boîte d'impression, décochez
        « En-têtes et pieds de page », sinon l'adresse du fichier s'imprime sur le bulletin.
      </p>
    </section>

    {#if eleveActif}
      <section class="panneau">
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
      </section>
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
    grid-template-columns: 17.5rem minmax(0, 1fr);
    gap: var(--e6);
    align-items: start;
  }

  aside {
    display: flex;
    flex-direction: column;
    gap: var(--e5);
    position: sticky;
    top: 3.9rem;
    max-height: calc(100vh - 5rem);
    overflow: auto;
    padding-right: var(--e1);
  }

  .panneau {
    display: flex;
    flex-direction: column;
    gap: var(--e3);
  }

  h3 {
    margin: 0;
    font-size: var(--t-xs);
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--encre-douce);
  }

  /* --- Interrupteur --- */
  .bascule {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--e3);
    padding: var(--e3);
    border: 1px solid var(--trait);
    border-radius: var(--r-md);
    background: var(--surface);
    color: var(--encre);
    font-size: var(--t-md);
    font-weight: 500;
    letter-spacing: normal;
    text-transform: none;
    cursor: pointer;
  }

  .bascule:hover {
    border-color: var(--trait-fort);
  }

  .bascule input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .rail {
    flex: none;
    display: flex;
    align-items: center;
    width: 2.1rem;
    height: 1.15rem;
    padding: 2px;
    border-radius: var(--r-max);
    background: var(--trait-fort);
    transition: background var(--transition);
  }

  .galet {
    width: 0.9rem;
    height: 0.9rem;
    border-radius: var(--r-max);
    background: var(--surface);
    box-shadow: var(--ombre-1);
    transition: transform var(--transition);
  }

  .bascule input:checked + .rail {
    background: var(--accent);
  }

  .bascule input:checked + .rail .galet {
    transform: translateX(0.95rem);
  }

  .bascule input:focus-visible + .rail {
    box-shadow: var(--anneau);
  }

  .etiquette {
    display: flex;
    flex-direction: column;
    line-height: 1.25;
  }

  .detail {
    color: var(--encre-douce);
    font-size: var(--t-xs);
    font-weight: 400;
  }

  .imprimer {
    justify-content: center;
    padding: 0.5rem 0.8rem;
  }

  /* C7 : le réglage à décocher est rappelé là où on imprime, pas dans une notice
     qui reste sur le Drive. */
  .rappel {
    margin: 0;
    padding: var(--e3) var(--e4);
    border-left: 3px solid var(--attention);
    border-radius: 0 var(--r-sm) var(--r-sm) 0;
    background: var(--attention-fond);
    color: var(--attention);
    font-size: var(--t-xs);
    line-height: 1.45;
  }

  .plein {
    width: 100%;
  }

  .plein textarea,
  .plein select {
    width: 100%;
  }

  /* Le « bureau » : un fond sourd sur lequel la feuille se détache. */
  .apercu {
    display: flex;
    flex-direction: column;
    gap: var(--e5);
    padding: var(--e5);
    border: 1px solid var(--trait);
    border-radius: var(--r-lg);
    background: var(--surface-appuyee);
  }

  .vide {
    margin: 0;
    padding: var(--e7);
    color: var(--encre-douce);
    font-size: var(--t-md);
    text-align: center;
  }

  @media print {
    .ecran {
      display: block;
    }

    .apercu {
      display: block;
      background: none;
      border: 0;
      padding: 0;
      gap: 0;
    }
  }

  @media (max-width: 900px) {
    .ecran {
      grid-template-columns: 1fr;
    }

    aside {
      position: static;
      max-height: none;
      overflow: visible;
    }

    .apercu {
      padding: var(--e3);
    }
  }
</style>
