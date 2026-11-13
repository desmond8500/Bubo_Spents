<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/settings" text="" />
        </ion-buttons>
        <ion-title>Importer</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-segment :value="type" @ion-change="onType">
        <ion-segment-button value="articles"><ion-label>Articles</ion-label></ion-segment-button>
        <ion-segment-button value="marques"><ion-label>Marques</ion-label></ion-segment-button>
        <ion-segment-button value="fournisseurs"><ion-label>Fournisseurs</ion-label></ion-segment-button>
      </ion-segment>

      <ion-note class="columns">
        Fichier CSV (séparateur « ; » ou « , »), avec une ligne d'en-tête. Colonnes :<br />
        <strong>{{ IMPORT_COLUMNS[type] }}</strong>
        <template v-if="type === 'articles'"><br />Les marques et fournisseurs inconnus sont créés automatiquement.</template>
        <br />Les lignes déjà présentes sont ignorées : vous pouvez réimporter un fichier sans créer de doublons.
      </ion-note>

      <ion-button expand="block" fill="outline" :disabled="busy" @click="input?.click()">
        <ion-icon slot="start" :icon="documentOutline" />
        {{ fileName || 'Choisir un fichier CSV' }}
      </ion-button>
      <input ref="input" type="file" accept=".csv,text/csv,text/plain" hidden @change="onFile" />

      <ion-note v-if="fileName && rowCount !== null" class="ion-margin-vertical" style="display: block">
        {{ rowCount }} ligne(s) détectée(s).
      </ion-note>

      <ion-button expand="block" :disabled="!buffer || busy || !rowCount" @click="run">
        <ion-icon slot="start" :icon="cloudUploadOutline" />
        Importer
      </ion-button>

      <ion-note v-if="error" color="danger" class="ion-padding-vertical" style="display: block">{{ error }}</ion-note>

      <ion-card v-if="result">
        <ion-card-header>
          <ion-card-title>{{ result.created }} ajouté(s)</ion-card-title>
          <ion-card-subtitle>
            {{ result.skipped }} déjà présent(s) ignoré(s) · {{ result.errors.length }} ligne(s) refusée(s)
          </ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <p v-if="result.createdMarques || result.createdFournisseurs">
            Créés au passage : {{ result.createdMarques }} marque(s), {{ result.createdFournisseurs }} fournisseur(s).
          </p>
          <ul v-if="result.errors.length" class="problems">
            <li v-for="e in result.errors.slice(0, 10)" :key="e">{{ e }}</li>
            <li v-if="result.errors.length > 10">… et {{ result.errors.length - 10 }} autre(s)</li>
          </ul>
          <ul v-if="result.warnings.length" class="problems warn">
            <li v-for="w in result.warnings.slice(0, 5)" :key="w">{{ w }}</li>
            <li v-if="result.warnings.length > 5">… et {{ result.warnings.length - 5 }} autre(s)</li>
          </ul>
          <ion-button v-if="result.created" size="small" :disabled="state.syncing" @click="sync">
            <ion-icon slot="start" :icon="syncOutline" />
            Synchroniser maintenant
          </ion-button>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonSegment,
  IonSegmentButton, IonLabel, IonNote, IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle,
  IonCardSubtitle, IonCardContent,
} from '@ionic/vue'
import { cloudUploadOutline, documentOutline, syncOutline } from 'ionicons/icons'
import {
  countRecords, IMPORT_COLUMNS, importCsv, MAX_FILE_BYTES, type ImportSummary, type ImportType,
} from '../services/importer'
import { state, sync } from '../services/store'

const type = ref<ImportType>('articles')
const input = ref<HTMLInputElement | null>(null)
const fileName = ref('')
const buffer = ref<ArrayBuffer | null>(null)
const rowCount = ref<number | null>(null)
const busy = ref(false)
const error = ref('')
const result = ref<ImportSummary | null>(null)

function onType(ev: CustomEvent) {
  type.value = ev.detail.value as ImportType
  result.value = null
  error.value = ''
}

async function onFile(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''

  result.value = null
  error.value = ''
  buffer.value = null
  rowCount.value = null
  fileName.value = ''
  if (!file) return

  if (file.size > MAX_FILE_BYTES) {
    error.value = 'Fichier trop volumineux (2 Mo maximum).'
    return
  }

  fileName.value = file.name
  buffer.value = await file.arrayBuffer()
  rowCount.value = countRecords(buffer.value)
  if (!rowCount.value) error.value = "Le fichier est vide ou ne contient que la ligne d'en-tête."
}

async function run() {
  if (!buffer.value) return
  busy.value = true
  error.value = ''
  try {
    result.value = await importCsv(type.value, buffer.value)
    buffer.value = null
    rowCount.value = null
    fileName.value = ''
  } catch (e: any) {
    error.value = e?.message ?? 'Import impossible.'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.columns {
  display: block;
  margin: 16px 0;
  line-height: 1.5;
}
.problems {
  margin: 8px 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--ion-color-danger);
}
.problems.warn {
  color: var(--ion-color-medium);
}
</style>
