<!--
  Un bulletin imprimable — §2.6.

  Recto : les points. Verso : commentaire et signatures. La pagination est
  entièrement décrite en CSS `@page` / `@media print` : l'export PDF est le
  « Imprimer → Enregistrer au format PDF » du navigateur, sans aucune
  bibliothèque. Ce composant ne calcule rien, il parcourt `domaine/bulletin.ts`.

  Mise en forme : c'est le seul écran qui sort de l'application et arrive chez
  des parents. Il ne suit donc pas la palette de l'interface mais les variables
  `--papier-*`, qui restent noir sur blanc y compris en thème sombre — l'aperçu
  montre la feuille, pas l'application. Le tableau abandonne le quadrillage
  complet pour des filets horizontaux : sur papier, une grille pleine alourdit
  la lecture, alors que la ligne d'une rubrique se suit très bien seule.
-->
<script lang="ts">
  import { afficherDate, afficherScore, type Bulletin } from '../domaine/bulletin.js';
  import { ECHELLE } from '../domaine/modele.js';

  const { bulletin }: { bulletin: Bulletin } = $props();

  const dateBulletin = $derived(afficherDate(bulletin.periode.date_bulletin));

  // Un champ d'identité laissé vide ne doit pas laisser traîner son séparateur.
  const enTete = $derived(
    [bulletin.ecole, bulletin.titulaire, bulletin.anneeScolaire].filter((p) => p.trim() !== '').join(' · '),
  );
</script>

