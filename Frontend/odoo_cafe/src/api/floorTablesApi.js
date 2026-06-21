import axiosClient from './axiosClient'

export const getAdminFloors = () => axiosClient.get('/admin/floors')

export const createAdminFloor = (payload) => axiosClient.post('/admin/floors', payload)

export const updateAdminFloor = (id, payload) => axiosClient.put(`/admin/floors/${id}`, payload)

export const deleteAdminFloor = (id) => axiosClient.delete(`/admin/floors/${id}`)

export const getAdminTables = () => axiosClient.get('/admin/tables')

export const createAdminTable = (payload) => axiosClient.post('/admin/tables', payload)

export const updateAdminTable = (id, payload) => axiosClient.put(`/admin/tables/${id}`, payload)

export const deleteAdminTable = (id) => axiosClient.delete(`/admin/tables/${id}`)
