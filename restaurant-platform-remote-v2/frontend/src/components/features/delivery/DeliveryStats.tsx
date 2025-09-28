import { useQuery } from '@tanstack/react-query';
import { ChartBarIcon, TruckIcon, MapPinIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

export default function DeliveryStats() {
  // Fetch delivery statistics
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['deliveryStats'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/delivery/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    }
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-24"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600 text-center">
          <p>Error loading delivery statistics. Please try again.</p>
        </div>
      </div>
    );
  }

  const mockStats = {
    zones: { total: 12, active: 8 },
    orders: { total: 1250, averageDeliveryFee: 3.5 },
    providers: { active: 3, total: 5 },
    performance: { 
      avgDeliveryTime: 28,
      successRate: 94.2,
      customerSatisfaction: 4.3
    }
  };

  const statsData = stats || mockStats;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900">Delivery Statistics</h2>
        <p className="text-gray-600">Overview of your delivery performance and metrics</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <MapPinIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Delivery Zones</p>
              <p className="text-2xl font-semibold text-gray-900">
                {statsData?.zones?.active || 0}/{statsData?.zones?.total || 0}
              </p>
              <p className="text-sm text-green-600">Active zones</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <TruckIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-semibold text-gray-900">{(statsData?.orders?.total || 0).toLocaleString()}</p>
              <p className="text-sm text-green-600">Delivery orders</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <CurrencyDollarIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Delivery Fee</p>
              <p className="text-2xl font-semibold text-gray-900">{statsData?.orders?.averageDeliveryFee || 0} JOD</p>
              <p className="text-sm text-green-600">Per order</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{statsData.performance?.successRate || 0}%</p>
              <p className="text-sm text-green-600">Completed orders</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Average Delivery Time</span>
              <span className="font-semibold">{statsData.performance?.avgDeliveryTime || 0} minutes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">On-Time Delivery Rate</span>
              <span className="font-semibold text-green-600">{statsData.performance?.successRate || 0}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Customer Satisfaction</span>
              <div className="flex items-center">
                <span className="font-semibold">{statsData.performance?.customerSatisfaction || 0}/5.0</span>
                <div className="ml-2 flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`h-4 w-4 ${
                        star <= (statsData.performance?.customerSatisfaction || 0) 
                          ? 'text-yellow-400' 
                          : 'text-gray-300'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Provider Distribution</h3>
          <div className="space-y-4">
            {['DHUB', 'Careem Express', 'Talabat'].map((provider, index) => (
              <div key={provider} className="flex items-center justify-between">
                <span className="text-gray-600">{provider}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${[65, 25, 10][index]}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold">{[65, 25, 10][index]}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zone Performance Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Zone Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Fee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Success Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[
                { name: 'Downtown Amman', nameAr: 'وسط عمان', orders: 485, avgFee: 3.5, successRate: 96.2, status: 'active' },
                { name: 'Abdali', nameAr: 'العبدلي', orders: 342, avgFee: 4.0, successRate: 94.8, status: 'active' },
                { name: 'Sweifieh', nameAr: 'الصويفية', orders: 298, avgFee: 4.5, successRate: 91.5, status: 'active' },
                { name: 'Jabal Amman', nameAr: 'جبل عمان', orders: 125, avgFee: 5.0, successRate: 89.2, status: 'active' }
              ].map((zone) => (
                <tr key={zone.name}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{zone.name}</div>
                      <div className="text-sm text-gray-500">{zone.nameAr}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {zone.orders}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {zone.avgFee} JOD
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {zone.successRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}