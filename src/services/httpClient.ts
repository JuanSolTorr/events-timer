import axios from 'axios'
import { config } from '../config/env'

export const httpClient = axios.create({
  baseURL: config.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

httpClient.interceptors.request.use((axiosConfig) => {
  const token = localStorage.getItem('token')
  if (token && axiosConfig.headers) {
    axiosConfig.headers.Authorization = `Bearer ${token}`
  }
  return axiosConfig
})

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('auth:session-expired'))
    }
    return Promise.reject(error)
  }
)
