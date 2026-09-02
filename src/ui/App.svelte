<!--
  Écran principal : la barre de fichier (C1, C3, C4), le choix de la période,
  et l'un des trois écrans — saisie, bulletins imprimables, réglages.
-->
<script lang="ts">
  import { classeur, DATE_BUILD, VERSION } from '../etat/classeur.svelte.js';
  import { ajouterEleve, elevesTries, supprimerEleve } from '../domaine/mutations.js';
  import EcranSaisie from './EcranSaisie.svelte';
  import EcranBulletins from './EcranBulletins.svelte';
  import EcranAdministration from './EcranAdministration.svelte';

  let champFichier = $state<HTMLInputElement | null>(null);
  let vue = $state<'saisie' | 'bulletins' | 'administration'>('saisie');

  // Formulaire de création de classe
  let nomClasse = $state('');
  let libelleAnnee = $state('2025-2026');
  let ecole = $state('');
  let titulaire = $state('');

  // Ajout d'élève
  let nomEleve = $state('');
  let prenomEleve = $state('');
  let anneeEtude = $state(4);

  const fichier = $derived(classeur.fichier);
  const eleves = $derived(fichier ? elevesTries(fichier) : []);

  // Garde-fou C1 : l'onglet ne se ferme pas sur un travail non enregistré.
  $effect(() => {
    const garder = (e: BeforeUnloadEvent) => {
      if (classeur.modifie) e.preventDefault();
    };
    window.addEventListener('beforeunload', garder);
    return () => window.removeEventListener('beforeunload', garder);
  });

  async function auChoixDeFichier(evenement: Event): Promise<void> {
    const champ = evenement.currentTarget as HTMLInputElement;
    const choisi = champ.files?.[0];
    if (!choisi) return;
    if (classeur.modifie && !confirm('Des modifications ne sont pas enregistrées. Les abandonner ?')) {
      champ.value = '';
      return;
    }
    await classeur.ouvrir(choisi);
    champ.value = ''; // permet de rouvrir deux fois le même fichier
  }

  function creer(evenement: SubmitEvent): void {
    evenement.preventDefault();
    if (!nomClasse.trim()) return;
    classeur.creerClasse({ classe: nomClasse, libelleAnnee, ecole, titulaire });
  }

  function ajouterUnEleve(evenement: SubmitEvent): void {
    evenement.preventDefault();
    if (!fichier || !nomEleve.trim()) return;
    ajouterEleve(fichier, { nom: nomEleve, prenom: prenomEleve, annee_etude: anneeEtude });
    classeur.toucher();
    nomEleve = '';
    prenomEleve = '';
  }

  function retirerEleve(id: string, nom: string): void {
    if (!fichier || !confirm(`Supprimer ${nom} et tous ses résultats ?`)) return;
    supprimerEleve(fichier, id);
    classeur.toucher();
  }
</script>

