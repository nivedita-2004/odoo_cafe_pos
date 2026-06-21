/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { loginUser, signupUser } from '../api/authApi'
import { ROLE_HOME } from '../utils/dummyUsers'

const AuthContext = createContext(null)

const AUTH_USER_KEY = 'odoo_cafe_auth_user'
const ACCESS_TOKEN_KEY = 'token'
const REFRESH_TOKEN_KEY = 'refreshToken'

const toPublicUser = (user) => ({
  id: user.id,
  fullName: user.fullName || user.name,
  name: user.name || user.fullName,
  email: user.email,
  role: String(user.role || '').toLowerCase(),
})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(AUTH_USER_KEY))
    } catch {
      localStorage.removeItem(AUTH_USER_KEY)
      return null
    }
  })

  const login = async ({ email, password }) => {
    try {
      const response = await loginUser({
        email: email.trim().toLowerCase(),
        password,
      })
      const { accessToken, refreshToken, user: apiUser } = response.data
      const publicUser = toPublicUser(apiUser)

      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(publicUser))
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
      setUser(publicUser)

      return {
        user: publicUser,
        redirectTo: ROLE_HOME[publicUser.role] || '/login',
      }
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Unable to login. Please try again.', {
        cause: error,
      })
    }
  }

  const signup = async ({ fullName, email, password }) => {
    try {
      const response = await signupUser({
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      })
      const { accessToken, refreshToken, user: apiUser } = response.data
      const publicUser = toPublicUser(apiUser)

      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(publicUser))
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
      setUser(publicUser)

      return publicUser
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Unable to create account. Please try again.', {
        cause: error,
      })
    }
  }

  const logout = () => {
    localStorage.removeItem(AUTH_USER_KEY)
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    setUser(null)
  }

  useEffect(() => {
    const handleAuthLogout = () => setUser(null)
    window.addEventListener('auth:logout', handleAuthLogout)
    return () => window.removeEventListener('auth:logout', handleAuthLogout)
  }, [])

  const value = useMemo(
    () => ({
      user,
      login,
      signup,
      logout,
      isAuthenticated: Boolean(user),
      role: user?.role || null,
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
