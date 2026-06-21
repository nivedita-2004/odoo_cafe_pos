import axiosClient from './axiosClient'

export const getCustomerTable = (token) => axiosClient.get(`/customer/table/${token}`)

export const getCustomerMenu = () => axiosClient.get('/customer/menu')

export const placeCustomerOrder = (payload) => axiosClient.post('/customer/orders', payload)

export const getCustomerOrderStatus = (id) => axiosClient.get(`/customer/orders/${id}/status`)

export const getCustomerOrderHistory = (tableToken) =>
  axiosClient.get(`/customer/tables/${tableToken}/orders`)

export const getCustomerOrderUpiQr = (id, tableToken) =>
  axiosClient.get(`/customer/orders/${id}/upi-qr`, { params: { table_token: tableToken } })

export const payCustomerOrder = (id, payload) => axiosClient.post(`/customer/orders/${id}/pay`, payload)

export const createCustomerRazorpayOrder = (id, payload) =>
  axiosClient.post(`/customer/orders/${id}/razorpay-order`, payload)

export const verifyCustomerRazorpayPayment = (id, payload) =>
  axiosClient.post(`/customer/orders/${id}/razorpay-verify`, payload)
