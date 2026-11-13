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

        <div class="solde-label">Votre solde du mois</div>
        <div class="solde" :class="{ negative: solde < 0 }">{{ fmt(solde) }}</div>

        <div class="chips">
          <div class="chip">
            <span>Revenus</span>
            <strong class="in">{{ fmt(totals.revenus) }}</strong>
          </div>
          <div class="chip">
            <span>Vos dépenses</span>
            <strong class="out">{{ fmt(totals.mesDepenses) }}</strong>
          </div>
          <div class="chip">
            <span>Emprunts</span>
            <strong class="loan">{{ fmt(totals.emprunts) }}</strong>
          </div>
        </div>
      </section>

      <ion-card class="budget">
        <ion-card-header>
          <ion-card-subtitle>Budget commun · visible par tous</ion-card-subtitle>
          <ion-card-title v-if="budget.active" :color="budget.reste < 0 ? 'danger' : 'success'">
            {{ fmt(budget.reste) }}
            <small>restant</small>
          </ion-card-title>
          <ion-card-title v-else>Aucun budget</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <template v-if="budget.active">
            <ion-progress-bar
              :value="budget.disponible > 0 ? Math.min(1, budget.depenses / budget.disponible) : 1"
              :color="budget.reste < 0 ? 'danger' : 'primary'"
            />
            <div class="budget-lines">
              <div><span>Report du mois précédent</span><strong>{{ fmt(budget.report) }}</strong></div>
              <div><span>Crédits du mois</span><strong>{{ fmt(budget.credits) }}</strong></div>
              <div><span>Dépenses générales</span><strong>{{ fmt(budget.depenses) }}</strong></div>
            </div>
            <p class="hint">Le reste sera reporté sur le budget du mois suivant.</p>
          </template>
          <p v-else-if="budget.start" class="hint">Le budget commence en {{ startLabel }}.</p>
          <p v-else class="hint">Définissez le solde de départ : il servira de budget mensuel pour tous.</p>

          <div class="budget-actions">
            <ion-button v-if="canCreate('budgets')" size="small" @click="credit()">
              <ion-icon slot="start" :icon="addCircleOutline" />
              {{ budget.start ? 'Créditer' : 'Définir le solde de départ' }}
            </ion-button>
            <ion-button v-if="budget.start" size="small" fill="outline" router-link="/tabs/resume/budget">
              Historique
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-list inset>
        <ion-list-header>
          <ion-label>Vos dépenses</ion-label>
        </ion-list-header>
        <ion-item>
          <div slot="start" class="dot primary"><ion-icon :icon="peopleOutline" /></div>
          <ion-label>
            <h3>Générales saisies par vous</h3>
            <p>Comptées dans votre solde</p>
          </ion-label>
          <ion-note slot="end" class="total">{{ fmt(totals.generalesSaisies) }}</ion-note>
        </ion-item>
        <ion-item>
          <div slot="start" class="dot secondary"><ion-icon :icon="personOutline" /></div>
          <ion-label>
            <h3>Personnelles</h3>
            <p>Visibles par vous seul</p>
          </ion-label>
          <ion-note slot="end" class="total">{{ fmt(totals.perso) }}</ion-note>
        </ion-item>
      </ion-list>

      <ion-list v-if="aRembourser.count" inset>
        <ion-list-header>
          <ion-label>Emprunts</ion-label>
        </ion-list-header>
        <ion-item router-link="/tabs/emprunts" detail>
          <ion-label>
            <h3>À rembourser</h3>
            <p>{{ aRembourser.count }} emprunt(s) non remboursé(s), tous mois confondus</p>
          </ion-label>
          <ion-note slot="end" class="total">{{ fmt(aRembourser.total) }}</ion-note>
        </ion-item>
      </ion-list>

      <ion-list inset>
        <ion-list-header>
          <ion-label>Dépenses générales (visibles par tous)</ion-label>
        </ion-list-header>
        <ion-item>
          <div slot="start" class="dot primary"><ion-icon :icon="peopleOutline" /></div>
          <ion-label>
            <h3>Total du mois</h3>
            <p>{{ generales.length }} dépense(s)</p>
          </ion-label>
          <ion-note slot="end" class="total">{{ fmt(totals.generalesTous) }}</ion-note>
        </ion-item>
        <ion-item v-for="p in parPersonne" :key="p.key">
          <ion-label>
            <h3>{{ p.name }}</h3>
            <ion-progress-bar :value="p.total / parPersonne[0].total" color="primary" class="bar" />
          </ion-label>
          <ion-note slot="end" class="total">{{ fmt(p.total) }}</ion-note>
        </ion-item>
      </ion-list>

      <ion-list v-if="byPoste.length" inset>
        <ion-list-header>
          <ion-label>Vos dépenses par poste</ion-label>
        </ion-list-header>
        <ion-item v-for="a in byPoste" :key="a.key">
          <ion-label>
            <h3>{{ a.name }}</h3>
            <ion-progress-bar :value="a.total / byPoste[0].total" color="danger" class="bar" />
          </ion-label>
          <ion-note slot="end" class="total">{{ fmt(a.total) }}</ion-note>
        </ion-item>
      </ion-list>
      <div v-else class="empty">
        <ion-icon :icon="moonOutline" />
        <p>Aucune dépense de votre part ce mois-ci.</p>
      </div>

      <entity-form
        entity="budgets"
        :is-open="creditOpen"
        :defaults="creditDefaults"
        @close="creditOpen = false"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon, IonList,
  IonListHeader, IonItem, IonLabel, IonNote, IonProgressBar, IonCard, IonCardHeader, IonCardSubtitle,
  IonCardTitle, IonCardContent,
} from '@ionic/vue'
import {
  addCircleOutline, chevronBack, chevronForward, moonOutline, peopleOutline, personOutline, settingsOutline,
} from 'ionicons/icons'
import { fmt, type EntityKey, type Row } from '../services/entities'
import EntityForm from '../components/EntityForm.vue'
import { budgetFor } from '../services/budget'
import { canCreate, isMine } from '../services/permissions'
import { session } from '../services/session'
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
const sum = (rows: Row[]) => rows.reduce((s, r) => s + (Number(r.montant) || 0), 0)

