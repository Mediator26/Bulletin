<!--
  Coquille de l'application : la barre de fichier (C1, C3, C4), la barre de
  contexte (écran courant + période), et l'un des trois écrans — saisie,
  bulletins imprimables, réglages.

  Deux barres, deux rôles, et jamais l'inverse :
    · la barre haute parle du *fichier* — quelle classe est ouverte, est-elle
      enregistrée, comment l'ouvrir et la réenregistrer ;
    · la barre de contexte parle de *ce qu'on regarde* — quel écran, quelle
      période, quelle date de bulletin.
  L'ancienne version mêlait les deux dans une seule rangée séparée par un trait,
  ce qui mettait « Réglages » et « Période 2 » au même niveau alors que l'un
  change d'écran et l'autre change de données.
-->
<script lang="ts">
  import { classeur, DATE_BUILD, VERSION } from '../etat/classeur.svelte.js';
  import { apparence } from '../etat/theme.svelte.js';
  import { ajouterEleve, elevesTries, supprimerEleve } from '../domaine/mutations.js';
  import type { Eleve } from '../domaine/modele.js';
  import EcranSaisie from './EcranSaisie.svelte';
  import EcranBulletins from './EcranBulletins.svelte';
  import EcranAdministration from './EcranAdministration.svelte';
  import ListeEleves from './ListeEleves.svelte';

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

  const VUES = [
    { cle: 'saisie', libelle: 'Saisie' },
    { cle: 'bulletins', libelle: 'Bulletins' },
    { cle: 'administration', libelle: 'Réglages' },
  ] as const;

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

  function retirerEleve(eleve: Eleve): void {
    const nom = `${eleve.nom} ${eleve.prenom}`;
    if (!fichier || !confirm(`Supprimer ${nom} et tous ses résultats ?`)) return;
    supprimerEleve(fichier, eleve.id);
    classeur.toucher();
  }
</script>

