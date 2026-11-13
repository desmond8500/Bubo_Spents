<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons v-if="def.back" slot="start">
          <ion-back-button :default-href="def.back" text="" />
        </ion-buttons>
        <ion-title>{{ def.title }}</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="state.syncing" @click="sync">
            <ion-icon slot="icon-only" :icon="syncOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar v-if="isDepense">
        <ion-segment :value="entity" @ion-change="onSegment">
          <ion-segment-button value="depenses"><ion-label>Générales</ion-label></ion-segment-button>
          <ion-segment-button value="depenses_personnelles"><ion-label>Personnelles</ion-label></ion-segment-button>
        </ion-segment>
      </ion-toolbar>
      <ion-toolbar v-if="def.searchable">
        <ion-searchbar
          :value="query"
          placeholder="Rechercher"
          :debounce="100"
          @ion-input="query = $event.detail.value ?? ''"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-note v-if="state.error" color="danger" class="ion-padding ion-text-center" style="display: block">
        {{ state.error }}
      </ion-note>
      <ion-note v-else-if="pendingCount() > 0" class="ion-padding ion-text-center" style="display: block">
        {{ pendingCount() }} élément(s) en attente de synchronisation
      </ion-note>

      <ion-list v-if="rows.length" inset>
        <ion-item-sliding v-for="row in rows" :key="row.uuid">
          <ion-item-options v-if="entity === 'emprunts' && canEdit(entity, row)" side="start">
            <ion-item-option color="success" @click="toggleRepaid(row, $event)">
              <ion-icon slot="top" :icon="row.rembourse ? arrowUndoOutline : checkmarkDoneOutline" />
              {{ row.rembourse ? 'Annuler' : 'Remboursé' }}
            </ion-item-option>
          </ion-item-options>

          <ion-item button :detail="false" @click="canEdit(entity, row) && openForm(row)">
            <div v-if="def.image" slot="start" class="avatar">
              <img v-if="thumb(row)" :src="thumb(row)!" alt="" />
              <span v-else>{{ initial(row) }}</span>
            </div>
            <div v-else-if="def.kind" slot="start" class="avatar kind" :class="def.kind?.tone">
              <ion-icon :icon="def.kind?.icon" />
            </div>
            <ion-label>
              <h2>{{ def.label(row, lookup) }}</h2>
              <p v-if="subtitle(row)">{{ subtitle(row) }}</p>
            </ion-label>
            <div slot="end" class="end">
              <span
                v-if="amount(row) !== null"
                class="amount"
                :class="[def.tone, { done: def.done?.(row) }]"
              >{{ fmt(amount(row)) }}</span>
              <ion-icon class="sync" :icon="row.synced ? cloudDoneOutline : cloudOfflineOutline" />
            </div>
          </ion-item>

          <ion-item-options v-if="canEdit(entity, row) || (def.duplicable && canCreate(entity))" side="end">
            <ion-item-option v-if="def.duplicable && canCreate(entity)" color="medium" @click="onDuplicate(row, $event)">
              <ion-icon slot="icon-only" :icon="copyOutline" />
            </ion-item-option>
            <ion-item-option v-if="canEdit(entity, row)" color="danger" @click="confirmRemove(row)">
              <ion-icon slot="icon-only" :icon="trashOutline" />
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <div v-else-if="query.trim()" class="empty">
        <ion-icon :icon="searchOutline" />
        <p>Aucun résultat pour « {{ query.trim() }} ».</p>
      </div>
      <div v-else class="empty">
        <ion-icon :icon="moonOutline" />
        <p>Rien pour l'instant.<br />Appuyez sur + pour ajouter.</p>
      </div>

      <ion-note v-if="!canCreate(entity)" class="ion-padding ion-text-center" style="display: block">
        Votre rôle (lecteur) permet seulement de consulter les données communes.
      </ion-note>

      <ion-fab v-if="canCreate(entity)" slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button color="secondary" @click="openForm()">
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
      </ion-fab>

      <entity-form :entity="entity" :is-open="formOpen" :row="editing" @close="formOpen = false" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonBackButton, IonContent, IonList,
  IonItem, IonLabel, IonIcon, IonNote, IonFab, IonFabButton, IonItemSliding, IonItemOptions, IonItemOption,
  IonSegment, IonSegmentButton, IonSearchbar, alertController,
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import {
  addOutline, arrowUndoOutline, checkmarkDoneOutline, cloudDoneOutline, cloudOfflineOutline, copyOutline,
  moonOutline, searchOutline, syncOutline, trashOutline,
} from 'ionicons/icons'
import EntityForm from '../components/EntityForm.vue'
import { entityByKey, fmt, type EntityKey, type Row } from '../services/entities'
import { state, lookup, duplicate, remove, update, visible, sync, pendingCount } from '../services/store'
import { canCreate, canEdit, isMine } from '../services/permissions'

