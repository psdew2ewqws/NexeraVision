import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TruckIcon,
  MapPinIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';

interface DeliveryProvider {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive';
  estimatedTime: number;
  baseFee: number;
  distanceFee: number;
  priority: number;
  coverage: {
    maxDistance: number;
    areas: string[];
  };
  capabilities: string[];
  metadata: {
    color: string;
    region: string;
    description: string;
  };
}

interface OrderRequest {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: {
    street: string;
    area: string;
    city: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  restaurantBranchId: string;
  items: {
    name: string;
    quantity: number;
    price: number;
    modifiers?: string[];
  }[];
  notes?: string;
  scheduledTime?: Date;
  paymentMethod: 'cash' | 'card' | 'online';
  totalAmount: number;
  preferredProvider?: string;
}

interface ProviderSelection {
  providerId: string;
  estimatedCost: number;
  estimatedTime: number;
  confidence: number;
  reason: string;
}

interface OrderPlacementInterfaceProps {
  branchId?: string;
  onOrderPlaced?: (orderId: string) => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

export default function OrderPlacementInterface({ 
  branchId, 
  onOrderPlaced 
}: OrderPlacementInterfaceProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [orderRequest, setOrderRequest] = useState<OrderRequest>({
    customerName: '',
    customerPhone: '',
    customerAddress: {
      street: '',
      area: '',
      city: 'Amman'
    },
    restaurantBranchId: branchId || '',
    items: [],
    paymentMethod: 'cash',
    totalAmount: 0
  });

  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showProviderSelection, setShowProviderSelection] = useState(false);
  const [estimationLoading, setEstimationLoading] = useState(false);