/** Dépenses générales : celles de tous les utilisateurs (données communes). */
const generales = computed(() => inMonth('depenses'))
const generalesSaisies = computed(() => generales.value.filter(isMine))
const personnelles = computed(() => inMonth('depenses_personnelles'))

const totals = computed(() => {
  const perso = sum(personnelles.value)
  const saisies = sum(generalesSaisies.value)
  return {
    revenus: sum(inMonth('revenus')),
    emprunts: sum(inMonth('emprunts')),
    perso,
    generalesSaisies: saisies,
    generalesTous: sum(generales.value),
    // Votre solde ne compte que ce que vous avez dépensé : vos dépenses personnelles et les générales que vous avez saisies.
    mesDepenses: perso + saisies,
  }
})

const solde = computed(() => totals.value.revenus - totals.value.mesDepenses)

/** Emprunts non remboursés, tous mois confondus. */
const aRembourser = computed(() => {
  const rows = visible('emprunts').filter((r) => !r.rembourse)
  return { count: rows.length, total: sum(rows) }
})

/** Budget commun du mois affiché (report des mois précédents + crédits − dépenses générales). */
const budget = computed(() => budgetFor(month.value))

const startLabel = computed(() => {
  if (!budget.value.start) return ''
  const [y, m] = budget.value.start.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
})

const creditOpen = ref(false)
const creditDefaults = ref<Record<string, any>>({})

function credit() {
  creditDefaults.value = budget.value.start ? {} : { description: 'Solde de départ' }
  creditOpen.value = true
}

/** Dépenses générales regroupées par personne qui les a saisies. */
const parPersonne = computed(() => {
  const groups = new Map<string, { key: string; name: string; total: number }>()
  for (const d of generales.value) {
    const mine = isMine(d)
    const key = mine ? 'moi' : String(d.user_id ?? d.auteur?.name ?? '?')
    const name = mine ? `${session.user?.name ?? 'Vous'} (vous)` : (d.auteur?.name ?? 'Inconnu')
    const g = groups.get(key) ?? { key, name, total: 0 }
    g.total += Number(d.montant) || 0
    groups.set(key, g)
  }
  return [...groups.values()].sort((a, b) => b.total - a.total)
})

/** Vos dépenses (générales saisies par vous + personnelles), regroupées par article ou désignation. */
const byPoste = computed(() => {
  const groups = new Map<string, { key: string; name: string; total: number }>()
  const add = (key: string, name: string, amount: unknown) => {
    const g = groups.get(key) ?? { key, name, total: 0 }
    g.total += Number(amount) || 0
    groups.set(key, g)
  }

  for (const d of generalesSaisies.value) {
    add(`a:${d.article_uuid}`, lookup('articles', d.article_uuid)?.nom ?? 'Article supprimé', d.montant)
  }
  // Les dépenses personnelles sont regroupées par désignation (sans tenir compte de la casse).
  for (const p of personnelles.value) {
    const name = String(p.designation ?? '').trim() || 'Sans désignation'
    add(`p:${name.toLowerCase()}`, name, p.montant)
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
.budget small {
  font-size: 13px;
  font-weight: 400;
  color: var(--ion-color-medium);
}
.budget-lines {
  margin-top: 12px;
  display: grid;
  gap: 6px;
  font-size: 14px;
}
.budget-lines div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.budget-lines span {
  color: var(--ion-color-medium);
}
.budget-lines strong {
  font-variant-numeric: tabular-nums;
}
.hint {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--ion-color-medium);
}
.budget-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
/* Même code couleur que les listes : indigo = dépense générale, ambre = dépense personnelle. */
.dot {
  width: 36px;
  height: 36px;
  margin-inline-end: 12px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 20px;
}
.dot.primary {
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.14);
}
.dot.secondary {
  color: var(--ion-color-secondary-shade);
  background: rgba(var(--ion-color-secondary-rgb), 0.2);
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
