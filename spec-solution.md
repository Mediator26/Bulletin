# Bulletin scolaire — Audit du classeur et solution retenue

**Contexte** : remplacer le modèle Excel de bulletins
(année 2024‑2025, école de Momignies) par un outil réellement fiable, utilisable
hors ligne par des enseignants, et **transmis sous forme de fichier** via le Drive
partagé de l'école.

**Décision** : application HTML autonome en **fichier unique**, ouverte dans le
navigateur, avec les données de chaque classe dans un fichier séparé.

---

## 1. Pourquoi remplacer le classeur actuel

### 1.1 Ce que fait le classeur (et qu'il faut conserver)

L'architecture métier est saine et doit être reprise telle quelle :

| Étage | Feuilles | Rôle |
|---|---|---|
| Paramétrage | `rubriques`, `NOMS` | Référentiel matières/pondérations + liste des élèves |
| Saisie | `bull1`, `bull2`, `bull3` | Points de chaque test, par période |
| Annexes | `commentaires`, `observ` | Commentaires imprimés + observations privées |
| Restitution | Feuilles `1` à `30` | Un bulletin imprimable par élève |

Barème : Français 100 (Parler 10, Écouter 10, Lire‑écrire 40, Écrire 20,
Expression écrite 20) · Mathématiques 100 (arithmétique 50, géométrie 20,
grandeurs 30) · Éveil 100 (Histoire‑géo 50, Sciences 50) · Éducation physique 20 ·
Néerlandais 20 · Religion/EPC, PECA/FMTT et comportement cotés TB‑B‑S‑F‑I.

La règle de calcul centrale, à préserver à l'identique — le **prorata des tests
réellement présentés** :

```
score_rubrique = arrondi( points_obtenus / Σ(max_test × présence_test) × max_rubrique , 1)
```

### 1.2 Les défauts relevés

**Bloquants et silencieux**

1. **Capacités incohérentes entre feuilles.** `NOMS` accepte 35 élèves,
   `bull1/2/3` n'ont que 32 lignes, `commentaires` 29, et il n'existe que
   30 feuilles‑bulletins. Comme tous les `VLOOKUP` sont en recherche
   **approximative** (4ᵉ argument omis), l'élève n° 33 ne reçoit pas `#N/A`
   mais **les points de l'élève 32**. Un bulletin faux, sans aucun signal.
2. **`#REF!` persistants** dans les 30 feuilles‑bulletins : `K13`, `K19`,
   `AB39`, `AB44`, `AB45`, `AB49`, `AB50`, `AB54`, `AB55` — 27 occurrences par
   feuille, vestiges d'une version à 4 périodes.
3. **Lien externe cassé** : `M46`, `M47`, `M51`, `M52`, `M56`, `M57` (et
   `O62`/`O63`) pointent vers
   un classeur `.ods` d'une autre école. Demande de mise à jour des liaisons à chaque
   ouverture, puis `#REF!`.
4. **Fonction non traduite** : `1!O1` contient `valeur(...)` (nom français de
   `VALUE`) dans une formule à syntaxe anglaise → `#NAME?`.

**Erreurs de contenu**

