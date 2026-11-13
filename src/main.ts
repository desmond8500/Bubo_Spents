import { createApp } from 'vue'
import { Capacitor } from '@capacitor/core'
import { IonicVue } from '@ionic/vue'
import App from './App.vue'
import router from './router'
import { init, startAutoSync } from './services/store'
import { loadSettings } from './services/settings'

import '@ionic/vue/css/core.css'
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/display.css'
import '@ionic/vue/css/palettes/dark.system.css'
import './theme/variables.css'

const app = createApp(App).use(IonicVue).use(router)

Promise.all([router.isReady(), loadSettings(), init()]).then(() => {
  app.mount('#app')
  startAutoSync()
})

// PWA : service worker pour l'ouverture hors ligne (version web uniquement, pas dans l'application Android).
if (import.meta.env.PROD && !Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // sans service worker, l'application fonctionne normalement mais ne s'ouvre pas hors ligne
    })
  })
}
