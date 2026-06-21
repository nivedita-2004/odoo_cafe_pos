import axiosClient from './axiosClient'

export const getAdminEmployees = (params) => axiosClient.get('/admin/employees', { params })

export const createAdminEmployee = (payload) => axiosClient.post('/admin/employees', payload)

export const updateAdminEmployee = (id, payload) =>
  axiosClient.put(`/admin/employees/${id}`, payload)

export const archiveAdminEmployee = (id, isActive) =>
  axiosClient.put(`/admin/employees/${id}/archive`, { is_active: isActive })

export const changeAdminEmployeePassword = (id, password) =>
  axiosClient.put(`/admin/employees/${id}/password`, { password })

export const deleteAdminEmployee = (id) => axiosClient.delete(`/admin/employees/${id}`)
