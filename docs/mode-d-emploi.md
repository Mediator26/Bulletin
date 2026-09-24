# Bulletin scolaire — mode d'emploi

**En une phrase :** cet outil remplace le classeur Excel des bulletins. Vous encodez
les points de votre classe, il calcule les points de chaque matière et imprime les
bulletins.

## Pourquoi c'est mieux que le classeur

- **Plus de bulletin faux sans que rien ne le signale.** Dans l'ancien classeur, à
  partir du 33ᵉ élève, le bulletin reprenait en silence les points de l'élève
  précédent. Ici, chaque élève a ses propres résultats, quel que soit leur nombre.
- **Le calcul au prorata est fait pour vous.** Un test qu'un élève n'a pas présenté
  sort du calcul : il n'est jamais compté comme un zéro. Un 0 que vous encodez,
  lui, est un vrai 0. Une sous-rubrique sur laquelle vous n'avez donné aucun test
  sort du calcul de la même façon : si votre seul test de français est un « Écrire »
  sur 10 réussi 8/10, l'élève est coté **80/100** en français, et non 16/100.
- **Chaque bulletin rappelle les périodes précédentes.** Points, cotations
  TB · B · S · F · I et commentaires déjà remis figurent à côté de ceux de la
  période : un seul bulletin donne le parcours de l'année.
- **Rien à installer, aucun compte, aucune mise à jour à faire vous-même.**
- **Ça peut fonctionner sans internet** (voir ci-dessous).
- **Vos données ne partent nulle part.** Elles restent dans un fichier, sur le
  Drive de l'école : aucun envoi, aucun hébergeur, aucun sous-traitant.
- **Plus de limite de place.** Le nombre d'élèves, de tests et de périodes est
  libre ; passer à quatre périodes ne demande aucune reprise des bulletins.

## Ouvrir l'outil : deux façons

**Le plus simple — le site.** Ouvrez l'adresse <https://mediator26.github.io/Bulletin/>
dans Chrome ou Edge. C'est toujours la dernière version, il n'y a rien à télécharger.

**Sans internet — le fichier.** On peut aussi vous transmettre l'outil sous forme
d'**un fichier `.html`** (par mail ou sur le Drive). Enregistré sur votre
ordinateur, il s'ouvre d'un double-clic et fonctionne **sans aucune connexion** :
utile en cas de panne, ou sur un poste hors réseau.

## Deux mots à comprendre une bonne fois : `.html` et `.json`

|                     | Le fichier **`.html`** — l'outil                                        | Le fichier **`.json`** — vos données                                  |
| ------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Ce que c'est**    | Une page web enregistrée dans un fichier : les écrans, les boutons, les calculs. | Un fichier de texte : la liste des élèves, les tests, les points, les commentaires. |
| **Ce qu'il contient** | Aucune donnée d'élève.                                                  | Aucun programme.                                                       |
| **Comment l'ouvrir** | Double-clic : le navigateur s'ouvre, comme si vous visitiez le site.    | **Jamais par double-clic.** Depuis l'outil, par « Ouvrir une classe… ». |
| **Sa durée de vie** | Remplacé à chaque nouvelle version.                                      | Gardé toute l'année, et archivé ensuite.                               |

> **L'image à retenir :** le `.html` est la calculatrice, le `.json` est votre
> cahier. On remplace la calculatrice quand une meilleure sort ; on ne remplace
> jamais le cahier.

Sur le Drive, gardez-les dans deux dossiers séparés — c'est ce qui évite
d'écraser une classe avec l'application, ou l'inverse :

```
Drive partagé/
├── Application/   bulletin-scolaire.html    ← l'outil, remplacé aux mises à jour
└── Classes/       4e-A-2025-2026.json       ← une classe, jamais remplacée
                   5e-B-2025-2026.json
```

## Les gestes, dans l'ordre

1. **Créer ou ouvrir la classe.** Au premier lancement : « Créer la classe »
   (Classe, Année scolaire, École, Titulaire). Les fois suivantes :
   « Ouvrir une classe… », puis choisissez votre fichier `.json`.
