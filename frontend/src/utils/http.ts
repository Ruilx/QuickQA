import axios from 'axios'

export const http = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token && token !== 'null' && token !== 'undefined') {
    config.headers = config.headers || ({} as any)
    ;(config.headers as any).Authorization = `Bearer ${token}`
  }
  config.headers = config.headers || ({} as any)
  ;(config.headers as any)['Content-Type'] = 'application/json'
  return config
})

http.interceptors.response.use(
  (resp) => resp,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('access_token')
      if (!location.search.includes('login=1')) {
        const url = new URL(location.href)
        url.searchParams.set('login', '1')
        location.replace(url.toString())
      }
    }
    return Promise.reject(error)
  }
)


