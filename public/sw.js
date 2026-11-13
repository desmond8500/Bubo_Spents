/*
 * Service worker de la PWA Bubo Spents : l'application s'ouvre hors ligne.
 * - Pages : réseau d'abord, repli sur la version en cache (l'application reste ouvrable sans réseau).
 * - Fichiers statiques de l'application : cache d'abord, mis à jour en arrière-plan.
 * - Les appels à l'API (autre domaine) ne sont jamais interceptés ni mis en cache : les données restent
 *   dans le stockage local de l'application et sont synchronisées par l'application elle-même.
 * Pour forcer une mise à jour de tous les appareils, changez VERSION.
 */
const VERSION = 'bubo-spents-v1'
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
          const copy = response.clone()
          caches.open(VERSION).then((cache) => cache.put('/index.html', copy))
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
          if (response.ok && response.type === 'basic') {
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
