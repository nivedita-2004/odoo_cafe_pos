import axiosClient from './axiosClient'

export const getAdminDashboard = () => axiosClient.get('/reports/admin-dashboard')
