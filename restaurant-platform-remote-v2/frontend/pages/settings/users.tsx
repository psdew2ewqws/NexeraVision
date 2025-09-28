import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { ArrowLeftIcon, UserGroupIcon, PlusIcon, XMarkIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline'
import ProtectedRoute from '../../src/components/ProtectedRoute'
import { useAuth } from '../../src/contexts/AuthContext'
import { useApiClient } from '../../src/hooks/useApiClient'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { COUNTRY_CODES } from '../../src/constants/countries'
import { commonFields } from '../../src/schemas/common'

// Types
interface User {
  id: string
  name: string
  email: string
  username?: string
  firstName?: string
  lastName?: string
  phone?: string
  role: 'super_admin' | 'company_owner' | 'branch_manager' | 'call_center' | 'cashier'
  isActive: boolean
  createdAt: string
  updatedAt: string
  companyId: string
  canManage?: boolean
  canDelete?: boolean
  company?: {
    id: string
    name: string
  }
}

interface Company {
  id: string
  name: string
}

// Zod schema for form validation

const createUserSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  password: commonFields.password,
  countryCode: commonFields.countryCode,
  phone: commonFields.phone,
  role: z.enum(['super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier'], {
    required_error: 'Please select a role',
  }),
  companyId: z.string().optional(),
  isActive: z.boolean().default(true),
}).refine((data) => {
  // Validate phone number format based on country code
  const countryData = COUNTRY_CODES.find(c => c.code === data.countryCode)
  if (countryData && data.phone) {
    return countryData.pattern.test(data.phone)
  }
  return true
}, {
  message: 'Invalid phone number format for selected country',
  path: ['phone']
}).refine((data) => {
  // Company is required when creating non-super_admin users
  if (data.role !== 'super_admin' && (!data.companyId || data.companyId.trim() === '')) {
    return false
  }
  return true
}, {
  message: 'Please select a company',
  path: ['companyId']
})

type CreateUserForm = z.infer<typeof createUserSchema>

