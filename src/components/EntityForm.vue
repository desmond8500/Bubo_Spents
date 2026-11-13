<template>
  <ion-modal :is-open="isOpen" @didDismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ row ? 'Modifier' : 'Nouveau' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="emit('close')">Fermer</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <template v-for="f in visibleFields" :key="f.key">
        <image-picker
          v-if="f.type === 'image' || f.type === 'images'"
          v-model="form[f.key]"
          :label="f.label"
          :multiple="f.type === 'images'"
        />

        <ion-item v-else-if="f.type === 'ref'">
          <ion-select v-model="form[f.key]" :label="f.label" label-placement="stacked" interface="popover">
            <ion-select-option v-if="!f.required" value="">Aucun</ion-select-option>
            <ion-select-option v-for="o in visible(f.ref!)" :key="o.uuid" :value="o.uuid">
              {{ entityByKey(f.ref!).label(o, lookup) }}
            </ion-select-option>
          </ion-select>
          <ion-button
            v-if="f.quickAdd && canCreate(f.ref!)"
            slot="end"
            fill="clear"
            :aria-label="`Nouveau : ${entityByKey(f.ref!).title}`"
            @click="openQuick(f)"
          >
            <ion-icon slot="icon-only" :icon="addCircleOutline" />
          </ion-button>
        </ion-item>

        <ion-item v-else-if="f.type === 'select'">
          <ion-select v-model="form[f.key]" :label="f.label" label-placement="stacked" interface="popover">
            <ion-select-option v-if="!f.required" value="">Non précisé</ion-select-option>
            <ion-select-option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item v-else-if="f.type === 'toggle'">
          <ion-toggle :checked="!!form[f.key]" @ion-change="form[f.key] = $event.detail.checked">
            {{ f.label }}
          </ion-toggle>
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
          />
        </ion-item>
      </template>

      <ion-button expand="block" class="ion-margin-top" :disabled="!valid" @click="save">Enregistrer</ion-button>

      <!-- Ajout rapide d'un élément lié (ex. un nouvel article depuis une dépense). -->
      <EntityForm
        v-if="quick.open"
        :entity="quick.entity"
        :is-open="quick.open"
        @close="quick.open = false"
        @saved="onQuickSaved"
      />
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, watch } from 'vue'
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonItem, IonIcon, IonInput,
  IonTextarea, IonSelect, IonSelectOption, IonToggle,
} from '@ionic/vue'
import { addCircleOutline } from 'ionicons/icons'
import ImagePicker from './ImagePicker.vue'
import { entityByKey, type EntityKey, type Field, type Row } from '../services/entities'
import { add, lookup, update, visible } from '../services/store'
import { canCreate } from '../services/permissions'

const props = defineProps<{
  entity: EntityKey
  isOpen: boolean
  /** Ligne à modifier ; absente pour une création. */
  row?: Row | null
  /** Valeurs proposées pour une création (ex. description « Solde de départ »). */
  defaults?: Record<string, any>
}>()

const emit = defineEmits<{
  close: []
  saved: [uuid: string]
}>()

const def = computed(() => entityByKey(props.entity))
const form = reactive<Record<string, any>>({})

const today = () => new Date().toISOString().slice(0, 10)
const toNumber = (v: unknown) => Number(String(v).replace(',', '.'))
const filled = (v: unknown) => (Array.isArray(v) ? v.length > 0 : String(v ?? '').trim() !== '')

/** Valeur vide d'un champ (pour une ligne existante qui ne l'a pas encore). */
function blank(f: Field) {
  if (f.type === 'images') return []
  if (f.type === 'image') return null
  if (f.type === 'toggle') return false
  return ''
}

/** Valeur initiale d'un nouveau champ : défaut du champ, sinon aujourd'hui pour une date. */
function initial(f: Field) {
  if (props.defaults && f.key in props.defaults) return props.defaults[f.key]
  if (f.default !== undefined) return f.default
  if (f.type === 'date') return today()
  return blank(f)
}

// Pour une dépense : dernier article et dernière quantité pris en compte dans le calcul du montant.
const seen = { article: '', quantite: '' }

function init() {
  for (const k of Object.keys(form)) delete form[k]
  for (const f of def.value.fields) {
    const v = props.row?.[f.key]
    form[f.key] = props.row ? (v ?? blank(f)) : initial(f)
  }
  seen.article = String(form.article_uuid ?? '')
  seen.quantite = String(form.quantite ?? '')
}

watch(() => props.isOpen, (open) => open && init(), { immediate: true })

const visibleFields = computed(() => def.value.fields.filter((f) => !f.showIf || f.showIf(form)))
const valid = computed(() => visibleFields.value.every((f) => !f.required || filled(form[f.key])))

/**
 * Dépense : le montant se recalcule (prix × quantité) quand l'utilisateur change l'article ou la quantité.
 * Les valeurs d'ouverture sont mémorisées pour ne pas écraser le montant d'une dépense existante.
 */
watch(
  () => [form.article_uuid, form.quantite],
  async () => {
    if (props.entity !== 'depenses') return
    const article = String(form.article_uuid ?? '')
    const quantite = String(form.quantite ?? '')
    if (article === seen.article && quantite === seen.quantite) return

    seen.article = article
    seen.quantite = quantite
    await nextTick()

    const produit = lookup('articles', article)
    const q = toNumber(quantite)
    if (produit && q > 0) form.montant = Math.round(Number(produit.prix) * q * 100) / 100
  },
)

/** Emprunt : cocher « remboursé » propose la date du jour ; décocher efface la date. */
watch(
  () => form.rembourse,
  (done) => {
    if (props.entity !== 'emprunts') return
    if (done && !form.date_remboursement) form.date_remboursement = today()
    if (!done) form.date_remboursement = ''
  },
)

async function save() {
  const data: Record<string, any> = {}
  for (const f of def.value.fields) {
    const v = form[f.key]
    if (f.showIf && !f.showIf(form)) data[f.key] = f.type === 'toggle' ? false : null
    else if (f.type === 'number') data[f.key] = toNumber(v)
    else if (f.type === 'toggle') data[f.key] = !!v
    else if (f.type === 'images') data[f.key] = v ?? []
    else data[f.key] = v === '' ? null : v
  }

  let uuid: string
  if (props.row) {
    await update(props.entity, props.row.uuid, data)
    uuid = props.row.uuid
  } else {
    uuid = (await add(props.entity, data)).uuid
  }

  emit('saved', uuid)
  emit('close')
}

const quick = reactive<{ open: boolean; entity: EntityKey; field: string }>({
  open: false,
  entity: 'articles',
  field: '',
})

function openQuick(f: Field) {
  quick.entity = f.ref!
  quick.field = f.key
  quick.open = true
}

/** L'élément créé est sélectionné dans le champ qui l'a demandé. */
function onQuickSaved(uuid: string) {
  form[quick.field] = uuid
}
</script>
