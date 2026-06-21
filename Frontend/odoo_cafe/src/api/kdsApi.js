import axiosClient from './axiosClient'

export const getKitchenOrders = () => axiosClient.get('/kds/orders')

export const startKitchenOrder = (id) => axiosClient.patch(`/kds/orders/${id}/start`)

export const completeKitchenOrder = (id) => axiosClient.patch(`/kds/orders/${id}/complete`)

export const completeKitchenItem = (id) => axiosClient.patch(`/kds/items/${id}/complete`)
