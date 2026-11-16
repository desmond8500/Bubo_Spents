import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * Identifiant unique de chaque build : le commit déployé sur Netlify (COMMIT_REF), sinon l'heure du build.
 * Il change à chaque push, ce qui fait installer un nouveau service worker sur tous les appareils.
 */
const BUILD_ID = (process.env.COMMIT_REF ?? '').slice(0, 7) || Date.now().toString(36)
const BUILD_DATE = new Date().toISOString()

/** Écrit l'identifiant du build dans dist/sw.js (le fichier source garde « dev »). */
function stampServiceWorker(): Plugin {
  let outDir = 'dist'
  return {
    name: 'bubo-stamp-sw',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const file = resolve(outDir, 'sw.js')
      if (!existsSync(file)) return
      const source = readFileSync(file, 'utf8')
      const stamped = source.replace(/const VERSION = '[^']*'/, `const VERSION = 'bubo-spents-${BUILD_ID}'`)
      if (stamped === source) throw new Error('sw.js : ligne « const VERSION = ... » introuvable')
      writeFileSync(file, stamped)
    },
  }
}

export default defineConfig({
  plugins: [vue(), stampServiceWorker()],
  define: {
    __APP_VERSION__: JSON.stringify(BUILD_ID),
    __APP_BUILD_DATE__: JSON.stringify(BUILD_DATE),
  },
})
