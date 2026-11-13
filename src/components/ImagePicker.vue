<template>
  <div class="ion-margin-vertical">
    <ion-text color="medium"><small>{{ label }}</small></ion-text>
    <div class="thumbs">
      <div v-for="(src, i) in list" :key="i" class="thumb">
        <img :src="src" alt="" />
        <ion-button class="rm" size="small" fill="clear" color="danger" @click="removeAt(i)">
          <ion-icon slot="icon-only" :icon="closeCircle" />
        </ion-button>
      </div>
      <ion-button v-if="multiple ? list.length < MAX : !list.length" fill="outline" @click="input?.click()">
        <ion-icon slot="icon-only" :icon="cameraOutline" />
      </ion-button>
    </div>
    <input ref="input" type="file" accept="image/*" :multiple="multiple" hidden @change="onPick" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { IonButton, IonIcon, IonText } from '@ionic/vue'
import { cameraOutline, closeCircle } from 'ionicons/icons'
import { fileToDataUrl } from '../services/image'

const MAX = 5

const props = defineProps<{
  modelValue: string | string[] | null | undefined
  label: string
  multiple?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string | string[] | null] }>()

const input = ref<HTMLInputElement | null>(null)

const list = computed<string[]>(() => {
  if (props.multiple) return Array.isArray(props.modelValue) ? props.modelValue : []
  return typeof props.modelValue === 'string' && props.modelValue ? [props.modelValue] : []
})

async function onPick(e: Event) {
  const target = e.target as HTMLInputElement
  const files = Array.from(target.files ?? [])
  target.value = ''
  if (!files.length) return

  const urls = await Promise.all(files.map((f) => fileToDataUrl(f)))
  emit('update:modelValue', props.multiple ? [...list.value, ...urls].slice(0, MAX) : urls[0])
}

function removeAt(i: number) {
  emit('update:modelValue', props.multiple ? list.value.filter((_, j) => j !== i) : null)
}
</script>

<style scoped>
.thumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}
.thumb {
  position: relative;
  width: 72px;
  height: 72px;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}
.rm {
  position: absolute;
  top: -12px;
  right: -12px;
  --padding-start: 0;
  --padding-end: 0;
}
</style>
