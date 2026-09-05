<!--
  Grille de saisie — étape 3 de la feuille de route.

  Une grille par rubrique : lignes = élèves, colonnes = tests de cette rubrique
  pour la période courante. L'écran de saisie les empile.
  Toute la logique de déplacement vit dans `domaine/navigation.ts` et la
  validation dans `domaine/validation.ts` ; ce composant ne fait que relier
  le clavier, le DOM et les mutations.

  Mise en forme : la grille se lit comme un tableur, mais elle doit rester lisible
  à la trace du regard. Trois choix en découlent :
    · `border-collapse: separate` — les bordures fusionnées disparaissent sous
      les cellules figées dès qu'on défile horizontalement ; séparées, elles tiennent ;
    · la ligne en cours de saisie est teintée (`:has(input:focus)`), pour ne pas
      encoder la note d'un élève dans la ligne du voisin ;
    · « abs » et « disp » sont des pastilles, pas du texte : un statut ne se
      confond pas avec une note.
-->
<script lang="ts">
  import type { Eleve, FichierClasse, Statut, Test } from '../domaine/modele.js';
  import { deplacer, idCellule, type Cellule } from '../domaine/navigation.js';
  import { definirResultat, resultatDe, supprimerTest } from '../domaine/mutations.js';
  import { validerPoints } from '../domaine/validation.js';

  interface Props {
    fichier: FichierClasse;
    eleves: Eleve[];
    tests: Test[];
    /** Sépare les grilles empilées de l'écran de saisie : une zone par rubrique. */
    zone: string;
    onModification: () => void;
  }

  const { fichier, eleves, tests, zone, onModification }: Props = $props();

  const dimensions = $derived({ lignes: eleves.length, colonnes: tests.length });

  /** Message de refus par cellule : la saisie fautive reste visible pour être corrigée. */
  let erreurs = $state<Record<string, string>>({});

  function cle(ligne: number, colonne: number): string {
    return `${ligne}:${colonne}`;
  }

  function affichage(test: Test, eleve: Eleve): string {
    const resultat = resultatDe(fichier, test.id, eleve.id);
    if (!resultat) return '';
    if (resultat.statut === 'absent') return 'abs';
    if (resultat.statut === 'dispense') return 'disp';
    return resultat.valeur === null ? '' : String(resultat.valeur).replace('.', ',');
  }

  /** Statut affiché, pour teinter la cellule : un statut n'est pas une note. */
  function statutDe(test: Test, eleve: Eleve): Statut | null {
    const resultat = resultatDe(fichier, test.id, eleve.id);
    return resultat?.statut === 'absent' || resultat?.statut === 'dispense'
      ? resultat.statut
      : null;
  }

  function saisir(evenement: Event, ligne: number, colonne: number): void {
    const champ = evenement.currentTarget as HTMLInputElement;
    const test = tests[colonne];
    const eleve = eleves[ligne];
    if (!test || !eleve) return;

    const validation = validerPoints(champ.value, test);
    if (!validation.ok) {
      erreurs = { ...erreurs, [cle(ligne, colonne)]: validation.message };
      return;
    }

    const { [cle(ligne, colonne)]: _, ...reste } = erreurs;
    erreurs = reste;
    definirResultat(fichier, test.id, eleve.id, validation.valeur);
    onModification();
  }

  function marquer(ligne: number, colonne: number, statut: Statut): void {
    const test = tests[colonne];
    const eleve = eleves[ligne];
    if (!test || !eleve) return;

    definirResultat(fichier, test.id, eleve.id, null, statut);
    const { [cle(ligne, colonne)]: _, ...reste } = erreurs;
    erreurs = reste;
    onModification();
  }

  function focaliser(cellule: Cellule): void {
    const champ = document.getElementById(idCellule(cellule, zone)) as HTMLInputElement | null;
    champ?.focus();
    champ?.select();
  }

  function auClavier(evenement: KeyboardEvent, ligne: number, colonne: number): void {
    const champ = evenement.currentTarget as HTMLInputElement;

    // Les raccourcis de l'application ne doivent jamais recouvrir ceux du
    // navigateur : Ctrl+A sélectionne le contenu de la cellule, il ne marque pas
    // une absence.
    const avecModificateur = evenement.ctrlKey || evenement.altKey || evenement.metaKey;
    const marque = champ.value === 'abs' || champ.value === 'disp';

    if (!avecModificateur) {
      // Raccourcis d'absence : « a » et « d » sur une cellule, plutôt qu'un menu
      // à la souris que personne n'ouvrirait pendant un encodage.
      const touche = evenement.key.toLowerCase();
      if (touche === 'a' || touche === 'd') {
        evenement.preventDefault();
        marquer(ligne, colonne, touche === 'a' ? 'absent' : 'dispense');
        return;
      }

      if (marque) {
        if (evenement.key === 'Delete' || evenement.key === 'Backspace') {
          evenement.preventDefault();
          definirResultat(fichier, tests[colonne]!.id, eleves[ligne]!.id, null);
          onModification();
          return;
        }
        // Un chiffre tapé sur une cellule marquée la remplace : « abs » puis « 8 »
        // donne 8, jamais « abs8 ».
        if (/^[0-9]$/.test(evenement.key)) champ.value = '';
      }
    }

    const cible = deplacer({ ligne, colonne }, evenement, dimensions);
    if (!cible) return;

    evenement.preventDefault();
    focaliser(cible);
  }
