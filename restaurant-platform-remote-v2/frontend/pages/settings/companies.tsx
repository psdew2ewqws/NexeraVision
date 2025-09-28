import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { 
  ArrowLeftIcon, 
  BuildingOfficeIcon as CompanyIcon, 
  PlusIcon, 
  XMarkIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  CreditCardIcon,
  ArrowPathIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  DocumentArrowDownIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import ProtectedRoute from '../../src/components/ProtectedRoute'
import { useAuth } from '../../src/contexts/AuthContext'
import { useLicense } from '../../src/contexts/LicenseContext'
import LicenseWarningHeader from '../../src/components/LicenseWarningHeader'
import { useApiClient } from '../../src/hooks/useApiClient'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'

// Types
interface Company {
  id: string
  name: string
  slug: string
  logo?: string
  businessType?: string
  timezone: string
  defaultCurrency: string
  status: 'trial' | 'active' | 'suspended' | 'canceled'
  createdAt: string
  updatedAt: string
  _count?: {
    branches: number
    users: number
  }
  license?: {
    id: string
    status: 'active' | 'expired' | 'suspended' | 'cancelled'
    daysRemaining: number
    expiresAt: string
    isExpired: boolean
    isNearExpiry: boolean
    features: string[]
  }
  invoices?: Invoice[]
}

interface Invoice {
  id: string
  invoiceNumber: string
  amount: number
  currency: string
  status: 'pending' | 'paid' | 'overdue'
  issuedAt: string
  dueAt: string
  downloadUrl?: string
}


// Zod schema for company validation
const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(100, 'Company name too long'),
  slug: z.string()
    .min(1, 'Company slug is required')
    .max(50, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .refine(val => !val.startsWith('-') && !val.endsWith('-'), 'Slug cannot start or end with hyphen'),
  businessType: z.string().optional(),
  timezone: z.string().default('Asia/Amman'),
  defaultCurrency: z.string().default('JOD'),
  licenseDuration: z.number().min(1).max(60).default(1),
})

const updateCompanySchema = createCompanySchema.extend({
  status: z.enum(['trial', 'active', 'suspended', 'canceled']).optional(),
})

type CreateCompanyForm = z.infer<typeof createCompanySchema>
type UpdateCompanyForm = z.infer<typeof updateCompanySchema>

// Common timezone options
const TIMEZONES = [
  { value: 'Asia/Amman', label: 'Asia/Amman (Jordan)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (UAE)' },
  { value: 'Asia/Riyadh', label: 'Asia/Riyadh (Saudi Arabia)' },
  { value: 'Europe/London', label: 'Europe/London (UK)' },
  { value: 'America/New_York', label: 'America/New_York (US Eastern)' },
]

// Common currencies
const CURRENCIES = [
  { value: 'JOD', label: 'JOD - Jordanian Dinar' },
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'SAR', label: 'SAR - Saudi Riyal' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
]

// License types
const LICENSE_TYPES = [
  { value: 'trial', label: 'Trial License', description: 'Limited trial access' },
  { value: 'active', label: 'Active License', description: '1 year full access' },
  { value: 'premium', label: 'Premium License', description: 'Premium features included' },
]


