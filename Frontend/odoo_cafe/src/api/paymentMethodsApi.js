import axiosClient from './axiosClient'

export const getAdminPaymentMethods = () => axiosClient.get('/admin/payment-methods')

export const updateAdminPaymentMethod = (id, payload) =>
  axiosClient.put(`/admin/payment-methods/${id}`, payload)
