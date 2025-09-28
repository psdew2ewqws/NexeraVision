import { useState, useEffect } from 'react';
import { PlusIcon, MapPinIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, UsersIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import CreateZoneModal from './CreateZoneModal';
import LocationManagement from './LocationManagement';
import BulkLocationAssignment from './BulkLocationAssignment';

interface DeliveryZone {
  id: string;
  branchId: string;
  zoneName: {
    en: string;
    ar: string;
  };
  deliveryFee: number;
  averageDeliveryTimeMins: number;
  priorityLevel: number;
  isActive: boolean;
  branch: {
    id: string;
    name: string;
    nameAr: string;
    company: {
      id: string;
      name: string;
      slug: string;
    };
  };
  _count: {
    orders: number;
  };
}

interface Company {
  id: string;
  name: string;
  slug: string;
  status: string;
  _count: {
    branches: number;
    users: number;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

export default function DeliveryZoneManagement() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [showLocationManagement, setShowLocationManagement] = useState(false);
  const [showBulkAssignment, setShowBulkAssignment] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const queryClient = useQueryClient();

  // Fetch companies
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    }
  });

  // Fetch delivery zones
  const { data: zones = [], isLoading, error } = useQuery({
    queryKey: ['deliveryZones', selectedCompany],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = selectedCompany ? `?companyId=${selectedCompany}` : '';
      const response = await axios.get(`${API_BASE_URL}/delivery/zones${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    }
  });

  // Delete zone mutation
  const deleteZoneMutation = useMutation({
    mutationFn: async (zoneId: string) => {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/delivery/zones/${zoneId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryZones'] });
      toast.success('Delivery zone deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete delivery zone');
    }
  });

  const handleDeleteZone = (zone: DeliveryZone) => {
    if (confirm(`Are you sure you want to delete ${zone.zoneName.en}?`)) {
      deleteZoneMutation.mutate(zone.id);
    }
  };

  // Filter zones based on search term
  const filteredZones = zones.filter((zone: DeliveryZone) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      zone.zoneName.en.toLowerCase().includes(searchLower) ||
      zone.zoneName.ar.toLowerCase().includes(searchLower) ||
      zone.branch.name.toLowerCase().includes(searchLower) ||
      zone.branch.company.name.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600 text-center">
          <p>Error loading delivery zones. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Delivery Management</h2>
          <p className="text-gray-600">
            Manage delivery zones, pricing, and companies • {companies.length} companies • {zones.length} zones • 3,979+ locations available
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowLocationManagement(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
            Manage Locations
          </button>
          <button
            onClick={() => setShowBulkAssignment(true)}
            className="inline-flex items-center px-4 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-600 bg-white hover:bg-green-50"
          >
            <UsersIcon className="h-4 w-4 mr-2" />
            Bulk Assign
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Zone
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Bar */}
          <div className="relative md:col-span-2">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search zones, branches, or companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Company Filter */}
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Companies</option>
            {companies.map((company: Company) => (
              <option key={company.id} value={company.id}>
                {company.name} ({company.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Companies Overview */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <BuildingOfficeIcon className="h-5 w-5 text-gray-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Companies Overview</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {companies.slice(0, 4).map((company: Company) => (
            <div key={company.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{company.name}</h4>
                  <p className="text-xs text-gray-500">{company.slug}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  company.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : company.status === 'trial'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {company.status}
                </span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <div>{company._count?.branches || 0} branches</div>
                <div>{company._count?.users || 0} users</div>
              </div>
            </div>
          ))}
        </div>
        {companies.length > 4 && (
          <div className="text-center">
            <span className="text-sm text-gray-500">And {companies.length - 4} more companies...</span>
          </div>
        )}
      </div>

      {/* Zones List */}
      {filteredZones.length === 0 ? (
        <div className="text-center py-12">
          <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No delivery zones</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first delivery zone.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Zone
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredZones.map((zone: DeliveryZone) => (
            <div key={zone.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{zone.zoneName.en}</h3>
                  <p className="text-sm text-gray-600">{zone.zoneName.ar}</p>
                  <p className="text-xs text-blue-600 mt-1">{zone.branch.name}</p>
                  <p className="text-xs text-green-600">{zone.branch.company.name}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedZone(zone)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteZone(zone)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Priority:</span>
                  <p className="font-medium">Level {zone.priorityLevel}</p>
                </div>
                
                <div>
                  <span className="text-gray-500">Status:</span>
                  <p className="font-medium">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      zone.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {zone.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-gray-500">
                  {zone._count?.orders || 0} orders
                </span>
                <div className="text-xs text-blue-600">
                  Pricing managed by company
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateZoneModal 
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['deliveryZones'] });
            setShowCreateModal(false);
          }}
        />
      )}

      {showLocationManagement && (
        <LocationManagement
          isOpen={showLocationManagement}
          onClose={() => setShowLocationManagement(false)}
          title="Jordan Locations Management"
        />
      )}

      {showBulkAssignment && (
        <BulkLocationAssignment
          isOpen={showBulkAssignment}
          onClose={() => setShowBulkAssignment(false)}
          userRole="super_admin" // TODO: Get from auth context
          // companyId and branchId would come from user's auth context
        />
      )}

      {selectedZone && (
        <EditZoneModal
          zone={selectedZone}
          isOpen={!!selectedZone}
          onClose={() => setSelectedZone(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['deliveryZones'] });
            setSelectedZone(null);
          }}
        />
      )}
    </div>
  );
}

// Edit Zone Modal Component (placeholder - will be implemented in next phase)
function EditZoneModal({ zone, isOpen, onClose, onSuccess }: { 
  zone: DeliveryZone; 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: () => void 
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-medium mb-4">Edit Delivery Zone</h3>
        <p className="text-gray-600 mb-4">Editing {zone.zoneName.en}</p>
        <div className="text-sm text-gray-500 mb-4">
          Edit functionality will be enhanced in the next phase with location search integration.
        </div>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}