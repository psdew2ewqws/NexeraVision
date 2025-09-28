import React, { useState, useEffect, useMemo } from 'react'
import {
  ClockIcon,
  TruckIcon,
  PhoneIcon,
  ComputerDesktopIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  FunnelIcon,
  EyeIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  modifiers?: string[]
}

interface Customer {
  name: string
  phone: string
  address?: string
}

interface Order {
  id: string
  orderNumber: string
  customer: Customer
  items: OrderItem[]
  total: number
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled'
  source: 'careem' | 'talabat' | 'deliveroo' | 'jahez' | 'phone' | 'web' | 'pos'
  timestamp: Date
  estimatedDelivery?: Date
  branch: string
  paymentMethod: 'cash' | 'card' | 'online'
  deliveryType: 'pickup' | 'delivery'
  priority: 'normal' | 'high' | 'urgent'
  notes?: string
}

interface OrderStreamProps {
  viewMode: 'overview' | 'detailed'
  onRefresh: () => void
}

const OrderStream: React.FC<OrderStreamProps> = ({ viewMode, onRefresh }) => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'completed'>('all')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'delivery' | 'direct'>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Mock data - replace with real API calls
  const mockOrders: Order[] = [
    {
      id: 'ord_001',
      orderNumber: '#1247',
      customer: { name: 'Ahmed Al-Rashid', phone: '+962791234567', address: 'Downtown Amman' },
      items: [
        { id: '1', name: 'Mansaf Large', quantity: 1, price: 18.50, modifiers: ['Extra Rice'] },
        { id: '2', name: 'Hummus', quantity: 2, price: 4.50 }
      ],
      total: 27.50,
      status: 'confirmed',
      source: 'careem',
      timestamp: new Date(Date.now() - 300000), // 5 minutes ago
      estimatedDelivery: new Date(Date.now() + 1800000), // 30 minutes from now
      branch: 'Downtown',
      paymentMethod: 'online',
      deliveryType: 'delivery',
      priority: 'normal'
    },
    {
      id: 'ord_002',
      orderNumber: '#1248',
      customer: { name: 'Sarah Johnson', phone: '+962797654321' },
      items: [
        { id: '3', name: 'Shawarma Plate', quantity: 1, price: 8.50 },
        { id: '4', name: 'French Fries', quantity: 1, price: 3.00 },
        { id: '5', name: 'Coca Cola', quantity: 2, price: 2.50 }
      ],
      total: 16.50,
      status: 'preparing',
      source: 'talabat',
      timestamp: new Date(Date.now() - 600000), // 10 minutes ago
      branch: 'Mall Branch',
      paymentMethod: 'cash',
      deliveryType: 'pickup',
      priority: 'high',
      notes: 'No onions please'
    },
    {
      id: 'ord_003',
      orderNumber: '#1249',
      customer: { name: 'Mohammed Hassan', phone: '+962799876543' },
      items: [
        { id: '6', name: 'Mixed Grill', quantity: 1, price: 22.00 },
        { id: '7', name: 'Tabbouleh', quantity: 1, price: 5.50 }
      ],
      total: 27.50,
      status: 'ready',
      source: 'phone',
      timestamp: new Date(Date.now() - 900000), // 15 minutes ago
      branch: 'Airport',
      paymentMethod: 'card',
      deliveryType: 'delivery',
      priority: 'urgent'
    }
  ]

  // Simulate loading and data fetching
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true)
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setOrders(mockOrders)
      setLoading(false)
    }

    fetchOrders()
  }, [])

  // Auto-refresh orders
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      // In real implementation, fetch updated orders
      onRefresh()
    }, 10000) // Refresh every 10 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, onRefresh])

  // Get source icon and color
  const getSourceDisplay = (source: string) => {
    switch (source) {
      case 'careem':
        return { icon: TruckIcon, color: 'text-green-600', bg: 'bg-green-50', name: 'Careem' }
      case 'talabat':
        return { icon: TruckIcon, color: 'text-orange-600', bg: 'bg-orange-50', name: 'Talabat' }
      case 'deliveroo':
        return { icon: TruckIcon, color: 'text-cyan-600', bg: 'bg-cyan-50', name: 'Deliveroo' }
      case 'jahez':
        return { icon: TruckIcon, color: 'text-purple-600', bg: 'bg-purple-50', name: 'Jahez' }
      case 'phone':
        return { icon: PhoneIcon, color: 'text-blue-600', bg: 'bg-blue-50', name: 'Phone' }
      case 'web':
        return { icon: ComputerDesktopIcon, color: 'text-indigo-600', bg: 'bg-indigo-50', name: 'Web' }
      case 'pos':
        return { icon: ComputerDesktopIcon, color: 'text-gray-600', bg: 'bg-gray-50', name: 'POS' }
      default:
        return { icon: ComputerDesktopIcon, color: 'text-gray-600', bg: 'bg-gray-50', name: 'Unknown' }
    }
  }

  // Get status color and icon
  const getStatusDisplay = (status: string, priority: string = 'normal') => {
    const baseConfig = {
      pending: { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'Pending' },
      confirmed: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Confirmed' },
      preparing: { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', label: 'Preparing' },
      ready: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Ready' },
      picked_up: { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Picked Up' },
      delivered: { color: 'text-green-700', bg: 'bg-green-100', border: 'border-green-300', label: 'Delivered' },
      cancelled: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Cancelled' }
    }

    const config = baseConfig[status as keyof typeof baseConfig] || baseConfig.pending

    // Add priority styling
    if (priority === 'urgent') {
      return { ...config, border: 'border-red-300 border-2', bg: 'bg-red-50' }
    } else if (priority === 'high') {
      return { ...config, border: 'border-orange-300 border-2' }
    }

    return config
  }

  // Filter orders
  const filteredOrders = useMemo(() => {
    let filtered = orders

    // Status filter
    if (filter !== 'all') {
      if (filter === 'active') {
        filtered = filtered.filter(order => ['confirmed', 'preparing', 'ready'].includes(order.status))
      } else if (filter === 'completed') {
        filtered = filtered.filter(order => ['picked_up', 'delivered', 'cancelled'].includes(order.status))
      } else {
        filtered = filtered.filter(order => order.status === filter)
      }
    }

    // Source filter
    if (sourceFilter !== 'all') {
      if (sourceFilter === 'delivery') {
        filtered = filtered.filter(order => ['careem', 'talabat', 'deliveroo', 'jahez'].includes(order.source))
      } else if (sourceFilter === 'direct') {
        filtered = filtered.filter(order => ['phone', 'web', 'pos'].includes(order.source))
      }
    }

    // Sort by timestamp (newest first)
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }, [orders, filter, sourceFilter])

  // Format time
  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'JOD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Live Order Stream</h3>
          <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-600" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-gray-100 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Live Order Stream</h3>
        <div className="flex items-center space-x-3">
          {/* Auto Refresh Toggle */}
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Auto refresh</span>
          </label>

          {/* Manual Refresh */}
          <button
            onClick={onRefresh}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <FunnelIcon className="w-4 h-4 text-gray-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Source Filter */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as any)}
          className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Sources</option>
          <option value="delivery">Delivery Platforms</option>
          <option value="direct">Direct Orders</option>
        </select>

        {/* Order Count */}
        <span className="text-sm text-gray-600">
          {filteredOrders.length} orders
        </span>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.map((order) => {
          const sourceDisplay = getSourceDisplay(order.source)
          const statusDisplay = getStatusDisplay(order.status, order.priority)

          return (
            <div
              key={order.id}
              className={`border rounded-lg p-4 transition-all hover:shadow-md ${statusDisplay.border} ${statusDisplay.bg}`}
            >
              <div className={`flex items-center justify-between ${
                viewMode === 'detailed' ? 'mb-4' : ''
              }`}>
                {/* Order Header */}
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {/* Source Badge */}
                  <div className={`w-8 h-8 ${sourceDisplay.bg} rounded-lg flex items-center justify-center`}>
                    <sourceDisplay.icon className={`w-4 h-4 ${sourceDisplay.color}`} />
                  </div>

                  {/* Order Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-900">{order.orderNumber}</span>
                      <span className="text-sm text-gray-500">via {sourceDisplay.name}</span>
                      {order.priority !== 'normal' && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          order.priority === 'urgent'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {order.priority}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {order.customer.name} • {order.branch} • {formatTime(order.timestamp)}
                    </div>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="flex items-center space-x-4 flex-shrink-0">
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(order.total)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {order.items.length} items
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusDisplay.color} ${statusDisplay.bg} border ${statusDisplay.border}`}>
                    {statusDisplay.label}
                  </span>
                </div>
              </div>

              {/* Detailed View */}
              {viewMode === 'detailed' && (
                <div className="pt-4 border-t border-gray-200">
                  {/* Items */}
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Order Items:</h5>
                    <div className="space-y-1">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            {item.quantity}x {item.name}
                            {item.modifiers && item.modifiers.length > 0 && (
                              <span className="text-gray-500"> ({item.modifiers.join(', ')})</span>
                            )}
                          </span>
                          <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Phone:</span>
                      <div className="font-medium">{order.customer.phone}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Payment:</span>
                      <div className="font-medium capitalize">{order.paymentMethod}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <div className="font-medium capitalize">{order.deliveryType}</div>
                    </div>
                    {order.estimatedDelivery && (
                      <div>
                        <span className="text-gray-500">ETA:</span>
                        <div className="font-medium">
                          {new Date(order.estimatedDelivery).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {order.notes && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <span className="text-sm text-yellow-800">
                        <strong>Notes:</strong> {order.notes}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* No orders state */}
      {filteredOrders.length === 0 && !loading && (
        <div className="text-center py-8">
          <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No orders found</p>
          <p className="text-sm text-gray-400 mt-1">
            {filter !== 'all' || sourceFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Orders will appear here as they come in'
            }
          </p>
        </div>
      )}
    </div>
  )
}

export default OrderStream