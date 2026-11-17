<!--
  Fenêtre de modification d'un test : nom et maximum.

  Le nom se corrige sans conséquence. Le maximum, lui, change le sens des
  notes déjà encodées, et deux lectures sont possibles (voir
  `ConversionPoints` dans `domaine/mutations.ts`). L'application ne tranche
  jamais à la place de l'enseignant : elle lui présente les deux options, dit
  dans quel cas choisir chacune, et les illustre avec une note de sa propre
  classe. Le bouton « Enregistrer » reste inactif tant qu'il n'a pas choisi.

  Tout ce qui est calculé ici — exemples, aperçu, dépassements — vient de
  `impactChangementMaximum` ; ce composant ne fait que le mettre en mots.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { FichierClasse, Test } from '../domaine/modele.js';
  import {
    impactChangementMaximum,
    messageDepassements,
    modifierTest,
    type ConversionPoints,
  } from '../domaine/mutations.js';

  interface Props {
    fichier: FichierClasse;
    test: Test;
    onFermer: () => void;
    /** Appelé après une modification réussie, avant la fermeture. */
    onModification: (test: Test) => void;
  }

  const { fichier, test, onFermer, onModification }: Props = $props();

  let dialogue: HTMLDialogElement;
  // Le brouillon part des valeurs actuelles du test, une fois pour toutes.
  // svelte-ignore state_referenced_locally
  let libelle = $state(test.libelle);
  // svelte-ignore state_referenced_locally
  let maximumSaisi = $state(nombre(test.maximum));
  let conversion = $state<ConversionPoints | null>(null);
  let erreur = $state<string | null>(null);

  const ancien = $derived(test.maximum);
  const maximum = $derived(Number(maximumSaisi.trim().replace(',', '.')));
  const maximumValide = $derived(maximumSaisi.trim() !== '' && Number.isFinite(maximum) && maximum > 0);
  const maximumChange = $derived(maximumValide && maximum !== ancien);
  const impact = $derived(maximumChange ? impactChangementMaximum(fichier, test.id, maximum) : null);
  const choixRequis = $derived(!!impact && impact.notes.length > 0);
  const conserverPossible = $derived(!impact || impact.depassements.length === 0);
  /** Un choix devenu impossible (maximum abaissé entre-temps) n'est plus retenu. */
  const choix = $derived(conversion === 'conserver' && !conserverPossible ? null : conversion);

  /** La note qui sert d'exemple : un 0 n'illustre rien, 0 reste 0 dans les deux cas. */
  const exemple = $derived(impact ? (impact.notes.find((n) => n.avant !== 0) ?? impact.notes[0]) : undefined);

  const enregistrable = $derived(
    libelle.trim() !== '' && maximumValide && (!choixRequis || choix !== null),
  );

  function nombre(valeur: number): string {
    return String(valeur).replace('.', ',');
  }

  function nomDe(eleve_id: string): string {
    const eleve = fichier.eleves.find((e) => e.id === eleve_id);
    return eleve ? `${eleve.nom} ${eleve.prenom}`.trim() : 'Un élève';
  }

  function enregistrer(evenement: SubmitEvent): void {
    evenement.preventDefault();
    const resultat = modifierTest(
      fichier,
      test.id,
      { libelle, maximum },
      choixRequis ? (choix ?? undefined) : undefined,
    );
    if (!resultat.ok) {
      erreur = resultat.message;
      return;
    }
    onModification(test);
    onFermer();
  }

  onMount(() => {
    dialogue.showModal();
  });
</script>

<dialog
  bind:this={dialogue}
  aria-labelledby="titre-modification-test"
  oncancel={(e) => {
    e.preventDefault();
    onFermer();
  }}
