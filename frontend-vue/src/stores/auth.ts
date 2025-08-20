import { defineStore } from 'pinia'
import { http } from '../utils/http'

export interface UserProfile {
  id: number
  username: string
  email?: string
}

interface AuthState {
  token: string | null
  user: UserProfile | null
  isInitialized: boolean
  pendingRoute: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: null,
    user: null,
    isInitialized: false,
    pendingRoute: null,
  }),
  getters: {
    isLoggedIn: (s) => !!s.token,
  },
  actions: {
    setPendingRoute(path: string | null) {
      this.pendingRoute = path
    }
    ,
    async initFromStorage() {
      const token = localStorage.getItem('access_token')
      if (token && token !== 'null' && token !== 'undefined') {
        this.token = token
        try {
          const res = await http.get('/profile')
          this.user = {
            id: res.data.id,
            username: res.data.username,
            email: res.data.email,
          }
        } catch (_) {
          this.logout()
        }
      }
      this.isInitialized = true
    },
    async login(payload: { username: string; password: string }) {
      const res = await http.post('/login', payload)
      const data = res.data
      this.token = data.access_token
      this.user = { id: data.user_id, username: data.username }
      localStorage.setItem('access_token', this.token!)
    },
    async register(payload: { username: string; email?: string; password: string }) {
      await http.post('/register', payload)
    },
    logout() {
      this.token = null
      this.user = null
      localStorage.removeItem('access_token')
    },
  },
})


