<!--
  Un bulletin imprimable — §2.6.

  Recto : les points. Verso : commentaire et signatures. La pagination est
  entièrement décrite en CSS `@page` / `@media print` : l'export PDF est le
  « Imprimer → Enregistrer au format PDF » du navigateur, sans aucune
  bibliothèque. Ce composant ne calcule rien, il parcourt `domaine/bulletin.ts`.
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
      <div>
        <h1>Bulletin — Période {bulletin.periode.numero}</h1>
        <p class="etablissement">{enTete}</p>
      </div>
      <div class="identite">
        <p class="nom">{bulletin.eleve.nom} {bulletin.eleve.prenom}</p>
        <p>{bulletin.eleve.annee_etude}<sup>e</sup> année</p>
        {#if dateBulletin}<p>Le {dateBulletin}</p>{/if}
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
    color: #000;
  }

  .page {
    background: #fff;
    padding: 12mm 14mm;
    margin: 0 auto 1rem;
    max-width: 210mm;
    border: 1px solid var(--trait);
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    border-bottom: 2px solid #000;
    padding-bottom: 0.5rem;
    margin-bottom: 0.8rem;
  }

  h1 {
    font-size: 1.05rem;
    margin: 0;
  }

  h2 {
    font-size: 1rem;
    margin: 0 0 0.5rem;
  }

  .etablissement {
    margin: 0.15rem 0 0;
    font-size: 0.8rem;
    color: #444;
  }

  .identite {
    text-align: right;
    font-size: 0.82rem;
  }

  .identite p {
    margin: 0;
  }

  .nom {
    font-weight: 700;
    font-size: 0.95rem;
  }

  .tableau-scroll {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }

  th,
  td {
    border: 1px solid #999;
    padding: 0.22rem 0.45rem;
    text-align: left;
  }

  thead th {
    background: #eee;
    font-size: 0.75rem;
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
    color: #666;
  }

  tr.principale > th {
    font-weight: 700;
    background: #f4f4f4;
  }

  tr.principale > .note {
    font-weight: 700;
    background: #f4f4f4;
  }

  tr.sous-rubrique > th {
    font-weight: 400;
  }

  tfoot th,
  tfoot td {
    font-weight: 700;
    background: #e6e6e6;
  }

  .echelle {
    text-align: right;
  }

  .cote {
    display: inline-block;
    min-width: 1.6rem;
    margin-left: 0.2rem;
    padding: 0 0.2rem;
    border: 1px solid #bbb;
    border-radius: 3px;
    text-align: center;
    color: #999;
    font-size: 0.75rem;
  }

  .cote.retenue {
    border-color: #000;
    background: #000;
    color: #fff;
    font-weight: 700;
  }

  .legende {
    margin-top: 0.6rem;
    font-size: 0.68rem;
    color: #555;
    line-height: 1.35;
  }

  .commentaire {
    min-height: 60mm;
    border: 1px solid #999;
    padding: 0.5rem;
    font-size: 0.85rem;
    white-space: pre-wrap;
  }

  .signatures {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 18mm;
    font-size: 0.78rem;
  }

  .signatures > div {
    flex: 1;
    text-align: center;
  }

  .ligne-signature {
    display: block;
    border-top: 1px solid #000;
    margin-bottom: 0.25rem;
  }

  /*
   * Impression : une page A4 par face, le verso après le recto, et un saut de
   * page après chaque bulletin pour imprimer toute une classe d'un seul coup.
   */
  @media print {
    .page {
      border: 0;
      padding: 0;
      margin: 0;
      max-width: none;
      break-after: page;
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
      gap: 0.6rem;
    }

    .identite {
      text-align: left;
    }

    table {
      font-size: 0.75rem;
    }

    th,
    td {
      padding: 0.16rem 0.3rem;
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
