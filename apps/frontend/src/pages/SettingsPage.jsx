import { useState, useEffect } from 'react'
import { 
  Lock, 
  MapPin, 
  Plus,
  Trash2
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { userAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import LoadingSpinner from '../components/LoadingSpinner'
import ThemeAppearanceCard from '../components/settings/ThemeAppearanceCard'
import toast from 'react-hot-toast'

// Appearance first: it is the only tab that needs no network round trip, so it
// is the one that always works.
const SETTINGS_TABS = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'security', label: 'Security' },
  { id: 'addresses', label: 'Addresses' }
]

const SettingsPage = () => {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  
  const [activeTab, setActiveTab] = useState('appearance')
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [addresses, setAddresses] = useState([])
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [addressForm, setAddressForm] = useState({
    type: 'home',
    name: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    isDefault: false
  })

  // Change password mutation
  const changePasswordMutation = useMutation(
    userAPI.changePassword,
    {
      onSuccess: () => {
        toast.success('Password changed successfully!')
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to change password')
      }
    }
  )

  // Add address mutation
  const addAddressMutation = useMutation(
    userAPI.addAddress,
    {
      onSuccess: () => {
        toast.success('Address added successfully!')
        setShowAddressForm(false)
        setAddressForm({
          type: 'home',
          name: '',
          phone: '',
          address: '',
          city: '',
          postalCode: '',
          country: '',
          isDefault: false
        })
        queryClient.invalidateQueries('userAddresses')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to add address')
      }
    }
  )

  // Update address mutation
  const updateAddressMutation = useMutation(
    ({ id, data }) => userAPI.updateAddress(id, data),
    {
      onSuccess: () => {
        toast.success('Address updated successfully!')
        queryClient.invalidateQueries('userAddresses')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update address')
      }
    }
  )

  // Delete address mutation
  const deleteAddressMutation = useMutation(
    userAPI.deleteAddress,
    {
      onSuccess: () => {
        toast.success('Address deleted successfully!')
        queryClient.invalidateQueries('userAddresses')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to delete address')
      }
    }
  )

  // Fetch addresses
  const { data: addressesData, isLoading } = useQuery(
    'userAddresses',
    userAPI.getAddresses,
    { staleTime: 5 * 60 * 1000 }
  )

  useEffect(() => {
    if (addressesData?.data) {
      setAddresses(addressesData.data)
    }
  }, [addressesData])

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    
    await changePasswordMutation.mutateAsync({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    })
  }

  const handleAddressSubmit = async (e) => {
    e.preventDefault()
    await addAddressMutation.mutateAsync(addressForm)
  }

  const handleDeleteAddress = async (addressId) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      await deleteAddressMutation.mutateAsync(addressId)
    }
  }

  const handleSetDefaultAddress = async (addressId) => {
    await updateAddressMutation.mutateAsync({
      id: addressId,
      isDefault: true
    })
  }

  // Gate the spinner on the Addresses tab only. Appearance and Security need
  // no request, so making Appearance the default tab must not put the whole
  // page behind the address query.
  if (isLoading && activeTab === 'addresses') {
    return <LoadingSpinner />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {SETTINGS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-medium'
                    : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {/* Appearance Tab */}
          {activeTab === 'appearance' && <ThemeAppearanceCard />}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-6">Security Settings</h2>
              
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="input"
                    placeholder="Enter current password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="input"
                    placeholder="Enter new password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="input"
                    placeholder="Confirm new password"
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={changePasswordMutation.isLoading}
                    className="btn-primary"
                  >
                    {changePasswordMutation.isLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Addresses Tab */}
          {activeTab === 'addresses' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Shipping Addresses</h2>
                <button
                  onClick={() => setShowAddressForm(!showAddressForm)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Address</span>
                </button>
              </div>

              {/* Add Address Form */}
              {showAddressForm && (
                <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-4">Add New Address</h3>
                  
                  <form onSubmit={handleAddressSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          Address Type
                        </label>
                        <select
                          value={addressForm.type}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, type: e.target.value }))}
                          className="input"
                        >
                          <option value="home">Home</option>
                          <option value="work">Work</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={addressForm.name}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, name: e.target.value }))}
                          className="input"
                          placeholder="Full name"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={addressForm.phone}
                        onChange={(e) => setAddressForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="input"
                        placeholder="Phone number"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        value={addressForm.address}
                        onChange={(e) => setAddressForm(prev => ({ ...prev, address: e.target.value }))}
                        className="input"
                        placeholder="Street address"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          value={addressForm.city}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                          className="input"
                          placeholder="City"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          value={addressForm.postalCode}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, postalCode: e.target.value }))}
                          className="input"
                          placeholder="Postal code"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          Country
                        </label>
                        <input
                          type="text"
                          value={addressForm.country}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, country: e.target.value }))}
                          className="input"
                          placeholder="Country"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={addressForm.isDefault}
                        onChange={(e) => setAddressForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                        className="h-4 w-4 text-primary-600 dark:text-primary-400 focus:ring-primary-500 dark:border-slate-600 border-gray-300 rounded dark:bg-slate-900"
                      />
                      <label className="text-sm text-gray-700 dark:text-slate-300">
                        Set as default address
                      </label>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowAddressForm(false)}
                        className="btn-outline"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={addAddressMutation.isLoading}
                        className="btn-primary"
                      >
                        {addAddressMutation.isLoading ? 'Adding...' : 'Add Address'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Existing Addresses */}
              <div className="space-y-4">
                {addresses.map((address) => (
                  <div key={address._id} className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="font-semibold text-gray-900 dark:text-slate-100 capitalize">{address.type}</h3>
                          {address.isDefault && (
                            <span className="badge-success">Default</span>
                          )}
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600 dark:text-slate-400">
                          <p>{address.name}</p>
                          <p>{address.phone}</p>
                          <p>{address.address}</p>
                          <p>{address.city}, {address.postalCode}</p>
                          <p>{address.country}</p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        {!address.isDefault && (
                          <button
                            onClick={() => handleSetDefaultAddress(address._id)}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAddress(address._id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