</script>

{#if tests.length === 0}
  <p class="vide">
    Aucun test encodé pour cette rubrique dans cette période.
    <span>Ajoutez-en un avec le champ ci-dessus.</span>
  </p>
{:else}
  <div class="cadre">
    <table>
      <thead>
        <tr>
          <th class="entete-eleve" scope="col">Élève</th>
          {#each tests as test, colonne (test.id)}
            <th scope="col">
              <span class="titre-test">
                <span class="libelle" title={test.libelle}>{test.libelle}</span>
                <span class="max">/ {test.maximum}</span>
              </span>
              <button
                class="supprimer"
                title="Supprimer ce test et ses résultats"
                aria-label="Supprimer le test {test.libelle}"
                onclick={() => {
                  supprimerTest(fichier, test.id);
                  onModification();
                }}
                data-colonne={colonne}>×</button
              >
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each eleves as eleve, ligne (eleve.id)}
          <tr>
            <th class="entete-eleve" scope="row">{eleve.nom} {eleve.prenom}</th>
            {#each tests as test, colonne (test.id)}
              {@const erreur = erreurs[cle(ligne, colonne)]}
              {@const statut = statutDe(test, eleve)}
              <td class:erreur={erreur} class:absent={statut === 'absent'} class:dispense={statut === 'dispense'}>
                <input
                  id={idCellule({ ligne, colonne }, zone)}
                  value={affichage(test, eleve)}
                  title={erreur ?? `${test.libelle} — maximum ${test.maximum}`}
                  aria-label="{eleve.nom} {eleve.prenom} — {test.libelle}"
                  aria-invalid={erreur ? 'true' : undefined}
                  inputmode="decimal"
                  autocomplete="off"
                  oninput={(e) => saisir(e, ligne, colonne)}
                  onkeydown={(e) => auClavier(e, ligne, colonne)}
                  onfocus={(e) => (e.currentTarget as HTMLInputElement).select()}
                />
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if Object.values(erreurs).length > 0}
    <p class="messages-erreur" role="alert">{Object.values(erreurs)[0]}</p>
  {/if}
{/if}

<style>
  /* Le cadre est la fenêtre de défilement horizontal : c'est lui qui fige la
     colonne des noms quand la rubrique compte plus de tests que d'écran. */
  .cadre {
    overflow: auto;
    border-radius: 0 0 var(--r-lg) var(--r-lg);
    background: var(--surface);
  }

  table {
    border-collapse: separate;
    border-spacing: 0;
    width: max-content;
    min-width: 100%;
  }

  th,
  td {
    border-right: 1px solid var(--trait);
    border-bottom: 1px solid var(--trait);
    padding: 0;
  }

  th:last-child,
  td:last-child {
    border-right: 0;
  }

  tbody tr:last-child th,
  tbody tr:last-child td {
    border-bottom: 0;
  }

  thead th {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--surface-douce);
    padding: 0.4rem 0.55rem;
    text-align: left;
    font-size: var(--t-xs);
    font-weight: 700;
    letter-spacing: 0.02em;
    white-space: nowrap;
    vertical-align: bottom;
  }

  .titre-test {
    display: inline-flex;
    align-items: baseline;
    gap: 0.25rem;
  }

  .libelle {
    display: inline-block;
    max-width: 9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: bottom;
  }

  .max {
    color: var(--encre-tenue);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  .supprimer {
    margin-left: var(--e1);
    border: 0;
    background: none;
    box-shadow: none;
    padding: 0 0.2rem;
    color: var(--encre-tenue);
    font-size: var(--t-md);
    line-height: 1;
  }

  .supprimer:hover:not(:disabled) {
    background: var(--alerte-fond);
    color: var(--alerte);
  }

  .entete-eleve {
    position: sticky;
    left: 0;
    z-index: 1;
    background: var(--surface-douce);
    padding: 0.3rem 0.6rem;
    text-align: left;
    font-size: var(--t-md);
    font-weight: 550;
    white-space: nowrap;
  }

  /* La colonne figée doit rester détachée des notes qui glissent dessous : une
     bordure suffit tant qu'on ne défile pas, une ombre porte le relief ensuite. */
  tbody .entete-eleve {
    box-shadow: 1px 0 0 var(--trait);
  }

  thead .entete-eleve {
    z-index: 3;
    box-shadow: 1px 0 0 var(--trait);
  }

  /* Repère de ligne : encoder vingt-cinq élèves sur six colonnes sans jamais
     glisser d'une ligne à l'autre est le seul vrai risque de la saisie. */
  tbody tr:hover td {
    background: var(--surface-douce);
  }

  tbody tr:has(input:focus) td {
    background: var(--accent-doux);
  }

  tbody tr:has(input:focus) .entete-eleve {
    background: var(--accent-doux);
    color: var(--accent-fort);
    font-weight: 700;
  }

  /* La cellule entière est la zone de saisie : l'input occupe toute la case,
     sinon un clic dans la marge de la case ne donne pas le focus (§ ergonomie
     de l'encodage au clavier). */
  input {
    display: block;
    box-sizing: border-box;
    width: 100%;
    min-width: 4.75rem;
    height: 100%;
    border: 0;
    border-radius: 0;
    padding: 0.32rem 0.5rem;
    text-align: left;
    font-variant-numeric: tabular-nums;
    background: transparent;
  }

  input:hover:not(:disabled) {
    border: 0;
  }

  input:focus,
  input:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
    box-shadow: none;
    border-radius: 0;
    background: var(--surface);
    font-weight: 650;
  }

  /* Absent et dispensé : deux statuts distincts, tous deux hors du prorata
     (défaut n° 8 du classeur). Ils se lisent au premier coup d'œil, sans être
     pris pour des notes. */
  td.absent input,
  td.dispense input {
    text-align: center;
    font-size: var(--t-xs);
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  td.absent input {
    color: var(--attention);
  }

  td.absent {
    background: var(--attention-fond);
  }

  td.dispense input {
    color: var(--encre-tenue);
  }

  td.dispense {
    background: var(--surface-appuyee);
  }

  /* Une saisie refusée ne disparaît pas : elle reste à l'écran, signalée, pour
     être corrigée plutôt que retapée. */
  td.erreur,
  tbody tr:hover td.erreur,
  tbody tr:has(input:focus) td.erreur {
    background: var(--alerte-fond);
    box-shadow: inset 2px 0 0 var(--alerte);
  }

  td.erreur input {
    color: var(--alerte);
    font-weight: 650;
  }

  .messages-erreur {
    display: flex;
    align-items: center;
    gap: var(--e2);
    margin: 0;
    padding: var(--e3) var(--e4);
    border-top: 1px solid var(--alerte);
    background: var(--alerte-fond);
    color: var(--alerte);
    font-size: var(--t-sm);
    font-weight: 550;
  }

  /* Une rubrique sans test tient sur une ligne. Au début d'une période, elles le
     sont presque toutes : un encadré vide par rubrique ferait de l'écran de
     saisie une page de vide à faire défiler avant d'atteindre le premier
     tableau. */
  .vide {
    display: flex;
    flex-wrap: wrap;
    gap: var(--e1) var(--e2);
    margin: 0;
    padding: var(--e3) var(--e4);
    color: var(--encre-tenue);
    font-size: var(--t-sm);
  }
</style>
