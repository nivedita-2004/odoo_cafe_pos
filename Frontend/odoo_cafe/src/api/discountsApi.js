import axiosClient from './axiosClient'

export const getAdminCoupons = () => axiosClient.get('/admin/coupons')

export const createAdminCoupon = (payload) => axiosClient.post('/admin/coupons', payload)

export const updateAdminCoupon = (id, payload) => axiosClient.put(`/admin/coupons/${id}`, payload)

export const deleteAdminCoupon = (id) => axiosClient.delete(`/admin/coupons/${id}`)

export const getAdminPromotions = () => axiosClient.get('/admin/promotions')

export const createAdminPromotion = (payload) => axiosClient.post('/admin/promotions', payload)

export const updateAdminPromotion = (id, payload) =>
  axiosClient.put(`/admin/promotions/${id}`, payload)

export const deleteAdminPromotion = (id) => axiosClient.delete(`/admin/promotions/${id}`)
