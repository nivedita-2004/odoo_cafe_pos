import axiosClient from './axiosClient'

export const loginUser = (credentials) => axiosClient.post('/auth/login', credentials)

export const signupUser = (account) => axiosClient.post('/auth/signup', account)

export const requestPasswordReset = (email) => axiosClient.post('/auth/forgot-password', { email })

export const verifyPasswordOtp = (payload) => axiosClient.post('/auth/verify-otp', payload)

export const resetPassword = (payload) => axiosClient.post('/auth/reset-password', payload)
