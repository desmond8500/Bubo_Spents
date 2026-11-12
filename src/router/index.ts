import { createRouter, createWebHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'
import TabsPage from '../views/TabsPage.vue'
import { entities } from '../services/entities'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/tabs/articles' },
  {
    path: '/tabs/',
    component: TabsPage,
    children: [
      { path: '', redirect: '/tabs/articles' },
      ...entities.map((e) => ({
        path: e.key,
        component: () => import('../views/EntityPage.vue'),
        props: { entity: e.key },
      })),
    ],
  },
]

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
