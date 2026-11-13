import { createRouter, createWebHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'
import TabsPage from '../views/TabsPage.vue'
import type { EntityKey } from '../services/entities'
import { session, sessionReady } from '../services/session'

const entityRoute = (path: string, entity: EntityKey): RouteRecordRaw => ({
  path,
  component: () => import('../views/EntityPage.vue'),
  props: { entity },
})

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/tabs/resume' },
  { path: '/login', component: () => import('../views/LoginPage.vue'), meta: { public: true } },
  { path: '/settings', component: () => import('../views/SettingsPage.vue') },
  { path: '/settings/users', component: () => import('../views/UsersPage.vue'), meta: { admin: true } },
  { path: '/settings/journal', component: () => import('../views/JournalPage.vue'), meta: { admin: true } },
  {
    path: '/tabs/',
    component: TabsPage,
    children: [
      { path: '', redirect: '/tabs/resume' },
      { path: 'resume', component: () => import('../views/SummaryPage.vue') },
      entityRoute('resume/budget', 'budgets'),
      entityRoute('depenses', 'depenses'),
      entityRoute('depenses/perso', 'depenses_personnelles'),
      entityRoute('revenus', 'revenus'),
      entityRoute('emprunts', 'emprunts'),
      { path: 'catalogue', component: () => import('../views/CatalogPage.vue') },
      entityRoute('catalogue/articles', 'articles'),
      entityRoute('catalogue/categories', 'categories'),
      entityRoute('catalogue/marques', 'marques'),
      entityRoute('catalogue/fournisseurs', 'fournisseurs'),
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  await sessionReady
  if (!to.meta.public && !session.token) return '/login'
  if (to.path === '/login' && session.token) return '/tabs/resume'
  if (to.meta.admin && (session.user?.role ?? 'membre') !== 'admin') return '/tabs/resume'
})

export default router
