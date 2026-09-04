<!--
  Écran d'administration — étape 6.

  Le référentiel de la classe s'y modifie : identité, périodes, arborescence des
  rubriques et pondérations. Chaque classe fige le sien (§2.4, décision 4) :
  changer un barème ici ne touche à aucune autre classe, ni à aucune autre année.

  Les suppressions détruisent des résultats déjà encodés : elles sont toutes
  confirmées, et l'écran affiche ce qui va disparaître.

  Mise en forme : une section = une carte titrée, avec sa phrase d'explication
  juste sous le titre plutôt qu'en note de bas de section. Les réglages se lisent
  rarement de haut en bas ; on y descend pour une chose précise, et chaque carte
  doit se comprendre seule.
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
  <section class="carte">
    <header>
      <h2>Identité de la classe</h2>
      <p class="explication">Ces trois champs s'impriment en tête de chaque bulletin.</p>
    </header>
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
  </section>

  <section class="carte">
    <header>
      <h2>Périodes</h2>
      <p class="explication">
        Le nombre de périodes est une donnée, pas une structure figée : passer à quatre périodes
        ne demande aucune reprise des bulletins.
      </p>
    </header>
    <div class="tabla-scroll">
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
    </div>
    <button
      onclick={() => {
        ajouterPeriode(fichier);
        onModification();
      }}
    >
      Ajouter une période
    </button>
  </section>

  <section class="carte">
    <header>
      <h2>Rubriques et pondérations</h2>
      <p class="explication">
        Chaque classe fige son propre barème : modifier une pondération ici ne touche à aucune
        autre classe, ni à aucune autre année.
      </p>
    </header>

    {#if anomalies.length > 0}
      <ul class="anomalies" role="alert">
        {#each anomalies as anomalie (anomalie.rubrique_id)}
          <li>{anomalie.message}</li>
        {/each}
      </ul>
    {/if}

    <div class="tabla-scroll">
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
    </div>

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
    gap: var(--e6);
    max-width: 64rem;
  }

  .carte {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--e5);
    padding: var(--e6);
    border: 1px solid var(--trait);
    border-radius: var(--r-lg);
    background: var(--surface);
    box-shadow: var(--ombre-1);
  }

  header {
    display: flex;
    flex-direction: column;
    gap: var(--e2);
  }

  h2 {
    margin: 0;
    font-size: var(--t-lg);
  }

  .explication {
    margin: 0;
    max-width: 44rem;
    color: var(--encre-douce);
    font-size: var(--t-md);
    line-height: 1.5;
  }

  .champs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--e4);
    width: 100%;
  }

  .champs input {
    width: 100%;
  }

  .tabla-scroll {
    width: 100%;
    overflow-x: auto;
    border: 1px solid var(--trait);
    border-radius: var(--r-md);
  }

  /* Même grammaire que la grille de saisie : bordures séparées, en-tête sourd,
     ligne survolée teintée. Deux tableaux dans la même application ne doivent
     pas avoir deux apparences. */
  .tableau {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: var(--t-md);
  }

  .tableau th,
  .tableau td {
    border-bottom: 1px solid var(--trait);
    padding: 0.3rem 0.5rem;
    text-align: left;
    vertical-align: middle;
  }

  .tableau tbody tr:last-child td {
    border-bottom: 0;
  }

  .tableau thead th {
    background: var(--surface-douce);
    color: var(--encre-douce);
    font-size: var(--t-xs);
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .tableau tbody tr:hover td {
    background: var(--surface-douce);
  }

  /* Une rubrique principale porte le poids de ses sous-rubriques : elle se
     détache par le fond et la graisse, l'indentation dit le reste. */
  tr.principale td {
    background: var(--surface-douce);
  }

  tr.principale:hover td {
    background: var(--surface-appuyee);
  }

  tr.principale .libelle {
    font-weight: 700;
  }

  /* Le libellé s'édite sur place : le champ ne se dessine qu'au survol ou au
     focus, pour que le tableau se lise comme un tableau. */
  .libelle {
    width: 100%;
    min-width: 12rem;
    border-color: transparent;
    background: transparent;
  }

  .libelle:hover {
    border-color: var(--trait);
    background: var(--surface);
  }

  .libelle:focus,
  .libelle:focus-visible {
    border-color: var(--accent);
    background: var(--surface);
  }

  .maximum {
    width: 5rem;
    text-align: right;
  }

  .nombre {
    text-align: right;
    color: var(--encre-douce);
    font-variant-numeric: tabular-nums;
  }

  .ordre {
    white-space: nowrap;
  }

  .ordre button {
    padding: 0.15rem 0.4rem;
    line-height: 1;
  }

  .ordre button + button {
    margin-left: 2px;
  }

  .anomalies {
    width: 100%;
    margin: 0;
    padding: var(--e4) var(--e4) var(--e4) var(--e6);
    border: 1px solid var(--alerte);
    border-left-width: 3px;
    border-radius: var(--r-md);
    background: var(--alerte-fond);
    color: var(--alerte);
    font-size: var(--t-md);
    line-height: 1.5;
  }

  /* Le formulaire d'ajout ferme la carte : il se lit comme la dernière ligne du
     tableau, pas comme une section de plus. */
  .ajout {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--e4);
    width: 100%;
    padding-top: var(--e5);
    border-top: 1px dashed var(--trait-fort);
  }

  .ajout .principal {
    margin-left: auto;
  }

  .note {
    margin: 0;
    color: var(--encre-tenue);
    font-size: var(--t-md);
  }

  @media (max-width: 760px) {
    .carte {
      padding: var(--e5);
    }

    .champs {
      grid-template-columns: 1fr;
    }

    .ajout {
      flex-direction: column;
      align-items: stretch;
    }

    .ajout .principal {
      margin-left: 0;
    }
  }
</style>
