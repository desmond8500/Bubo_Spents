<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/settings" text="" />
        </ion-buttons>
        <ion-title>Journal d'activité</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="loading" @click="load(true)">
            <ion-icon slot="icon-only" :icon="refreshOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-note v-if="error" color="danger" class="ion-padding ion-text-center" style="display: block">
        {{ error }}
      </ion-note>

      <ion-list v-if="entries.length" inset>
        <ion-item v-for="e in entries" :key="e.id">
          <ion-icon slot="start" :icon="iconOf(e.action)" :color="colorOf(e.action)" />
          <ion-label class="ion-text-wrap">
            <h3>{{ actionLabel(e.action) }}<template v-if="e.entity"> · {{ entityLabel(e.entity) }}</template></h3>
            <p v-if="e.libelle">{{ e.libelle }}</p>
            <p>{{ who(e) }} · {{ when(e.created_at) }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
      <div v-else-if="!loading" class="empty">
        <ion-icon :icon="moonOutline" />
        <p>Aucune activité enregistrée.</p>
      </div>

      <ion-button v-if="page < lastPage" fill="clear" expand="block" :disabled="loading" @click="load()">
        Charger plus
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonBackButton, IonContent, IonList,
  IonItem, IonLabel, IonIcon, IonNote, onIonViewWillEnter,
} from '@ionic/vue'
import {
  addCircleOutline, alertCircleOutline, createOutline, downloadOutline, logInOutline, logOutOutline, moonOutline,
  personAddOutline, refreshOutline, shieldCheckmarkOutline, trashOutline,
} from 'ionicons/icons'
import { api } from '../services/api'
import { errorMessage } from '../services/auth'

interface Entree {
  id: number
  action: string
  entity: string | null
  libelle: string | null
  created_at: string
  user: { id: number; name: string } | null
  details: { email?: string } | null
}

const ACTIONS: Record<string, { label: string; icon: string; color: string }> = {
  create: { label: 'Création', icon: addCircleOutline, color: 'success' },
  update: { label: 'Modification', icon: createOutline, color: 'primary' },
  delete: { label: 'Suppression', icon: trashOutline, color: 'danger' },
  login: { label: 'Connexion', icon: logInOutline, color: 'medium' },
  login_echec: { label: 'Échec de connexion', icon: alertCircleOutline, color: 'danger' },
  logout: { label: 'Déconnexion', icon: logOutOutline, color: 'medium' },
  register: { label: 'Inscription', icon: personAddOutline, color: 'success' },
  role: { label: 'Changement de rôle', icon: shieldCheckmarkOutline, color: 'secondary' },
  export: { label: 'Export', icon: downloadOutline, color: 'medium' },
}

const ENTITIES: Record<string, string> = {
  budgets: 'Crédit du budget',
  categories: 'Catégorie',
  marques: 'Marque',
  fournisseurs: 'Fournisseur',
  articles: 'Article',
  depenses: 'Dépense générale',
  depenses_personnelles: 'Dépense perso',
  revenus: 'Revenu',
  emprunts: 'Emprunt',
  users: 'Utilisateur',
}

const actionLabel = (a: string) => ACTIONS[a]?.label ?? a
const iconOf = (a: string) => ACTIONS[a]?.icon ?? createOutline
const colorOf = (a: string) => ACTIONS[a]?.color ?? 'medium'
const entityLabel = (e: string) => ENTITIES[e] ?? e
const who = (e: Entree) => e.user?.name ?? e.details?.email ?? 'Inconnu'
const when = (iso: string) => new Date(iso).toLocaleString('fr-FR')

const entries = ref<Entree[]>([])
const page = ref(0)
const lastPage = ref(1)
const loading = ref(false)
const error = ref('')

async function load(reset = false) {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const next = reset ? 1 : page.value + 1
    const { data } = await api.get('/journal', { params: { page: next } })
    entries.value = reset ? data.data : [...entries.value, ...data.data]
    page.value = data.current_page
    lastPage.value = data.last_page
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

onIonViewWillEnter(() => load(true))
</script>

<style scoped>
.empty {
  text-align: center;
  padding: 72px 24px;
  color: var(--ion-color-medium);
}
.empty ion-icon {
  font-size: 56px;
  opacity: 0.5;
}
</style>
