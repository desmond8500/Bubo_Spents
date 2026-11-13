import { createRouter, createWebHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'
import TabsPage from '../views/TabsPage.vue'
import type { EntityKey } from '../services/entities'

const entityRoute = (path: string, entity: EntityKey): RouteRecordRaw => ({
  path,
  component: () => import('../views/EntityPage.vue'),
  props: { entity },
})

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/tabs/depenses' },
  {
    path: '/tabs/',
    component: TabsPage,
    children: [
      { path: '', redirect: '/tabs/depenses' },
      entityRoute('depenses', 'depenses'),
      entityRoute('revenus', 'revenus'),
      entityRoute('emprunts', 'emprunts'),
      { path: 'catalogue', component: () => import('../views/CatalogPage.vue') },
      entityRoute('catalogue/articles', 'articles'),
      entityRoute('catalogue/marques', 'marques'),
      entityRoute('catalogue/fournisseurs', 'fournisseurs'),
    ],
  },
]

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