2. **Ajouter les élèves.** Écran **Saisie**, panneau de gauche : Nom, Prénom,
   puis « Ajouter l'élève ». *(Oui, c'est bien dans « Saisie » et non dans
   « Réglages ».)* La liste se range toute seule par ordre alphabétique.
3. **Choisir la période.** Dans la barre du haut : « Période 1 », « 2 » ou « 3 »,
   et remplissez la « Date du bulletin » — c'est elle qui s'imprimera.
4. **Créer vos tests.** Chaque rubrique (Français › Lire, Mathématiques ›
   Géométrie…) a son propre encadré. Tapez le nom du test, son maximum, puis
   « Ajouter ».
5. **Encoder.** Une ligne par élève, une colonne par test. Tout se fait au clavier
   (voir ci-dessous).
6. **Imprimer.** Écran **Bulletins** : choisissez l'élève, rédigez le
   « Commentaire imprimé » et cochez les cotations **TB · B · S · F · I**, puis
   « Imprimer ce bulletin » — ou l'interrupteur « Toute la classe » pour les
   sortir tous d'un coup. Pour un PDF, choisissez « Enregistrer au format PDF »
   comme destination d'impression.
7. **Enregistrer.** Bouton « Enregistrer » en haut à droite, puis **replacez le
   fichier téléchargé sur le Drive, en écrasant l'ancien**.

Le troisième écran, **Réglages**, sert au reste : école, titulaire, année,
nombre de périodes, et le barème des rubriques.

## Le clavier

| Touche          | Effet                     |
| --------------- | ------------------------- |
| ↑ ↓ ← →         | se déplacer de case en case |
| **Entrée**      | élève suivant             |
| **Tab**         | test suivant              |
| **a**           | absent                    |
| **d**           | dispensé                  |
| **Suppr**       | effacer la case           |

**Une case vide n'est pas un zéro :** elle sort du calcul, un 0 y entre.
Les demi-points s'écrivent avec une virgule : `12,5`.

## Les quatre pièges à éviter

1. **« Enregistrer » télécharge un fichier, il n'écrit pas dans le Drive.** Votre
   travail n'est en sécurité qu'une fois ce fichier reposé sur le Drive. C'est le
   risque n° 1 de perte de données.
2. **Rien n'est récupéré automatiquement** si l'onglet se ferme ou si l'ordinateur
   s'éteint. Enregistrez souvent. Le repère : le bouton « Enregistrer » devient
   bleu, et l'indicateur passe à « Non enregistré », dès qu'il y a du travail en
   attente.
3. **À l'impression, décochez « En-têtes et pieds de page »** dans la boîte du
   navigateur, sinon l'adresse du fichier et la date s'impriment sur le bulletin.
4. **Une seule personne à la fois par classe.** Si deux collègues travaillent sur
   la même classe, le dernier qui enregistre écrase le premier, sans avertissement.

## Ce n'est pas une panne

- **La moyenne annuelle reste vide** tant qu'une seule période est encodée : une
  moyenne sur un seul bulletin n'est pas une moyenne.
- **Les colonnes des périodes précédentes n'apparaissent pas sur le bulletin de la
  période 1** : il n'y a encore rien à rappeler.
- **Un « — » signifie « aucun test présenté »**, pas zéro : la rubrique est écartée
  du calcul au lieu d'y compter pour rien.
- **Il n'y a plus de total général** (l'ancien « /340 ») : additionner un français
  sur 100 et un néerlandais sur 20 ne donnait pas un nombre lisible.
- **Pas de bouton « archiver ».** Pour garder une trace d'une fin de période,
  dupliquez simplement le fichier sur le Drive en le renommant, par exemple
  `4e-A-2025-2026_P2-cloture.json`.

En cas de souci, notez le numéro de version affiché en haut à gauche de l'écran
(par exemple `v0.1.0 · 2026-09-08`) : il permet de savoir quelle version vous
utilisez.
