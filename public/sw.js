/*
 * Service worker de la PWA Bubo Spents : l'application s'ouvre hors ligne.
 * - Pages : réseau d'abord, repli sur la version en cache (l'application reste ouvrable sans réseau).
 * - Fichiers statiques de l'application : cache d'abord, mis à jour en arrière-plan.
 * - Les appels à l'API (autre domaine) ne sont jamais interceptés ni mis en cache : les données restent
 *   dans le stockage local de l'application et sont synchronisées par l'application elle-même.
 * VERSION est remplacée à chaque build par l'identifiant du commit (voir vite.config.ts) : chaque déploiement
 * installe donc un nouveau service worker, vide les anciens caches et l'application se recharge d'elle-même.
 */
const VERSION = 'bubo-spents-dev'
const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/logo.svg',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Ne garde en cache qu'une vraie page : une page d'erreur (404, 500...) remplacerait l'application hors ligne.
          if (response.ok && response.type === 'basic') {
            const copy = response.clone()
            caches.open(VERSION).then((cache) => cache.put('/index.html', copy))
          }
          return response
        })
        .catch(() => caches.match('/index.html').then((cached) => cached || caches.match('/'))),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const refresh = fetch(request)
        .then((response) => {
          // Un fichier disparu après un déploiement est remplacé par index.html (règle _redirects) : ne pas le garder.
          const isHtml = (response.headers.get('content-type') || '').includes('text/html')
          if (response.ok && response.type === 'basic' && !isHtml) {
            const copy = response.clone()
            caches.open(VERSION).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached)

      return cached || refresh
    }),
  )
})
