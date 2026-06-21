import axiosClient from './axiosClient'

export const getAdminSettings = () => axiosClient.get('/admin/settings')

export const updateAdminSettings = (payload) => axiosClient.put('/admin/settings', payload)

export const uploadAdminSettingImage = (file) => {
  const formData = new FormData()
  formData.append('image', file)

  return axiosClient.post('/admin/settings/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}
