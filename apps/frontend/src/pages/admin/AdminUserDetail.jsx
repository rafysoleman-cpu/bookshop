import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Shield,
  Ban,
  UserCheck,
  ArrowLeft,
  Edit,
  Save,
  X
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { adminAPI } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'

const AdminUserDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({})

  const { data: userData, isLoading, error } = useQuery(
    ['adminUser', id],
    () => adminAPI.getUser(id),
    { enabled: !!id }
  )

  const user = userData?.data?.data

  const updateUserMutation = useMutation(
    (updatedData) => adminAPI.updateUser(id, updatedData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['adminUser', id])
        queryClient.invalidateQueries(['adminUsers'])
        setIsEditing(false)
      }
    }
  )

  const toggleUserStatusMutation = useMutation(
    () => adminAPI.toggleUserStatus(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['adminUser', id])
        queryClient.invalidateQueries(['adminUsers'])
      }
    }
  )

  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      })
    }
  }, [user])

  const handleSave = () => {
    updateUserMutation.mutate(editForm)
  }

  const handleToggleStatus = () => {
    toggleUserStatusMutation.mutate()
  }

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (isLoading) return <LoadingSpinner />

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-red-800 dark:text-red-300 font-semibold mb-2">Error Loading User</h3>
          <p className="text-red-600 dark:text-red-400">{error.message || 'Failed to load user details'}</p>
          <Link 
            to="/admin/users" 
            className="inline-flex items-center mt-4 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Link>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h3 className="text-yellow-800 dark:text-yellow-300 font-semibold mb-2">User Not Found</h3>
          <p className="text-yellow-600 dark:text-yellow-400">The user you're looking for doesn't exist.</p>
          <Link 
            to="/admin/users" 
            className="inline-flex items-center mt-4 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              to="/admin/users"
              className="inline-flex items-center text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Users
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">User Details</h1>
          </div>
          <div className="flex items-center space-x-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit User
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateUserMutation.isLoading}
                  className="inline-flex items-center px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateUserMutation.isLoading ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Info Card */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto mb-4 overflow-hidden">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary-100 dark:bg-primary-900/40">
                    <User className="w-12 h-12 text-primary-600 dark:text-primary-400" />
                  </div>
                )}
              </div>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Role</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => handleInputChange('role', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">{user.name}</h2>
                  <p className="text-gray-600 dark:text-slate-400 mb-4">{user.email}</p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        user.role === 'admin' ? 'bg-error-100 dark:bg-error-900/40 text-error-800 dark:text-error-300' :
                        'bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300'
                      }`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        user.isActive ? 'bg-success-100 dark:bg-success-900/40 text-success-800 dark:text-success-300' : 'bg-gray-100 dark:bg-slate-800/70 text-gray-800 dark:text-slate-200'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Details Card */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">User Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">User ID</label>
                  <p className="text-gray-900 dark:text-slate-100 font-mono text-sm">{user._id}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">Email Address</label>
                  <div className="flex items-center text-gray-900 dark:text-slate-100">
                    <Mail className="w-4 h-4 mr-2 text-gray-400 dark:text-slate-500" />
                    {user.email}
                  </div>
                </div>

                {user.phone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">Phone Number</label>
                    <div className="flex items-center text-gray-900 dark:text-slate-100">
                      <Phone className="w-4 h-4 mr-2 text-gray-400 dark:text-slate-500" />
                      {user.phone}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">Account Status</label>
                  <div className="flex items-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.isActive ? 'bg-success-100 dark:bg-success-900/40 text-success-800 dark:text-success-300' : 'bg-gray-100 dark:bg-slate-800/70 text-gray-800 dark:text-slate-200'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">Role</label>
                  <div className="flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-gray-400 dark:text-slate-500" />
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin' ? 'bg-error-100 dark:bg-error-900/40 text-error-800 dark:text-error-300' :
                      'bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300'
                    }`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">Member Since</label>
                  <div className="flex items-center text-gray-900 dark:text-slate-100">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400 dark:text-slate-500" />
                    {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">Last Updated</label>
                  <div className="flex items-center text-gray-900 dark:text-slate-100">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400 dark:text-slate-500" />
                    {new Date(user.updatedAt).toLocaleDateString()}
                  </div>
                </div>

                {user.address && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">Address</label>
                    <div className="flex items-start text-gray-900 dark:text-slate-100">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400 dark:text-slate-500 mt-0.5" />
                      <span className="text-sm">{user.address}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleToggleStatus}
                    disabled={toggleUserStatusMutation.isLoading}
                    className={`inline-flex items-center px-4 py-2 rounded-lg ${
                      user.isActive 
                        ? 'bg-error-600 text-white hover:bg-error-700' 
                        : 'bg-success-600 text-white hover:bg-success-700'
                    } disabled:opacity-50`}
                  >
                    {user.isActive ? (
                      <>
                        <Ban className="w-4 h-4 mr-2" />
                        {toggleUserStatusMutation.isLoading ? 'Processing...' : 'Deactivate'}
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 mr-2" />
                        {toggleUserStatusMutation.isLoading ? 'Processing...' : 'Activate'}
                      </>
                    )}
                  </button>
                </div>
                
                <div className="text-sm text-gray-500 dark:text-slate-400">
                  Last login: {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminUserDetail
