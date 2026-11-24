<!--
  Écran « Statistiques » de la classe, pour la période courante.

  Il ne calcule rien : tout vient de `domaine/statistiques.ts`, qui relit les
  scores du moteur (§2.5). L'écran se lit de haut en bas, du plus synthétique
  au plus détaillé :
    1. quatre chiffres clés de la période ;
    2. les constats saillants, en phrases ;
    3. les matières — réussite, échecs, répartition, nombre de tests ;
    4. l'évolution d'une période à l'autre ;
    5. les élèves — global, évolution, matières en échec, absences ;
    6. les tests, du plus difficile au plus facile ;
    7. les cotations littérales ;
    8. ce qui reste à encoder.

  Les couleurs ont un rôle, jamais décoratif : terre cuite pour l'échec, mousse
  pour la réussite, un gris neutre au milieu. Chaque teinte est doublée d'un
  nombre ou d'une légende — la couleur seule ne porte jamais l'information.
-->
<script lang="ts">
  import {
    construireStatistiques,
    faitsSaillants,
    SEUIL_EVOLUTION,
    SEUIL_REUSSITE,
    TRANCHES,
    type BilanEleve,
    type StatRubrique,
  } from '../domaine/statistiques.js';
  import { cheminLibelle } from '../domaine/referentiel.js';
  import { ECHELLE, type FichierClasse, type Id } from '../domaine/modele.js';

  interface Props {
    fichier: FichierClasse;
    periodeId: Id;
  }

  const { fichier, periodeId }: Props = $props();

  const stats = $derived(construireStatistiques(fichier, periodeId));
  const faits = $derived(stats ? faitsSaillants(stats) : []);

  // --- Tri des matières : ordre du bulletin, ou classement par réussite -----
  let triMatieres = $state<'bulletin' | 'croissant' | 'decroissant'>('bulletin');
  let avecSousDomaines = $state(true);

  const matieres = $derived.by(() => {
    if (!stats) return [];
    const lignes = stats.rubriques.filter((r) => avecSousDomaines || r.niveau === 0);
    if (triMatieres === 'bulletin') return lignes;
    // Classées, les rubriques sans note vont en fin de liste : « — » n'est pas 0.
    const signe = triMatieres === 'croissant' ? 1 : -1;
    return [...lignes].sort((a, b) => {
      if (a.moyenne === null) return b.moyenne === null ? 0 : 1;
      if (b.moyenne === null) return -1;
      return signe * (a.moyenne - b.moyenne);
    });
  });

  const evolution = $derived(
    stats ? stats.evolution.filter((e) => avecSousDomaines || e.niveau === 0) : [],
  );

  // --- Tri des élèves ------------------------------------------------------
  let triEleves = $state<'nom' | 'global' | 'ecart' | 'echecs' | 'absences'>('global');

  const eleves = $derived.by(() => {
    if (!stats) return [];
    const nulsEnFin = (a: number | null, b: number | null, signe: number) => {
      if (a === null) return b === null ? 0 : 1;
      if (b === null) return -1;
      return signe * (a - b);
    };
    const liste = [...stats.eleves];
    const parNom = (a: BilanEleve, b: BilanEleve) =>
      a.eleve.nom.localeCompare(b.eleve.nom, 'fr') || a.eleve.prenom.localeCompare(b.eleve.prenom, 'fr');
    switch (triEleves) {
      case 'global':
        return liste.sort((a, b) => nulsEnFin(a.global, b.global, 1) || parNom(a, b));
      case 'ecart':
        return liste.sort((a, b) => nulsEnFin(a.ecart, b.ecart, 1) || parNom(a, b));
      case 'echecs':
        return liste.sort((a, b) => b.echecs.length - a.echecs.length || parNom(a, b));
      case 'absences':
        return liste.sort((a, b) => b.absences - a.absences || parNom(a, b));
      default:
        return liste.sort(parNom);
    }
  });

  const aSuivre = $derived(stats ? stats.eleves.filter((e) => e.echecs.length > 0).length : 0);
  const enRecul = $derived(
    stats ? stats.eleves.filter((e) => e.ecart !== null && e.ecart <= -SEUIL_EVOLUTION).length : 0,
  );
  const enProgres = $derived(
    stats ? stats.eleves.filter((e) => e.ecart !== null && e.ecart >= SEUIL_EVOLUTION).length : 0,
  );

  // --- Tests : du plus difficile au plus facile, ou ordre du bulletin -------
  let testsParDifficulte = $state(true);
  const tests = $derived.by(() => {
    if (!stats) return [];
    if (!testsParDifficulte) return stats.tests;
    return [...stats.tests].sort((a, b) => {
      if (a.moyenne === null) return b.moyenne === null ? 0 : 1;
      if (b.moyenne === null) return -1;
      return a.moyenne - b.moyenne;
    });
  });

  // --- Mise en forme -------------------------------------------------------
  const nombre = (v: number) => String(v).replace('.', ',');
  const pct = (v: number | null) => (v === null ? '—' : `${nombre(v)} %`);
  const ecart = (v: number | null) =>
    v === null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : '±'}${nombre(Math.abs(v))}`;
  const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

  /** Largeur d'une barre, bornée : un 0 % garde un trait visible. */
  const largeur = (v: number | null) => `${v === null ? 0 : Math.max(1.5, Math.min(100, v))}%`;

  function tonEcart(v: number | null): string {
    if (v === null) return '';
    if (v >= SEUIL_EVOLUTION) return 'monte';
    if (v <= -SEUIL_EVOLUTION) return 'baisse';
    return '';
  }

  function infobulleRepartition(r: StatRubrique): string {
    return TRANCHES.map((t, i) => `${t.libelle} : ${r.repartition[i]}`).join('\n');
  }

  const nomCourt = (e: { nom: string; prenom: string }) => `${e.prenom} ${e.nom}`.trim();
</script>

{#if stats}
  <div class="ecran">
    <header class="entete">
      <div>
        <h1>Statistiques de la classe</h1>
        <p class="chapeau">
          Période {stats.periode.numero}
          {#if stats.periodePrecedente}· comparée à la période {stats.periodePrecedente.numero}{/if}
          · seuil de réussite fixé à {SEUIL_REUSSITE} % du maximum
        </p>
      </div>
      <span class="badge" title="Cet écran n'est visible que sur ce navigateur, après le geste de déverrouillage.">
        Aperçu privé
      </span>
    </header>

    <!-- 1. Chiffres clés -->
    <section class="tuiles" aria-label="Chiffres clés">
      <div class="tuile">
        <span class="tuile-titre">Moyenne de la classe</span>
        <span class="tuile-valeur">{pct(stats.synthese.moyenneClasse)}</span>
        <span class="tuile-detail">pourcentage global moyen, pondéré comme le bulletin</span>
      </div>
      <div class="tuile" class:alerte={stats.synthese.elevesEnEchec > 0}>
        <span class="tuile-titre">Élèves en échec</span>
        <span class="tuile-valeur">
          {stats.synthese.elevesEnEchec}<small> / {stats.synthese.eleves}</small>
        </span>
        <span class="tuile-detail">sous {SEUIL_REUSSITE} % dans au moins une matière</span>
      </div>
      <div class="tuile">
        <span class="tuile-titre">Tests donnés</span>
        <span class="tuile-valeur">{stats.synthese.tests}</span>
        <span class="tuile-detail">
          {stats.synthese.rubriquesSansTest.length === 0
            ? 'toutes les rubriques sont évaluées'
            : `${pluriel(stats.synthese.rubriquesSansTest.length, 'rubrique')} sans test`}
        </span>
      </div>
      <div class="tuile" class:attention={stats.synthese.completude !== null && stats.synthese.completude < 100}>
        <span class="tuile-titre">Encodage</span>
        <span class="tuile-valeur">{pct(stats.synthese.completude)}</span>
        <span class="tuile-detail">des cases remplies (note, absence ou dispense)</span>
      </div>
    </section>

    {#if stats.synthese.tests === 0}
      <p class="vide">
        Aucun test n'a encore été encodé pour la période {stats.periode.numero}. Les statistiques
        apparaîtront dès les premières notes.
      </p>
    {/if}

    <!-- 2. Faits saillants -->
    {#if faits.length > 0}
      <section class="bloc">
        <h2>En un coup d'œil</h2>
        <div class="faits">
          {#each faits as fait (fait.titre)}
            <article class="fait {fait.ton}">
              <span class="fait-titre">{fait.titre}</span>
              <strong class="fait-valeur">{fait.valeur}</strong>
              <span class="fait-detail">{fait.detail}</span>
            </article>
          {/each}
        </div>
      </section>
    {/if}

    <!-- 3. Matières -->
    <section class="bloc">
      <div class="bloc-entete">
        <h2>Réussite par matière</h2>
        <div class="reglages">
          <label class="choix">
            Ordre
            <select bind:value={triMatieres}>
              <option value="bulletin">Celui du bulletin</option>
              <option value="croissant">Les moins réussies d'abord</option>
              <option value="decroissant">Les mieux réussies d'abord</option>
            </select>
          </label>
          <label class="case">
            <input type="checkbox" bind:checked={avecSousDomaines} />
            Sous-domaines
          </label>
        </div>
      </div>

      <div class="defile">
        <table class="tableau">
          <thead>
            <tr>
              <th class="gauche">Matière</th>
              <th class="gauche large">Moyenne de classe</th>
              <th>Médiane</th>
              <th>Min – max</th>
              <th>En échec</th>
              <th class="gauche">Répartition</th>
              <th>Tests</th>
            </tr>
          </thead>
          <tbody>
            {#each matieres as r (r.rubrique.id)}
              <tr class:principale={r.niveau === 0}>
                <th scope="row" class="gauche libelle" style:padding-left="{0.6 + (triMatieres === 'bulletin' ? r.niveau * 1.1 : 0)}rem">
                  {triMatieres === 'bulletin' || r.niveau === 0
                    ? r.rubrique.libelle
                    : cheminLibelle(r.rubrique, fichier.rubriques)}
                </th>
                <td class="gauche">
                  <div class="jauge" title="{r.rubrique.libelle} : {pct(r.moyenne)} de moyenne sur {pluriel(r.cotes, 'élève')} coté{r.cotes > 1 ? 's' : ''}">
                    <span class="piste">
                      <span class="barre" class:sous-seuil={r.moyenne !== null && r.moyenne < SEUIL_REUSSITE} style:width={largeur(r.moyenne)}></span>
                      <span class="seuil" style:left="{SEUIL_REUSSITE}%" aria-hidden="true"></span>
                    </span>
                    <span class="valeur chiffres">{pct(r.moyenne)}</span>
                  </div>
                </td>
                <td class="chiffres">{pct(r.mediane)}</td>
                <td class="chiffres tenu">
                  {r.min === null ? '—' : `${nombre(r.min)} – ${nombre(r.max ?? 0)}`}
                </td>
                <td class="chiffres">
                  {#if r.cotes === 0}
                    <span class="tenu">—</span>
                  {:else if r.enEchec.length === 0}
                    <span class="tenu">0</span>
                  {:else}
                    <details class="noms">
                      <summary><span class="pastille-echec">{r.enEchec.length}</span><span class="tenu"> / {r.cotes}</span></summary>
                      <ul>
                        {#each r.enEchec as e (e.eleve.id)}
                          <li>{nomCourt(e.eleve)} <span class="tenu chiffres">{pct(e.pourcentage)}</span></li>
                        {/each}
                      </ul>
                    </details>
                  {/if}
                </td>
                <td class="gauche">
                  {#if r.cotes > 0}
                    <span class="empile" title={infobulleRepartition(r)} role="img" aria-label={infobulleRepartition(r)}>
                      {#each r.repartition as n, i (i)}
                        {#if n > 0}
                          <span class="segment-rep t{i}" style:flex-grow={n}>{n}</span>
                        {/if}
                      {/each}
                    </span>
                  {:else}
                    <span class="tenu">—</span>
                  {/if}
                </td>
                <td class="chiffres" class:tenu={r.tests === 0}>{r.tests}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <ul class="legende" aria-label="Légende de la répartition">
        {#each TRANCHES as t, i (t.libelle)}
          <li><span class="puce t{i}" aria-hidden="true"></span>{t.libelle}</li>
        {/each}
      </ul>
    </section>

    <!-- 4. Évolution -->
    {#if stats.periodes.length > 1}
      <section class="bloc">
        <div class="bloc-entete">
          <h2>Évolution d'une période à l'autre</h2>
        </div>
        {#if !stats.periodePrecedente}
          <p class="note">
            La période 1 n'a pas de période précédente : choisissez une période suivante pour lire la
            progression.
          </p>
        {/if}
        <div class="defile">
          <table class="tableau">
            <thead>
              <tr>
                <th class="gauche">Matière</th>
                {#each stats.periodes as p (p.id)}
                  <th class:courante={p.id === stats.periode.id}>P{p.numero}</th>
                {/each}
                {#if stats.periodePrecedente}
                  <th title="Progression moyenne par élève, sur les élèves cotés aux deux périodes">
                    P{stats.periodePrecedente.numero} → P{stats.periode.numero}
                  </th>
                {/if}
              </tr>
            </thead>
            <tbody>
              {#each evolution as e (e.rubrique.id)}
                <tr class:principale={e.niveau === 0}>
                  <th scope="row" class="gauche libelle" style:padding-left="{0.6 + e.niveau * 1.1}rem">
                    {e.rubrique.libelle}
                  </th>
                  {#each e.moyennes as m, i (i)}
                    <td class="chiffres" class:courante={stats.periodes[i]?.id === stats.periode.id} class:sous-seuil-texte={m !== null && m < SEUIL_REUSSITE}>
                      {pct(m)}
                    </td>
                  {/each}
                  {#if stats.periodePrecedente}
                    <td class="chiffres">
                      <span class="ecart {tonEcart(e.ecart)}">
                        {#if e.ecart !== null && e.ecart >= SEUIL_EVOLUTION}▲{:else if e.ecart !== null && e.ecart <= -SEUIL_EVOLUTION}▼{/if}
                        {ecart(e.ecart)}
                      </span>
                    </td>
                  {/if}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        {#if stats.periodePrecedente}
          <p class="note">
            L'écart compare chaque élève à lui-même, en points de pourcentage : un élève arrivé en
            cours d'année ne fausse pas la progression. Les flèches signalent un écart d'au moins
            {SEUIL_EVOLUTION} points.
          </p>
        {/if}
      </section>
    {/if}

    <!-- 5. Élèves -->
    <section class="bloc">
      <div class="bloc-entete">
        <h2>Élèves</h2>
        <div class="reglages">
          <label class="choix">
            Trier par
            <select bind:value={triEleves}>
              <option value="global">Pourcentage global (le plus faible d'abord)</option>
              <option value="echecs">Nombre de matières en échec</option>
              {#if stats.periodePrecedente}
                <option value="ecart">Évolution (le plus fort recul d'abord)</option>
              {/if}
              <option value="absences">Absences aux tests</option>
              <option value="nom">Nom</option>
            </select>
          </label>
        </div>
      </div>

      <p class="resume">
        <span class="pastille-texte alerte">{pluriel(aSuivre, 'élève')} en échec dans au moins une matière</span>
        {#if stats.periodePrecedente}
          <span class="pastille-texte alerte">{enRecul} en recul d'au moins {SEUIL_EVOLUTION} points</span>
          <span class="pastille-texte ok">{enProgres} en progrès d'au moins {SEUIL_EVOLUTION} points</span>
        {/if}
      </p>

      <div class="defile">
        <table class="tableau">
          <thead>
            <tr>
              <th class="gauche">Élève</th>
              <th class="gauche large">Global</th>
              {#if stats.periodePrecedente}<th>Évolution</th>{/if}
              <th class="gauche">Matières en échec</th>
              <th>Absences</th>
            </tr>
          </thead>
          <tbody>
            {#each eleves as b (b.eleve.id)}
              <tr>
                <th scope="row" class="gauche libelle">{b.eleve.nom} {b.eleve.prenom}</th>
                <td class="gauche">
                  <div class="jauge" title="{nomCourt(b.eleve)} : {pct(b.global)}">
                    <span class="piste">
                      <span class="barre" class:sous-seuil={b.global !== null && b.global < SEUIL_REUSSITE} style:width={largeur(b.global)}></span>
                      <span class="seuil" style:left="{SEUIL_REUSSITE}%" aria-hidden="true"></span>
                    </span>
                    <span class="valeur chiffres">{pct(b.global)}</span>
                  </div>
                </td>
                {#if stats.periodePrecedente}
                  <td class="chiffres">
                    <span class="ecart {tonEcart(b.ecart)}" title={b.globalPrecedent === null ? '' : `P${stats.periodePrecedente.numero} : ${pct(b.globalPrecedent)}`}>
                      {#if b.ecart !== null && b.ecart >= SEUIL_EVOLUTION}▲{:else if b.ecart !== null && b.ecart <= -SEUIL_EVOLUTION}▼{/if}
                      {ecart(b.ecart)}
                    </span>
                  </td>
                {/if}
                <td class="gauche">
                  {#if b.echecs.length === 0}
                    <span class="tenu">—</span>
                  {:else}
                    <span class="etiquettes">
                      {#each b.echecs as e (e.rubrique.id)}
                        <span class="etiquette-echec">{e.rubrique.libelle} <span class="chiffres">{pct(e.pourcentage)}</span></span>
                      {/each}
                    </span>
                  {/if}
                </td>
                <td class="chiffres" class:tenu={b.absences === 0}>{b.absences}</td>
              </tr>
            {:else}
              <tr><td colspan="5" class="tenu gauche">Aucun élève dans la classe.</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>

    <!-- 6. Tests -->
    {#if stats.tests.length > 0}
      <section class="bloc">
        <div class="bloc-entete">
          <h2>Tests de la période</h2>
          <div class="reglages">
            <label class="case">
              <input type="checkbox" bind:checked={testsParDifficulte} />
              Les plus difficiles d'abord
            </label>
          </div>
        </div>
        <div class="defile">
          <table class="tableau">
            <thead>
              <tr>
                <th class="gauche">Test</th>
                <th class="gauche">Rubrique</th>
                <th class="gauche large">Moyenne</th>
                <th>En échec</th>
                <th>Absents</th>
                <th>Dispensés</th>
                <th>Non encodés</th>
              </tr>
            </thead>
            <tbody>
              {#each tests as t (t.test.id)}
                <tr>
                  <th scope="row" class="gauche libelle">
                    {t.test.libelle || 'Sans titre'}
                    <span class="tenu chiffres">/ {nombre(t.test.maximum)}</span>
                  </th>
                  <td class="gauche tenu">{t.rubrique.libelle}</td>
                  <td class="gauche">
                    <div class="jauge" title="{pct(t.moyenne)} sur {pluriel(t.presents, 'copie')}">
                      <span class="piste">
                        <span class="barre" class:sous-seuil={t.moyenne !== null && t.moyenne < SEUIL_REUSSITE} style:width={largeur(t.moyenne)}></span>
                        <span class="seuil" style:left="{SEUIL_REUSSITE}%" aria-hidden="true"></span>
                      </span>
                      <span class="valeur chiffres">{pct(t.moyenne)}</span>
                    </div>
                  </td>
                  <td class="chiffres">
                    {#if t.enEchec > 0}<span class="pastille-echec">{t.enEchec}</span>{:else}<span class="tenu">0</span>{/if}
                    <span class="tenu"> / {t.presents}</span>
                  </td>
                  <td class="chiffres" class:tenu={t.absents === 0}>{t.absents}</td>
                  <td class="chiffres" class:tenu={t.dispenses === 0}>{t.dispenses}</td>
                  <td class="chiffres">
                    {#if t.nonEncodes > 0}
                      <span class="pastille-attention">{t.nonEncodes}</span>
                    {:else}
                      <span class="tenu">0</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {/if}

    <!-- 7. Cotations littérales -->
    {#if stats.echelles.length > 0}
      <section class="bloc">
        <h2>Cotations littérales</h2>
        <div class="echelles">
          {#each stats.echelles as e (e.rubrique.id)}
            {@const cotes = e.comptes.reduce((s, n) => s + n, 0)}
            <div class="echelle">
              <div class="echelle-entete">
                <span class="libelle">{e.rubrique.libelle}</span>
                <span class="tenu">
                  {e.nonCotes > 0 ? `${pluriel(e.nonCotes, 'élève')} non coté${e.nonCotes > 1 ? 's' : ''}` : 'tous cotés'}
                </span>
              </div>
              {#if cotes > 0}
                <span class="empile grand" role="img" aria-label={ECHELLE.map((x, i) => `${x} : ${e.comptes[i]}`).join(', ')}>
                  {#each e.comptes as n, i (i)}
                    {#if n > 0}
                      <span class="segment-rep e{i}" style:flex-grow={n} title="{ECHELLE[i]} : {pluriel(n, 'élève')}">
                        {ECHELLE[i]} · {n}
                      </span>
                    {/if}
                  {/each}
                </span>
              {:else}
                <span class="tenu">Aucune cotation pour cette période.</span>
              {/if}
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- 8. Encodage à compléter -->
    {#if stats.synthese.rubriquesSansTest.length > 0 && stats.synthese.tests > 0}
      <section class="bloc">
        <h2>Rubriques sans test cette période</h2>
        <p class="note">
          Elles s'imprimeront « — » sur le bulletin. C'est parfois voulu ; sinon, un test reste à
          ajouter dans la saisie.
        </p>
        <span class="etiquettes">
          {#each stats.synthese.rubriquesSansTest as r (r.id)}
            <span class="etiquette-neutre">{cheminLibelle(r, fichier.rubriques)}</span>
          {/each}
        </span>
      </section>
    {/if}
  </div>
{/if}

<style>
  .ecran {
    /* Teintes de la répartition : une échelle divergente, terre cuite (échec)
       → gris neutre → mousse (réussite). Dérivées des rôles du thème, elles
       suivent le passage en sombre sans définition supplémentaire. */
    --rep-0: var(--alerte);
    --rep-1: color-mix(in oklab, var(--alerte) 45%, var(--surface));
    --rep-2: color-mix(in oklab, var(--encre-tenue) 35%, var(--surface));
    --rep-3: color-mix(in oklab, var(--ok) 45%, var(--surface));
    --rep-4: var(--ok);

    display: flex;
    flex-direction: column;
    gap: var(--e6);
    max-width: 78rem;
    margin: 0 auto;
  }

  h1 {
    margin: 0;
    font-size: var(--t-xl);
  }

  h2 {
    margin: 0;
    font-size: var(--t-lg);
  }

  .entete {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--e4);
  }

  .chapeau {
    margin: var(--e1) 0 0;
    color: var(--encre-douce);
    font-size: var(--t-md);
  }

  .badge {
    flex: none;
    padding: 0.15rem 0.6rem;
    border: 1px dashed var(--accent-trait);
    border-radius: var(--r-max);
    color: var(--accent-fort);
    background: var(--accent-doux);
    font-size: var(--t-xs);
    font-weight: 650;
  }

  /* ---------- Tuiles ---------- */
  .tuiles {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--e4);
  }

  .tuile {
    display: flex;
    flex-direction: column;
    gap: var(--e1);
    padding: var(--e4) var(--e5);
    border: 1px solid var(--trait);
    border-radius: var(--r-lg);
    background: var(--surface);
    box-shadow: var(--ombre-1);
  }

  .tuile-titre {
    color: var(--encre-douce);
    font-size: var(--t-xs);
    font-weight: 650;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .tuile-valeur {
    font-size: var(--t-2xl);
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }

  .tuile-valeur small {
    color: var(--encre-tenue);
    font-size: var(--t-lg);
    font-weight: 500;
  }

  .tuile-detail {
    color: var(--encre-tenue);
    font-size: var(--t-xs);
  }

  .tuile.alerte {
    border-left: 3px solid var(--alerte);
  }

  .tuile.attention {
    border-left: 3px solid var(--attention);
  }

  /* ---------- Faits saillants ---------- */
  .faits {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
    gap: var(--e4);
  }

  .fait {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: var(--e4) var(--e5);
    border: 1px solid var(--trait);
    border-left: 3px solid var(--trait-fort);
    border-radius: var(--r-md);
    background: var(--surface);
  }

  .fait.ok {
    border-left-color: var(--ok);
  }

  .fait.alerte {
    border-left-color: var(--alerte);
  }

  .fait-titre {
    color: var(--encre-douce);
    font-size: var(--t-xs);
    font-weight: 650;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .fait-valeur {
    font-size: var(--t-base);
  }

  .fait-detail {
    color: var(--encre-douce);
    font-size: var(--t-sm);
  }

  /* ---------- Blocs ---------- */
  .bloc {
    display: flex;
    flex-direction: column;
    gap: var(--e4);
  }

  .bloc-entete {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--e4);
  }

  .reglages {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--e4);
  }

  .case {
    flex-direction: row;
    align-items: center;
    gap: var(--e2);
    padding-bottom: 0.4rem;
    text-transform: none;
    letter-spacing: 0;
    font-size: var(--t-md);
    font-weight: 500;
    color: var(--encre);
  }

  .note,
  .vide {
    margin: 0;
    color: var(--encre-douce);
    font-size: var(--t-sm);
    line-height: 1.55;
  }

  .vide {
    padding: var(--e4) var(--e5);
    border: 1px dashed var(--trait-fort);
    border-radius: var(--r-md);
  }

  /* ---------- Tableaux ---------- */
  .defile {
    overflow-x: auto;
    border: 1px solid var(--trait);
    border-radius: var(--r-lg);
    background: var(--surface);
    box-shadow: var(--ombre-1);
  }

  .tableau {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--t-md);
  }

  .tableau th,
  .tableau td {
    padding: 0.45rem 0.6rem;
    border-bottom: 1px solid var(--trait);
    text-align: right;
    vertical-align: middle;
    white-space: nowrap;
  }

  .tableau thead th {
    position: sticky;
    top: 0;
    background: var(--surface-douce);
    color: var(--encre-douce);
    font-size: var(--t-xs);
    font-weight: 650;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .tableau tbody tr:last-child > * {
    border-bottom: 0;
  }

  .tableau tbody tr:hover > * {
    background: var(--surface-douce);
  }

  .tableau .gauche {
    text-align: left;
  }

  .tableau .large {
    min-width: 12rem;
  }

  .libelle {
    font-weight: 500;
    white-space: normal;
    min-width: 10rem;
  }

  tr.principale .libelle {
    font-weight: 650;
  }

  .tableau .courante {
    background: var(--accent-doux);
  }

  .tenu {
    color: var(--encre-tenue);
  }

  .sous-seuil-texte {
    color: var(--alerte);
  }

  /* ---------- Jauge : une barre, le seuil marqué d'un trait ---------- */
  .jauge {
    display: flex;
    align-items: center;
    gap: var(--e3);
  }

  .piste {
    position: relative;
    flex: 1;
    min-width: 6rem;
    height: 0.55rem;
    border-radius: var(--r-max);
    background: var(--surface-appuyee);
  }

  .barre {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: var(--r-max);
    background: var(--accent);
  }

  .barre.sous-seuil {
    background: var(--alerte);
  }

  .seuil {
    position: absolute;
    top: -0.2rem;
    bottom: -0.2rem;
    width: 2px;
    margin-left: -1px;
    background: var(--encre-douce);
    opacity: 0.6;
  }

  .valeur {
    min-width: 3.6rem;
    text-align: right;
  }

  /* ---------- Répartitions empilées ---------- */
  .empile {
    display: flex;
    gap: 2px;
    min-width: 9rem;
    height: 1.2rem;
    border-radius: var(--r-xs);
    overflow: hidden;
  }

  .empile.grand {
    height: 1.8rem;
  }

  .segment-rep {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-basis: 0;
    min-width: 1.2rem;
    color: var(--encre);
    font-size: var(--t-xs);
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }

  .t0,
  .e4 {
    background: var(--rep-0);
    color: var(--surface);
  }

  .t1,
  .e3 {
    background: var(--rep-1);
  }

  .t2,
  .e2 {
    background: var(--rep-2);
  }

  .t3,
  .e1 {
    background: var(--rep-3);
  }

  .t4,
  .e0 {
    background: var(--rep-4);
    color: var(--surface);
  }

  .legende {
    display: flex;
    flex-wrap: wrap;
    gap: var(--e2) var(--e5);
    margin: 0;
    padding: 0;
    list-style: none;
    color: var(--encre-douce);
    font-size: var(--t-xs);
  }

  .legende li {
    display: inline-flex;
    align-items: center;
    gap: var(--e2);
  }

  .puce {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 3px;
  }

  /* ---------- Échelles ---------- */
  .echelles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
    gap: var(--e4);
  }

  .echelle {
    display: flex;
    flex-direction: column;
    gap: var(--e3);
    padding: var(--e4) var(--e5);
    border: 1px solid var(--trait);
    border-radius: var(--r-md);
    background: var(--surface);
  }

  .echelle-entete {
    display: flex;
    justify-content: space-between;
    gap: var(--e3);
    font-size: var(--t-md);
  }

  .echelle .libelle {
    min-width: 0;
    font-weight: 600;
  }

  .echelle-entete .tenu {
    font-size: var(--t-xs);
  }

  /* ---------- Pastilles et étiquettes ---------- */
  .pastille-echec,
  .pastille-attention {
    display: inline-block;
    min-width: 1.5rem;
    padding: 0 0.35rem;
    border-radius: var(--r-max);
    text-align: center;
    font-weight: 650;
  }

  .pastille-echec {
    background: var(--alerte-fond);
    color: var(--alerte);
  }

  .pastille-attention {
    background: var(--attention-fond);
    color: var(--attention);
  }

  .noms summary {
    cursor: pointer;
    list-style: none;
  }

  .noms summary::-webkit-details-marker {
    display: none;
  }

  .noms ul {
    margin: var(--e2) 0 0;
    padding: 0;
    list-style: none;
    text-align: left;
    font-size: var(--t-sm);
  }

  .etiquettes {
    display: flex;
    flex-wrap: wrap;
    gap: var(--e2);
  }

  .etiquette-echec,
  .etiquette-neutre {
    padding: 0.05rem 0.5rem;
    border-radius: var(--r-max);
    font-size: var(--t-sm);
    white-space: nowrap;
  }

  .etiquette-echec {
    background: var(--alerte-fond);
    color: var(--alerte);
  }

  .etiquette-neutre {
    background: var(--surface-appuyee);
    color: var(--encre-douce);
  }

  .resume {
    display: flex;
    flex-wrap: wrap;
    gap: var(--e2);
    margin: 0;
  }

  .pastille-texte {
    padding: 0.15rem 0.6rem;
    border-radius: var(--r-max);
    font-size: var(--t-sm);
    font-weight: 600;
  }

  .pastille-texte.alerte {
    background: var(--alerte-fond);
    color: var(--alerte);
  }

  .pastille-texte.ok {
    background: var(--ok-fond);
    color: var(--ok);
  }

  .ecart.monte {
    color: var(--ok);
    font-weight: 650;
  }

  .ecart.baisse {
    color: var(--alerte);
    font-weight: 650;
  }

  /* ---------- Écrans étroits ----------
     La saisie reste réservée au poste fixe (C9), mais une consultation des
     statistiques sur téléphone doit rester lisible : les tuiles passent sur
     deux colonnes et les tableaux défilent horizontalement dans leur cadre. */
  @media (max-width: 720px) {
    .tuiles {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .tuile-valeur {
      font-size: var(--t-xl);
    }

    .entete {
      flex-direction: column;
    }

    .echelles {
      grid-template-columns: 1fr;
    }

    .libelle {
      min-width: 8rem;
    }
  }
</style>