  // Fetch available providers for the branch
  const { data: availableProviders = [], isLoading: providersLoading } = useQuery<DeliveryProvider[]>({
    queryKey: ['available-providers', orderRequest.restaurantBranchId],
    queryFn: async () => {
      if (!orderRequest.restaurantBranchId) return [];
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/delivery/providers/available/${orderRequest.restaurantBranchId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    enabled: !!orderRequest.restaurantBranchId
  });

  // Get provider selection recommendation
  const getProviderRecommendation = async (orderData: OrderRequest): Promise<ProviderSelection[]> => {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_BASE_URL}/delivery/providers/select`,
      {
        branchId: orderData.restaurantBranchId,
        deliveryAddress: orderData.customerAddress,
        orderValue: orderData.totalAmount,
        urgency: orderData.scheduledTime ? 'scheduled' : 'immediate',
        customerType: orderData.customerId ? 'registered' : 'guest'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.recommendations;
  };

  // Place order mutation
  const placeOrderMutation = useMutation({
    mutationFn: async (finalOrderData: OrderRequest & { providerId: string }) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/delivery/orders`,
        finalOrderData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['delivery-orders']);
      onOrderPlaced?.(data.id);
    }
  });

  const handleGetRecommendation = async () => {
    if (!orderRequest.customerAddress.street || !orderRequest.customerAddress.area || orderRequest.totalAmount === 0) {
      alert('Please fill in customer address and order items first');
      return;
    }

    setEstimationLoading(true);
    try {
      const recommendations = await getProviderRecommendation(orderRequest);
      if (recommendations.length > 0) {
        setSelectedProvider(recommendations[0].providerId);
        setShowProviderSelection(true);
      }
    } catch (error) {
      console.error('Error getting provider recommendation:', error);
      alert('Error getting provider recommendation. Please try again.');
    } finally {
      setEstimationLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedProvider) {
      alert('Please select a delivery provider');
      return;
    }

    if (!orderRequest.customerName || !orderRequest.customerPhone) {
      alert('Please fill in customer details');
      return;
    }

    try {
      await placeOrderMutation.mutateAsync({
        ...orderRequest,
        providerId: selectedProvider
      });
      alert('Order placed successfully!');
      // Reset form
      setOrderRequest({
        customerName: '',
        customerPhone: '',
        customerAddress: { street: '', area: '', city: 'Amman' },
        restaurantBranchId: branchId || '',
        items: [],
        paymentMethod: 'cash',
        totalAmount: 0
      });
      setSelectedProvider(null);
      setShowProviderSelection(false);
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Error placing order. Please try again.');
    }
  };

  const addItem = () => {
    setOrderRequest(prev => ({
      ...prev,
      items: [...prev.items, { name: '', quantity: 1, price: 0 }]
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setOrderRequest(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeItem = (index: number) => {
    setOrderRequest(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    const itemsTotal = orderRequest.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setOrderRequest(prev => ({ ...prev, totalAmount: itemsTotal }));
  };

  useEffect(() => {
    calculateTotal();
  }, [orderRequest.items]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Place Delivery Order</h1>
        <p className="text-gray-600">Smart provider selection for optimal delivery experience</p>
      </div>

      {/* Customer Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <UserIcon className="h-5 w-5 mr-2" />
          Customer Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              value={orderRequest.customerName}
              onChange={(e) => setOrderRequest(prev => ({ ...prev, customerName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter customer name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              value={orderRequest.customerPhone}
              onChange={(e) => setOrderRequest(prev => ({ ...prev, customerPhone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="+962 XX XXX XXXX"
            />
          </div>
        </div>
      </div>

      {/* Delivery Address */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MapPinIcon className="h-5 w-5 mr-2" />
          Delivery Address
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Address *
            </label>
            <input
              type="text"
              value={orderRequest.customerAddress.street}
              onChange={(e) => setOrderRequest(prev => ({
                ...prev,
                customerAddress: { ...prev.customerAddress, street: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Building name, street, area"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Area *
            </label>
            <input
              type="text"
              value={orderRequest.customerAddress.area}
              onChange={(e) => setOrderRequest(prev => ({
                ...prev,
                customerAddress: { ...prev.customerAddress, area: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Area/District"
            />
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <BuildingOfficeIcon className="h-5 w-5 mr-2" />
            Order Items
          </h2>
          <button
            onClick={addItem}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Item
          </button>
        </div>

        <div className="space-y-3">
          {orderRequest.items.map((item, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateItem(index, 'name', e.target.value)}
                placeholder="Item name"
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                min="1"
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <input
                type="number"
                value={item.price}
                onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                step="0.01"
                placeholder="Price"
                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <button
                onClick={() => removeItem(index)}
                className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
              >
                Remove
              </button>
            </div>
          ))}

          {orderRequest.items.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400 mb-2" />
              <p>No items added yet. Click "Add Item" to get started.</p>
            </div>
          )}
        </div>

        {orderRequest.items.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
              <span className="text-xl font-bold text-blue-600">
                ${orderRequest.totalAmount.toFixed(2)} JOD
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Provider Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TruckIcon className="h-5 w-5 mr-2" />
          Delivery Provider Selection
        </h2>

        {!showProviderSelection ? (
          <div className="text-center py-8">
            <CogIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">Get intelligent provider recommendations based on your order</p>
            <button
              onClick={handleGetRecommendation}
              disabled={estimationLoading || !orderRequest.customerAddress.street || orderRequest.totalAmount === 0}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto"
            >
              {estimationLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <ArrowRightIcon className="h-4 w-4 mr-2" />
              )}
              {estimationLoading ? 'Getting Recommendations...' : 'Get Provider Recommendations'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableProviders.map((provider) => (
                <div
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedProvider === provider.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <TruckIcon className="h-6 w-6 text-gray-600 mr-2" />
                      <h3 className="font-semibold text-gray-900">{provider.name}</h3>
                    </div>
                    {selectedProvider === provider.id && (
                      <CheckCircleIcon className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-2" />
                      <span>{provider.estimatedTime} mins</span>
                    </div>
                    <div className="flex items-center">
                      <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                      <span>{provider.baseFee} JOD base fee</span>
                    </div>
                    <div className="flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-2" />
                      <span>{provider.metadata.region}</span>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${provider.metadata.color}`}>
                      {provider.metadata.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Order Actions */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => {
            setShowProviderSelection(false);
            setSelectedProvider(null);
          }}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Reset
        </button>
        <button
          onClick={handlePlaceOrder}
          disabled={!selectedProvider || placeOrderMutation.isLoading}
          className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {placeOrderMutation.isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <CheckCircleIcon className="h-4 w-4 mr-2" />
          )}
          {placeOrderMutation.isLoading ? 'Placing Order...' : 'Place Order'}
        </button>
      </div>
    </div>
  );
}