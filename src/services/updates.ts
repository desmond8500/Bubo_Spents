import { toastController } from '@ionic/vue'

/**
 * Mise à jour automatique de la version web (PWA).
 *
 * Chaque push sur le dépôt déclenche un déploiement Netlify, dont le service worker porte un nouvel identifiant.
 * L'application vérifie s'il existe une nouvelle version au lancement, quand elle revient au premier plan et toutes
 * les 30 minutes. Dès qu'une nouvelle version est installée, la page se recharge d'elle-même, sauf si un formulaire
 * ou une boîte de dialogue est ouvert : elle attend alors qu'il soit fermé pour ne pas perdre la saisie.
 */

const CHECK_EVERY = 30 * 60 * 1000
const UPDATED_FLAG = 'bubo_spents_just_updated'

export const appVersion = __APP_VERSION__
export const appBuildDate = __APP_BUILD_DATE__

/** Une fenêtre (formulaire, alerte, menu) est ouverte : recharger maintenant ferait perdre ce qui est saisi. */
const overlayOpen = () =>
  !!document.querySelector(
    'ion-modal:not(.overlay-hidden), ion-alert:not(.overlay-hidden), ion-action-sheet:not(.overlay-hidden)',
  )

let reloading = false

function reloadWhenIdle() {
  if (reloading) return
  reloading = true
  const go = () => {
    try {
      sessionStorage.setItem(UPDATED_FLAG, '1')
    } catch {
      // stockage indisponible : on recharge quand même, simplement sans message
    }
    window.location.reload()
  }
  if (!overlayOpen()) return go()
  const wait = window.setInterval(() => {
    if (!overlayOpen()) {
      window.clearInterval(wait)
      go()
    }
  }, 1500)
}

export function setupAutoUpdate() {
  if (!('serviceWorker' in navigator)) return

  // Au tout premier passage, la prise de contrôle du service worker n'est pas une mise à jour : on ne recharge pas.
  const hadController = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) reloadWhenIdle()
  })

  window.addEventListener('load', async () => {
    try {
      // updateViaCache "none" : le navigateur redemande toujours sw.js au serveur, sans passer par son cache HTTP.
      const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      const check = () => registration.update().catch(() => {})
      window.setInterval(check, CHECK_EVERY)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      window.addEventListener('online', check)
    } catch {
      // sans service worker, l'application fonctionne normalement mais ne s'ouvre pas hors ligne
    }
  })
}

/**
 * Un ancien écran demande un fichier qui n'existe plus après un déploiement (les noms changent à chaque build) :
 * on recharge pour récupérer la nouvelle version au lieu d'afficher une page cassée.
 */
export function reloadOnStaleChunks() {
  window.addEventListener('vite:preloadError', (event: Event) => {
    event.preventDefault()
    reloadWhenIdle()
  })
}

/** Affiche « Application mise à jour » juste après un rechargement dû à une nouvelle version. */
export async function announceUpdate() {
  let updated = false
  try {
    updated = sessionStorage.getItem(UPDATED_FLAG) === '1'
    sessionStorage.removeItem(UPDATED_FLAG)
  } catch {
    return
  }
  if (!updated) return
  const toast = await toastController.create({
    message: `Application mise à jour (version ${appVersion})`,
    color: 'success',
    duration: 2500,
    position: 'bottom',
  })
  await toast.present()
}
