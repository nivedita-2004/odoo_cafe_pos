import axiosClient from './axiosClient'

let tablesPromise = null

export const getPosTables = () => {
  tablesPromise ||= axiosClient
    .get('/employee/tables')
    .finally(() => window.setTimeout(() => { tablesPromise = null }, 5000))

  return tablesPromise
}

export const getPosTableQr = (token) => axiosClient.get(`/employee/tables/${token}/qr`)
