<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/settings" text="" />
        </ion-buttons>
        <ion-title>Utilisateurs et rôles</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-note v-if="error" color="danger" class="ion-padding ion-text-center" style="display: block">
        {{ error }}
      </ion-note>

      <ion-list inset>
        <ion-item v-for="u in users" :key="u.id">
          <ion-label>
            <h3>{{ u.name }}</h3>
            <p>{{ u.email }}</p>
          </ion-label>
          <ion-select
            slot="end"
            aria-label="Rôle"
            interface="popover"
            :value="u.role"
            @ion-change="(ev: CustomEvent) => changeRole(u, ev.detail.value)"
          >
            <ion-select-option v-for="r in roles" :key="r" :value="r">{{ roleLabel[r] }}</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>

      <ion-note class="ion-padding-horizontal" style="display: block">
        Administrateur : gère tout. Membre : crée et gère ses données communes. Lecteur : consulte les données
        communes seulement. Chacun garde l'accès à ses données privées.
      </ion-note>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonList, IonItem,
  IonLabel, IonNote, IonSelect, IonSelectOption, onIonViewWillEnter,
} from '@ionic/vue'
import { api } from '../services/api'
import { errorMessage } from '../services/auth'
import { roleLabel, type Role } from '../services/session'

interface Utilisateur {
  id: number
  name: string
  email: string
  role: Role
}

const roles: Role[] = ['admin', 'membre', 'lecteur']
const users = ref<Utilisateur[]>([])
const error = ref('')

async function load() {
  error.value = ''
  try {
    const { data } = await api.get<Utilisateur[]>('/users')
    users.value = data
  } catch (e) {
    error.value = errorMessage(e)
  }
}

async function changeRole(user: Utilisateur, role: Role) {
  if (role === user.role) return
  error.value = ''
  try {
    const { data } = await api.patch<Utilisateur>(`/users/${user.id}`, { role })
    user.role = data.role
  } catch (e) {
    error.value = errorMessage(e)
    await load() // revient à l'état réel du serveur
  }
}

onIonViewWillEnter(load)
</script>
