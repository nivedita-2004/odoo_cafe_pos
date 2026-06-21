import axiosClient from './axiosClient'

export const getAdminPosSessions = () => axiosClient.get('/admin/pos-sessions')

export const closePosSession = (id, closingAmount) =>
  axiosClient.post(`/employee/sessions/${id}/close`, { closing_amount: closingAmount })
