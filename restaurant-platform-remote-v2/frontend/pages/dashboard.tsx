import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import { useLanguage } from '../src/contexts/LanguageContext'
import { useAuth } from '../src/contexts/AuthContext'
import ProtectedRoute from '../src/components/shared/ProtectedRoute'
import LicenseWarningHeader from '../src/components/shared/LicenseWarningHeader'
import { 
  ChartBarIcon,
  ClockIcon,
  DocumentTextIcon,
  DocumentArrowDownIcon,
  BuildingOfficeIcon,
  CakeIcon,
  TagIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  SpeakerWaveIcon,
  PrinterIcon,
  ChatBubbleLeftRightIcon,
  TruckIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon
} from '@heroicons/react/24/outline'
import { 
  CheckCircleIcon as CheckCircleIconSolid,
  ExclamationCircleIcon as ExclamationCircleIconSolid,
  ClockIcon as ClockIconSolid
} from '@heroicons/react/24/solid'

// Import advanced components
import { PremiumButton, ButtonGroup, ProfessionalCard } from '../src/components/shared/PremiumButton'

// Mock data
const mockRealtimeMetrics = {
  revenue: { today: 24567.89, trend: '+8.5%' },
  orders: { total: 147, pending: 12 },
  performance: { avgOrderValue: 167.23 },
  branches: [
    { id: 'BR-001', name: 'Downtown', orders: 45, revenue: 7234.56, staff: 12 },
    { id: 'BR-002', name: 'Mall Branch', orders: 38, revenue: 6189.23, staff: 9 },
    { id: 'BR-003', name: 'Airport', orders: 42, revenue: 6834.12, staff: 11 },
    { id: 'BR-004', name: 'City Center', orders: 22, revenue: 4309.98, staff: 7 }
  ]
}

// Static mock data to prevent hydration mismatches
const mockLiveOrders = [
  { id: 'ORD-001', orderNumber: '#1247', customer: { name: 'Ahmed Al-Rashid', phone: '+971501234567' }, total: 89.50, status: 'confirmed', branch: 'Downtown', timestamp: new Date('2025-08-27T02:55:00.000Z') },
  { id: 'ORD-002', orderNumber: '#1248', customer: { name: 'Sarah Johnson', phone: '+971507654321' }, total: 156.75, status: 'preparing', branch: 'Mall Branch', timestamp: new Date('2025-08-27T02:58:00.000Z') },
  { id: 'ORD-003', orderNumber: '#1249', customer: { name: 'Mohammed Hassan', phone: '+971509876543' }, total: 203.25, status: 'ready', branch: 'Airport', timestamp: new Date('2025-08-27T03:00:00.000Z') }
]

const systemHealth = [
  { component: 'Database', status: 'healthy', uptime: '99.9%', latency: '12ms' },
  { component: 'POS Integration', status: 'healthy', uptime: '98.7%', latency: '45ms' },
  { component: 'Payment Gateway', status: 'healthy', uptime: '99.2%', latency: '89ms' },
  { component: 'Phone System', status: 'maintenance', uptime: '95.1%', latency: 'N/A' }
]

// Optimized StatsCard component with React.memo and Arabic support
const StatsCard = memo(({ title, value, trend, icon: Icon, className = "" }: {
  title: string;
  value: string;
  trend?: string;
  icon: any;
  className?: string;
}) => (
  <div className={`stats-card ${className} min-h-[100px] max-h-[120px]`}>
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-medium text-gray-500 leading-tight truncate flex-1 pr-2">{title}</h3>
      <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
    </div>
    <div className="flex items-baseline space-x-2">
      <span className="text-xl md:text-2xl font-bold text-gray-900 ltr-numbers truncate">
        {value}
      </span>
      {trend && (
        <span className="text-xs md:text-sm font-medium text-emerald-600 flex items-center flex-shrink-0">
          <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />
          {trend}
        </span>
      )}
    </div>
  </div>
))

StatsCard.displayName = 'StatsCard'