<article class="bulletin">
  <!-- Recto -->
  <section class="page">
    <header>
      <div class="entete-titre">
        <p class="sur-titre">Bulletin scolaire</p>
        <h1>Période {bulletin.periode.numero}</h1>
        <p class="etablissement">{enTete}</p>
      </div>
      <div class="identite">
        <p class="nom">{bulletin.eleve.nom} {bulletin.eleve.prenom}</p>
        <p class="annee">{bulletin.eleve.annee_etude}<sup>e</sup> année</p>
        {#if dateBulletin}<p class="date">Le {dateBulletin}</p>{/if}
      </div>
    </header>

    <div class="tableau-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col" class="col-rubrique">Rubrique</th>
            <th scope="col" class="col-note">Période {bulletin.periode.numero}</th>
            <th scope="col" class="col-note">Maximum</th>
            <th scope="col" class="col-note">Moyenne annuelle</th>
          </tr>
        </thead>
        <tbody>
          {#each bulletin.lignes as ligne (ligne.rubrique_id)}
            <tr class:principale={ligne.niveau === 0} class:sous-rubrique={ligne.niveau > 0}>
              <th scope="row" style="padding-left: {0.5 + ligne.niveau * 1.2}rem">{ligne.libelle}</th>
              {#if ligne.type === 'echelle'}
                <td class="echelle" colspan="3">
                  {#each ECHELLE as cote (cote)}
                    <span class="cote" class:retenue={ligne.cotation === cote}>{cote}</span>
                  {/each}
                </td>
              {:else}
                <td class="note">{afficherScore(ligne.score)}</td>
                <td class="note maximum">{ligne.maximum}</td>
                <td class="note">{afficherScore(ligne.moyenne)}</td>
              {/if}
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td class="note">{afficherScore(bulletin.total)}</td>
            <td class="note maximum">{bulletin.totalMaximum}</td>
            <td class="note"></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <p class="legende">
      « — » signale une rubrique dont aucun test n'a été présenté : elle ne compte pas dans le
      total. Les tests non présentés sont exclus du calcul, qui se fait au prorata des seuls
      tests passés.
    </p>
  </section>

  <!-- Verso -->
  <section class="page verso">
    <h2>Observations du titulaire</h2>
    <div class="commentaire">{bulletin.commentaire}</div>

    <div class="signatures">
      <div><span class="ligne-signature"></span>Le titulaire</div>
      <div><span class="ligne-signature"></span>La direction</div>
      <div><span class="ligne-signature"></span>Les parents</div>
    </div>
  </section>
</article>

<style>
  .bulletin {
    color: var(--papier-encre);
  }

  .page {
    background: var(--papier);
    padding: 12mm 14mm;
    margin: 0 auto;
    max-width: 210mm;
    border-radius: 2px;
    box-shadow: var(--ombre-2);
  }

  .page + .page {
    margin-top: var(--e5);
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--e5);
    border-bottom: 1.5pt solid var(--papier-encre);
    padding-bottom: var(--e3);
    margin-bottom: var(--e5);
  }

  /* Le sur-titre porte le nom du document, le titre porte la période : c'est la
     période qu'on cherche des yeux quand trois bulletins sont posés côte à côte. */
  .sur-titre {
    margin: 0;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--papier-douce);
  }

  h1 {
    font-size: 1.35rem;
    margin: 0.1rem 0 0;
    letter-spacing: -0.015em;
  }

  h2 {
    font-size: 1rem;
    margin: 0 0 var(--e3);
  }

  .etablissement {
    margin: 0.2rem 0 0;
    font-size: 0.78rem;
    color: var(--papier-douce);
  }

  .identite {
    flex: none;
    max-width: 45%;
    padding-left: var(--e4);
    border-left: 1px solid var(--papier-trait);
    text-align: right;
    font-size: 0.78rem;
    color: var(--papier-douce);
  }

  .identite p {
    margin: 0;
  }

  .nom {
    color: var(--papier-encre);
    font-weight: 700;
    font-size: 1rem;
    letter-spacing: -0.01em;
  }

  .annee {
    margin-top: 0.1rem;
  }

  .date {
    margin-top: 0.25rem;
    font-variant-numeric: tabular-nums;
  }

  .tableau-scroll {
    overflow-x: auto;
  }

  /* Filets horizontaux seulement : la ligne d'une rubrique se suit sans qu'on
     ait besoin d'enfermer chaque nombre dans une case. */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }

  th,
  td {
    border: 0;
    border-bottom: 0.5pt solid var(--papier-trait);
    padding: 0.3rem 0.5rem;
    text-align: left;
  }

  thead th {
    border-bottom: 1pt solid var(--papier-encre);
    padding-bottom: 0.2rem;
    color: var(--papier-douce);
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .col-note {
    width: 6.5rem;
    text-align: right;
  }

  .note {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .maximum {
    color: var(--papier-douce);
  }

  /* Rubrique principale : le nom en gras et un filet d'appui au-dessus, plutôt
     qu'un aplat gris — moins d'encre, une hiérarchie plus nette. */
  tr.principale > th {
    font-weight: 700;
    font-size: 0.86rem;
  }

  tr.principale > th,
  tr.principale > td {
    border-top: 0.5pt solid var(--papier-trait);
    padding-top: 0.34rem;
  }

  tr.principale > .note {
    font-weight: 700;
  }

  tr.sous-rubrique > th {
    font-weight: 400;
    color: var(--papier-douce);
  }

  tfoot th,
  tfoot td {
    border-top: 1pt solid var(--papier-encre);
    border-bottom: 0;
    padding-top: 0.4rem;
    font-weight: 700;
    font-size: 0.9rem;
  }

  .echelle {
    text-align: right;
  }

  .cote {
    display: inline-block;
    min-width: 1.7rem;
    margin-left: 0.2rem;
    padding: 0.05rem 0.2rem;
    border: 0.5pt solid var(--papier-trait);
    border-radius: 3px;
    text-align: center;
    color: var(--papier-trait);
    font-size: 0.72rem;
    font-weight: 600;
  }

  .cote.retenue {
    border-color: var(--papier-encre);
    background: var(--papier-encre);
    color: var(--papier);
  }

  .legende {
    margin-top: var(--e4);
    padding-top: var(--e3);
    border-top: 0.5pt solid var(--papier-trait);
    font-size: 0.66rem;
    color: var(--papier-douce);
    line-height: 1.4;
  }

  .commentaire {
    min-height: 60mm;
    border: 0.5pt solid var(--papier-trait);
    border-radius: 2px;
    padding: var(--e4);
    font-size: 0.85rem;
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .signatures {
    display: flex;
    justify-content: space-between;
    gap: var(--e5);
    margin-top: 18mm;
    font-size: 0.75rem;
    color: var(--papier-douce);
  }

  .signatures > div {
    flex: 1;
    text-align: center;
  }

  .ligne-signature {
    display: block;
    border-top: 0.5pt solid var(--papier-encre);
    margin-bottom: 0.3rem;
  }

  /*
   * Impression : une page A4 par face, le verso après le recto, et un saut de
   * page après chaque bulletin pour imprimer toute une classe d'un seul coup.
   */
  @media print {
    .page {
      border: 0;
      border-radius: 0;
      box-shadow: none;
      padding: 0;
      margin: 0;
      max-width: none;
      break-after: page;
    }

    .page + .page {
      margin-top: 0;
    }

    .bulletin {
      break-after: page;
    }

    tr,
    .signatures {
      break-inside: avoid;
    }

    thead {
      display: table-header-group;
    }

    .tableau-scroll {
      overflow: visible;
    }
  }

  @media screen and (max-width: 700px) {
    .page {
      padding: 6mm 5mm;
    }

    header {
      flex-wrap: wrap;
      gap: var(--e3);
    }

    .identite {
      max-width: none;
      padding-left: 0;
      border-left: 0;
      text-align: left;
    }

    table {
      font-size: 0.75rem;
    }

    th,
    td {
      padding: 0.2rem 0.3rem;
    }

    .col-note {
      width: auto;
      min-width: 3.4rem;
    }

    .signatures {
      flex-direction: column;
      align-items: flex-start;
      gap: 1.4rem;
      margin-top: 10mm;
    }

    .signatures > div {
      width: 100%;
      text-align: left;
    }
  }
</style>
