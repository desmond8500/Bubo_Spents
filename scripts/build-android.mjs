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
