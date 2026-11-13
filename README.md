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

## Synchronisation

Chaque ligne créée hors ligne reçoit un `uuid` et `synced: false`. Le bouton de synchronisation envoie
les lignes en attente à `POST /api/sync`, puis remplace les données locales par celles du serveur.

Voir [todo.md](todo.md) pour l'avancement.
