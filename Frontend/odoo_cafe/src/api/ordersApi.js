import axiosClient from './axiosClient'

export const getAdminOrders = (params = {}) => axiosClient.get('/employee/orders', { params })

export const getAdminOrder = (id) => axiosClient.get(`/employee/orders/${id}`)

export const updateAdminOrderStatus = (id, status) =>
  axiosClient.put(`/employee/orders/${id}/status`, { status })