>
  <form onsubmit={enregistrer}>
    <header>
      <h2 id="titre-modification-test">Modifier le test</h2>
      <p>Les notes déjà encodées restent attachées au test.</p>
    </header>

    <div class="champs">
      <label class="nom">
        Nom du test
        <input
          bind:value={libelle}
          oninput={() => (erreur = null)}
          autocomplete="off"
          required
        />
      </label>
      <label class="maximum">
        Sur
        <input
          bind:value={maximumSaisi}
          oninput={() => (erreur = null)}
          inputmode="decimal"
          autocomplete="off"
          aria-invalid={maximumValide ? undefined : 'true'}
        />
      </label>
    </div>

    {#if !maximumValide}
      <p class="refus" role="alert">Le maximum doit être un nombre plus grand que 0.</p>
    {:else if impact && !choixRequis}
      <p class="consequence">
        Aucune note n'est encore encodée pour ce test : le maximum passe de {nombre(ancien)} à
        {nombre(maximum)} sans autre conséquence.
      </p>
    {:else if impact && exemple}
      <fieldset>
        <legend>Que deviennent les notes déjà encodées ?</legend>
        <p class="contexte">
          {impact.notes.length === 1
            ? 'Un élève a déjà une note'
            : `${impact.notes.length} élèves ont déjà une note`} pour ce test, et le maximum passe de
          <strong>{nombre(ancien)}</strong> à <strong>{nombre(maximum)}</strong>. Choisissez ce que
          deviennent leurs points : l'application ne peut pas le deviner.
        </p>

        <label class="option" class:choisie={choix === 'conserver'} class:impossible={!conserverPossible}>
          <input
            type="radio"
            name="conversion"
            value="conserver"
            bind:group={conversion}
            disabled={!conserverPossible}
          />
          <span class="corps">
            <span class="intitule">Garder les points tels quels</span>
            <span class="effet">Les points encodés ne bougent pas, seul le maximum change.</span>
            <span class="quand">
              <em>À choisir si</em> vous vous êtes trompé de maximum en créant le test : les copies
              étaient corrigées sur {nombre(maximum)}, et vous avez encodé les points de la copie.
            </span>
            <span class="exemple">
              Exemple : {nomDe(exemple.eleve_id)}
              <span class="avant">{nombre(exemple.avant)} / {nombre(ancien)}</span>
              <span aria-label="devient">→</span>
              <span class="apres">{nombre(exemple.conserver)} / {nombre(maximum)}</span>
            </span>
            {#if !conserverPossible}
              <span class="blocage">{messageDepassements(fichier, impact)}</span>
            {/if}
          </span>
        </label>

        <label class="option" class:choisie={choix === 'proportionnel'}>
          <input type="radio" name="conversion" value="proportionnel" bind:group={conversion} />
          <span class="corps">
            <span class="intitule">Convertir les points (règle de trois)</span>
            <span class="effet">Chaque note est recalculée pour garder la même réussite.</span>
            <span class="quand">
              <em>À choisir si</em> les copies étaient bien corrigées sur {nombre(ancien)}, mais que
              ce test doit compter comme un test sur {nombre(maximum)}.
            </span>
            <span class="exemple">
              Exemple : {nomDe(exemple.eleve_id)}
              <span class="avant">{nombre(exemple.avant)} / {nombre(ancien)}</span>
              <span aria-label="devient">→</span>
              <span class="apres">{nombre(exemple.proportionnel)} / {nombre(maximum)}</span>
            </span>
            <span class="detail">Les notes converties sont arrondies au centième.</span>
          </span>
        </label>

        <p class="consequence">
          Dans les deux cas, les absences et les dispenses restent telles quelles, et ce test
          comptera pour {nombre(maximum)} points dans le total de la rubrique, au lieu de
          {nombre(ancien)}.
        </p>

        {#if choix}
          <details open={impact.notes.length <= 8}>
            <summary>
              {impact.notes.length === 1 ? 'La note' : `Les ${impact.notes.length} notes`} après modification
            </summary>
            <div class="apercu">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Élève</th>
                    <th scope="col">Maintenant</th>
                    <th scope="col">Après</th>
                  </tr>
                </thead>
                <tbody>
                  {#each impact.notes as note (note.eleve_id)}
                    {@const apres = choix === 'conserver' ? note.conserver : note.proportionnel}
                    <tr>
                      <th scope="row">{nomDe(note.eleve_id)}</th>
                      <td>{nombre(note.avant)} / {nombre(ancien)}</td>
                      <td class:change={apres !== note.avant}>{nombre(apres)} / {nombre(maximum)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </details>
        {/if}
      </fieldset>
    {/if}

    {#if erreur}
      <p class="refus" role="alert">{erreur}</p>
    {/if}

    <footer>
      {#if choixRequis && !choix}
        <span class="attente">Choisissez une option pour enregistrer.</span>
      {/if}
      <button type="button" class="discret" onclick={onFermer}>Annuler</button>
      <button type="submit" class="principal" disabled={!enregistrable}>Enregistrer</button>
    </footer>
  </form>
</dialog>

<style>
  dialog {
    width: min(40rem, calc(100vw - 2rem));
    max-height: calc(100vh - 2rem);
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

  form {
    display: flex;
    flex-direction: column;
    gap: var(--e5);
    padding: var(--e6);
  }

  header h2 {
    margin: 0;
    font-size: var(--t-xl);
  }

  header p {
    margin: var(--e1) 0 0;
    color: var(--encre-douce);
    font-size: var(--t-sm);
  }

  .champs {
    display: flex;
    gap: var(--e4);
  }

  .champs .nom {
    flex: 1;
  }

  .champs .maximum input {
    width: 6rem;
    font-variant-numeric: tabular-nums;
  }

  .champs input {
    text-transform: none;
    letter-spacing: normal;
    font-weight: 400;
  }

  fieldset {
    display: flex;
    flex-direction: column;
    gap: var(--e4);
    margin: 0;
    padding: 0;
    border: 0;
  }

  legend {
    padding: 0;
    margin-bottom: var(--e2);
    font-size: var(--t-lg);
    font-weight: 650;
  }

  .contexte,
  .consequence {
    margin: 0;
    font-size: var(--t-md);
    color: var(--encre-douce);
  }

  .contexte strong {
    color: var(--encre);
    font-variant-numeric: tabular-nums;
  }

  /* Une option = une carte entière cliquable. Le libellé hérite par défaut de
     la mise en forme des étiquettes de champ (petites capitales) : on la
     neutralise, c'est ici un paragraphe d'explication. */
  .option {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: var(--e4);
    padding: var(--e4) var(--e5);
    border: 1px solid var(--trait-fort);
    border-radius: var(--r-md);
    background: var(--surface);
    color: var(--encre);
    font-size: var(--t-md);
    font-weight: 400;
    letter-spacing: normal;
    text-transform: none;
    cursor: pointer;
    transition:
      border-color var(--transition),
      background var(--transition);
  }

  .option:hover:not(.impossible) {
    border-color: var(--n-400);
  }

  .option.choisie {
    border-color: var(--accent);
    background: var(--accent-doux);
    box-shadow: inset 0 0 0 1px var(--accent);
  }

  .option.impossible {
    cursor: not-allowed;
    background: var(--surface-douce);
  }

  .option.impossible .intitule,
  .option.impossible .effet,
  .option.impossible .quand,
  .option.impossible .exemple {
    opacity: 0.6;
  }

  .option input {
    margin-top: 0.2rem;
    accent-color: var(--accent);
  }

  .corps {
    display: flex;
    flex-direction: column;
    gap: var(--e1);
  }

  .intitule {
    font-size: var(--t-base);
    font-weight: 650;
  }

  .quand em {
    font-style: normal;
    font-weight: 600;
  }

  .quand,
  .detail {
    color: var(--encre-douce);
  }

  .detail {
    font-size: var(--t-sm);
  }

  .exemple {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--e2);
    margin-top: var(--e1);
    padding: var(--e2) var(--e3);
    border-radius: var(--r-sm);
    background: var(--surface-appuyee);
    font-variant-numeric: tabular-nums;
    align-self: flex-start;
  }

  .exemple .apres {
    font-weight: 700;
  }

  .blocage {
    margin-top: var(--e2);
    color: var(--alerte);
    font-weight: 550;
  }

  details summary {
    cursor: pointer;
    font-size: var(--t-md);
    font-weight: 600;
  }

  .apercu {
    max-height: 14rem;
    overflow: auto;
    margin-top: var(--e3);
    border: 1px solid var(--trait);
    border-radius: var(--r-sm);
  }

  .apercu table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--t-md);
    font-variant-numeric: tabular-nums;
  }

  .apercu th,
  .apercu td {
    padding: 0.25rem 0.6rem;
    border-bottom: 1px solid var(--trait);
    text-align: left;
  }

  .apercu thead th {
    position: sticky;
    top: 0;
    background: var(--surface-douce);
    font-size: var(--t-xs);
  }

  .apercu tbody th {
    font-weight: 500;
  }

  .apercu td.change {
    font-weight: 700;
    color: var(--accent-fort);
  }

  .refus {
    margin: 0;
    padding: var(--e3) var(--e4);
    border-radius: var(--r-sm);
    background: var(--alerte-fond);
    color: var(--alerte);
    font-size: var(--t-md);
    font-weight: 550;
  }

  footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--e3);
  }

  .attente {
    margin-right: auto;
    color: var(--encre-tenue);
    font-size: var(--t-sm);
  }
</style>
