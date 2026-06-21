import axiosClient from './axiosClient'

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )

export const getAdminSalesReport = (params) =>
  axiosClient.get('/admin/reports/sales', { params: cleanParams(params) })

export const exportAdminReport = (format, params) =>
  axiosClient.get(`/admin/reports/export/${format}`, {
    params: cleanParams(params),
    responseType: 'blob',
  })
