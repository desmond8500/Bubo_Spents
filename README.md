# Bubo Spents

Application mobile et web (Ionic 8 + Vue 3) de suivi des dépenses quotidiennes.
Les données sont enregistrées localement (Capacitor Preferences) puis synchronisées avec l'API Laravel
du repo [Bubo_Server](https://github.com/desmond8500/Bubo_Server).

## Démarrage

```bash
npm install
cp .env.example .env   # optionnel : VITE_API_URL pour viser un autre serveur (par défaut https://buboserver.yonkou.info/api)
npm run dev
```

## Build Android en une commande

Android Studio n'est pas nécessaire. Il faut :

- un **JDK 21** (la commande `java` dans le PATH) ;
- le **SDK Android**, dont les [outils en ligne de commande](https://developer.android.com/studio#command-line-tools-only) suffisent,
  avec la variable `ANDROID_HOME` qui pointe vers son dossier.

```bash
# une seule fois, avec les outils en ligne de commande installés
sdkmanager --sdk_root="$ANDROID_HOME" "platform-tools" "platforms;android-35" "build-tools;35.0.0"
sdkmanager --sdk_root="$ANDROID_HOME" --licenses
```

Si Gradle réclame une autre version de plateforme, installez celle qu'il indique avec `sdkmanager`.

```bash
npm run apk       # installe si besoin, build, crée le projet Android, produit l'APK de debug
npm run android   # même préparation, puis ouvre le projet dans Android Studio
```

L'APK est écrit dans `android/app/build/outputs/apk/debug/app-debug.apk` (le dossier `android/` est généré
localement et ignoré par git). Autres scripts : `npm run build` (vérification des types + build web),
`npm run build:web` (build web seul), `npm run typecheck`.

## Logo, icône et splash screen

Le logo (hibou indigo et ambre, une pièce sur le ventre) est dans `public/logo.svg` (web, écran de connexion,
favicon). L'icône et les écrans de démarrage sont dans `assets/` :

| Fichier | Rôle |
| --- | --- |
| `icon-only.png` | icône plein cadre (1024 px) |
| `icon-foreground.png`, `icon-background.png` | icône adaptative Android (le hibou reste dans la zone sûre) |
| `splash.png`, `splash-dark.png` | écran de démarrage clair et sombre (2732 px) |

`npm run apk` les convertit automatiquement aux tailles Android (`npm run assets` pour le faire seul).
Les sources vectorielles sont dans `assets/svg/`.

## Synchronisation

Chaque ligne créée hors ligne reçoit un `uuid` et `synced: false`. Le bouton de synchronisation envoie
les lignes en attente à `POST /api/sync`, puis remplace les données locales par celles du serveur.

Voir [todo.md](todo.md) pour l'avancement.

Une synchronisation automatique part toutes les 8 h tant que l'application est ouverte (désactivable dans Paramètres). Application fermée, elle ne peut pas tourner : le rattrapage se fait à l'ouverture suivante.

## Budget

Le budget est commun. N'importe qui peut le créditer (Résumé > Budget). Solde du mois = report du mois précédent + crédits − dépenses **générales** de tous les utilisateurs. Les dépenses personnelles n'y entrent pas.

## Application web (PWA)

`npm run build` produit une PWA installable (manifest, icônes, service worker `public/sw.js`). Le service worker n'est enregistré que sur le web, jamais dans l'application Android. Les appels à l'API ne sont jamais mis en cache.

## Importer des données (CSV)

Paramètres > Importer. Fichier CSV avec ligne d'en-tête, séparateur `;`, `,` ou tabulation, UTF-8 ou Windows-1252 ; 2 Mo et 2000 lignes maximum.

| Type | Colonnes |
| --- | --- |
| Marques, fournisseurs | `nom`, `description`, `logo` (adresse http/https) |
| Articles | `nom`, `prix`, `reference`, `unite` (piece, kg, g, l, ml, m, paquet, carton, sac, boite), `poids`, `description`, `caracteristiques`, `categorie`, `marque`, `fournisseur`, `images` (adresses http/https séparées par `\|`, 5 maximum) |

Les lignes déjà présentes (même nom, ou même nom + marque + fournisseur pour un article) sont ignorées : réimporter un fichier ne crée pas de doublons. Les marques, fournisseurs et catégories inconnus cités par des articles sont créés. Les lignes invalides sont refusées avec leur numéro de ligne. L'export correspondant est fourni par l'API serveur (`/api/export/{marques|fournisseurs|articles}?format=csv|json`).

## Statistiques

Résumé > icône graphique : total, nombre, moyenne, répartition par catégorie et plus gros postes, par mois ou par année (barres mois par mois), pour les dépenses générales (tous) ou personnelles (les vôtres).

## Dépense personnelle depuis un article

À la création, « Choisir un article existant » préremplit la désignation, la catégorie de l'article et le montant (prix × quantité).
