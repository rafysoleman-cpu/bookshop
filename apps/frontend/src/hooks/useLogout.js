import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

/**
 * Single logout routine shared by the desktop account menu and the mobile
 * drawer, so the "clear session then go home" behaviour is defined once.
 */
export const useLogout = () => {
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()

  return async () => {
    await logout()
    navigate('/')
  }
}