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
      <section class="hero">
        <div class="month">
          <ion-button fill="clear" color="light" @click="shift(-1)">
            <ion-icon slot="icon-only" :icon="chevronBack" />
          </ion-button>
          <strong class="month-label">{{ monthLabel }}</strong>
          <ion-button fill="clear" color="light" :disabled="isCurrent" @click="shift(1)">
            <ion-icon slot="icon-only" :icon="chevronForward" />
          </ion-button>
        </div>

        <div class="solde-label">Solde du mois</div>
        <div class="solde" :class="{ negative: solde < 0 }">{{ fmt(solde) }}</div>

        <div class="chips">
          <div class="chip">
            <span>Revenus</span>
            <strong class="in">{{ fmt(totals.revenus) }}</strong>
          </div>
          <div class="chip">
            <span>Dépenses</span>
            <strong class="out">{{ fmt(totals.depenses) }}</strong>
          </div>
          <div class="chip">
            <span>Emprunts</span>
            <strong class="loan">{{ fmt(totals.emprunts) }}</strong>
          </div>
        </div>
      </section>

      <ion-list v-if="byArticle.length" inset>
        <ion-list-header>
          <ion-label>Dépenses par article</ion-label>
        </ion-list-header>
        <ion-item v-for="a in byArticle" :key="a.key">
          <ion-label>
            <h3>{{ a.name }}</h3>
            <ion-progress-bar :value="a.total / byArticle[0].total" color="danger" class="bar" />
          </ion-label>
          <ion-note slot="end" class="total">{{ fmt(a.total) }}</ion-note>
        </ion-item>
      </ion-list>
      <div v-else class="empty">
        <ion-icon :icon="moonOutline" />
        <p>Aucune dépense ce mois-ci.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon, IonList,
  IonListHeader, IonItem, IonLabel, IonNote, IonProgressBar,
} from '@ionic/vue'
import { chevronBack, chevronForward, moonOutline, settingsOutline } from 'ionicons/icons'
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
/* Le bandeau garde les mêmes couleurs en clair et en sombre : texte blanc sur indigo profond. */
.hero {
  margin: 8px 16px 16px;
  padding: 8px 16px 20px;
  border-radius: 24px;
  color: #fff;
  background: linear-gradient(135deg, #4a48b5 0%, #27256f 100%);
  box-shadow: 0 10px 24px rgba(39, 37, 111, 0.28);
}
.month {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.month-label {
  text-transform: capitalize;
}
.solde-label {
  text-align: center;
  font-size: 13px;
  opacity: 0.75;
}
.solde {
  text-align: center;
  font-size: 34px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  margin: 4px 0 18px;
}
.solde.negative {
  color: #ffb4ae;
}
.chips {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 12px;
  min-width: 0;
}
.chip strong {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.chip .in {
  color: #8ff0bf;
}
.chip .out {
  color: #ffb4ae;
}
.chip .loan {
  color: #ffd27d;
}
.bar {
  margin-top: 8px;
  border-radius: 4px;
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
