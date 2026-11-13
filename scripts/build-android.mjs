// Build Android en une commande :  npm run apk      -> APK de debug
//                                  npm run android  -> prépare le projet et ouvre Android Studio
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const openStudio = process.argv.includes('--open')

function run(command, options = {}) {
  console.log(`\n> ${command}`)
  const result = spawnSync(command, { stdio: 'inherit', shell: true, ...options })
  if (result.status !== 0) {
    console.error(`\nÉchec de la commande : ${command}`)
    return result.status ?? 1
  }
  return 0
}

function step(command, options) {
  const code = run(command, options)
  if (code !== 0) process.exit(code)
}

/** Vérifie JDK et SDK Android avant de commencer, pour échouer tout de suite avec un message clair. */
function preflight() {
  const problems = []

  const java = spawnSync('java -version', { shell: true, encoding: 'utf8' })
  const major = Number(/version "(?:1\.)?(\d+)/.exec(`${java.stdout ?? ''}${java.stderr ?? ''}`)?.[1])
  if (java.status !== 0 || !major) problems.push('Java introuvable : installez un JDK 21 (la commande java doit être dans le PATH).')
  else if (major < 21) problems.push(`Java ${major} détecté : Capacitor 7 demande un JDK 21 ou plus récent.`)

  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
  if (!sdk || !existsSync(sdk)) problems.push('SDK Android introuvable : définissez ANDROID_HOME vers le dossier du SDK (voir README).')

  if (problems.length) {
    console.error(`\n${problems.map((p) => `- ${p}`).join('\n')}`)
    process.exit(1)
  }
}

if (!openStudio) preflight()

if (!existsSync('node_modules/@capacitor/android')) step('npm install')

step('npm run build:web')
if (!existsSync('android')) step('npx cap add android')
step('npx cap sync android')

if (openStudio) {
  step('npx cap open android')
  process.exit(0)
}

const gradle = process.platform === 'win32' ? 'gradlew.bat' : './gradlew'
if (run(`${gradle} assembleDebug`, { cwd: 'android' }) !== 0) {
  console.error('\nVérifiez que le JDK 21 et le SDK Android sont installés (variable ANDROID_HOME définie).')
  process.exit(1)
}

console.log('\nAPK prêt : android/app/build/outputs/apk/debug/app-debug.apk')
