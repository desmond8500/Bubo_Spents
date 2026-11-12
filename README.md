# Bubo Spents

Application mobile et web (Ionic 8 + Vue 3) de suivi des dépenses quotidiennes.
Les données sont enregistrées localement (Capacitor Preferences) puis synchronisées avec l'API Laravel
du repo [Bubo_Server](https://github.com/desmond8500/Bubo_Server).

## Démarrage

```bash
npm install
cp .env.example .env   # adapter VITE_API_URL
npm run dev
```

## Mobile (Capacitor)

```bash
npm run build
npx cap add android   # ou ios
npx cap sync
```

## Synchronisation

Chaque ligne créée hors ligne reçoit un `uuid` et `synced: false`. Le bouton de synchronisation envoie
les lignes en attente à `POST /api/sync`, puis remplace les données locales par celles du serveur.

Voir [todo.md](todo.md) pour l'avancement.
