import axiosClient from './axiosClient'

export const getAdminCategories = () => axiosClient.get('/admin/categories')

export const createAdminCategory = (payload) => axiosClient.post('/admin/categories', payload)

export const updateAdminCategory = (id, payload) => axiosClient.put(`/admin/categories/${id}`, payload)

export const deleteAdminCategory = (id) => axiosClient.delete(`/admin/categories/${id}`)