<header class="barre no-print">
  <div class="marque">
    <svg class="logo" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <rect x="3" y="2" width="18" height="20" rx="5" fill="currentColor" opacity="0.14" />
      <path
        d="M7.5 8h9M7.5 12h9M7.5 16h5.5"
        stroke="currentColor"
        stroke-width="1.9"
        stroke-linecap="round"
        fill="none"
      />
    </svg>
    <span class="titre">
      <strong>Bulletin scolaire</strong>
      <span class="version" title="Date de compilation : {DATE_BUILD}">
        v{VERSION} · {DATE_BUILD}
      </span>
    </span>
  </div>

  {#if fichier}
    <div class="contexte">
      <span class="nom-fichier" title="Fichier de classe ouvert">{classeur.nomFichier}</span>
      {#if fichier.annee.libelle || fichier.annee.ecole}
        <span class="sous-titre">
          {[fichier.annee.libelle, fichier.annee.ecole].filter(Boolean).join(' · ')}
        </span>
      {/if}
    </div>
  {/if}

  <div class="actions">
    {#if fichier}
      <!-- L'indicateur n'est pas décoratif : rien ne s'écrit tout seul sur le
           Drive (C1), il dit s'il reste du travail à sauver. -->
      <span
        class="etat"
        class:en-attente={classeur.modifie}
        title={classeur.modifie
          ? 'Ces modifications ne sont pas encore dans le fichier du Drive'
          : 'Le fichier téléchargé est à jour'}
      >
        <span class="pastille" aria-hidden="true"></span>
        {classeur.modifie ? 'Non enregistré' : 'Enregistré'}
      </span>
    {/if}

    <button onclick={() => champFichier?.click()}>Ouvrir une classe…</button>
    <input
      bind:this={champFichier}
      type="file"
      accept="application/json,.json"
      hidden
      onchange={auChoixDeFichier}
    />
    <!-- Enregistrer ne devient l'action dominante que lorsqu'il y a réellement
         quelque chose à enregistrer. -->
    <button
      class:principal={classeur.modifie}
      disabled={!fichier}
      onclick={() => classeur.enregistrer()}
    >
      Enregistrer
    </button>

    <!-- Bascule d'apparence. Le clair est le thème par défaut ; le sombre est un
         confort, pas un réglage à comprendre, d'où un seul bouton sans menu. -->
    <button
      class="apparence"
      onclick={() => apparence.basculer()}
      title={apparence.theme === 'clair' ? 'Passer au thème sombre' : 'Passer au thème clair'}
      aria-label={apparence.theme === 'clair' ? 'Passer au thème sombre' : 'Passer au thème clair'}
      aria-pressed={apparence.theme === 'sombre'}
    >
      {#if apparence.theme === 'clair'}
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path
            d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linejoin="round"
          />
        </svg>
      {:else}
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8" />
          <path
            d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      {/if}
    </button>
  </div>
</header>

{#if classeur.message}
  <div class="bandeau no-print" class:erreur={classeur.message.ton === 'erreur'} role="status">
    <span class="pastille" aria-hidden="true"></span>
    <p>{classeur.message.texte}</p>
    <button class="discret compact" aria-label="Masquer ce message" onclick={() => (classeur.message = null)}>
      ×
    </button>
  </div>
{/if}

<main>
  {#if !fichier}
    <section class="accueil">
      <h1>Par quoi commencer ?</h1>
      <p class="chapeau">
        Ce fichier est l'<em>application</em>. Les données de chaque classe vivent dans un
        fichier <code>.json</code> distinct, à conserver sur le Drive de l'école.
      </p>

      <p class="avertissement">
        <strong>Ne les confondez jamais :</strong> l'application se remplace à chaque mise à jour,
        les classes non.
      </p>

      <!-- Les deux cartes sont strictement à égalité : même fond, même cadre,
           deux actions principales. Ouvrir un fichier existant est simplement
           placé en premier dans l'ordre de lecture, ce qui suffit à guider sans
           reléguer la création. Ne pas y remettre de teinte d'accent : privilégier
           l'un des deux chemins par la couleur est précisément ce que la mise à
           égalité des deux cartes corrigeait. -->
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
    <nav class="contexte-barre no-print" aria-label="Écran et période">
      <div class="segmente" role="group" aria-label="Écran">
        {#each VUES as item (item.cle)}
          <button
            class="segment"
            aria-pressed={vue === item.cle}
            onclick={() => (vue = item.cle)}
          >
            {item.libelle}
          </button>
        {/each}
      </div>

      {#if vue !== 'administration'}
        <!-- La période courante ne pilote que la saisie et les bulletins : dans les
             réglages, toutes les périodes sont déjà listées, un sélecteur y serait sans
             effet visible et dupliquerait le champ de date du tableau. -->
        <div class="segmente" role="group" aria-label="Période">
          {#each fichier.periodes as periode (periode.id)}
            <button
              class="segment"
              aria-pressed={classeur.periodeCourante === periode.id}
              onclick={() => (classeur.periodeCourante = periode.id)}
            >
              Période {periode.numero}
            </button>
          {/each}
        </div>

        <label class="date">
          <span>Date du bulletin</span>
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
          <section class="panneau">
            <h2>
              Élèves
              <span class="compte">{eleves.length}</span>
            </h2>
            <ListeEleves
              {eleves}
              onSuppression={retirerEleve}
              vide="Aucun élève. Ajoutez-en ci-dessous."
            />
          </section>

          <section class="panneau">
            <h2>Ajouter un élève</h2>
            <form class="ajout" onsubmit={ajouterUnEleve}>
              <label class="plein">Nom <input bind:value={nomEleve} required /></label>
              <label class="plein">Prénom <input bind:value={prenomEleve} /></label>
              <label class="courte">
                Année <input type="number" min="1" max="6" bind:value={anneeEtude} />
              </label>
              <button type="submit">Ajouter l'élève</button>
            </form>
          </section>
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
  /* ---------- Barre d'application ---------- */
  .barre {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: var(--e5);
    padding: var(--e3) var(--e5);
    border-bottom: 1px solid var(--trait);
    background: var(--surface);
    box-shadow: var(--ombre-1);
  }

  .marque {
    display: flex;
    align-items: center;
    gap: var(--e3);
  }

  /* Bouton carré : seule l'icône change, la barre ne doit pas se réagencer
     à la bascule. */
  .apparence {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.1rem;
    padding: 0;
  }

  .logo {
    flex: none;
    color: var(--accent);
  }

  .titre {
    display: flex;
    flex-direction: column;
    line-height: 1.15;
  }

  .titre strong {
    font-size: var(--t-base);
    letter-spacing: -0.012em;
  }

  /* Version et date de build restent lisibles en permanence, sans occuper la
     place d'une action. */
  .version {
    color: var(--encre-tenue);
    font-size: var(--t-xs);
    font-variant-numeric: tabular-nums;
  }

  .contexte {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding-left: var(--e5);
    border-left: 1px solid var(--trait);
    line-height: 1.2;
  }

  .nom-fichier {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--t-md);
    font-weight: 600;
  }

  .sous-titre {
    color: var(--encre-douce);
    font-size: var(--t-xs);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: var(--e3);
    margin-left: auto;
  }

  .etat {
    display: inline-flex;
    align-items: center;
    gap: var(--e2);
    padding: 0.2rem 0.6rem 0.2rem 0.45rem;
    border-radius: var(--r-max);
    background: var(--ok-fond);
    color: var(--ok);
    font-size: var(--t-xs);
    font-weight: 650;
    white-space: nowrap;
  }

  .etat.en-attente {
    background: var(--attention-fond);
    color: var(--attention);
  }

  .pastille {
    width: 0.44rem;
    height: 0.44rem;
    border-radius: var(--r-max);
    background: currentColor;
  }

  /* ---------- Bandeau de message ---------- */
  .bandeau {
    display: flex;
    align-items: flex-start;
    gap: var(--e3);
    padding: var(--e3) var(--e5);
    border-bottom: 1px solid var(--accent-trait);
    background: var(--accent-doux);
    color: var(--accent-fort);
    font-size: var(--t-md);
  }

  .bandeau .pastille {
    margin-top: 0.42rem;
  }

  .bandeau p {
    margin: 0;
    flex: 1;
  }

  .bandeau button {
    color: inherit;
    font-size: var(--t-lg);
    line-height: 1;
  }

  .bandeau.erreur {
    border-bottom-color: var(--alerte);
    background: var(--alerte-fond);
    color: var(--alerte);
  }

  main {
    padding: var(--e5);
  }

  /* ---------- Accueil ---------- */
  .accueil {
    max-width: 54rem;
    margin: var(--e7) auto;
  }

  .accueil h1 {
    margin: 0 0 var(--e3);
    font-size: var(--t-2xl);
  }

  .chapeau {
    margin: 0;
    max-width: 44rem;
    color: var(--encre-douce);
    font-size: var(--t-base);
    line-height: 1.6;
  }

  /* La confusion « application / données » est le risque n° 1 de C3 : elle a
     droit à un encadré, pas à une phrase au fil du texte. */
  .avertissement {
    margin: var(--e5) 0 0;
    padding: var(--e4) var(--e5);
    border-left: 3px solid var(--attention);
    border-radius: 0 var(--r-md) var(--r-md) 0;
    background: var(--attention-fond);
    color: var(--attention);
    font-size: var(--t-md);
  }

  .choix {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--e5);
    margin-top: var(--e6);
    align-items: stretch;
  }

  .carte {
    display: flex;
    flex-direction: column;
    gap: var(--e4);
    padding: var(--e6);
    border: 1px solid var(--trait);
    border-radius: var(--r-lg);
    background: var(--surface);
    box-shadow: var(--ombre-1);
  }

  .carte h2 {
    margin: 0;
    font-size: var(--t-lg);
  }

  .carte p {
    margin: 0;
    color: var(--encre-douce);
    font-size: var(--t-md);
    line-height: 1.55;
  }

  /* L'action se pose au pied de la carte : les deux chemins d'entrée s'alignent
     au lieu de flotter à des hauteurs différentes. */
  .carte button {
    align-self: flex-start;
    margin-top: auto;
  }

  .carte form {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--e4);
  }

  .carte form label {
    min-width: 0;
  }

  .carte form input {
    width: 100%;
  }

  .carte form button {
    grid-column: 1 / -1;
    justify-self: start;
  }

  /* ---------- Barre de contexte ---------- */
  .contexte-barre {
    display: flex;
    align-items: center;
    gap: var(--e5);
    margin-bottom: var(--e5);
  }

  /* Contrôle segmenté : un groupe de choix exclusifs se lit comme un seul objet,
     pas comme une rangée de boutons indépendants. */
  .segmente {
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    border: 1px solid var(--trait);
    border-radius: var(--r-md);
    background: var(--surface-douce);
  }

  .segment {
    border: 0;
    border-radius: var(--r-sm);
    background: transparent;
    box-shadow: none;
    color: var(--encre-douce);
    font-size: var(--t-md);
    padding: 0.3rem 0.75rem;
  }

  .segment:hover:not(:disabled) {
    background: var(--surface-appuyee);
    color: var(--encre);
  }

  .segment[aria-pressed='true'] {
    background: var(--surface);
    color: var(--accent-fort);
    font-weight: 650;
    box-shadow: var(--ombre-1);
  }

  .date {
    flex-direction: row;
    align-items: center;
    gap: var(--e3);
    margin-left: auto;
  }

  /* ---------- Écran de saisie ---------- */
  .colonnes {
    display: grid;
    grid-template-columns: 16rem minmax(0, 1fr);
    gap: var(--e6);
    align-items: start;
  }

  aside {
    display: flex;
    flex-direction: column;
    gap: var(--e5);
    position: sticky;
    top: 3.9rem;
  }

  .panneau {
    display: flex;
    flex-direction: column;
    gap: var(--e3);
  }

  .panneau h2 {
    display: flex;
    align-items: center;
    gap: var(--e3);
    margin: 0;
    font-size: var(--t-xs);
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--encre-douce);
  }

  .compte {
    padding: 0.05rem 0.4rem;
    border-radius: var(--r-max);
    background: var(--surface-appuyee);
    color: var(--encre-douce);
    font-size: var(--t-xs);
    font-variant-numeric: tabular-nums;
  }

  .ajout {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--e3);
    align-items: end;
  }

  .ajout .plein {
    grid-column: 1 / -1;
  }

  .ajout input {
    width: 100%;
  }

  .ajout .courte {
    max-width: 5rem;
  }

  @media (max-width: 900px) {
    .colonnes {
      grid-template-columns: 1fr;
    }

    aside {
      position: static;
    }
  }

  @media (max-width: 720px) {
    .barre {
      flex-wrap: wrap;
      gap: var(--e3);
    }

    .contexte {
      padding-left: 0;
      border-left: 0;
    }

    .actions {
      flex-wrap: wrap;
      width: 100%;
      margin-left: 0;
    }

    main {
      padding: var(--e4);
    }

    .accueil {
      margin-top: var(--e5);
    }

    .choix,
    .carte form {
      grid-template-columns: 1fr;
    }

    .contexte-barre {
      flex-wrap: wrap;
      gap: var(--e3);
    }

    .segmente {
      flex-wrap: wrap;
    }

    .date {
      margin-left: 0;
      width: 100%;
    }
  }
</style>
