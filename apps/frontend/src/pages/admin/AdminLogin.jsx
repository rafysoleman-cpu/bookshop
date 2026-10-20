import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, Mail, Lock, Key, AlertCircle, CheckCircle } from 'lucide-react'
import { authAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

const AdminLogin = () => {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    otp: ''
  })
  const [adminId, setAdminId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [otpTimer, setOtpTimer] = useState(0)
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await authAPI.adminLogin({
        email: formData.email,
        password: formData.password
      })

      if (response.data.success) {
        setAdminId(response.data.adminId)
        setStep(2)
        setSuccess('OTP sent to your email. Please check your inbox.')
        startOtpTimer()
      } else {
        setError(response.data.error || 'Login failed')
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOTPVerification = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await authAPI.adminVerifyOTP({
        adminId,
        otp: formData.otp
      })

      if (response.data.success) {
        const { user, accessToken, refreshToken } = response.data.data
        
        // Store auth data
        setAuth({
          user,
          token: accessToken,
          refreshToken
        })

        setSuccess('Admin login successful!')
        setTimeout(() => {
          navigate('/admin/dashboard')
        }, 1000)
      } else {
        setError(response.data.error || 'OTP verification failed')
      }
    } catch (error) {
      setError(error.response?.data?.error || 'OTP verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (otpTimer > 0) return
    
    setLoading(true)
    setError('')

    try {
      const response = await authAPI.adminResendOTP({ adminId })
      
      if (response.data.success) {
        setSuccess('New OTP sent to your email.')
        startOtpTimer()
      } else {
        setError(response.data.error || 'Failed to resend OTP')
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  const startOtpTimer = () => {
    setOtpTimer(300) // 5 minutes
    const timer = setInterval(() => {
      setOtpTimer(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-red-600 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-slate-100">
            Admin Portal
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
            Secure admin access with OTP verification
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 shadow-xl rounded-lg p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-md flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
              <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-md flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">{success}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Admin Email
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-slate-600 rounded-md placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="admin@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-slate-600 rounded-md placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending OTP...' : 'Login & Get OTP'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleOTPVerification} className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  One-Time Password (OTP)
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                  </div>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={formData.otp}
                    onChange={handleInputChange}
                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-slate-600 rounded-md placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-red-500 focus:border-red-500 text-center text-lg tracking-widest"
                    placeholder="000000"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                  Enter the 6-digit code sent to {formData.email}
                </p>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || formData.otp.length !== 6}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={otpTimer > 0 || loading}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-400 disabled:text-gray-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                  {otpTimer > 0 
                    ? `Resend OTP in ${formatTime(otpTimer)}` 
                    : 'Resend OTP'
                  }
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-gray-600 dark:text-slate-400 hover:text-gray-500 dark:hover:text-slate-400"
            >
              ← Back to regular login
            </Link>
          </div>
        </div>

        <div className="text-center text-xs text-gray-500 dark:text-slate-400">
          <p>Protected by 2-factor authentication</p>
          <p className="mt-1">Only authorized admin emails can access</p>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
