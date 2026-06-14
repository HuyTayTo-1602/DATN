import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { authApi, clearTokens, notificationsApi } from '../services/api'
import { createNotificationSocket } from '../services/notificationSocket'

const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

const ROLE_LABEL = {
  job_seeker: 'Ứng viên',
  recruiter: 'Nhà tuyển dụng',
  admin: 'Quản trị viên',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [latestNotification, setLatestNotification] = useState(null)
  const socketRef = useRef(null)

  const refreshUnreadCount = useCallback(async () => {
    try {
      const data = await notificationsApi.unreadCount()
      setUnreadCount(data?.count ?? 0)
    } catch {
      // ignore — best effort
    }
  }, [])

  const disconnectSocket = useCallback(() => {
    socketRef.current?.disconnect()
    socketRef.current = null
  }, [])

  const connectSocket = useCallback(() => {
    disconnectSocket()
    socketRef.current = createNotificationSocket({
      onMessage: (data) => {
        setLatestNotification(data)
        setUnreadCount((c) => c + 1)
      },
    })
  }, [disconnectSocket])

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const me = await authApi.me()
      setUser(me)
      connectSocket()
      refreshUnreadCount()
    } catch {
      clearTokens()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [connectSocket, refreshUnreadCount])

  useEffect(() => {
    loadMe()
    return () => disconnectSocket()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password)
    authApi.saveSession(data)
    setUser(data.user)
    connectSocket()
    refreshUnreadCount()
    return data.user
  }, [connectSocket, refreshUnreadCount])

  const register = useCallback(async (email, password, role) => {
    return authApi.register(email, password, role)
  }, [])

  const logout = useCallback(() => {
    clearTokens()
    disconnectSocket()
    setUser(null)
    setUnreadCount(0)
  }, [disconnectSocket])

  const value = {
    user,
    role: user?.role || 'guest',
    roleLabel: ROLE_LABEL[user?.role] || 'Khách',
    isAuthenticated: !!user,
    loading,
    unreadCount,
    setUnreadCount,
    latestNotification,
    refreshUnreadCount,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
