import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
const ACCESS_TOKEN_KEY = 'token'
const REFRESH_TOKEN_KEY = 'refreshToken'
const AUTH_USER_KEY = 'odoo_cafe_auth_user'

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

let refreshPromise = null

const clearAuthSession = () => {
  localStorage.removeItem(AUTH_USER_KEY)
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  window.dispatchEvent(new Event('auth:logout'))
}

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status

    if (!originalRequest || status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (originalRequest.url?.includes('/auth/refresh')) {
      clearAuthSession()
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refreshToken) {
      clearAuthSession()
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      refreshPromise ||= refreshClient
        .post('/auth/refresh', { refreshToken })
        .then((response) => response.data)
        .finally(() => {
          refreshPromise = null
        })

      const data = await refreshPromise
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)

      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
      return axiosClient(originalRequest)
    } catch (refreshError) {
      clearAuthSession()
      return Promise.reject(refreshError)
    }
  },
)

export default axiosClient
