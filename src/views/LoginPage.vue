<template>
  <ion-page>
    <ion-content class="ion-padding">
      <div class="wrap">
        <div class="brand">
          <img class="logo" src="/logo.svg" alt="Bubo Spents" />
          <h1>Bubo Spents</h1>
          <p>Vos dépenses, sous contrôle.</p>
        </div>

        <ion-segment v-model="mode" class="ion-margin-bottom">
          <ion-segment-button value="login"><ion-label>Connexion</ion-label></ion-segment-button>
          <ion-segment-button value="register"><ion-label>Créer un compte</ion-label></ion-segment-button>
        </ion-segment>

        <ion-item v-if="mode === 'register'">
          <ion-input v-model="name" label="Nom" label-placement="stacked" autocomplete="name" />
        </ion-item>
        <ion-item>
          <ion-input
            v-model="email"
            label="Email"
            label-placement="stacked"
            type="email"
            autocomplete="email"
            autocapitalize="off"
          />
        </ion-item>
        <ion-item>
          <ion-input
            v-model="password"
            label="Mot de passe"
            label-placement="stacked"
            type="password"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            @keyup.enter="submit"
          />
        </ion-item>

        <ion-note v-if="error" color="danger" class="ion-padding-vertical" style="display: block">
          {{ error }}
        </ion-note>

        <ion-button expand="block" class="ion-margin-top" :disabled="!canSubmit" @click="submit">
          {{ mode === 'login' ? 'Se connecter' : 'Créer le compte' }}
        </ion-button>

        <ion-button fill="clear" size="small" expand="block" class="ion-margin-top" @click="showServer = !showServer">
          Serveur
        </ion-button>
        <ion-item v-if="showServer">
          <ion-input
            v-model="settings.apiUrl"
            label="URL de l'API"
            label-placement="stacked"
            type="url"
            :placeholder="DEFAULT_API_URL"
            autocapitalize="off"
          />
        </ion-item>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonContent, IonSegment, IonSegmentButton, IonLabel, IonItem, IonInput, IonButton, IonNote } from '@ionic/vue'
import { errorMessage, login, register } from '../services/auth'
import { DEFAULT_API_URL, settings } from '../services/settings'
import { sync } from '../services/store'

const router = useRouter()

const mode = ref<string>('login')
const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const showServer = ref(false)

const canSubmit = computed(
  () => !loading.value && !!email.value.trim() && !!password.value && (mode.value === 'login' || !!name.value.trim()),
)

async function submit() {
  if (!canSubmit.value) return
  error.value = ''
  loading.value = true
  try {
    if (mode.value === 'login') await login(email.value.trim(), password.value)
    else await register(name.value.trim(), email.value.trim(), password.value)
    password.value = ''
    await router.replace('/tabs/resume')
    sync() // récupère les données du compte en arrière-plan
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.wrap {
  max-width: 420px;
  margin: 0 auto;
  padding-top: 6vh;
}
.brand {
  text-align: center;
  margin-bottom: 28px;
}
.logo {
  display: block;
  width: 96px;
  height: 96px;
  margin: 0 auto 12px;
  border-radius: 26px;
  box-shadow: 0 10px 24px rgba(39, 37, 111, 0.3);
}
.brand h1 {
  margin: 0;
  font-weight: 800;
}
.brand p {
  margin: 4px 0 0;
  color: var(--ion-color-medium);
}
</style>