export default function Dashboard() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [currentTime, setCurrentTime] = useState(new Date(0)) // Initialize with epoch to avoid hydration mismatch
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [currency, setCurrency] = useState('JOD')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<number[]>([0])
  const { language, setLanguage, t } = useLanguage()

  // Optimize toggleGroup with useCallback
  const toggleGroup = useCallback((groupIndex: number) => {
    setExpandedGroups(prev => 
      prev.includes(groupIndex) 
        ? prev.filter(index => index !== groupIndex)
        : [...prev, groupIndex]
    )
  }, [])

  // Authentication check
  useEffect(() => {
    if (user) {
      // Check if user has access to dashboard (management roles only)
      const allowedRoles = ['super_admin', 'company_owner', 'branch_manager']
      if (!allowedRoles.includes(user.role)) {
        toast.error('Access denied. Dashboard is for management only.')
        logout()
        return
      }
    }
  }, [user, logout])

  // Logout function
  const handleLogout = useCallback(async () => {
    try {
      logout()
    } catch (error) {
      console.error('Logout error:', error)
      logout()
    }
  }, [logout])

  // Live time updates - fixed hydration
  useEffect(() => {
    // Set mounted flag and initial time after component mounts
    setMounted(true)
    setCurrentTime(new Date())
    
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])

  // Memoize currency configuration for performance
  const currencyConfig = useMemo(() => ({
    JOD: { locale: 'en-US', currency: 'JOD' },
    AED: { locale: 'en-US', currency: 'AED' },
    USD: { locale: 'en-US', currency: 'USD' },
    EUR: { locale: 'en-US', currency: 'EUR' }
  }), [])

  // Memoize formatter to avoid recreation on every render
  const currencyFormatter = useMemo(() => {
    const config = currencyConfig[currency as keyof typeof currencyConfig] || currencyConfig.JOD
    return new Intl.NumberFormat(config.locale, { 
      style: 'currency', 
      currency: config.currency,
      minimumFractionDigits: 2
    })
  }, [currency, currencyConfig])

  // Optimize formatCurrency with useCallback
  const formatCurrency = useCallback((amount: number) => {
    return currencyFormatter.format(amount)
  }, [currencyFormatter])

  // Memoize time formatter for performance
  const timeFormatter = useMemo(() => new Intl.DateTimeFormat('en-US', { 
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }), [])

  const formatTime = useCallback((date: Date) => {
    // Avoid hydration mismatch by showing placeholder until mounted
    if (!mounted || !date || date.getTime() === new Date(0).getTime()) {
      return '--:--:--'
    }
    return timeFormatter.format(date)
  }, [timeFormatter, mounted])

  // Debug user role
  useEffect(() => {
    console.log('Dashboard user object:', user);
    console.log('User role:', user?.role);
    console.log('Is super_admin?', user?.role === 'super_admin');
  }, [user]);

  // Memoize business modules to avoid recreation on every render
  const businessModules = useMemo(() => [
    {
      id: 'analytics',
      title: 'Analytics & Operations',
      icon: ChartBarIcon,
      items: [
        { name: 'Charts & Reports', href: '/analytics/reports', icon: ChartBarIcon },
        { name: 'Live Orders', href: '/operations/live-orders', icon: ClockIcon },
        { name: 'Order History', href: '/operations/history', icon: DocumentTextIcon }
      ]
    },
    {
      id: 'branches',
      title: 'Branches',
      icon: BuildingOfficeIcon,
      items: [
        { name: 'Manage Branches', href: '/branches', icon: BuildingOfficeIcon }
      ]
    },
    {
      id: 'menu',
      title: 'Menu Management',
      icon: CakeIcon,
      items: [
        { name: 'Products & Menus', href: '/menu/products', icon: CakeIcon },
        { name: 'Availability', href: '/menu/availability', icon: ClockIcon },
        { name: 'Discounts & Promocodes', href: '/menu/promotions', icon: TagIcon }
      ]
    },
    {
      id: 'customers',
      title: 'Customer Management',
      icon: UserGroupIcon,
      items: [
        { name: 'Customer Info', href: '/customers', icon: UserGroupIcon },
        { name: 'Complaints', href: '/customers/complaints', icon: ExclamationTriangleIcon },
        { name: 'Blacklist', href: '/customers/blacklist', icon: XMarkIcon }
      ]
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: UsersIcon,
      items: [
        { name: 'Sounds', href: '/settings/sounds', icon: SpeakerWaveIcon },
        { name: 'Printing', href: '/settings/printing', icon: PrinterIcon },
        { name: 'Chatbot', href: '/settings/chatbot', icon: ChatBubbleLeftRightIcon },
        { name: 'Delivery', href: '/settings/delivery', icon: TruckIcon },
        { name: 'Users', href: '/settings/users', icon: UsersIcon },
        ...(user?.role === 'super_admin' ? [
          { name: 'Companies', href: '/settings/companies', icon: BuildingOfficeIcon }
        ] : []),
        { name: 'Phone Ordering', href: '/settings/phone', icon: PhoneIcon }
      ]
    }
  ], [user])

  // Memoize order status configurations
  const orderStatusConfigs = useMemo(() => ({
    confirmed: { color: 'bg-blue-100 text-blue-800' },
    preparing: { color: 'bg-amber-100 text-amber-800' },
    ready: { color: 'bg-emerald-100 text-emerald-800' },
    delivered: { color: 'bg-gray-100 text-gray-800' }
  }), [])

  const getOrderStatusConfig = useCallback((status: string) => {
    return orderStatusConfigs[status as keyof typeof orderStatusConfigs] || orderStatusConfigs.confirmed
  }, [orderStatusConfigs])

  // Memoize stats data for performance
  const statsData = useMemo(() => [
    {
      title: t('todays_sales'),
      value: formatCurrency(mockRealtimeMetrics.revenue.today),
      trend: mockRealtimeMetrics.revenue.trend,
      icon: CurrencyDollarIcon
    },
    {
      title: t('orders_today'),
      value: mockRealtimeMetrics.orders.total.toString(),
      trend: `${mockRealtimeMetrics.orders.pending} pending`,
      icon: ShoppingBagIcon
    },
    {
      title: t('avg_order_value'),
      value: formatCurrency(mockRealtimeMetrics.performance.avgOrderValue),
      icon: BanknotesIcon
    },
    {
      title: t('active_branches'),
      value: mockRealtimeMetrics.branches.length.toString(),
      trend: 'all active',
      icon: BuildingOfficeIcon
    }
  ], [t, formatCurrency])

  return (
    <ProtectedRoute>
      <Head>
        <title>Restaurant Management Dashboard</title>
      </Head>
      
      {/* Clean Professional Dashboard - Always LTR */}
      <div className="min-h-screen bg-gray-50 dashboard-layout">
        {/* License Warning Header - Always at the top */}
        <LicenseWarningHeader />
        {/* Compact Professional Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <div className="flex justify-between items-center h-16">
              {/* Compact Branding */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-white text-sm font-bold">RM</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">
                    {t('restaurant_management')}
                  </h1>
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    <span className="text-xs text-gray-600 font-medium uppercase">
                      {t('system_online')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Compact Controls */}
              <div className="flex items-center space-x-3">
                {/* Language Switcher */}
                <div className="flex items-center bg-gray-100 rounded-md p-0.5">
                  <button
                    onClick={() => setLanguage('en')}
                    className={`px-2 py-1 text-xs font-semibold rounded transition-colors ${
                      language === 'en' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setLanguage('ar')}
                    className={`px-2 py-1 text-xs font-semibold rounded transition-colors ${
                      language === 'ar' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    AR
                  </button>
                </div>

                {/* Compact Notification Bell */}
                <div className="relative">
                  <button className="p-1.5 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
                    <BellIcon className="w-4 h-4" />
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      3
                    </span>
                  </button>
                </div>

                {/* Time */}
                <div className="text-xs text-gray-500 font-mono">
                  {formatTime(currentTime)}
                </div>

                {/* Styled Logout Button */}
                <button 
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-200 hover:border-gray-300 transition-all duration-200"
                >
                  {t('logout')}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation Tabs - Centered */}
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="px-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>
              
              {/* Desktop Navigation Tabs - Centered */}
              <div className="hidden md:flex space-x-1 justify-center flex-1">
                {['overview', 'analytics', 'orders', 'operations', 'settings'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-4 px-4 border-b-2 font-medium text-sm capitalize transition-colors ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {t(tab)}
                  </button>
                ))}
              </div>
              
              {/* Export & Mobile Navigation */}
              <div className="flex items-center space-x-reverse space-x-4">
                {/* Subtle Export Button */}
                <button className="hidden md:flex items-center space-x-2 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <DocumentArrowDownIcon className="w-4 h-4" />
                  <span className="text-sm">Export</span>
                </button>
                
                {/* Mobile Navigation Dropdown */}
                <div className="md:hidden">
                  <select 
                    value={activeTab}
                    onChange={(e) => setActiveTab(e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1"
                  >
                    {['overview', 'analytics', 'orders', 'operations', 'settings'].map((tab) => (
                      <option key={tab} value={tab}>{t(tab)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Dashboard Layout - Left to Right */}
        <div className="flex min-h-screen bg-gray-50">
          {/* Left Sidebar - Restaurant Management */}
          <aside className="w-80 lg:w-80 md:w-72 sm:w-64 bg-white flex-shrink-0 border-r border-gray-200 overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 leading-tight">
                {t('management_sections')}
              </h2>
              
              {/* Management Groups - Simple Clean Design */}
              <div className="grid grid-cols-1 gap-4">
                {businessModules.map((group, groupIndex) => (
                  <div key={groupIndex} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {/* Group Header - Simple */}
                    <div 
                      className="flex items-center justify-between p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleGroup(groupIndex)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                          <group.icon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">{group.title}</h3>
                          <p className="text-xs text-gray-500 truncate">{group.items.length} options</p>
                        </div>
                      </div>
                      <ChevronDownIcon 
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          expandedGroups.includes(groupIndex) ? 'rotate-180' : ''
                        }`} 
                      />
                    </div>
                    
                    {/* Group Items - Simple Grid Layout */}
                    {expandedGroups.includes(groupIndex) && (
                      <div className="p-3">
                        <div className="grid grid-cols-1 gap-1">
                          {group.items.map((item, itemIndex) => (
                            <Link key={itemIndex} href={item.href || '#'}>
                              <div className="flex items-center p-3 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer group">
                                <item.icon className="w-4 h-4 text-gray-400 group-hover:text-blue-500 mr-3 flex-shrink-0" />
                                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 truncate">
                                  {item.name}
                                </span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </aside>
          
          {/* Main Content Area - Clean Design */}
          <main className="flex-1 px-4 md:px-6 py-4 md:py-8">
            <div className="max-w-7xl mx-auto">

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <>
                  {/* Key Performance Indicators */}
                  <section className="mb-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                      {statsData.map((stat, index) => (
                        <StatsCard
                          key={`${stat.title}-${index}`}
                          title={stat.title}
                          value={stat.value}
                          trend={stat.trend}
                          icon={stat.icon}
                        />
                      ))}
                    </div>
                  </section>

                  {/* Live Orders Section */}
                  <section className="mb-8">
                    <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4 leading-tight">Live Orders</h2>
                    <div className="space-y-3">
                      {mockLiveOrders.map((order) => {
                        const statusConfig = getOrderStatusConfig(order.status)
                        return (
                          <div key={order.id} className="live-order-card max-h-[80px] overflow-hidden">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 flex-1 min-w-0">
                                <div className="flex flex-col min-w-0">
                                  <span className="font-medium text-gray-900 text-sm truncate">{order.orderNumber}</span>
                                  <span className="text-xs text-gray-500 truncate">{order.customer.name}</span>
                                </div>
                                <div className="text-xs text-gray-600 hidden sm:block truncate">
                                  {order.branch} • {formatTime(order.timestamp)}
                                </div>
                              </div>
                              <div className="flex items-center space-x-3 flex-shrink-0">
                                <span className="font-semibold text-gray-900 ltr-numbers text-sm">{formatCurrency(order.total)}</span>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color} whitespace-nowrap`}>
                                  {order.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                </>
              )}

              {/* Settings Tab with Currency Configuration */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">System Settings</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">General Configuration</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Restaurant Name</label>
                            <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" defaultValue="Your Restaurant Chain" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Default Currency</label>
                            <select 
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                              value={currency}
                              onChange={(e) => setCurrency(e.target.value)}
                            >
                              <option value="JOD">JOD - Jordanian Dinar</option>
                              <option value="AED">AED - UAE Dirham</option>
                              <option value="USD">USD - US Dollar</option>
                              <option value="EUR">EUR - Euro</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Language Settings</h3>
                        <div className="space-y-4">
                          <div className="flex items-center space-x-4">
                            <PremiumButton
                              variant={language === 'en' ? 'primary' : 'outline'}
                              size="sm"
                              onClick={() => setLanguage('en')}
                            >
                              English
                            </PremiumButton>
                            <PremiumButton
                              variant={language === 'ar' ? 'primary' : 'outline'}
                              size="sm"
                              onClick={() => setLanguage('ar')}
                            >
                              العربية
                            </PremiumButton>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex justify-end space-x-3">
                        <PremiumButton variant="outline" size="md">
                          Reset to Defaults
                        </PremiumButton>
                        <PremiumButton variant="primary" size="md">
                          Save Settings
                        </PremiumButton>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Other tabs content */}
              {activeTab === 'analytics' && (
                <div className="bg-white rounded-lg p-6 border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Analytics Dashboard</h2>
                  <p className="text-gray-600">Advanced analytics features coming soon...</p>
                </div>
              )}
              
              {activeTab === 'orders' && (
                <div className="bg-white rounded-lg p-6 border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Management</h2>
                  <p className="text-gray-600">Order management features coming soon...</p>
                </div>
              )}
              
              {activeTab === 'operations' && (
                <div className="bg-white rounded-lg p-6 border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Operations Center</h2>
                  <p className="text-gray-600">Operations management features coming soon...</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}