export default function UsersPage() {
  const { user } = useAuth()
  const { apiCall } = useApiClient()
  const [users, setUsers] = useState<User[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [availableRoles, setAvailableRoles] = useState<{value: string, label: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [viewingUser, setViewingUser] = useState<User | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form setup
  const createForm = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      countryCode: '+962', // Default to Jordan
      isActive: true,
      companyId: user?.role === 'super_admin' ? '' : user?.companyId || '',
    },
  })

  const editForm = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
  })

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiCall(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'}/users?page=1&limit=100`)
      if (data) {
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  // Fetch companies (only for super_admin)
  const fetchCompanies = useCallback(async () => {
    if (user?.role !== 'super_admin') return
    
    try {
      console.log('Fetching companies for super_admin...', user)
      const data = await apiCall(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'}/companies/list`)
      console.log('Companies response:', data)
      if (data) {
        setCompanies(data.companies || [])
        console.log('Companies set:', data.companies || [])
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
    }
  }, [apiCall, user?.role])

  // Fetch available roles based on current user permissions
  const fetchAvailableRoles = useCallback(async () => {
    try {
      const data = await apiCall(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'}/users/available-roles`)
      if (data) {
        setAvailableRoles(data)
      }
    } catch (error) {
      console.error('Error fetching available roles:', error)
    }
  }, [apiCall])

  // Load users, companies, and roles on mount
  useEffect(() => {
    fetchUsers()
    fetchCompanies()
    fetchAvailableRoles()
  }, [fetchUsers, fetchCompanies, fetchAvailableRoles])

  // Create user
  const handleCreateUser = useCallback(async (data: CreateUserForm) => {
    setSubmitting(true)
    try {
      const userData = {
        ...data,
        phone: `${data.countryCode}${data.phone}`, // Combine country code with phone number
        status: data.isActive ? 'active' : 'inactive', // Convert isActive to status
      }
      // Remove countryCode and isActive from the data being sent to API
      const { countryCode, isActive, ...apiData } = userData

      // Only include companyId if user is super_admin and has selected a company
      if (user?.role === 'super_admin' && !data.companyId) {
        delete apiData.companyId;
      }

      const response = await apiCall(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'}/users`, {
        method: 'POST',
        body: JSON.stringify(apiData),
      })

      if (response) {
        toast.success('User created successfully!')
        createForm.reset()
        setShowCreateForm(false)
        fetchUsers()
      }
    } catch (error) {
      console.error('Error creating user:', error)
      toast.error('Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }, [apiCall, createForm, fetchUsers, user?.role])

  // Edit user
  const handleEditUser = useCallback(async (data: CreateUserForm) => {
    if (!editingUser) return
    
    setSubmitting(true)
    try {
      const userData = {
        ...data,
        phone: `${data.countryCode}${data.phone}`, // Combine country code with phone number
        status: data.isActive ? 'active' : 'inactive', // Convert isActive to status
      }
      // Remove countryCode and isActive from the data being sent to API
      const { countryCode, isActive, ...apiData } = userData

      // Only include companyId if user is super_admin and has selected a company
      if (user?.role === 'super_admin' && !data.companyId) {
        delete apiData.companyId;
      }

      const response = await apiCall(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'}/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(apiData),
      })

      if (response) {
        toast.success('User updated successfully!')
        editForm.reset()
        setShowEditForm(false)
        setEditingUser(null)
        fetchUsers()
      }
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('Failed to update user')
    } finally {
      setSubmitting(false)
    }
  }, [apiCall, editForm, fetchUsers, editingUser])

  // Delete user
  const handleDeleteUser = useCallback(async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await apiCall(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'}/users/${userId}`, {
        method: 'DELETE',
      })

      if (response) {
        toast.success('User deleted successfully!')
        fetchUsers()
      } else {
        toast.error('Failed to delete user - authentication failed')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Failed to delete user')
    }
  }, [apiCall, fetchUsers])

  // Open edit form
  const openEditForm = useCallback((user: User) => {
    setEditingUser(user)
    
    // Parse phone number to extract country code
    let countryCode = '+962' // Default to Jordan
    let phoneNumber = user.phone || ''
    
    if (user.phone) {
      for (const country of COUNTRY_CODES) {
        if (user.phone.startsWith(country.code)) {
          countryCode = country.code
          phoneNumber = user.phone.slice(country.code.length)
          break
        }
      }
    }
    
    editForm.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      countryCode,
      phone: phoneNumber,
      role: user.role,
      companyId: user.companyId,
      isActive: user.isActive,
    })
    setShowEditForm(true)
  }, [editForm])

  const openViewModal = useCallback((user: User) => {
    setViewingUser(user)
    setShowViewModal(true)
  }, [])

  const getRoleBadge = (role: string) => {
    const roleColors = {
      super_admin: 'bg-purple-100 text-purple-800',
      company_owner: 'bg-blue-100 text-blue-800',
      branch_manager: 'bg-green-100 text-green-800',
      call_center: 'bg-indigo-100 text-indigo-800',
      cashier: 'bg-amber-100 text-amber-800',
    }
    return roleColors[role as keyof typeof roleColors] || roleColors.cashier
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["super_admin", "company_owner", "branch_manager"]}>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <h2 className="text-xl font-semibold">Loading users...</h2>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["super_admin", "company_owner", "branch_manager"]}>
      <Head>
        <title>User Management - Restaurant Platform</title>
        <meta name="description" content="Manage users and their permissions" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        {/* Simple B2B Header - Match Dashboard Style */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Navigation with Back Button */}
              <div className="flex items-center space-x-4">
                <Link href="/dashboard" className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
                <div className="h-6 w-px bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <UserGroupIcon className="w-5 h-5 text-gray-700" />
                  <h1 className="text-lg font-semibold text-gray-900">User Management</h1>
                </div>
              </div>
              
              {/* Right Side Actions */}
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add User
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Simple Stats Section - Match Dashboard Style */}
          <div className="mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
                  <p className="text-sm text-gray-600">Manage your restaurant team</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">{users.length}</div>
                  <div className="text-sm text-gray-500">Total Users</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">{users.filter(u => u.isActive).length}</div>
                  <div className="text-xs text-gray-500 mt-1">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600">{users.filter(u => u.role === 'branch_manager').length}</div>
                  <div className="text-xs text-gray-500 mt-1">Managers</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-indigo-600">{users.filter(u => u.role === 'call_center').length}</div>
                  <div className="text-xs text-gray-500 mt-1">Call Center</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-amber-600">{users.filter(u => u.role === 'cashier').length}</div>
                  <div className="text-xs text-gray-500 mt-1">Cashiers</div>
                </div>
              </div>
            </div>
          </div>

          {/* Users List */}
          {users.length === 0 ? (
            <div className="text-center py-12">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding your first team member.</p>
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {users.map((user) => (
                <div key={user.id} className="bg-white rounded-lg shadow border p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {user.firstName} {user.lastName}
                      </h3>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                      {user.role === 'branch_manager' ? 'Manager' : user.role.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    {user.phone && <p><strong>Phone:</strong> {user.phone}</p>}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {/* View/Edit/Delete buttons */}
                    <div className="flex items-center justify-end space-x-2 pt-2">
                      <button
                        onClick={() => openViewModal(user)}
                        className="inline-flex items-center px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
                      >
                        <EyeIcon className="w-3 h-3 mr-1" />
                        View
                      </button>
                      {user.canManage && (
                        <button
                          onClick={() => openEditForm(user)}
                          className="inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                        >
                          <PencilIcon className="w-3 h-3 mr-1" />
                          Edit
                        </button>
                      )}
                      {user.canDelete && (
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name || `${user.firstName} ${user.lastName}`)}
                          className="inline-flex items-center px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        >
                          <TrashIcon className="w-3 h-3 mr-1" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit User Modal */}
        {showEditForm && editingUser && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl bg-white rounded-lg shadow-lg">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
                  <p className="text-sm text-gray-600">Update {editingUser.firstName} {editingUser.lastName}'s information</p>
                </div>
                <button
                  onClick={() => {
                    setShowEditForm(false)
                    setEditingUser(null)
                    editForm.reset()
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={editForm.handleSubmit(handleEditUser)} className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                      <input
                        {...editForm.register('firstName')}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="John"
                      />
                      {editForm.formState.errors.firstName && (
                        <p className="mt-1 text-sm text-red-600">{editForm.formState.errors.firstName.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                      <input
                        {...editForm.register('lastName')}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Doe"
                      />
                      {editForm.formState.errors.lastName && (
                        <p className="mt-1 text-sm text-red-600">{editForm.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <input
                      {...editForm.register('password')}
                      type="password"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter new password"
                    />
                    {editForm.formState.errors.password && (
                      <p className="mt-1 text-sm text-red-600">{editForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <div className="flex">
                      <select
                        {...editForm.register('countryCode')}
                        className="flex-shrink-0 w-32 px-3 py-2 border border-r-0 border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                      >
                        {COUNTRY_CODES.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.flag} {country.code}
                          </option>
                        ))}
                      </select>
                      <input
                        {...editForm.register('phone')}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="791234567"
                      />
                    </div>
                    {editForm.formState.errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{editForm.formState.errors.phone.message}</p>
                    )}
                    {editForm.formState.errors.countryCode && (
                      <p className="mt-1 text-sm text-red-600">{editForm.formState.errors.countryCode.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                    <select
                      {...editForm.register('role')}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Role</option>
                      {availableRoles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    {editForm.formState.errors.role && (
                      <p className="mt-1 text-sm text-red-600">{editForm.formState.errors.role.message}</p>
                    )}
                  </div>

                  {/* Company Selection (for super_admin only) */}
                  {user?.role === 'super_admin' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company/Brand 
                        <span className="text-xs text-gray-500 ml-1">({companies.length} available)</span>
                      </label>
                      <select
                        {...editForm.register('companyId')}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">{companies.length === 0 ? 'No companies available' : 'Select Company'}</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                      {editForm.formState.errors.companyId && (
                        <p className="mt-1 text-sm text-red-600">{editForm.formState.errors.companyId.message}</p>
                      )}
                      {companies.length === 0 && (
                        <p className="mt-1 text-sm text-amber-600">
                          No companies found. <Link href="/companies" className="text-blue-600 hover:underline">Create a company first</Link>
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-3 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900">Account Settings</h4>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          {...editForm.register('isActive')}
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Account is active</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditForm(false)
                      setEditingUser(null)
                      editForm.reset()
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <PencilIcon className="w-4 h-4 mr-2" />
                    {submitting ? 'Updating...' : 'Update User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View User Modal */}
        {showViewModal && viewingUser && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl bg-white rounded-lg shadow-lg">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
                  <p className="text-sm text-gray-600">{viewingUser.name || `${viewingUser.firstName} ${viewingUser.lastName}`}</p>
                </div>
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    setViewingUser(null)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                      {viewingUser.name || `${viewingUser.firstName || ''} ${viewingUser.lastName || ''}`.trim()}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                      {viewingUser.email}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                      {viewingUser.username || 'Not set'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                      {viewingUser.phone || 'Not set'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getRoleBadge(viewingUser.role)}`}>
                        {viewingUser.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                        viewingUser.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {viewingUser.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {viewingUser.company && (
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                      <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                        {viewingUser.company.name}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
                    <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                      {new Date(viewingUser.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                    <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                      {new Date(viewingUser.updatedAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
                  <button
                    onClick={() => {
                      setShowViewModal(false)
                      setViewingUser(null)
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create User Modal - Dashboard Styling */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl bg-white rounded-lg shadow-lg">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Add New User</h3>
                  <p className="text-sm text-gray-600">Create a new team member account</p>
                </div>
                <button
                  onClick={() => {
                    setShowCreateForm(false)
                    createForm.reset()
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={createForm.handleSubmit(handleCreateUser)} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      {...createForm.register('name')}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="John Doe"
                    />
                    {createForm.formState.errors.name && (
                      <p className="mt-1 text-sm text-red-600">{createForm.formState.errors.name.message}</p>
                    )}
                  </div>


                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        {...createForm.register('email')}
                        type="email"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="john@example.com"
                      />
                      {createForm.formState.errors.email && (
                        <p className="mt-1 text-sm text-red-600">{createForm.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                      <input
                        {...createForm.register('username')}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="johndoe"
                      />
                      {createForm.formState.errors.username && (
                        <p className="mt-1 text-sm text-red-600">{createForm.formState.errors.username.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <input
                      {...createForm.register('password')}
                      type="password"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter password"
                    />
                    {createForm.formState.errors.password && (
                      <p className="mt-1 text-sm text-red-600">{createForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <div className="flex">
                      <select
                        {...createForm.register('countryCode')}
                        className="flex-shrink-0 w-32 px-3 py-2 border border-r-0 border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                      >
                        {COUNTRY_CODES.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.flag} {country.code}
                          </option>
                        ))}
                      </select>
                      <input
                        {...createForm.register('phone')}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="791234567"
                      />
                    </div>
                    {createForm.formState.errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{createForm.formState.errors.phone.message}</p>
                    )}
                    {createForm.formState.errors.countryCode && (
                      <p className="mt-1 text-sm text-red-600">{createForm.formState.errors.countryCode.message}</p>
                    )}
                  </div>

                  {/* Company Selection (for super_admin only) */}
                  {user?.role === 'super_admin' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company/Brand *
                        <span className="text-xs text-gray-500 ml-1">({companies.length} available)</span>
                      </label>
                      <select
                        {...createForm.register('companyId')}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">{companies.length === 0 ? 'No companies available' : 'Select Company'}</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                      {createForm.formState.errors.companyId && (
                        <p className="mt-1 text-sm text-red-600">{createForm.formState.errors.companyId.message}</p>
                      )}
                      {companies.length === 0 && (
                        <p className="mt-1 text-sm text-amber-600">
                          No companies found. <Link href="/settings/companies" className="text-blue-600 hover:underline font-medium">Create companies here →</Link>
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                    <select
                      {...createForm.register('role')}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Role</option>
                      {availableRoles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    {createForm.formState.errors.role && (
                      <p className="mt-1 text-sm text-red-600">{createForm.formState.errors.role.message}</p>
                    )}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900">Account Settings</h4>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          {...createForm.register('isActive')}
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Account is active</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false)
                      createForm.reset()
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    {submitting ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}