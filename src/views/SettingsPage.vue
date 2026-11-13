<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/resume" text="" />
        </ion-buttons>
        <ion-title>Paramètres</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list inset>
        <ion-list-header><ion-label>Serveur</ion-label></ion-list-header>
        <ion-item>
          <ion-input
            v-model="settings.apiUrl"
            label="URL de l'API"
            label-placement="stacked"
            type="url"
            :placeholder="DEFAULT_API_URL"
            autocapitalize="off"
          />
        </ion-item>
        <ion-item button :detail="false" :disabled="testing" @click="testConnection">
          <ion-icon slot="start" :icon="wifiOutline" />
          <ion-label>Tester la connexion</ion-label>
        </ion-item>
      </ion-list>

      <ion-note class="ion-padding-horizontal" style="display: block">
        Sur un téléphone, « localhost » désigne le téléphone lui-même : saisissez l'adresse du serveur
        (par exemple http://192.168.1.10:8000/api).
      </ion-note>

      <ion-list inset>
        <ion-list-header><ion-label>Affichage</ion-label></ion-list-header>
        <ion-item>
          <ion-input v-model="settings.currency" label="Devise" label-placement="stacked" placeholder="FCFA" />
        </ion-item>
      </ion-list>

      <ion-list inset>
        <ion-list-header><ion-label>Synchronisation</ion-label></ion-list-header>
        <ion-item>
          <ion-label>
            <h3>Dernière synchronisation</h3>
            <p>{{ lastSync }}</p>
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-label>
            <h3>En attente d'envoi</h3>
            <p>{{ pendingCount() }} élément(s)</p>
          </ion-label>
        </ion-item>
        <ion-item v-if="state.error">
          <ion-label color="danger" class="ion-text-wrap">{{ state.error }}</ion-label>
        </ion-item>
        <ion-item button :detail="false" :disabled="state.syncing" @click="sync">
          <ion-icon slot="start" :icon="syncOutline" />
          <ion-label>Synchroniser maintenant</ion-label>
        </ion-item>
      </ion-list>

      <ion-list inset>
        <ion-list-header><ion-label>Données</ion-label></ion-list-header>
        <ion-item button :detail="false" @click="confirmClear">
          <ion-icon slot="start" :icon="trashOutline" color="danger" />
          <ion-label color="danger">Effacer les données locales</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonList,
  IonListHeader, IonItem, IonLabel, IonInput, IonIcon, IonNote, alertController, toastController,
} from '@ionic/vue'
import { syncOutline, trashOutline, wifiOutline } from 'ionicons/icons'
import { api } from '../services/api'
import { DEFAULT_API_URL, settings } from '../services/settings'
import { clearLocal, pendingCount, state, sync } from '../services/store'

const testing = ref(false)

const lastSync = computed(() =>
  state.lastSync ? new Date(state.lastSync).toLocaleString('fr-FR') : 'Jamais',
)

async function toast(message: string, color: 'success' | 'danger') {
  const t = await toastController.create({ message, color, duration: 2500, position: 'bottom' })
  await t.present()
}

async function testConnection() {
  testing.value = true
  try {
    await api.get('/marques')
    await toast('Connexion réussie', 'success')
  } catch (e: any) {
    await toast(e?.response ? `Le serveur a répondu : erreur ${e.response.status}` : 'Serveur injoignable', 'danger')
  } finally {
    testing.value = false
  }
}

async function confirmClear() {
  const pending = pendingCount()
  const alert = await alertController.create({
    header: 'Effacer les données locales ?',
    message:
      (pending > 0 ? `${pending} élément(s) non synchronisé(s) seront perdus. ` : '') +
      'Les données déjà synchronisées pourront être récupérées depuis le serveur.',
    buttons: [
      { text: 'Annuler', role: 'cancel' },
      { text: 'Effacer', role: 'destructive', handler: () => clearLocal() },
    ],
  })
  await alert.present()
}
</script>
