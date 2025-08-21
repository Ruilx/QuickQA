import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import Home from '../views/Home.vue'
import SpeedMode from '../views/SpeedMode.vue'
import StudyMode from '../views/StudyMode.vue'
import Leaderboard from '../views/Leaderboard.vue'
import { useAuthStore } from '../stores/auth'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: Home },
  { path: '/speed', name: 'speed', component: SpeedMode, meta: { requiresAuth: true } },
  { path: '/study', name: 'study', component: StudyMode, meta: { requiresAuth: true } },
  { path: '/leaderboard', name: 'leaderboard', component: Leaderboard, meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach(async (to) => {
  const store = useAuthStore()
  if (!store.isInitialized) {
    await store.initFromStorage()
  }
  if (to.meta.requiresAuth && !store.isLoggedIn) {
    store.setPendingRoute(to.fullPath)
    return { path: '/', query: { login: '1' } }
  }
  return true
})

export default router


