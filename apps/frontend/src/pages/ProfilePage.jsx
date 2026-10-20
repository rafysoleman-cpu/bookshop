import { useState, useEffect } from 'react'
import { 
  User, 
  Mail, 
  Phone, 
  Edit2, 
  Camera
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { userAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

const ProfilePage = () => {
  const queryClient = useQueryClient()
  
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: ''
  })

  // Fetch user data
  const { data: userData, isLoading } = useQuery(
    'userProfile',
    userAPI.getMe,
    { staleTime: 5 * 60 * 1000 }
  )

  // Update profile mutation
  const updateProfileMutation = useMutation(
    userAPI.updateProfile,
    {
      onSuccess: () => {
        toast.success('Profile updated successfully!')
        setIsEditing(false)
        queryClient.invalidateQueries('userProfile')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update profile')
      }
    }
  )

  useEffect(() => {
    const profile = userData?.data?.data?.user
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        avatar: profile.avatar || ''
      })
    }
  }, [userData])

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    
    const profileData = {
      name: formData.name,
      phone: formData.phone,
      avatar: formData.avatar
    }
    
    await updateProfileMutation.mutateAsync(profileData)
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">My Profile</h1>
        <p className="text-gray-600 dark:text-slate-400">Manage your profile information</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Profile Information</h2>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="btn-outline flex items-center space-x-2"
            >
              <Edit2 className="w-4 h-4" />
              <span>{isEditing ? 'Cancel' : 'Edit'}</span>
            </button>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-24 h-24 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  {formData.avatar ? (
                    <img
                      src={formData.avatar}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-12 h-12 text-gray-400 dark:text-slate-500" />
                    </div>
                  )}
                </div>
                {isEditing && (
                  <button
                    type="button"
                    className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {isEditing && (
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="input"
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              )}
            </div>

            {!isEditing ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                  <div>
                    <p className="font-medium">{formData.email}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-400">Email Address</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                  <div>
                    <p className="font-medium">{formData.phone || 'Not provided'}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-400">Phone Number</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="input"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>
            )}

            {isEditing && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isLoading}
                  className="btn-primary"
                >
                  {updateProfileMutation.isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
