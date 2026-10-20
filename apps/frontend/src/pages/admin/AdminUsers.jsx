import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { 
  Search, 
  Filter, 
  User, 
  Mail, 
  Shield, 
  Ban,
  MoreHorizontal,
  UserCheck,
  UserX
} from 'lucide-react'
import { useQuery } from 'react-query'
import { adminAPI } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import Pagination from '../../components/Pagination'

const AdminUsers = () => {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const inputRef = useRef(null)

  // Handle search input change - immediate UI update
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value
    setSearchQuery(value) // Update input immediately
  }, [])

  // Debounce search query for API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      setCurrentPage(1) // Reset to first page when searching
    }, 300) // Proper debounce timing for stability

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Force focus persistence
  useEffect(() => {
    inputRef.current?.focus()
  }, [debouncedSearchQuery])

  const { data: usersData, isLoading, error } = useQuery(
    ['adminUsers', currentPage, debouncedSearchQuery, roleFilter, statusFilter],
    () => adminAPI.getUsers({
      page: currentPage,
      search: debouncedSearchQuery,
      role: roleFilter,
      status: statusFilter
    }),
    { 
      staleTime: 30 * 1000,
      keepPreviousData: true, // VERY IMPORTANT - prevents UI flicker
      refetchOnWindowFocus: false
    }
  )

  const users = usersData?.data?.data?.users || []
  const pagination = usersData?.data?.data?.pagination

  const roleOptions = [
    { value: '', label: 'All Roles' },
    { value: 'user', label: 'Users' },
    { value: 'admin', label: 'Admins' }
  ]

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'suspended', label: 'Suspended' }
  ]

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-950/40'
      case 'user': return 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40'
      default: return 'text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-900'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-950/40'
      case 'inactive': return 'text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-900'
      case 'suspended': return 'text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-950/40'
      default: return 'text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-900'
    }
  }

  if (isLoading) return <LoadingSpinner />

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-red-800 dark:text-red-300 font-semibold mb-2">Error Loading Users</h3>
          <p className="text-red-600 dark:text-red-400">{error.message || 'Failed to load users'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">Manage Users</h1>
        <p className="text-gray-600 dark:text-slate-400">{users.length} users</p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="search-icon" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search users..."
              className="search-input w-full"
              autoComplete="off"
              spellCheck="false"
            />
          </div>
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      {users.length > 0 ? (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-slate-900">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-primary-100 dark:bg-primary-900/40">
                                <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-slate-400">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.isActive ? 'active' : 'inactive')}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/admin/users/${user._id}`}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                          >
                            View
                          </Link>
                          
                          {user.isActive ? (
                            <button className="text-error-600 dark:text-error-400 hover:text-error-900 dark:hover:text-error-300">
                              <Ban className="w-4 h-4" />
                            </button>
                          ) : (
                            <button className="text-success-600 dark:text-success-400 hover:text-success-900 dark:hover:text-success-300">
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="mt-8">
              <Pagination 
                currentPage={pagination.page}
                totalPages={pagination.pages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <User className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">No users found</h3>
          <p className="text-gray-600 dark:text-slate-400">Try adjusting your filters or search terms.</p>
        </div>
      )}
    </div>
  )
}

export default AdminUsers
