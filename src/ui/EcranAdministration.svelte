<!--
  Écran d'administration — étape 6.

  Le référentiel de la classe s'y modifie : identité, périodes, arborescence des
  rubriques et pondérations. Chaque classe fige le sien (§2.4, décision 4) :
  changer un barème ici ne touche à aucune autre classe, ni à aucune autre année.

  Les suppressions détruisent des résultats déjà encodés : elles sont toutes
  confirmées, et l'écran affiche ce qui va disparaître.
-->
<script lang="ts">
  import type { FichierClasse, Id, Rubrique } from '../domaine/modele.js';
  import { enfantsDe } from '../domaine/calcul.js';
  import {
    ajouterPeriode,
    ajouterRubrique,
    deplacerRubrique,
    descendance,
    modifierRubrique,
    supprimerPeriode,
    supprimerRubrique,
    verifierReferentiel,
  } from '../domaine/mutations.js';

  interface Props {
    fichier: FichierClasse;
    onModification: () => void;
  }

  const { fichier, onModification }: Props = $props();

  const anomalies = $derived(verifierReferentiel(fichier.rubriques));

  /** Rubriques à plat, dans l'ordre d'affichage du bulletin. */
  const aplat = $derived.by(() => {
    const sortie: { rubrique: Rubrique; niveau: number }[] = [];
    const descendre = (parent_id: Id | null, niveau: number) => {
      for (const rubrique of enfantsDe(fichier.rubriques, parent_id)) {
        sortie.push({ rubrique, niveau });
        descendre(rubrique.id, niveau + 1);
      }
    };
    descendre(null, 0);
    return sortie;
  });

  let nouveauParent = $state<string>('');
  let nouveauLibelle = $state('');
  let nouveauMaximum = $state(10);
  let nouveauType = $state<'points' | 'echelle'>('points');

  function testsDe(rubrique_id: Id): number {
    const branche = descendance(fichier.rubriques, rubrique_id);
    return fichier.tests.filter((t) => branche.has(t.rubrique_id)).length;
  }

  function retirerRubrique(rubrique: Rubrique): void {
    const nombre = testsDe(rubrique.id);
    const detail = nombre > 0 ? ` ${nombre} test(s) et leurs résultats seront perdus.` : '';
    if (!confirm(`Supprimer « ${rubrique.libelle} » et ses sous-rubriques ?${detail}`)) return;
    supprimerRubrique(fichier, rubrique.id);
    onModification();
  }

  function retirerPeriode(periode_id: Id, numero: number): void {
    const nombre = fichier.tests.filter((t) => t.periode_id === periode_id).length;
    const detail = nombre > 0 ? ` ${nombre} test(s) et leurs résultats seront perdus.` : '';
    if (!confirm(`Supprimer la période ${numero} ?${detail}`)) return;
    supprimerPeriode(fichier, periode_id);
    onModification();
  }

  function creerRubrique(evenement: SubmitEvent): void {
    evenement.preventDefault();
    if (!nouveauLibelle.trim()) return;
    ajouterRubrique(fichier, {
      parent_id: nouveauParent === '' ? null : nouveauParent,
      libelle: nouveauLibelle,
      maximum: nouveauType === 'echelle' ? 0 : nouveauMaximum,
      type: nouveauType,
    });
    nouveauLibelle = '';
    onModification();
  }
</script>

