import axiosClient from './axiosClient'

export const getAdminProducts = (params) => axiosClient.get('/admin/products', { params })

const multipartConfig = {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
}

const getRequestConfig = (payload) => (payload instanceof FormData ? multipartConfig : undefined)

export const createAdminProduct = (payload) =>
  axiosClient.post('/admin/products', payload, getRequestConfig(payload))

export const updateAdminProduct = (id, payload) =>
  axiosClient.put(`/admin/products/${id}`, payload, getRequestConfig(payload))

export const deleteAdminProduct = (id) => axiosClient.delete(`/admin/products/${id}`)

export const getAdminCategories = () => axiosClient.get('/admin/categories')
