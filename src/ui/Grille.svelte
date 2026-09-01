<!--
  Grille de saisie — étape 3 de la feuille de route.

  Une grille par rubrique : lignes = élèves, colonnes = tests de cette rubrique
  pour la période courante. L'écran de saisie les empile.
  Toute la logique de déplacement vit dans `domaine/navigation.ts` et la
  validation dans `domaine/validation.ts` ; ce composant ne fait que relier
  le clavier, le DOM et les mutations.
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
  <p class="vide">Aucun test encodé pour cette rubrique dans cette période.</p>
{:else}
  <div class="cadre">
    <table>
      <thead>
        <tr>
          <th class="entete-eleve" scope="col">Élève</th>
          {#each tests as test, colonne (test.id)}
            <th scope="col">
              <span class="libelle">{test.libelle}</span>
              <span class="max">/ {test.maximum}</span>
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
              <td class:erreur={erreur}>
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
  .cadre {
    overflow: auto;
    border: 1px solid var(--trait);
    border-radius: 6px;
  }

  table {
    border-collapse: collapse;
    width: max-content;
    min-width: 100%;
  }

  th,
  td {
    border: 1px solid var(--trait);
    padding: 0;
  }

  thead th {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--fond-doux);
    padding: 0.35rem 0.5rem;
    text-align: left;
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .libelle {
    display: inline-block;
    max-width: 9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: bottom;
  }

  .max {
    color: var(--encre-douce);
    font-weight: 400;
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

  .entete-eleve {
    position: sticky;
    left: 0;
    z-index: 1;
    background: var(--fond-doux);
    padding: 0.3rem 0.6rem;
    text-align: left;
    font-weight: 500;
    white-space: nowrap;
  }

  thead .entete-eleve {
    z-index: 3;
  }

  /* La cellule entière est la zone de saisie : l'input occupe toute la case,
     sinon un clic dans la marge de la case ne donne pas le focus (§ ergonomie
     de l'encodage au clavier). */
  input {
    display: block;
    box-sizing: border-box;
    width: 100%;
    min-width: 5.5rem;
    height: 100%;
    border: 0;
    border-radius: 0;
    padding: 0.3rem 0.4rem;
    text-align: right;
    background: transparent;
  }

  input:focus {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
    background: #eef4fc;
  }

  td.erreur {
    background: var(--alerte-fond);
  }

  .messages-erreur {
    margin: 0.5rem 0 0;
    color: var(--alerte);
    font-size: 0.85rem;
  }

  .vide {
    margin: 0.6rem 0 0;
    color: var(--encre-douce);
    font-size: 0.82rem;
  }
</style>