<div class="administration">
  <section>
    <h2>Identité de la classe</h2>
    <div class="champs">
      <label>
        École
        <input
          value={fichier.annee.ecole}
          oninput={(e) => {
            fichier.annee.ecole = (e.currentTarget as HTMLInputElement).value;
            onModification();
          }}
        />
      </label>
      <label>
        Titulaire
        <input
          value={fichier.annee.titulaire}
          oninput={(e) => {
            fichier.annee.titulaire = (e.currentTarget as HTMLInputElement).value;
            onModification();
          }}
        />
      </label>
      <label>
        Année scolaire
        <input
          value={fichier.annee.libelle}
          oninput={(e) => {
            fichier.annee.libelle = (e.currentTarget as HTMLInputElement).value;
            onModification();
          }}
        />
      </label>
    </div>
    <p class="note">Ces trois champs s'impriment en tête de chaque bulletin.</p>
  </section>

  <section>
    <h2>Périodes</h2>
    <table class="tableau">
      <thead>
        <tr>
          <th scope="col">Période</th>
          <th scope="col">Date du bulletin</th>
          <th scope="col">Tests encodés</th>
          <th scope="col"></th>
        </tr>
      </thead>
      <tbody>
        {#each fichier.periodes as periode (periode.id)}
          <tr>
            <td>Période {periode.numero}</td>
            <td>
              <input
                type="date"
                value={periode.date_bulletin}
                onchange={(e) => {
                  periode.date_bulletin = (e.currentTarget as HTMLInputElement).value;
                  onModification();
                }}
              />
            </td>
            <td class="nombre">
              {fichier.tests.filter((t) => t.periode_id === periode.id).length}
            </td>
            <td>
              <button
                class="danger"
                disabled={fichier.periodes.length <= 1}
                onclick={() => retirerPeriode(periode.id, periode.numero)}
              >
                Supprimer
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
    <button
      onclick={() => {
        ajouterPeriode(fichier);
        onModification();
      }}
    >
      Ajouter une période
    </button>
    <p class="note">
      Le nombre de périodes est une donnée, pas une structure figée : passer à quatre périodes
      ne demande aucune reprise des bulletins.
    </p>
  </section>

  <section>
    <h2>Rubriques et pondérations</h2>

    {#if anomalies.length > 0}
      <ul class="anomalies" role="alert">
        {#each anomalies as anomalie (anomalie.rubrique_id)}
          <li>{anomalie.message}</li>
        {/each}
      </ul>
    {/if}

    <table class="tableau">
      <thead>
        <tr>
          <th scope="col">Rubrique</th>
          <th scope="col">Maximum</th>
          <th scope="col">Cotation</th>
          <th scope="col">Tests</th>
          <th scope="col">Ordre</th>
          <th scope="col"></th>
        </tr>
      </thead>
      <tbody>
        {#each aplat as { rubrique, niveau } (rubrique.id)}
          {@const branche = enfantsDe(fichier.rubriques, rubrique.id).length > 0}
          <tr class:principale={niveau === 0}>
            <td style="padding-left: {0.5 + niveau * 1.3}rem">
              <input
                class="libelle"
                value={rubrique.libelle}
                aria-label="Libellé de {rubrique.libelle}"
                oninput={(e) => {
                  modifierRubrique(fichier, rubrique.id, {
                    libelle: (e.currentTarget as HTMLInputElement).value,
                  });
                  onModification();
                }}
              />
            </td>
            <td>
              {#if rubrique.type === 'points'}
                <input
                  type="number"
                  min="0"
                  step="1"
                  class="maximum"
                  value={rubrique.maximum}
                  aria-label="Maximum de {rubrique.libelle}"
                  oninput={(e) => {
                    modifierRubrique(fichier, rubrique.id, {
                      maximum: Number((e.currentTarget as HTMLInputElement).value),
                    });
                    onModification();
                  }}
                />
              {:else}
                <span class="note">—</span>
              {/if}
            </td>
            <td>
              <select
                value={rubrique.type}
                disabled={branche}
                title={branche
                  ? 'Une rubrique qui a des sous-rubriques est toujours cotée en points.'
                  : undefined}
                aria-label="Type de cotation de {rubrique.libelle}"
                onchange={(e) => {
                  const type = (e.currentTarget as HTMLSelectElement).value as 'points' | 'echelle';
                  modifierRubrique(fichier, rubrique.id, {
                    type,
                    ...(type === 'echelle' ? { maximum: 0 } : {}),
                  });
                  onModification();
                }}
              >
                <option value="points">Points</option>
                <option value="echelle">TB · B · S · F · I</option>
              </select>
            </td>
            <td class="nombre">{testsDe(rubrique.id)}</td>
            <td class="ordre">
              <button
                aria-label="Remonter {rubrique.libelle}"
                onclick={() => {
                  deplacerRubrique(fichier, rubrique.id, 'haut');
                  onModification();
                }}>↑</button
              >
              <button
                aria-label="Descendre {rubrique.libelle}"
                onclick={() => {
                  deplacerRubrique(fichier, rubrique.id, 'bas');
                  onModification();
                }}>↓</button
              >
            </td>
            <td>
              <button class="danger" onclick={() => retirerRubrique(rubrique)}>Supprimer</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    <form class="ajout" onsubmit={creerRubrique}>
      <label>
        Rattachée à
        <select bind:value={nouveauParent}>
          <option value="">— rubrique principale —</option>
          {#each aplat as { rubrique, niveau } (rubrique.id)}
            <option value={rubrique.id}>{'  '.repeat(niveau)}{rubrique.libelle}</option>
          {/each}
        </select>
      </label>
      <label>Libellé <input bind:value={nouveauLibelle} required /></label>
      <label>
        Cotation
        <select bind:value={nouveauType}>
          <option value="points">Points</option>
          <option value="echelle">TB · B · S · F · I</option>
        </select>
      </label>
      {#if nouveauType === 'points'}
        <label>Maximum <input type="number" min="1" step="1" bind:value={nouveauMaximum} /></label>
      {/if}
      <button class="principal" type="submit">Ajouter la rubrique</button>
    </form>
  </section>
</div>

<style>
  .administration {
    display: flex;
    flex-direction: column;
    gap: 1.8rem;
    max-width: 62rem;
  }

  h2 {
    font-size: 1rem;
    margin: 0 0 0.6rem;
  }

  .champs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
  }

  .tableau {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 0.7rem;
    font-size: 0.85rem;
  }

  .tableau th,
  .tableau td {
    border: 1px solid var(--trait);
    padding: 0.2rem 0.4rem;
    text-align: left;
  }

  .tableau thead th {
    background: var(--fond-doux);
    font-size: 0.75rem;
  }

  tr.principale td {
    background: var(--fond-doux);
  }

  tr.principale .libelle {
    font-weight: 600;
  }

  .libelle {
    width: 100%;
    min-width: 12rem;
    border-color: transparent;
    background: transparent;
  }

  .libelle:focus {
    border-color: var(--trait);
    background: var(--fond);
  }

  .maximum {
    width: 5rem;
    text-align: right;
  }

  .nombre {
    text-align: right;
    color: var(--encre-douce);
  }

  .ordre {
    white-space: nowrap;
  }

  .ordre button {
    padding: 0.1rem 0.35rem;
    line-height: 1;
  }

  .danger {
    color: var(--alerte);
    border-color: var(--trait);
    font-size: 0.8rem;
    padding: 0.15rem 0.5rem;
  }

  .danger:hover:not(:disabled) {
    background: var(--alerte-fond);
  }

  .anomalies {
    margin: 0 0 0.7rem;
    padding: 0.5rem 0.6rem 0.5rem 1.6rem;
    border: 1px solid var(--alerte);
    border-radius: 6px;
    background: var(--alerte-fond);
    color: var(--alerte);
    font-size: 0.82rem;
  }

  .ajout {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.6rem;
  }

  .note {
    margin: 0.35rem 0 0;
    color: var(--encre-douce);
    font-size: 0.78rem;
  }
</style>
