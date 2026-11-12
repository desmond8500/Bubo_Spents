<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ def.title }}</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="state.syncing" @click="sync">
            <ion-icon slot="icon-only" :icon="syncOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-note v-if="state.error" color="danger" class="ion-padding ion-text-center" style="display: block">
        {{ state.error }}
      </ion-note>
      <ion-note v-else-if="pendingCount() > 0" class="ion-padding ion-text-center" style="display: block">
        {{ pendingCount() }} élément(s) en attente de synchronisation
      </ion-note>

      <ion-list>
        <ion-item v-for="row in rows" :key="row.uuid">
          <ion-label>
            <h2>{{ row.nom }}</h2>
            <p v-if="entity === 'articles'">
              {{ row.prix }} · {{ row.depense_le }}
              <template v-if="row.marque_uuid"> · {{ labelOf('marques', row.marque_uuid) }}</template>
              <template v-if="row.fournisseur_uuid"> · {{ labelOf('fournisseurs', row.fournisseur_uuid) }}</template>
            </p>
            <p v-else-if="row.contact">{{ row.contact }}</p>
          </ion-label>
          <ion-icon slot="end" :icon="row.synced ? cloudDoneOutline : cloudOfflineOutline" />
        </ion-item>
      </ion-list>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button @click="openForm">
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
      </ion-fab>

      <ion-modal :is-open="isOpen" @didDismiss="isOpen = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>Nouveau</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="isOpen = false">Fermer</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-item v-for="f in def.fields" :key="f.key">
            <ion-select
              v-if="f.type === 'ref'"
              v-model="form[f.key]"
              :label="f.label"
              label-placement="stacked"
              interface="popover"
            >
              <ion-select-option v-for="o in state[f.ref!]" :key="o.uuid" :value="o.uuid">
                {{ o.nom }}
              </ion-select-option>
            </ion-select>
            <ion-input
              v-else
              v-model="form[f.key]"
              :label="f.label"
              label-placement="stacked"
              :type="f.type"
              :inputmode="f.type === 'number' ? 'decimal' : undefined"
            />
          </ion-item>
          <ion-button expand="block" class="ion-margin-top" :disabled="!valid" @click="save">
            Enregistrer
          </ion-button>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonList, IonItem,
  IonLabel, IonIcon, IonNote, IonFab, IonFabButton, IonModal, IonInput, IonSelect, IonSelectOption,
} from '@ionic/vue'
import { addOutline, syncOutline, cloudDoneOutline, cloudOfflineOutline } from 'ionicons/icons'
import { entityByKey, type EntityKey } from '../services/entities'
import { state, add, sync, pendingCount } from '../services/store'

const props = defineProps<{ entity: EntityKey }>()

const def = computed(() => entityByKey(props.entity))
const rows = computed(() => state[props.entity])

const isOpen = ref(false)
const form = reactive<Record<string, any>>({})

const today = () => new Date().toISOString().slice(0, 10)

function openForm() {
  for (const k of Object.keys(form)) delete form[k]
  for (const f of def.value.fields) form[f.key] = f.type === 'date' ? today() : ''
  isOpen.value = true
}

const valid = computed(() => def.value.fields.every((f) => !f.required || String(form[f.key] ?? '').trim() !== ''))

async function save() {
  const data: Record<string, any> = {}
  for (const f of def.value.fields) {
    const v = form[f.key]
    data[f.key] = f.type === 'number' ? Number(String(v).replace(',', '.')) : v === '' ? null : v
  }
  await add(props.entity, data)
  isOpen.value = false
}

const labelOf = (key: EntityKey, uuid: string) => state[key].find((r) => r.uuid === uuid)?.nom ?? ''
</script>