export default function CompaniesPage() {
  const { user } = useAuth()
  const { license } = useLicense()
  const { apiCall } = useApiClient()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showRenewalModal, setShowRenewalModal] = useState(false)
  const [renewalDays, setRenewalDays] = useState<number>(30)
  const [isRenewing, setIsRenewing] = useState(false)
  const [companyLicenses, setCompanyLicenses] = useState<{[key: string]: any}>({})
  const [loadingLicenses, setLoadingLicenses] = useState(false)

  // Form setup
  const createForm = useForm<CreateCompanyForm>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: {
      businessType: 'restaurant',
      timezone: 'Asia/Amman',
      defaultCurrency: 'JOD',
    },
  })

  const editForm = useForm<UpdateCompanyForm>({
    resolver: zodResolver(updateCompanySchema),
  })

  // Auto-generate slug from name
  const watchedName = createForm.watch('name')
  const watchedEditName = editForm.watch('name')

  useEffect(() => {
    if (watchedName) {
      const slug = watchedName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
      createForm.setValue('slug', slug)
    }
  }, [watchedName, createForm])

  useEffect(() => {
    if (watchedEditName && selectedCompany) {
      const slug = watchedEditName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
      editForm.setValue('slug', slug)
    }
  }, [watchedEditName, editForm, selectedCompany])

  // Fetch companies
  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiCall(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'}/companies`)
      if (data) {
        setCompanies(data || [])
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
      toast.error('Failed to load companies')
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  // Load companies on mount
  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchCompanies()
    }
  }, [fetchCompanies, user?.role])

  // Fetch license for a specific company
  const fetchCompanyLicense = useCallback(async (companyId: string) => {
    try {
      // Add timestamp to prevent caching issues
      const timestamp = new Date().getTime()
      const response = await apiCall(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'}/licenses/company/${companyId}?_t=${timestamp}`)
      if (response?.data) {
        // License data fetched successfully
        setCompanyLicenses(prev => ({ 
          ...prev, 
          [companyId]: response.data 
        }))
      }
    } catch (error) {
      console.error('Error fetching company license:', error)
    }
  }, [apiCall])

  // Memoized stats calculation
  const stats = useMemo(() => {
    return {
      activeCount: companies.filter(c => c.status === 'active').length,
      trialCount: companies.filter(c => c.status === 'trial').length,
      suspendedCount: companies.filter(c => c.status === 'suspended').length,
      totalBranches: companies.reduce((sum, c) => sum + (c._count?.branches || 0), 0),
    }
  }, [companies])

  // Fetch licenses for all companies when companies are loaded
  useEffect(() => {
    if (companies.length > 0) {
      companies.forEach(company => {
        fetchCompanyLicense(company.id)
      })
    }
  }, [companies, fetchCompanyLicense])

  // Create company
  const handleCreateCompany = useCallback(async (data: CreateCompanyForm) => {
    setSubmitting(true)
    try {
      const response = await apiCall(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'}/companies`, {
        method: 'POST',
        body: JSON.stringify(data),
      })

      if (response) {
        toast.success('Company created successfully!')
        createForm.reset()
        setShowCreateForm(false)
        fetchCompanies()
      }
    } catch (error) {
      console.error('Error creating company:', error)
      toast.error('Failed to create company')
    } finally {
      setSubmitting(false)
    }
  }, [apiCall, createForm, fetchCompanies])

  // Edit company
  const handleEditCompany = useCallback(async (data: UpdateCompanyForm) => {
    if (!selectedCompany) return
    
    setSubmitting(true)
    try {
      // Remove fields that shouldn't be sent to backend
      const { slug, licenseDuration, ...updateData } = data
      
      
      const response = await apiCall(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'}/companies/${selectedCompany.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      })

      if (response) {
        toast.success('Company updated successfully!')
        editForm.reset()
        setShowEditForm(false)
        setSelectedCompany(null)
        fetchCompanies()
        // Refresh license data after update
        setTimeout(() => {
          setCompanyLicenses({})
        }, 500)
      }
    } catch (error) {
      console.error('Error updating company:', error)
      toast.error('Failed to update company')
    } finally {
      setSubmitting(false)
    }
  }, [apiCall, editForm, fetchCompanies, selectedCompany])

  // Delete company
  const handleDeleteCompany = useCallback(async (companyId: string, companyName: string) => {
    if (!confirm(`Are you sure you want to delete "${companyName}"? This will permanently delete all associated branches and users. This action cannot be undone.`)) {
      return
    }

    try {
      const response = await apiCall(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'}/companies/${companyId}`, {
        method: 'DELETE',
      })

      if (response || response === '') { // DELETE returns 204 No Content
        toast.success('Company deleted successfully!')
        
        // Immediate UI update - remove the company from state
        setCompanies(prev => prev.filter(company => company.id !== companyId))
        
        // Also remove from license cache
        setCompanyLicenses(prev => {
          const updated = { ...prev }
          delete updated[companyId]
          return updated
        })
        
        // Refresh from server to ensure consistency
        fetchCompanies()
      }
    } catch (error) {
      console.error('Error deleting company:', error)
      toast.error('Failed to delete company')
    }
  }, [apiCall, fetchCompanies])

  // Open edit form
  const openEditForm = useCallback(async (company: Company) => {
    setSelectedCompany(company)
    
    // Fetch the company's license data
    await fetchCompanyLicense(company.id)
    const license = companyLicenses[company.id]
    
    editForm.reset({
      name: company.name,
      slug: company.slug,
      businessType: company.businessType || 'restaurant',
      timezone: company.timezone,
      defaultCurrency: company.defaultCurrency,
      status: company.status,
    })
    setShowEditForm(true)
  }, [editForm, fetchCompanyLicense, companyLicenses])

  // Open view modal
  const openViewModal = useCallback((company: Company) => {
    setSelectedCompany(company)
    fetchCompanyLicense(company.id)
    setShowViewModal(true)
  }, [fetchCompanyLicense])

  // Handle license renewal
  const handleRenewal = useCallback(async (companyId: string) => {
    setIsRenewing(true)
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'}/licenses/renew`;
      const payload = {
        durationDays: renewalDays,
        companyId: companyId, // Include companyId for super_admin
        amount: 0, // No payment processing in this version
        currency: 'USD'
      };
      
      
      const response = await apiCall(url, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      

      if (response && response.status === 'success') {
        toast.success(`License renewed for ${renewalDays} days`)
        setShowRenewalModal(false)
        setRenewalDays(30) // Reset to default
        
        // Refresh license data and companies list
        await new Promise(resolve => setTimeout(resolve, 500)) // Small delay to ensure backend processing is complete
        
        await fetchCompanyLicense(companyId)
        await fetchCompanies()
      } else {
        console.warn(`⚠️ Unexpected renewal response:`, response);
        toast.error('License renewal failed. Please check the logs.')
      }
    } catch (error) {
      console.error('💥 Renewal error:', error)
      toast.error('Failed to renew license. Please try again.')
    } finally {
      setIsRenewing(false)
    }
  }, [apiCall, fetchCompanies, fetchCompanyLicense, renewalDays])

  // Open renewal modal
  const openRenewalModal = useCallback((company: Company) => {
    setSelectedCompany(company)
    setShowRenewalModal(true)
  }, [])

  const getStatusBadge = (status: string) => {
    const statusColors = {
      trial: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      canceled: 'bg-red-100 text-red-800',
    }
    return statusColors[status as keyof typeof statusColors] || statusColors.trial
  }

  const getStatusLabel = (status: string) => {
    const statusLabels = {
      trial: 'Trial',
      active: 'Active',
      suspended: 'Suspended',
      canceled: 'Canceled',
    }
    return statusLabels[status as keyof typeof statusLabels] || 'Unknown'
  }

  const getLicenseStatusColor = useCallback((license: any) => {
    if (!license) return 'text-gray-500 bg-gray-100'
    if (license.isExpired) return 'text-red-600 bg-red-100'
    if (license.daysRemaining <= 7) return 'text-red-600 bg-red-100'
    if (license.daysRemaining <= 14) return 'text-orange-600 bg-orange-100'
    if (license.daysRemaining <= 30) return 'text-amber-600 bg-amber-100'
    return 'text-green-600 bg-green-100'
  }, [])

  const getLicenseStatusIcon = useCallback((license: any) => {
    if (!license) return <ClockIcon className="w-4 h-4" />
    if (license.isExpired || license.daysRemaining <= 7) {
      return <ExclamationTriangleIcon className="w-4 h-4" />
    }
    return <CheckCircleIcon className="w-4 h-4" />
  }, [])

  const formatTimeRemaining = useCallback((days: number) => {
    if (days >= 365) {
      const years = Math.floor(days / 365)
      const remainingDays = days % 365
      return `${years} year${years > 1 ? 's' : ''} ${remainingDays > 0 ? `${remainingDays} days` : ''}`
    } else if (days >= 30) {
      const months = Math.floor(days / 30)
      const remainingDays = days % 30
      return `${months} month${months > 1 ? 's' : ''} ${remainingDays > 0 ? `${remainingDays} days` : ''}`
    }
    return `${days} day${days > 1 ? 's' : ''}`
  }, [])

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["super_admin"]}>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <h2 className="text-xl font-semibold">Loading companies...</h2>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["super_admin"]}>
      <Head>
        <title>Company Management - Super Admin Dashboard</title>
        <meta name="description" content="Manage restaurant companies and brands" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        {/* License Warning Header */}
        <LicenseWarningHeader />
        
        {/* Header */}
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
                  <CompanyIcon className="w-5 h-5 text-gray-600" />
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">Company Management</h1>
                    <p className="text-sm text-gray-500">Manage restaurant brands and companies</p>
                  </div>
                </div>
              </div>
              
              {/* Right Side Actions */}
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Company
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Section */}
          <div className="mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Restaurant Companies</h2>
                  <p className="text-sm text-gray-600">Manage all restaurant brands and companies</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">{companies.length}</div>
                  <div className="text-sm text-gray-500">Total Companies</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">{stats.activeCount}</div>
                  <div className="text-xs text-gray-500 mt-1">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600">{stats.trialCount}</div>
                  <div className="text-xs text-gray-500 mt-1">Trial</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-yellow-600">{stats.suspendedCount}</div>
                  <div className="text-xs text-gray-500 mt-1">Suspended</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-600">{stats.totalBranches}</div>
                  <div className="text-xs text-gray-500 mt-1">Total Branches</div>
                </div>
              </div>
            </div>
          </div>

          {/* Companies List */}
          {companies.length === 0 ? (
            <div className="text-center py-12">
              <CompanyIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No companies found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first restaurant company.</p>
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {companies.map((company) => {
                const companyLicense = companyLicenses[company.id]
                
                
                return (
                <div key={company.id} className="bg-white rounded-lg shadow border p-6 hover:shadow-lg transition-shadow flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{company.name}</h3>
                      <p className="text-sm text-gray-500 mb-2">@{company.slug}</p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(company.status)}`}>
                        {getStatusLabel(company.status)}
                      </span>
                      {companyLicense && (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium space-x-1 ${getLicenseStatusColor(companyLicense)}`}>
                          {getLicenseStatusIcon(companyLicense)}
                          <span>
                            {companyLicense.isExpired ? 'Expired' : `${companyLicense.daysRemaining} days until expired`}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 flex-grow">
                    <p><strong>Business Type:</strong> {company.businessType || 'Restaurant'}</p>
                    <p><strong>Timezone:</strong> {company.timezone}</p>
                    <p><strong>Currency:</strong> {company.defaultCurrency}</p>
                    {company._count && (
                      <>
                        <p><strong>Branches:</strong> {company._count.branches}</p>
                        <p><strong>Users:</strong> {company._count.users}</p>
                      </>
                    )}
                    {companyLicense && (
                      <div className="pt-2 border-t border-gray-100">
                        <p><strong>License:</strong> {companyLicense.type} 
                          {companyLicense.expiresAt && (
                            <span className="text-xs text-gray-500 ml-1">
                              (expires {new Date(companyLicense.expiresAt).toLocaleDateString()})
                            </span>
                          )}
                        </p>
                        {/* Only show license days info to company owners, not super admins */}
                        {user?.role === 'company_owner' && (
                          <>
                            {companyLicense.isExpired ? (
                              <p className="text-red-600 font-medium text-xs">License expired - renewal required!</p>
                            ) : companyLicense.isNearExpiry ? (
                              <p className="text-amber-600 font-medium text-xs">Expires in {formatTimeRemaining(companyLicense.daysRemaining)}</p>
                            ) : (
                              <p className="text-green-600 font-medium text-xs">{formatTimeRemaining(companyLicense.daysRemaining)} remaining</p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openViewModal(company)}
                        className="inline-flex items-center px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
                      >
                        <EyeIcon className="w-3 h-3 mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => openEditForm(company)}
                        className="inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                      >
                        <PencilIcon className="w-3 h-3 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCompany(company.id, company.name)}
                        className="inline-flex items-center px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                      >
                        <TrashIcon className="w-3 h-3 mr-1" />
                        Delete
                      </button>
                    </div>
                    
                    {/* License Management - B2B Professional Style */}
                    {user?.role === 'super_admin' && companyLicense && companyLicense.id && (
                      <div className="flex items-center gap-2">
                        {/* License Status Indicator */}
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${
                            companyLicense.isExpired ? 'bg-red-500' : 
                            companyLicense.daysRemaining <= 30 ? 'bg-amber-500' : 'bg-green-500'
                          }`} />
                          <span className="text-xs text-gray-600 font-medium">
                            {companyLicense.daysRemaining} days
                          </span>
                        </div>
                        
                        {/* Extend License Button - Professional B2B Style */}
                        <button
                          onClick={() => openRenewalModal(company)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200"
                        >
                          <svg className="w-3 h-3 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Extend License
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )})
              }
            </div>
          )}
        </div>

        {/* Create Company Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl bg-white rounded-lg shadow-lg">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Create New Company</h3>
                  <p className="text-sm text-gray-600">Add a new restaurant brand or company</p>
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

              <form onSubmit={createForm.handleSubmit(handleCreateCompany)} className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                      <input
                        {...createForm.register('name')}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Pizza Palace"
                      />
                      {createForm.formState.errors.name && (
                        <p className="mt-1 text-sm text-red-600">{createForm.formState.errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Slug *</label>
                      <input
                        {...createForm.register('slug')}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="pizza-palace"
                      />
                      {createForm.formState.errors.slug && (
                        <p className="mt-1 text-sm text-red-600">{createForm.formState.errors.slug.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                    <input
                      {...createForm.register('businessType')}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Restaurant"
                    />
                    {createForm.formState.errors.businessType && (
                      <p className="mt-1 text-sm text-red-600">{createForm.formState.errors.businessType.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                      <select
                        {...createForm.register('timezone')}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        {TIMEZONES.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Default Currency</label>
                      <select
                        {...createForm.register('defaultCurrency')}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        {CURRENCIES.map((currency) => (
                          <option key={currency.value} value={currency.value}>
                            {currency.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* License Fields */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label htmlFor="licenseDuration" className="block text-sm font-medium text-gray-700 mb-1">
                        License Duration (months)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        {...createForm.register('licenseDuration', { valueAsNumber: true })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="1"
                      />
                      {createForm.formState.errors.licenseDuration && (
                        <p className="mt-1 text-sm text-red-600">{createForm.formState.errors.licenseDuration.message}</p>
                      )}
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
                    {submitting ? 'Creating...' : 'Create Company'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Company Modal */}
        {showEditForm && selectedCompany && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl bg-white rounded-lg shadow-lg">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Edit Company</h3>
                  <p className="text-sm text-gray-600">Update {selectedCompany.name} information</p>
                </div>
                <button
                  onClick={() => {
                    setShowEditForm(false)
                    setSelectedCompany(null)
                    editForm.reset()
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={editForm.handleSubmit(handleEditCompany)} className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                      <input
                        {...editForm.register('name')}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {editForm.formState.errors.name && (
                        <p className="mt-1 text-sm text-red-600">{editForm.formState.errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Slug</label>
                      <input
                        value={selectedCompany.slug}
                        disabled
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                      <p className="mt-1 text-xs text-gray-500">Slug cannot be changed after creation</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                    <input
                      {...editForm.register('businessType')}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        {...editForm.register('status')}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="trial">Trial</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="canceled">Canceled</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Default Currency</label>
                      <select
                        {...editForm.register('defaultCurrency')}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        {CURRENCIES.map((currency) => (
                          <option key={currency.value} value={currency.value}>
                            {currency.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                    <select
                      {...editForm.register('timezone')}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* License Fields */}
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditForm(false)
                      setSelectedCompany(null)
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
                    {submitting ? 'Updating...' : 'Update Company'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Company Modal */}
        {showViewModal && selectedCompany && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl bg-white rounded-lg shadow-lg">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Company Details</h3>
                  <p className="text-sm text-gray-600">View company information</p>
                </div>
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    setSelectedCompany(null)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Company Name</label>
                          <p className="text-sm text-gray-900 font-medium">{selectedCompany.name}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Slug</label>
                          <p className="text-sm text-gray-900">@{selectedCompany.slug}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Business Type</label>
                          <p className="text-sm text-gray-900">{selectedCompany.businessType || 'Restaurant'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Status</label>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedCompany.status)}`}>
                            {getStatusLabel(selectedCompany.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Settings</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Timezone</label>
                          <p className="text-sm text-gray-900">{selectedCompany.timezone}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Default Currency</label>
                          <p className="text-sm text-gray-900">{selectedCompany.defaultCurrency}</p>
                        </div>
                        {selectedCompany._count && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">Branches</label>
                              <p className="text-sm text-gray-900">{selectedCompany._count.branches}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">Users</label>
                              <p className="text-sm text-gray-900">{selectedCompany._count.users}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Created</label>
                        <p className="text-sm text-gray-900">{new Date(selectedCompany.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Last Updated</label>
                        <p className="text-sm text-gray-900">{new Date(selectedCompany.updatedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
                  <button
                    onClick={() => {
                      setShowViewModal(false)
                      setSelectedCompany(null)
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* License Renewal Modal - Professional B2B Style */}
        {showRenewalModal && selectedCompany && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto border w-full max-w-lg bg-white shadow-2xl">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Extend License Period</h3>
                    <p className="text-sm text-gray-600 mt-1">{selectedCompany.name}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowRenewalModal(false)
                      setRenewalDays(30)
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-6">
                {/* Current License Status */}
                {companyLicenses[selectedCompany.id] && (
                  <div className="mb-6 p-4 bg-gray-50 border-l-4 border-blue-500">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Current Expiry:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(companyLicenses[selectedCompany.id].expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-gray-600">Days Remaining:</span>
                      <span className="font-medium text-gray-900">
                        {companyLicenses[selectedCompany.id].daysRemaining} days
                      </span>
                    </div>
                  </div>
                )}

                {/* Extension Period Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Extension Period
                  </label>
                  
                  {/* Quick Select Options */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[30, 90, 365].map((days) => (
                      <button
                        key={days}
                        onClick={() => setRenewalDays(days)}
                        className={`px-3 py-2 text-sm font-medium border transition-colors ${
                          renewalDays === days
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {days} days
                      </button>
                    ))}
                  </div>
                  
                  {/* Custom Input */}
                  <div className="relative">
                    <label htmlFor="renewalDays" className="block text-xs font-medium text-gray-600 mb-1">
                      Custom Period (Days)
                    </label>
                    <input
                      type="number"
                      id="renewalDays"
                      min="1"
                      max="365"
                      value={renewalDays}
                      onChange={(e) => setRenewalDays(parseInt(e.target.value) || 30)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="30"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Maximum 365 days</p>
                </div>

                {/* New Expiry Preview */}
                {renewalDays > 0 && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200">
                    <div className="text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">New Expiry Date:</span>
                        <span className="font-semibold text-blue-900">
                          {companyLicenses[selectedCompany.id]?.expiresAt 
                            ? new Date(new Date(companyLicenses[selectedCompany.id].expiresAt).getTime() + (renewalDays * 24 * 60 * 60 * 1000)).toLocaleDateString()
                            : new Date(Date.now() + (renewalDays * 24 * 60 * 60 * 1000)).toLocaleDateString()
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowRenewalModal(false)
                      setRenewalDays(30)
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleRenewal(selectedCompany.id)}
                    disabled={!renewalDays || renewalDays <= 0 || isRenewing}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isRenewing ? 'Processing...' : 'Extend License'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}