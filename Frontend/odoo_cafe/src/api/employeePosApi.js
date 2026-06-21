import axiosClient from './axiosClient'

let menuPromise = null
let activeSessionPromise = null
let customersPromise = null
let ordersPromise = null

const once = (key, request) => {
  if (key === 'menu') {
    menuPromise ||= request().finally(() => window.setTimeout(() => { menuPromise = null }, 5000))
    return menuPromise
  }
  if (key === 'session') {
    activeSessionPromise ||= request().finally(() => window.setTimeout(() => { activeSessionPromise = null }, 5000))
    return activeSessionPromise
  }
  if (key === 'customers') {
    customersPromise ||= request().finally(() => window.setTimeout(() => { customersPromise = null }, 5000))
    return customersPromise
  }
  ordersPromise ||= request().finally(() => window.setTimeout(() => { ordersPromise = null }, 5000))
  return ordersPromise
}

export const getCustomerMenu = () => once('menu', () => axiosClient.get('/customer/menu'))

export const getActiveEmployeeSession = () =>
  once('session', () => axiosClient.get('/employee/sessions/active'))

export const openEmployeeSession = (openingAmount = 0) =>
  axiosClient.post('/employee/sessions/open', { opening_amount: openingAmount })

export const getEmployeeCustomers = (query = '') =>
  query
    ? axiosClient.get('/employee/customers', { params: { query } })
    : once('customers', () => axiosClient.get('/employee/customers', { params: { query } }))

export const createEmployeeCustomer = (payload) => axiosClient.post('/employee/customers', payload)

export const updateEmployeeCustomer = (id, payload) =>
  axiosClient.put(`/employee/customers/${id}`, payload)

export const deleteEmployeeCustomer = (id) => axiosClient.delete(`/employee/customers/${id}`)

export const previewEmployeeOrderTotals = (payload) =>
  axiosClient.post('/employee/orders/preview', payload)

export const applyEmployeeCoupon = (payload) => axiosClient.post('/employee/coupons/apply', payload)

export const getEmployeeOrders = (status = '', params = {}) => {
  const requestParams = { ...params, ...(status ? { status } : {}) }
  const hasParams = Object.keys(requestParams).length > 0

  return hasParams
    ? axiosClient.get('/employee/orders', { params: requestParams })
    : once('orders', () => axiosClient.get('/employee/orders'))
}

export const createEmployeeOrder = (payload) => axiosClient.post('/employee/orders', payload)

export const updateEmployeeOrder = (id, payload) => axiosClient.put(`/employee/orders/${id}`, payload)

export const getEmployeeOrder = (id) => axiosClient.get(`/employee/orders/${id}`)

export const updateEmployeeOrderStatus = (id, status) =>
  axiosClient.put(`/employee/orders/${id}/status`, { status })

export const sendEmployeeOrderToKitchen = (id) =>
  axiosClient.post(`/employee/orders/${id}/send-to-kitchen`)

export const getEmployeeOrderUpiQr = (id) => axiosClient.get(`/employee/orders/${id}/upi-qr`)

export const payEmployeeOrder = (id, payload) =>
  axiosClient.post(`/employee/orders/${id}/pay`, payload)

export const createEmployeeRazorpayOrder = (id) =>
  axiosClient.post(`/employee/orders/${id}/razorpay-order`)

export const verifyEmployeeRazorpayPayment = (id, payload) =>
  axiosClient.post(`/employee/orders/${id}/razorpay-verify`, payload)
