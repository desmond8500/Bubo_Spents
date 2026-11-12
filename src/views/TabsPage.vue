<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="articles" href="/tabs/articles">
          <ion-icon :icon="receiptOutline" />
          <ion-label>Articles</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="marques" href="/tabs/marques">
          <ion-icon :icon="pricetagOutline" />
          <ion-label>Marques</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="fournisseurs" href="/tabs/fournisseurs">
          <ion-icon :icon="storefrontOutline" />
          <ion-label>Fournisseurs</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonTabs, IonRouterOutlet, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/vue'
import { receiptOutline, pricetagOutline, storefrontOutline } from 'ionicons/icons'
</script>
