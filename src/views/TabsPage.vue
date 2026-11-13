<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="depenses" href="/tabs/depenses">
          <ion-icon :icon="cartOutline" />
          <ion-label>Dépenses</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="revenus" href="/tabs/revenus">
          <ion-icon :icon="cashOutline" />
          <ion-label>Revenus</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="emprunts" href="/tabs/emprunts">
          <ion-icon :icon="swapHorizontalOutline" />
          <ion-label>Emprunts</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="catalogue" href="/tabs/catalogue">
          <ion-icon :icon="albumsOutline" />
          <ion-label>Catalogue</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonTabs, IonRouterOutlet, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/vue'
import { cartOutline, cashOutline, swapHorizontalOutline, albumsOutline } from 'ionicons/icons'
</script>
