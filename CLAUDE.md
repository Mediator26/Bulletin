# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Le document de référence

[spec-solution.md](spec-solution.md) est la spécification
du projet : audit du classeur Excel remplacé, solution retenue, contraintes (C1–C12)
et ordre de construction (§4.1). **Le lire avant toute décision de conception.**
Les commentaires du code renvoient à ses numéros de section et de défaut ; garder
cette convention lors des ajouts.

Le projet remplace un modèle Excel de bulletins scolaires (école de Momignies) par
une application HTML autonome, ouverte en `file://`, sans installation ni réseau.

## Commandes

```bash
npm test                              # tous les tests (vitest run)
npx vitest run tests/calcul.test.ts   # un seul fichier de test
npx vitest -t "prorata"               # un seul cas, par son libellé, en watch
npx tsc --noEmit -p tsconfig.json     # vérification de types seule
npm run build                         # svelte-check puis bundle mono-fichier dans dist/
npm run dev                           # serveur de développement Vite
```

## Contraintes de build non négociables

- **Aucune ressource externe** : pas de CDN, pas de police embarquée, pas de requête
  réseau au chargement. `vite-plugin-singlefile` inline tout ; `base: './'` et un
  `assetsInlineLimit` très élevé sont ce qui rend le fichier utilisable en `file://`.
  Toute dépendance qui charge une ressource à l'exécution casse l'outil.
- **Moins de 2 Mo** pour le `.html` produit (C8).
- La cible d'impression est le navigateur : mise en page en CSS `@page` / `@media print`,
  export PDF via « Imprimer → Enregistrer au format PDF ». Ne pas introduire de
  bibliothèque de génération de PDF.

## Architecture

Le principe qui gouverne tout : **la structure est une donnée, jamais une géométrie
de cellules**. Le nombre d'élèves, de tests, de périodes et l'arborescence des
rubriques sont des enregistrements, ce qui supprime par construction les
désynchronisations du classeur d'origine.

- `src/domaine/` — cœur métier, en TypeScript pur, sans aucune dépendance à
  l'interface ni au DOM. C'est là que vit la valeur, et c'est ce qui est testé.
  - `modele.ts` : le modèle de §2.4, plus `SCHEMA_VERSION` et `FichierClasse`
    (la forme exacte du fichier de classe sur le disque).
  - `calcul.ts` : moteur de scores. `scoreRubrique` applique le prorata des tests
    réellement présentés ; `scoreRubriqueArbre` agrège les branches par récursion
    sur `parent_id`, au lieu de recopier des formules.
  - `validation.ts` : interprétation des saisies de la grille.
  - `bulletin.ts` : composition d'un bulletin, ligne à ligne, telle qu'elle sera
    imprimée. Rend la structure, jamais du HTML — c'est ce qui permet de tester
    le contenu d'un bulletin sans navigateur.
- `src/donnees/persistance.ts` — sérialisation, migrations de schéma, nommage des
  fichiers. Aucune logique de calcul ici.
- `src/etat/classeur.svelte.ts` — le fichier ouvert, en `$state` profond, et son
  cycle de vie. Les mutations du domaine écrivent en place dans cet objet : c'est
  ce qui leur permet d'être testables en Node tout en rafraîchissant l'interface.
- `src/ui/` — composants Svelte, organisés en trois écrans (`EcranSaisie`,
  `EcranBulletins`, `EcranAdministration`) que `App.svelte` alterne. Ils ne
  calculent rien : la navigation clavier vient de `domaine/navigation.ts`, la
  validation de `domaine/validation.ts`, le contenu du bulletin de
  `domaine/bulletin.ts`. Toute règle métier écrite dans un `.svelte` est au
  mauvais endroit.
  L'écran de saisie empile **une grille par rubrique** — le titulaire encode une
  période en descendant la page, sans choisir de rubrique dans un menu. Chaque
  grille reçoit une `zone` (l'id de la rubrique) : sans elle, deux cellules de
  même coordonnée porteraient le même identifiant DOM et le déplacement du focus
  atterrirait dans la mauvaise rubrique.
- `tests/` — vitest, un fichier par module du domaine.

### Invariants du domaine

- **`null` n'est pas 0.** `null` signifie « rien à afficher » (imprimé « — ») et se
  propage à travers les agrégations : une rubrique dont rien n'est encodé vaut `null`,
  pas 0. Ne jamais remplacer un `null` par un `?? 0` dans une chaîne de calcul.
- **`statut` est distinct de `valeur`.** Un 0 encodé est un vrai 0 et entre dans la
  base du prorata ; `absent` et `dispense` en sortent. C'est la correction du défaut
  n° 8 du classeur, et les tests la verrouillent.
- **`schemaVersion` est obligatoire dans tout fichier de classe.** Un fichier de
  version plus ancienne passe par la table `MIGRATIONS` de `persistance.ts` ; un
  fichier plus récent est refusé avec un message clair, jamais lu de travers (C4).
  Toute modification incompatible de `FichierClasse` impose d'incrémenter
  `SCHEMA_VERSION` et d'ajouter la migration correspondante.
- Le fichier de données ne contient jamais l'application, et réciproquement (C3).
  Les `observation` ne sont jamais imprimées.

## Règles d’interface

- Le cycle est *ouvrir un fichier → travailler en mémoire → réenregistrer par
  téléchargement*. Il n'y a pas d'écriture directe en `file://` (C1) : l'indicateur
  de modifications non enregistrées et l'alerte `beforeunload` ne sont pas des
  agréments, ce sont les garde-fous contre la perte de données.
- `localStorage` / `IndexedDB` servent uniquement de filet de récupération, jamais
  de source de vérité (C2).
- Version et date de build doivent rester visibles à l'écran (`__VERSION__`,
  `__BUILD_DATE__`, injectés par `vite.config.ts`).
- Saisie au clavier, poste fixe ou portable uniquement — pas de responsive mobile (C9).

## Portée

L'import du classeur `.xltx` existant — étape 5 du plan de la spécification — a
été **abandonné** sur décision de l'utilisateur. Ne pas le rouvrir ni ajouter
SheetJS sans demande explicite ; les classes se créent depuis l'application.

## Langue

Le code, les commentaires, les identifiants du domaine et les messages destinés à
l'utilisateur sont en français, accentués. Les libellés d'erreur s'adressent à un
enseignant, pas à un développeur : ils disent quoi faire.