<header class="no-print">
  <div class="titre">
    <strong>Bulletin scolaire</strong>
    {#if fichier}
      <span class="nom-fichier">{classeur.nomFichier}</span>
      {#if classeur.modifie}
        <span class="drapeau" title="Ces modifications ne sont pas encore dans le fichier du Drive">
          modifications non enregistrées
        </span>
      {:else}
        <span class="drapeau enregistre">enregistré</span>
      {/if}
    {/if}
  </div>

  <div class="actions">
    <button onclick={() => champFichier?.click()}>Ouvrir une classe…</button>
    <input
      bind:this={champFichier}
      type="file"
      accept="application/json,.json"
      hidden
      onchange={auChoixDeFichier}
    />
    <button class="principal" disabled={!fichier} onclick={() => classeur.enregistrer()}>
      Enregistrer
    </button>
    <span class="version" title="Date de compilation : {DATE_BUILD}">v{VERSION} — {DATE_BUILD}</span>
  </div>
</header>

{#if classeur.message}
  <p class="bandeau no-print" class:erreur={classeur.message.ton === 'erreur'} role="status">
    {classeur.message.texte}
  </p>
{/if}

<main>
  {#if !fichier}
    <section class="accueil">
      <h1>Par quoi commencer ?</h1>
      <p>
        Ce fichier est l'<em>application</em>. Les données de chaque classe vivent dans un
        fichier <code>.json</code> distinct, à conserver sur le Drive de l'école. Ne les confondez
        jamais : l'application se remplace à chaque mise à jour, les classes non.
      </p>

      <div class="choix">
        <div class="carte">
          <h2>Ouvrir une classe existante</h2>
          <p>Reprendre le travail sur un fichier <code>.json</code> déjà enregistré sur le Drive.</p>
          <button class="principal" onclick={() => champFichier?.click()}>
            Choisir un fichier…
          </button>
        </div>

        <div class="carte">
          <h2>Créer une nouvelle classe</h2>
          <form onsubmit={creer}>
            <label>Classe <input bind:value={nomClasse} placeholder="4e A" required /></label>
            <label>Année scolaire <input bind:value={libelleAnnee} placeholder="2025-2026" /></label>
            <label>École <input bind:value={ecole} placeholder="Momignies" /></label>
            <label>Titulaire <input bind:value={titulaire} /></label>
            <button class="principal" type="submit">Créer la classe</button>
          </form>
        </div>
      </div>
    </section>
  {:else}
    <nav class="periodes no-print">
      <div class="vues">
        <button class:active={vue === 'saisie'} onclick={() => (vue = 'saisie')}>Saisie</button>
        <button class:active={vue === 'bulletins'} onclick={() => (vue = 'bulletins')}>
          Bulletins
        </button>
        <button class:active={vue === 'administration'} onclick={() => (vue = 'administration')}>
          Réglages
        </button>
      </div>

      {#if vue !== 'administration'}
        <!-- La période courante ne pilote que la saisie et les bulletins : dans les
             réglages, toutes les périodes sont déjà listées, un sélecteur y serait sans
             effet visible et dupliquerait le champ de date du tableau. -->
        {#each fichier.periodes as periode (periode.id)}
          <button
            class:active={classeur.periodeCourante === periode.id}
            onclick={() => (classeur.periodeCourante = periode.id)}
          >
            Période {periode.numero}
          </button>
        {/each}

        <label class="date">
          Date du bulletin
          <input
            type="date"
            value={fichier.periodes.find((p) => p.id === classeur.periodeCourante)?.date_bulletin ?? ''}
            onchange={(e) => {
              const periode = fichier.periodes.find((p) => p.id === classeur.periodeCourante);
              if (periode) {
                periode.date_bulletin = (e.currentTarget as HTMLInputElement).value;
                classeur.toucher();
              }
            }}
          />
        </label>
      {/if}
    </nav>

    {#if vue === 'bulletins'}
      {#if classeur.periodeCourante}
        <EcranBulletins
          {fichier}
          {eleves}
          periodeId={classeur.periodeCourante}
          onModification={() => classeur.toucher()}
        />
      {/if}
    {:else if vue === 'administration'}
      <EcranAdministration {fichier} onModification={() => classeur.toucher()} />
    {:else}
      <div class="colonnes">
        <aside class="no-print">
          <h2>Élèves <span class="compte">{eleves.length}</span></h2>
          <ul class="liste-eleves">
            {#each eleves as eleve (eleve.id)}
              <li>
                <span>{eleve.nom} {eleve.prenom}</span>
                <button
                  class="supprimer"
                  aria-label="Supprimer {eleve.nom} {eleve.prenom}"
                  onclick={() => retirerEleve(eleve.id, `${eleve.nom} ${eleve.prenom}`)}>×</button
                >
              </li>
            {/each}
          </ul>
          <form class="ajout" onsubmit={ajouterUnEleve}>
            <h2>Ajouter un élève</h2>
            <label>Nom <input bind:value={nomEleve} required /></label>
            <label>Prénom <input bind:value={prenomEleve} /></label>
            <label>Année <input type="number" min="1" max="6" bind:value={anneeEtude} /></label>
            <button type="submit">Ajouter l'élève</button>
          </form>
        </aside>

        <section class="saisie">
          {#if classeur.periodeCourante}
            <EcranSaisie
              {fichier}
              {eleves}
              periodeId={classeur.periodeCourante}
              onModification={() => classeur.toucher()}
            />
          {/if}
        </section>
      </div>
    {/if}
  {/if}
</main>

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.6rem 1rem;
    border-bottom: 1px solid var(--trait);
    background: var(--fond-doux);
  }

  .titre {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
  }

  .nom-fichier {
    color: var(--encre-douce);
    font-size: 0.85rem;
  }

  .drapeau {
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    background: var(--alerte-fond);
    color: var(--alerte);
    font-size: 0.75rem;
  }

  .drapeau.enregistre {
    background: #edf7f1;
    color: var(--ok);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .version {
    color: var(--encre-douce);
    font-size: 0.75rem;
  }

  .bandeau {
    margin: 0;
    padding: 0.5rem 1rem;
    background: #eef4fc;
    border-bottom: 1px solid var(--trait);
    font-size: 0.87rem;
  }

  .bandeau.erreur {
    background: var(--alerte-fond);
    color: var(--alerte);
  }

  main {
    padding: 1rem;
  }

  .accueil {
    max-width: 52rem;
  }

  .accueil h1 {
    font-size: 1.2rem;
  }

  .accueil > p {
    color: var(--encre-douce);
    line-height: 1.5;
  }

  .choix {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
    margin-top: 1.5rem;
    align-items: start;
  }

  .carte {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    padding: 1.2rem;
    border: 1px solid var(--trait);
    border-radius: 8px;
    background: var(--fond-doux);
  }

  .carte h2 {
    font-size: 1rem;
    margin: 0;
  }

  .carte p {
    margin: 0;
    color: var(--encre-douce);
    line-height: 1.4;
    font-size: 0.9rem;
  }

  .carte .principal {
    align-self: flex-start;
  }

  form {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.6rem;
  }

  .periodes {
    display: flex;
    align-items: flex-end;
    gap: 0.4rem;
    margin-bottom: 1rem;
  }

  .periodes button.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  .vues {
    display: flex;
    gap: 0.4rem;
    margin-right: 1rem;
    padding-right: 1rem;
    border-right: 1px solid var(--trait);
  }

  .periodes .date {
    margin-left: auto;
  }

  .colonnes {
    display: grid;
    grid-template-columns: 15rem minmax(0, 1fr);
    gap: 1.5rem;
    align-items: start;
  }

  aside h2 {
    font-size: 0.95rem;
    margin: 0 0 0.5rem;
  }

  .compte {
    color: var(--encre-douce);
    font-weight: 400;
  }

  .liste-eleves {
    list-style: none;
    margin: 0 0 0.8rem;
    padding: 0;
    max-height: 40vh;
    overflow: auto;
    border: 1px solid var(--trait);
    border-radius: 6px;
  }

  .liste-eleves li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0.5rem;
    font-size: 0.87rem;
  }

  .liste-eleves li + li {
    border-top: 1px solid var(--trait);
  }

  .supprimer {
    border: 0;
    background: none;
    padding: 0 0.2rem;
    color: var(--encre-douce);
    line-height: 1;
  }

  .supprimer:hover {
    color: var(--alerte);
    background: none;
  }

  .ajout label input {
    width: 100%;
  }

  .ajout label:has(input[type='number']) {
    max-width: 5rem;
  }

</style>
