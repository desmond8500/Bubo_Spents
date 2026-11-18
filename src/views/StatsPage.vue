<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/resume" text="" />
        </ion-buttons>
        <ion-title>Statistiques</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment :value="scope" @ion-change="onScope">
          <ion-segment-button value="depenses"><ion-label>Générales</ion-label></ion-segment-button>
          <ion-segment-button value="depenses_personnelles"><ion-label>Personnelles</ion-label></ion-segment-button>
        </ion-segment>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment :value="mode" @ion-change="onMode">
          <ion-segment-button value="month"><ion-label>Par mois</ion-label></ion-segment-button>
          <ion-segment-button value="year"><ion-label>Par année</ion-label></ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="period">
        <ion-button fill="clear" aria-label="Période précédente" @click="shift(-1)">
          <ion-icon slot="icon-only" :icon="chevronBack" />
        </ion-button>
        <strong>{{ periodLabel }}</strong>
        <ion-button fill="clear" aria-label="Période suivante" :disabled="isCurrent" @click="shift(1)">
          <ion-icon slot="icon-only" :icon="chevronForward" />
        </ion-button>
      </div>

      <ion-card>
        <ion-card-header>
          <ion-card-subtitle>
            {{ scope === 'depenses' ? 'Dépenses générales (tous les utilisateurs)' : 'Vos dépenses personnelles' }}
          </ion-card-subtitle>
          <ion-card-title>{{ fmt(stats.total) }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="kpis">
            <div><span>Dépenses</span><strong>{{ stats.count }}</strong></div>
            <div><span>Moyenne</span><strong>{{ fmt(stats.average) }}</strong></div>
            <div v-if="mode === 'year'"><span>Par mois</span><strong>{{ fmt(Math.round(stats.total / 12)) }}</strong></div>
          </div>
        </ion-card-content>
      </ion-card>

      <div v-if="!stats.count" class="empty">
        <ion-icon :icon="moonOutline" />
        <p>Aucune dépense sur cette période.</p>
      </div>

      <template v-else>
        <ion-card v-if="mode === 'year'">
          <ion-card-header><ion-card-title class="small">Mois par mois</ion-card-title></ion-card-header>
          <ion-card-content>
            <div class="months" role="img" aria-label="Dépenses de chaque mois">
              <div v-for="(t, i) in stats.byMonth" :key="i" class="month">
                <div class="bar-wrap">
                  <div class="bar" :style="{ height: monthHeight(t) + '%' }" :title="fmt(t)" />
                </div>
                <small>{{ MONTHS[i] }}</small>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <ion-list inset>
          <ion-list-header><ion-label>Par catégorie</ion-label></ion-list-header>
          <ion-item v-for="c in stats.byCategory" :key="c.uuid || 'none'" lines="none" class="cat">
            <ion-label>
              <div class="cat-line">
                <span>{{ categoryName(c.uuid) }}</span>
                <strong>{{ fmt(c.total) }} <small>{{ c.part }} %</small></strong>
              </div>
              <ion-progress-bar :value="c.part / 100" :color="scope === 'depenses' ? 'primary' : 'secondary'" />
            </ion-label>
          </ion-item>
        </ion-list>

        <ion-list inset>
          <ion-list-header><ion-label>Ce qui coûte le plus</ion-label></ion-list-header>
          <ion-item v-for="t in stats.top" :key="t.label">
            <ion-label>{{ t.label }}</ion-label>
            <ion-note slot="end" class="total">{{ fmt(t.total) }}</ion-note>
          </ion-item>
        </ion-list>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonContent, IonIcon,
  IonSegment, IonSegmentButton, IonLabel, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle,
  IonCardContent, IonList, IonListHeader, IonItem, IonNote, IonProgressBar,
} from '@ionic/vue'
import { chevronBack, chevronForward, moonOutline } from 'ionicons/icons'
import { entityByKey, fmt } from '../services/entities'
import { computeStats, periodOf, shiftPeriod, type StatMode } from '../services/stats'
import { lookup, visible } from '../services/store'

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

const scope = ref<'depenses' | 'depenses_personnelles'>('depenses')
const mode = ref<StatMode>('month')
const today = new Date().toISOString().slice(0, 10)
const period = ref(periodOf(today, 'month'))

function onScope(ev: CustomEvent) {
  scope.value = ev.detail.value === 'depenses_personnelles' ? 'depenses_personnelles' : 'depenses'
}
function onMode(ev: CustomEvent) {
  mode.value = ev.detail.value as StatMode
  period.value = periodOf(today, mode.value)
}
function shift(delta: number) {
  period.value = shiftPeriod(period.value, mode.value, delta)
}
const isCurrent = computed(() => period.value === periodOf(today, mode.value))

const periodLabel = computed(() => {
  if (mode.value === 'year') return period.value
  const [y, m] = period.value.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
})

const stats = computed(() => {
  const def = entityByKey(scope.value)
  const rows = visible(scope.value).map((r) => ({
    date: String(r.date ?? ''),
    montant: r.montant as number,
    categorie_uuid: (r.categorie_uuid as string | null | undefined) ?? null,
    label: def.label(r, lookup),
  }))
  return computeStats(rows, mode.value, period.value)
})

const categoryName = (uuid: string) => (uuid ? (lookup('categories', uuid)?.nom ?? 'Catégorie supprimée') : 'Sans catégorie')
const monthHeight = (t: number) => {
  const max = Math.max(...stats.value.byMonth, 1)
  return t > 0 ? Math.max(4, Math.round((t / max) * 100)) : 0
}
</script>

<style scoped>
.period {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 4px 16px 0;
}
.period strong {
  text-transform: capitalize;
}
.kpis {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}
.kpis div {
  display: flex;
  flex-direction: column;
}
.kpis span {
  font-size: 12px;
  color: var(--ion-color-medium);
}
.kpis strong {
  font-variant-numeric: tabular-nums;
}
ion-card-title.small {
  font-size: 16px;
}
.months {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 4px;
  align-items: end;
}
.month {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.bar-wrap {
  display: flex;
  align-items: flex-end;
  width: 100%;
  height: 110px;
}
.bar {
  width: 100%;
  border-radius: 4px 4px 0 0;
  background: var(--ion-color-primary);
}
.month small {
  font-size: 11px;
  color: var(--ion-color-medium);
}
.cat-line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}
.cat-line strong {
  font-variant-numeric: tabular-nums;
}
.cat-line small {
  font-weight: 400;
  color: var(--ion-color-medium);
}
.total {
  font-weight: 700;
  color: var(--ion-text-color);
  font-variant-numeric: tabular-nums;
}
.empty {
  text-align: center;
  padding: 40px 24px;
  color: var(--ion-color-medium);
}
.empty ion-icon {
  font-size: 48px;
  opacity: 0.5;
}
</style>
