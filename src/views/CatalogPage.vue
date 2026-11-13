<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Catalogue</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        <ion-item v-for="link in links" :key="link.to" :router-link="link.to" detail>
          <ion-icon slot="start" :icon="link.icon" />
          <ion-label>{{ link.label }}</ion-label>
          <ion-note slot="end">{{ visible(link.key).length }}</ion-note>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonIcon, IonNote } from '@ionic/vue'
import { layersOutline, receiptOutline, pricetagOutline, storefrontOutline } from 'ionicons/icons'
import type { EntityKey } from '../services/entities'
import { visible } from '../services/store'

const links: Array<{ to: string; label: string; icon: string; key: EntityKey }> = [
  { to: '/tabs/catalogue/articles', label: 'Articles', icon: receiptOutline, key: 'articles' },
  { to: '/tabs/catalogue/categories', label: 'Catégories', icon: layersOutline, key: 'categories' },
  { to: '/tabs/catalogue/marques', label: 'Marques', icon: pricetagOutline, key: 'marques' },
  { to: '/tabs/catalogue/fournisseurs', label: 'Fournisseurs', icon: storefrontOutline, key: 'fournisseurs' },
]
</script>
