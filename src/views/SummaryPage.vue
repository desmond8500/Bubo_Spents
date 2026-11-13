<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Résumé</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/settings">
            <ion-icon slot="icon-only" :icon="settingsOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="month">
        <ion-button fill="clear" @click="shift(-1)">
          <ion-icon slot="icon-only" :icon="chevronBack" />
        </ion-button>
        <strong class="label">{{ monthLabel }}</strong>
        <ion-button fill="clear" :disabled="isCurrent" @click="shift(1)">
          <ion-icon slot="icon-only" :icon="chevronForward" />
        </ion-button>
      </div>

      <ion-card>
        <ion-card-header>
          <ion-card-subtitle>Solde du mois (revenus − dépenses)</ion-card-subtitle>
          <ion-card-title :color="solde < 0 ? 'danger' : 'success'">{{ fmt(solde) }}</ion-card-title>
        </ion-card-header>
      </ion-card>

      <ion-list inset>
        <ion-item>
          <ion-label>Revenus</ion-label>
          <ion-note slot="end" color="success">{{ fmt(totals.revenus) }}</ion-note>
        </ion-item>
        <ion-item>
          <ion-label>Dépenses</ion-label>
          <ion-note slot="end" color="danger">{{ fmt(totals.depenses) }}</ion-note>
        </ion-item>
        <ion-item>
          <ion-label>Emprunts</ion-label>
          <ion-note slot="end">{{ fmt(totals.emprunts) }}</ion-note>
        </ion-item>
      </ion-list>

      <ion-list v-if="byArticle.length" inset>
        <ion-list-header>
          <ion-label>Dépenses par article</ion-label>
        </ion-list-header>
        <ion-item v-for="a in byArticle" :key="a.key">
          <ion-label>
            <h3>{{ a.name }}</h3>
            <ion-progress-bar :value="a.total / byArticle[0].total" color="danger" />
          </ion-label>
          <ion-note slot="end">{{ fmt(a.total) }}</ion-note>
        </ion-item>
      </ion-list>
      <ion-note v-else class="ion-padding ion-text-center" style="display: block">
        Aucune dépense ce mois-ci.
      </ion-note>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon, IonCard,
  IonCardHeader, IonCardSubtitle, IonCardTitle, IonList, IonListHeader, IonItem, IonLabel, IonNote,
  IonProgressBar,
} from '@ionic/vue'
import { chevronBack, chevronForward, settingsOutline } from 'ionicons/icons'
import { fmt, type EntityKey } from '../services/entities'
import { lookup, visible } from '../services/store'

const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const currentKey = keyOf(new Date())

const month = ref(currentKey) // "AAAA-MM"
const isCurrent = computed(() => month.value === currentKey)

const monthLabel = computed(() => {
  const [y, m] = month.value.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
})

function shift(delta: number) {
  const [y, m] = month.value.split('-').map(Number)
  month.value = keyOf(new Date(y, m - 1 + delta, 1))
}

const inMonth = (key: EntityKey) => visible(key).filter((r) => String(r.date ?? '').startsWith(month.value))
const sum = (rows: Array<{ montant?: unknown }>) => rows.reduce((s, r) => s + (Number(r.montant) || 0), 0)

const totals = computed(() => ({
  revenus: sum(inMonth('revenus')),
  depenses: sum(inMonth('depenses')),
  emprunts: sum(inMonth('emprunts')),
}))

const solde = computed(() => totals.value.revenus - totals.value.depenses)

const byArticle = computed(() => {
  const groups = new Map<string, { key: string; name: string; total: number }>()
  for (const d of inMonth('depenses')) {
    const g = groups.get(d.article_uuid) ?? {
      key: d.article_uuid,
      name: lookup('articles', d.article_uuid)?.nom ?? 'Article supprimé',
      total: 0,
    }
    g.total += Number(d.montant) || 0
    groups.set(d.article_uuid, g)
  }
  return [...groups.values()].sort((a, b) => b.total - a.total).slice(0, 8)
})
</script>

<style scoped>
.month {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
}
.label {
  text-transform: capitalize;
}
</style>