5. **Date du 2ᵉ bulletin erronée** : `rubriques!F2` = 21/02/**2024** au lieu de
   2025. Elle s'imprime sur les 30 bulletins.
6. **Élève de démonstration** « Dupont / Julien » laissé dans le modèle.
7. **Double sens de « P1/P2/P3 »** : périodes dans `rubriques`, année primaire
   dans `NOMS`.

**Fragilités de conception**

8. **Un 0 réel est traité comme une absence** (`IF(S5>0;1;0)` et le test
   `IF(somme=0;0;…)`). Limite assumée et documentée, mais bien réelle.
9. **Indice de colonne en texte** : `VLOOKUP(...;"3")` — coercition non garantie
   selon le moteur de calcul.
10. **Références mixtes instables** : `NOMS!$A4:$BC$50` (ligne relative) contre
    `NOMS!$A$4:$BC$40` ailleurs ; bornes flottantes `$GC$37`, `$EY$37`,
    `$HA$37`, `$GL$37`, `$GN$37`, `$IV$37` sans raison fonctionnelle.
11. **Unités mélangées en colonne K** : sous‑rubriques en `%`, totaux en points.
12. **Zones d'impression en double** (`$B$2:$L$58` et `$B$2:$L$56` pour la même
    feuille) + un `Excel_BuiltIn_Print_Area_2` valant `#REF!` → Excel peut
    proposer une réparation à l'ouverture.
13. **7 Mo pour ~2 000 cellules utiles** : `bull1` fait 7,1 Mo de XML à lui seul
    (1 072 lignes × 1 013 colonnes formatées, ligne 1 de compteurs étendue
    jusqu'à `AMJ1`).
14. **Protection à mot de passe trivial** (`ce2a`, hachage Excel legacy).
15. **Aucune validation de saisie** : rien n'empêche 15 sur un test coté sur 10,
    ni une lettre dans une case de points.

> **Racine commune** : la structure est codée dans la géométrie des cellules.
> C'est ce que la refonte élimine par construction.

---

## 2. Solution retenue : application HTML en fichier unique

### 2.1 Principe

Un seul fichier `bulletin-scolaire-v1.0.html` (quelques centaines de Ko), qui
contient **tout** : interface, logique de calcul, styles, mise en page
d'impression. L'enseignant le télécharge une fois depuis le Drive, le
double‑clique, il s'ouvre dans son navigateur. Aucune installation, aucune
connexion, aucun compte.

Les données ne sont **pas** dans ce fichier. Chaque classe est un fichier
`4eA-2025-2026.json` que l'enseignant ouvre puis enregistre — exactement le
réflexe qu'il a déjà avec le `.xltx`.

```
Drive partagé/
├── Application/
│   ├── bulletin-scolaire-v1.0.html      ← l'outil, versionné
│   └── CHANGELOG.txt
└── Classes/
    ├── 4eA-2025-2026.json               ← les données, une par classe
    └── 5eB-2025-2026.json
```

### 2.2 Pourquoi cette voie plutôt qu'une autre

| Voie | Alerte de sécurité | Installation | Impression | Mise à jour |
|---|---|---|---|---|
| **HTML fichier unique** | **Aucune** | **Aucune** | Excellente (CSS) | Remplacer le fichier |
| Tauri / Electron signés | Aucune | Oui | Excellente | Automatique |
| Tauri non signé sur Drive | Windows **et** macOS | Oui | Excellente | Manuelle |
| Tauri non signé sur clé USB | Aucune *si exFAT* | Oui | Excellente | Manuelle |
| Flutter desktop non signé | Windows **et** macOS | Oui | À recoder en Dart | Manuelle |

Les trois raisons qui tranchent :

1. **Zéro alerte de sécurité.** SmartScreen (Windows) et Gatekeeper (macOS) ne
   s'appliquent qu'aux **exécutables**. Un `.html` n'en est pas un. Aucun
   certificat à acheter : ni les 99 €/an d'Apple, ni le certificat Windows
   (~10 $/mois via Azure Trusted Signing, ou 400–700 €/an en EV pour neutraliser
   SmartScreen dès la première version). Économie : **220 à 250 €/an**.
   Sur macOS 15 (Sequoia), Apple a supprimé le contournement par clic droit →
   Ouvrir : une application non signée y est un vrai mur, pas une simple gêne.
2. **L'impression est native.** Le bulletin recto‑verso se décrit en CSS
   (`@page`, `break-after`), et l'export PDF est le « Imprimer → Enregistrer au
   format PDF » du navigateur. C'est le cœur de cet outil, et c'est précisément
   ce que Flutter fait perdre : il peint des pixels sur un canevas, il faudrait
   redessiner la mise en page en widgets Dart via le paquet `pdf`/`printing`.
3. **Ça épouse le flux existant** : un fichier posé sur le Drive, qu'on ouvre,
   qu'on remplit, qu'on enregistre, qu'on imprime.

### 2.3 Pile technique

| Élément | Choix | Motif |
|---|---|---|
| Langage | TypeScript | Erreurs attrapées à la compilation, pas chez l'enseignant |
| Interface | Svelte (ou React) | Léger, compile en JS natif sans runtime lourd |
| Build | Vite + `vite-plugin-singlefile` | Produit **un seul** `.html` tout inclus |
| Données | JSON, ou SQLite‑wasm si le volume l'impose | Lisible, diffable, réparable à la main |
| Grille de saisie | Grille CSS + navigation clavier | Saisie à la tabulation, comme un tableur |
| Impression | CSS `@page` / `@media print` | Aucune bibliothèque PDF nécessaire |
| Polices | Polices système (`system-ui`) | Aucune police embarquée : le fichier reste léger |

**Contrainte de build absolue** : aucun CDN, aucune ressource externe. Tout est
inline, sinon l'outil ne fonctionne pas hors ligne.

### 2.4 Modèle de données

```
annee_scolaire (id, libelle, ecole, titulaire)
periode        (id, annee_id, numero, date_bulletin)          -- 3 aujourd'hui, N demain
eleve          (id, annee_id, nom, prenom, annee_etude, ordre)
rubrique       (id, annee_id, parent_id, libelle, maximum, type)  -- type: points | echelle
test           (id, periode_id, rubrique_id, libelle, maximum)
resultat       (test_id, eleve_id, valeur NULLABLE, statut)   -- statut: presente | absent | dispense
commentaire    (eleve_id, periode_id, texte)
observation    (eleve_id, texte)                              -- privé, jamais imprimé
```

Quatre décisions qui suppriment les défauts 1, 8 et 10 par construction :

1. **`statut` distinct de `valeur`** → un 0 légitime entre dans le prorata,
   une absence en sort. Le défaut n° 8 disparaît.
2. **Le nombre d'élèves, de tests et de périodes est une donnée**, pas une plage
   de cellules → plus de désynchronisation 35 / 32 / 29 / 30 (défaut n° 1).
3. **`rubrique.parent_id`** → l'arborescence Français → Lire‑écrire est native,
   les totaux sont des agrégations, pas des formules recopiées.
4. **`annee_id` sur les rubriques** → chaque année fige son référentiel :
   modifier ses pondérations en 2027 ne corrompt pas les bulletins de 2025.

### 2.5 Moteur de calcul

Trente lignes testables remplacent des milliers de formules recopiées :

```ts
function scoreRubrique(resultats: Resultat[], tests: Map<Id, Test>, maxRubrique: number): number | null {
  const presents = resultats.filter(r => r.statut === 'presente' && r.valeur !== null);
  if (presents.length === 0) return null;              // null ≠ 0, affiché « — »
  const obtenu = presents.reduce((s, r) => s + r.valeur!, 0);
  const base   = presents.reduce((s, r) => s + tests.get(r.test_id)!.maximum, 0);
  if (base === 0) return null;
  return Math.round((obtenu / base) * maxRubrique * 10) / 10;
}
```

**Cas à couvrir en tests unitaires** — ce sont exactement ceux qui cassent
aujourd'hui : élève entièrement absent · 0 légitime · rubrique sans aucun test
encodé · élève au‑delà de la capacité de la liste · moyenne annuelle avec un
seul bulletin complété (doit rester vide, comme le `IF(S7<2;"")` actuel).

### 2.6 Impression

```css
@page { size: A4 portrait; margin: 12mm 14mm; }
@media print {
  .bulletin      { break-after: page; }
  .no-print      { display: none; }
  tr, .rubrique  { break-inside: avoid; }
}
```

Le recto porte les points, le verso les commentaires et les signatures —
la structure du modèle actuel se transpose directement. Le nom du PDF proposé
par le navigateur est piloté par `document.title` : le fixer à
`Bulletin-P2-Dupont-Julien` avant d'appeler `window.print()` donne un nommage
automatique gratuit.

---

## 3. Contraintes qui en découlent

C'est le prix à payer pour l'absence d'installation et d'alerte. Aucune n'est
rédhibitoire, **mais elles doivent être traitées explicitement dans l'interface**,
pas laissées à la vigilance de l'utilisateur.

### 3.1 Structurelles — à concevoir dès le départ

**C1. Pas d'enregistrement dans le fichier ouvert.** Ouvert en `file://`, le
navigateur interdit l'écriture directe (la File System Access API n'y est pas
disponible). Le cycle est donc : *ouvrir* via un sélecteur de fichier →
*travailler* → *enregistrer* via un téléchargement, qui atterrit dans le dossier
Téléchargements. L'enseignant doit ensuite **déplacer le fichier vers le Drive**
en écrasant l'ancien.
→ *C'est le risque n° 1 de perte de données.* Mitigations obligatoires :
indicateur permanent « modifications non enregistrées », alerte `beforeunload`
à la fermeture, bouton Enregistrer proéminent, nom de fichier proposé
pré‑rempli et identique à l'original.

**C2. Le stockage navigateur n'est pas fiable en `file://`.** `localStorage` et
`IndexedDB` y ont une origine opaque, au comportement variable selon le
navigateur, et peuvent être purgés en vidant les données de navigation.
→ Utilisable comme **filet de sécurité** (« une session non enregistrée a été
retrouvée, la restaurer ? »), **jamais** comme source de vérité. Le fichier sur
le Drive est la seule référence.

**C3. Deux fichiers distincts à ne jamais confondre** : l'application
(versionnée, partagée par tous) et les données (une par classe, propriété d'un
enseignant). Une convention de nommage stricte et un rappel visible dans
l'interface évitent le « j'ai écrasé l'application avec ma classe ».

**C4. Dérive de version.** Chacun garde sa copie de l'application ; rien ne
force la mise à jour.
→ Afficher **version et date de build** dans un coin de l'écran, inscrire un
`schemaVersion` dans chaque fichier de données, et refuser explicitement — avec
un message clair — un fichier produit par une version plus récente. Prévoir une
migration automatique pour les versions plus anciennes.

**C5. Aucune édition simultanée, aucune fusion.** Deux enseignants qui ouvrent
la même classe et enregistrent chacun leur version : le dernier écrase le
premier, sans avertissement. Le Drive ne verrouille pas un fichier édité hors
ligne.
→ Règle organisationnelle à poser : **un seul propriétaire par classe**.
L'historique des versions du Drive sert de rattrapage.

### 3.2 Ergonomiques

**C6. Le navigateur compte.** Chrome et Edge sont la cible recommandée. Firefox
fonctionne. Safari fonctionne, avec des différences sur le téléchargement et les
options d'impression. À tester réellement sur un poste Mac avant diffusion.

**C7. Réglages d'impression à expliquer une fois.** Il faut décocher
« En‑têtes et pieds de page » dans la boîte d'impression, sans quoi l'URL du
fichier et la date s'impriment sur le bulletin. À documenter dans une notice
d'une page, avec capture d'écran, jointe à l'application sur le Drive.

**C8. Poids du fichier.** Tout étant inline, viser **moins de 2 Mo**. Concrètement :
pas de police embarquée, pas de bibliothèque lourde, pas d'images en base64
au‑delà d'un logo. Au‑delà, le téléchargement depuis Drive et l'envoi par mail
deviennent pénibles.

**C9. Poste fixe ou portable uniquement.** La saisie en grille au clavier n'est
pas utilisable sur tablette ou téléphone. À assumer, pas à corriger.

### 3.3 Organisationnelles et réglementaires

**C10. Le fichier de données n'est pas chiffré** et contient des noms d'élèves et
leurs résultats. Sa seule protection est le **droit d'accès du dossier Drive**.
→ Placer `Classes/` dans un dossier à accès restreint aux titulaires concernés,
et n'y stocker aucune donnée sensible au‑delà du strict nécessaire (pas de
remarques médicales ou familiales dans le champ `observation`).
En contrepartie, comme rien ne quitte l'école, il n'y a **ni sous‑traitant à
déclarer, ni hébergement à sécuriser** — c'est l'argument RGPD fort de cette
solution.

**C11. Aucune mise à jour automatique.** Chaque correction impose de reposer le
fichier sur le Drive et de prévenir les collègues.
→ Un dossier `Application/` avec la dernière version et un `CHANGELOG.txt`
daté ; annoncer les mises à jour en réunion d'équipe, pas par mail individuel.

**C12. Aucune sauvegarde automatique versionnée.** Le classeur actuel repose sur
la consigne « gardez toujours une copie vierge », c'est‑à‑dire sur la discipline
de l'utilisateur.
→ S'appuyer sur l'**historique des versions du Drive** et proposer, en fin de
période, un export horodaté `4eA-2025-2026_P2-cloture_2026-02-21.json` à archiver.

### 3.4 Ce que cette voie ne fera jamais

- Écrire directement dans le fichier posé sur le Drive : il y aura toujours une
  manipulation de fichier à l'ouverture et à la fermeture.
- Consolider automatiquement les classes au niveau de l'école.
- Signaler à l'enseignant B que l'enseignant A a modifié la même classe.

**Points de bascule** — si l'un de ces besoins apparaît, il faudra héberger
l'application (GitHub Pages ou Netlify, gratuit, HTTPS). Le code reste
identique : servi depuis une origine `https://`, il débloque l'enregistrement
direct dans le fichier via la File System Access API sur Chrome et Edge, et la
mise à jour devient automatique. **Rien dans l'architecture proposée ne ferme
cette porte** — c'est la même base de code, seule la couche de persistance change.

---

## 4. Mise en œuvre

### 4.1 Ordre de construction

1. **Le moteur de calcul et ses tests unitaires**, en TypeScript pur, sans
   interface. C'est le cœur de valeur et la partie où le classeur actuel échoue.
2. **Le modèle de données** et les fonctions `charger` / `enregistrer` (JSON,
   avec `schemaVersion`).
3. **La grille de saisie** avec navigation clavier et validation des maxima
   (défaut n° 15).
4. **Le rendu du bulletin et la feuille d'impression CSS**, en repartant de la
   mise en page recto‑verso existante.
5. **L'import du `.xltx` existant** via SheetJS — c'est ce qui décidera les
   collègues déjà équipés à basculer, et cela permet de reprendre l'année en
   cours sans ressaisie.
6. Le paramétrage des rubriques et des périodes (écran d'administration).

### 4.2 Checklist avant diffusion

- [ ] Les données de démonstration (« Dupont / Julien ») sont retirées.
- [ ] La date du 2ᵉ bulletin est bien 2025 et non 2024.
- [ ] Version et date de build visibles dans l'interface.
- [ ] Testé sur Windows/Chrome, Windows/Edge et macOS/Safari.
- [ ] Testé **hors ligne**, en coupant réellement le réseau.
- [ ] Impression testée sur imprimante physique, recto‑verso, en‑têtes décochés.
- [ ] Le fichier fait moins de 2 Mo.
- [ ] Aucune requête réseau au chargement (à vérifier dans l'onglet Réseau).
- [ ] Alerte de fermeture avec modifications non enregistrées vérifiée.
- [ ] Notice d'une page rédigée : ouvrir, enregistrer, imprimer, sauvegarder.

---

*Document de synthèse — analyse du modèle Excel de bulletins (v. 25/10/2024)
et spécification de la solution de remplacement.*
