<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons v-if="isCatalogue" slot="start">
          <ion-back-button default-href="/tabs/catalogue" text="" />
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
          <ion-segment-button value="depenses"><ion-label>Articles</ion-label></ion-segment-button>
          <ion-segment-button value="depenses_personnelles"><ion-label>Personnelles</ion-label></ion-segment-button>
        </ion-segment>
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
          <ion-item button :detail="false" @click="openForm(row)">
            <div v-if="def.image" slot="start" class="avatar">
              <img v-if="thumb(row)" :src="thumb(row)!" alt="" />
              <span v-else>{{ initial(row) }}</span>
            </div>
            <ion-label>
              <h2>{{ def.label(row, lookup) }}</h2>
              <p v-if="subtitle(row)">{{ subtitle(row) }}</p>
            </ion-label>
            <div slot="end" class="end">
              <span v-if="amount(row) !== null" class="amount" :class="def.tone">{{ fmt(amount(row)) }}</span>
              <ion-icon class="sync" :icon="row.synced ? cloudDoneOutline : cloudOfflineOutline" />
            </div>
          </ion-item>
          <ion-item-options side="end">
            <ion-item-option color="danger" @click="confirmRemove(row)">
              <ion-icon slot="icon-only" :icon="trashOutline" />
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <div v-else class="empty">
        <ion-icon :icon="moonOutline" />
        <p>Rien pour l'instant.<br />Appuyez sur + pour ajouter.</p>
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button color="secondary" @click="openForm()">
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
      </ion-fab>

      <ion-modal :is-open="isOpen" @didDismiss="isOpen = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ editingUuid ? 'Modifier' : 'Nouveau' }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="isOpen = false">Fermer</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <template v-for="f in def.fields" :key="f.key">
            <image-picker
              v-if="f.type === 'image' || f.type === 'images'"
              v-model="form[f.key]"
              :label="f.label"
              :multiple="f.type === 'images'"
            />
            <ion-item v-else-if="f.type === 'ref'">
              <ion-select
                v-model="form[f.key]"
                :label="f.label"
                label-placement="stacked"
                interface="popover"
                @ion-change="onChange(f.key)"
              >
                <ion-select-option v-if="!f.required" value="">Aucun</ion-select-option>
                <ion-select-option v-for="o in options(f.ref!)" :key="o.uuid" :value="o.uuid">
                  {{ entityByKey(f.ref!).label(o, lookup) }}
                </ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item v-else-if="f.type === 'textarea'">
              <ion-textarea v-model="form[f.key]" :label="f.label" label-placement="stacked" :auto-grow="true" />
            </ion-item>
            <ion-item v-else>
              <ion-input
                v-model="form[f.key]"
                :label="f.label"
                label-placement="stacked"
                :type="f.type"
                :inputmode="f.type === 'number' ? 'decimal' : undefined"
                @ion-input="onChange(f.key)"
              />
            </ion-item>
          </template>
          <ion-button expand="block" class="ion-margin-top" :disabled="!valid" @click="save">
            Enregistrer
          </ion-button>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonBackButton, IonContent, IonList,
  IonItem, IonLabel, IonIcon, IonNote, IonFab, IonFabButton, IonModal, IonInput, IonTextarea,
  IonSelect, IonSelectOption, IonItemSliding, IonItemOptions, IonItemOption, IonSegment, IonSegmentButton,
  alertController,
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import { addOutline, syncOutline, cloudDoneOutline, cloudOfflineOutline, trashOutline, moonOutline } from 'ionicons/icons'
import ImagePicker from '../components/ImagePicker.vue'
import { entityByKey, fmt, type EntityKey, type Row } from '../services/entities'
import { state, lookup, add, update, remove, visible, sync, pendingCount } from '../services/store'

const props = defineProps<{ entity: EntityKey }>()

const def = computed(() => entityByKey(props.entity))
const rows = computed(() => visible(props.entity))
const isCatalogue = computed(() => ['articles', 'marques', 'fournisseurs'].includes(props.entity))
const options = (key: EntityKey) => visible(key)

const router = useRouter()
const isDepense = computed(() => props.entity === 'depenses' || props.entity === 'depenses_personnelles')

/** Bascule entre les dépenses d'articles et les dépenses personnelles (deux routes sœurs dans l'onglet Dépenses). */
function onSegment(ev: CustomEvent) {
  const target = ev.detail.value === 'depenses_personnelles' ? '/tabs/depenses/perso' : '/tabs/depenses'
  if (ev.detail.value !== props.entity) router.replace(target)
}

const thumb = (row: Row) => def.value.image?.(row) ?? null
const subtitle = (row: Row) => def.value.subtitle?.(row, lookup) ?? ''
const amount = (row: Row) => (def.value.amount ? def.value.amount(row) : null)
const initial = (row: Row) => (def.value.label(row, lookup).trim().charAt(0) || '?').toUpperCase()

const isOpen = ref(false)
const editingUuid = ref<string | null>(null)
const form = reactive<Record<string, any>>({})

const today = () => new Date().toISOString().slice(0, 10)

function emptyValue(f: { type: string; default?: any }) {
  if (f.default !== undefined) return f.default
  if (f.type === 'date') return today()
  if (f.type === 'images') return []
  if (f.type === 'image') return null
  return ''
}

function openForm(row?: Row) {
  editingUuid.value = row?.uuid ?? null
  for (const k of Object.keys(form)) delete form[k]
  for (const f of def.value.fields) {
    const v = row?.[f.key]
    form[f.key] = row ? (v ?? emptyValue({ type: f.type === 'date' ? 'text' : f.type })) : emptyValue(f)
  }
  isOpen.value = true
}

const filled = (v: unknown) => (Array.isArray(v) ? v.length > 0 : String(v ?? '').trim() !== '')
const valid = computed(() => def.value.fields.every((f) => !f.required || filled(form[f.key])))

const toNumber = (v: unknown) => Number(String(v).replace(',', '.'))

/** Dépense : le montant se recalcule (prix x quantité) quand l'article ou la quantité change. */
async function onChange(key: string) {
  if (props.entity !== 'depenses' || (key !== 'article_uuid' && key !== 'quantite')) return
  await nextTick()
  const article = lookup('articles', form.article_uuid)
  const quantite = toNumber(form.quantite)
  if (article && quantite > 0) form.montant = Math.round(Number(article.prix) * quantite * 100) / 100
}

async function save() {
  const data: Record<string, any> = {}
  for (const f of def.value.fields) {
    const v = form[f.key]
    if (f.type === 'number') data[f.key] = toNumber(v)
    else if (f.type === 'images') data[f.key] = v ?? []
    else data[f.key] = v === '' ? null : v
  }
  if (editingUuid.value) await update(props.entity, editingUuid.value, data)
  else await add(props.entity, data)
  isOpen.value = false
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