const props = defineProps<{ entity: EntityKey }>()

const def = computed(() => entityByKey(props.entity))
const router = useRouter()

const isDepense = computed(() => props.entity === 'depenses' || props.entity === 'depenses_personnelles')

/** Bascule entre les dépenses générales et personnelles (deux routes sœurs dans l'onglet Dépenses). */
function onSegment(ev: CustomEvent) {
  const target = ev.detail.value === 'depenses_personnelles' ? '/tabs/depenses/perso' : '/tabs/depenses'
  if (ev.detail.value !== props.entity) router.replace(target)
}

// --- Recherche (sans tenir compte des accents ni de la casse)
const query = ref('')
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

const searchText = (row: Row) =>
  [def.value.label(row, lookup), def.value.subtitle?.(row, lookup), row.description].filter(Boolean).join(' ')

const rows = computed(() => {
  const all = visible(props.entity)
  const q = normalize(query.value.trim())
  return q ? all.filter((r) => normalize(searchText(r)).includes(q)) : all
})

// --- Affichage d'une ligne
const thumb = (row: Row) => def.value.image?.(row) ?? null
/** Type de dépense, détail, et auteur quand la ligne commune vient de quelqu'un d'autre. */
const subtitle = (row: Row) => {
  const parts = [def.value.kind?.label, def.value.subtitle?.(row, lookup) ?? '']
  if (def.value.shared && !isMine(row) && row.auteur?.name) parts.push(`par ${row.auteur.name}`)
  return parts.filter(Boolean).join(' · ')
}
const amount = (row: Row) => (def.value.amount ? def.value.amount(row) : null)
const initial = (row: Row) => (def.value.label(row, lookup).trim().charAt(0) || '?').toUpperCase()

// --- Formulaire
const formOpen = ref(false)
const editing = ref<Row | null>(null)

function openForm(row?: Row) {
  editing.value = row ?? null
  formOpen.value = true
}

// --- Actions sur une ligne
/** Referme la ligne glissée après une action. */
function closeSliding(ev: Event) {
  const sliding = (ev.target as HTMLElement | null)?.closest('ion-item-sliding') as
    | (HTMLElement & { close?: () => Promise<void> })
    | null
  sliding?.close?.()
}

async function onDuplicate(row: Row, ev: Event) {
  closeSliding(ev)
  const copy = await duplicate(props.entity, row.uuid)
  if (copy) openForm(copy) // la copie s'ouvre pour être ajustée tout de suite
}

async function toggleRepaid(row: Row, ev: Event) {
  closeSliding(ev)
  const done = !row.rembourse
  await update('emprunts', row.uuid, {
    rembourse: done,
    date_remboursement: done ? new Date().toISOString().slice(0, 10) : null,
  })
}

async function confirmRemove(row: Row) {
  const alert = await alertController.create({
    header: 'Supprimer ?',
    message: def.value.label(row, lookup),
    buttons: [
      { text: 'Annuler', role: 'cancel' },
      { text: 'Supprimer', role: 'destructive', handler: () => remove(props.entity, row.uuid) },
    ],
  })
  await alert.present()
}
</script>

<style scoped>
.avatar {
  width: 44px;
  height: 44px;
  margin-inline-end: 12px;
  border-radius: 12px;
  overflow: hidden;
  display: grid;
  place-items: center;
  font-weight: 700;
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.14);
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar.kind {
  font-size: 22px;
}
.avatar.kind.secondary {
  color: var(--ion-color-secondary-shade);
  background: rgba(var(--ion-color-secondary-rgb), 0.2);
}
.end {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.amount {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.amount.success {
  color: var(--ion-color-success);
}
.amount.danger {
  color: var(--ion-color-danger);
}
.amount.secondary {
  color: var(--ion-color-secondary-shade);
}
.amount.medium {
  color: var(--ion-color-medium);
}
.amount.done {
  text-decoration: line-through;
  opacity: 0.55;
}
.sync {
  font-size: 13px;
  color: var(--ion-color-medium);
  opacity: 0.7;
}
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
