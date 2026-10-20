import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import toast from 'react-hot-toast'

const AuthCallbackPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setAuth } = useAuthStore()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const token = searchParams.get('token')
      const refresh = searchParams.get('refresh')

      if (token && refresh) {
        try {
          // Store tokens in localStorage
          localStorage.setItem('accessToken', token)
          localStorage.setItem('refreshToken', refresh)
          
          // Update auth state
          setAuth(token, refresh)
          
          // Fetch user data
          const userResponse = await api.get('/auth/me')
          const { user } = userResponse.data.data
          
          // Update user in store
          useAuthStore.setState({ user })
          
          toast.success('Successfully logged in with Google!')
          
          // Redirect to home or dashboard
          navigate('/')
        } catch (error) {
          console.error('Auth callback error:', error)
          toast.error('Authentication failed')
          navigate('/login')
        }
      } else {
        toast.error('Authentication failed')
        navigate('/login')
      }
    }

    handleAuthCallback()
  }, [navigate, searchParams, setAuth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-slate-400">Completing authentication...</p>
      </div>
    </div>
  )
}

export default AuthCallbackPage
