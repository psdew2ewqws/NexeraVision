import React, { useState, useEffect } from 'react';
import { XMarkIcon, MapPinIcon, PlusIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import LocationSearchModal from './LocationSearchModal';

interface GlobalLocation {
  id: string;
  countryName: string;
  countryNameAr: string;
  governorate: string;
  city: string;
  cityNameAr: string;
  area: string;
  areaNameAr: string;
  subArea: string;
  subAreaNameAr: string;
  searchText: string;
  deliveryDifficulty: number;
  averageDeliveryFee: number;
  isActive: boolean;
}

interface Branch {
  id: string;
  name: string;
  nameAr: string;
  address: string;
  addressAr: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
}

interface CreateZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

export default function CreateZoneModal({ isOpen, onClose, onSuccess }: CreateZoneModalProps) {
  const [formData, setFormData] = useState({
    branchId: '',
    zoneNameEn: '',
    zoneNameAr: '',
    deliveryFee: '', // Optional - company sets this
    averageDeliveryTimeMins: '', // Optional - auto-calculated
    priorityLevel: '1',
    isActive: true,
    centerLat: '',
    centerLng: '',
    radius: '',
    globalLocationId: ''
  });
  
  const [selectedLocations, setSelectedLocations] = useState<GlobalLocation[]>([]);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [zoneType, setZoneType] = useState<'circular' | 'location-based'>('location-based');

  // Fetch branches for selection
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/branches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    enabled: isOpen
  });

  // Create zone mutation
  const createZoneMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('token');
      
      // Create the zone with new schema
      const zoneData: any = {
        branchId: data.branchId,
        zoneName: {
          en: data.zoneNameEn,
          ar: data.zoneNameAr
        },
        priorityLevel: parseInt(data.priorityLevel),
        isActive: data.isActive,
        centerLat: data.centerLat ? parseFloat(data.centerLat) : null,
        centerLng: data.centerLng ? parseFloat(data.centerLng) : null,
        radius: data.radius ? parseFloat(data.radius) : null,
        globalLocationId: data.globalLocationId || null
      };

      // Optional fields - set by company
      if (data.deliveryFee) {
        zoneData.deliveryFee = parseFloat(data.deliveryFee);
      }
      
      if (data.averageDeliveryTimeMins) {
        zoneData.averageDeliveryTimeMins = parseInt(data.averageDeliveryTimeMins);
      }

      const zoneResponse = await axios.post(`${API_BASE_URL}/delivery/zones`, zoneData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return zoneResponse.data;
    },
    onSuccess: () => {
      toast.success('Delivery zone created successfully');
      onSuccess();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create delivery zone');
    }
  });

  const resetForm = () => {
    setFormData({
      branchId: '',
      zoneNameEn: '',
      zoneNameAr: '',
      deliveryFee: '', // Optional
      averageDeliveryTimeMins: '', // Optional
      priorityLevel: '1',
      isActive: true,
      centerLat: '',
      centerLng: '',
      radius: '',
      globalLocationId: ''
    });
    setSelectedLocations([]);
    setZoneType('location-based');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (zoneType === 'location-based' && selectedLocations.length === 0) {
      toast.error('Please select at least one location for the delivery zone');
      return;
    }
    
    if (zoneType === 'circular' && (!formData.centerLat || !formData.centerLng || !formData.radius)) {
      toast.error('Please provide center coordinates and radius for circular zone');
      return;
    }
    
    // Set primary location for location-based zones
    if (zoneType === 'location-based' && selectedLocations.length > 0) {
      const primaryLocation = selectedLocations[0];
      formData.globalLocationId = primaryLocation.id;
      
      // Auto-fill zone names if empty
      if (!formData.zoneNameEn) {
        formData.zoneNameEn = `${primaryLocation.area} - ${primaryLocation.city}`;
      }
      if (!formData.zoneNameAr) {
        formData.zoneNameAr = `${primaryLocation.areaNameAr} - ${primaryLocation.cityNameAr}`;
      }
      
      // Auto-suggest delivery fee based on location data
      if (!formData.deliveryFee) {
        formData.deliveryFee = primaryLocation.averageDeliveryFee.toString();
      }
    }
    
    createZoneMutation.mutate(formData);
  };

  const handleLocationSelect = (location: GlobalLocation) => {
    if (zoneType === 'location-based') {
      // For now, we'll use single location selection
      // Later this can be expanded to multiple locations per zone
      setSelectedLocations([location]);
      setShowLocationSearch(false);
      
      // Auto-fill form fields based on selected location
      if (!formData.zoneNameEn) {
        setFormData(prev => ({
          ...prev,
          zoneNameEn: `${location.area} - ${location.city}`,
          zoneNameAr: `${location.areaNameAr} - ${location.cityNameAr}`,
          deliveryFee: '', // Leave empty - company will set
          averageDeliveryTimeMins: location.deliveryDifficulty === 1 ? '25' : 
                               location.deliveryDifficulty === 2 ? '35' :
                               location.deliveryDifficulty === 3 ? '45' : '60'
        }));
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Create Delivery Zone</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Zone Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Zone Type</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setZoneType('location-based')}
                  className={`p-3 border rounded-lg text-left ${
                    zoneType === 'location-based'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <MapPinIcon className="h-5 w-5 mb-2" />
                  <div className="font-medium">Location-Based</div>
                  <div className="text-sm text-gray-600">Select from 2,080+ locations</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setZoneType('circular')}
                  className={`p-3 border rounded-lg text-left ${
                    zoneType === 'circular'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="w-5 h-5 border-2 border-current rounded-full mb-2"></div>
                  <div className="font-medium">Circular Zone</div>
                  <div className="text-sm text-gray-600">Define by center & radius</div>
                </button>
              </div>
            </div>

            {/* Branch Selection */}
            <div>
              <label htmlFor="branchId" className="block text-sm font-medium text-gray-700 mb-2">
                Branch *
              </label>
              <select
                id="branchId"
                value={formData.branchId}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a branch</option>
                {branches.map((branch: Branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} ({branch.nameAr})
                  </option>
                ))}
              </select>
            </div>

            {/* Location Selection for Location-Based Zones */}
            {zoneType === 'location-based' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Coverage Locations *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowLocationSearch(true)}
                    className="inline-flex items-center px-3 py-1.5 border border-blue-300 rounded-md text-sm text-blue-600 hover:bg-blue-50"
                  >
                    <MagnifyingGlassIcon className="h-4 w-4 mr-1" />
                    Search Locations
                  </button>
                </div>
                
                {selectedLocations.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-2 text-sm font-medium text-gray-900">No locations selected</div>
                    <div className="mt-1 text-sm text-gray-500">Click "Search Locations" to add coverage areas</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedLocations.map((location) => (
                      <div key={location.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                        <div>
                          <div className="font-medium text-gray-900">
                            {location.subArea || location.area}
                          </div>
                          <div className="text-sm text-gray-600">
                            {location.city} • {location.governorate} • {location.averageDeliveryFee} JOD avg
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedLocations([])}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Circular Zone Configuration */}
            {zoneType === 'circular' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="centerLat" className="block text-sm font-medium text-gray-700 mb-2">
                    Center Latitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    id="centerLat"
                    value={formData.centerLat}
                    onChange={(e) => setFormData({ ...formData, centerLat: e.target.value })}
                    required
                    placeholder="31.9539"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="centerLng" className="block text-sm font-medium text-gray-700 mb-2">
                    Center Longitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    id="centerLng"
                    value={formData.centerLng}
                    onChange={(e) => setFormData({ ...formData, centerLng: e.target.value })}
                    required
                    placeholder="35.9106"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="radius" className="block text-sm font-medium text-gray-700 mb-2">
                    Radius (KM) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    id="radius"
                    value={formData.radius}
                    onChange={(e) => setFormData({ ...formData, radius: e.target.value })}
                    required
                    placeholder="3.0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Zone Names */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="zoneNameEn" className="block text-sm font-medium text-gray-700 mb-2">
                  Zone Name (English) *
                </label>
                <input
                  type="text"
                  id="zoneNameEn"
                  value={formData.zoneNameEn}
                  onChange={(e) => setFormData({ ...formData, zoneNameEn: e.target.value })}
                  required
                  placeholder="Downtown Amman"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="zoneNameAr" className="block text-sm font-medium text-gray-700 mb-2">
                  Zone Name (Arabic) *
                </label>
                <input
                  type="text"
                  id="zoneNameAr"
                  value={formData.zoneNameAr}
                  onChange={(e) => setFormData({ ...formData, zoneNameAr: e.target.value })}
                  required
                  placeholder="وسط عمان"
                  dir="rtl"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Pricing and Delivery Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="deliveryFee" className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Fee (JOD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="deliveryFee"
                  value={formData.deliveryFee}
                  onChange={(e) => setFormData({ ...formData, deliveryFee: e.target.value })}
                  required
                  placeholder="3.50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="deliveryFee" className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Fee (JOD) <span className="text-orange-600 text-sm">(Optional - Set by Company)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="deliveryFee"
                  value={formData.deliveryFee}
                  onChange={(e) => setFormData({ ...formData, deliveryFee: e.target.value })}
                  placeholder="Leave empty - company sets pricing"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="averageDeliveryTimeMins" className="block text-sm font-medium text-gray-700 mb-2">
                  Average Delivery Time (minutes) <span className="text-orange-600 text-sm">(Auto-calculated)</span>
                </label>
                <input
                  type="number"
                  id="averageDeliveryTimeMins"
                  value={formData.averageDeliveryTimeMins}
                  onChange={(e) => setFormData({ ...formData, averageDeliveryTimeMins: e.target.value })}
                  placeholder="Auto-calculated when delivering"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="priorityLevel" className="block text-sm font-medium text-gray-700 mb-2">
                  Priority Level
                </label>
                <select
                  id="priorityLevel"
                  value={formData.priorityLevel}
                  onChange={(e) => setFormData({ ...formData, priorityLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="1">1 - High Priority</option>
                  <option value="2">2 - Medium Priority</option>
                  <option value="3">3 - Low Priority</option>
                  <option value="4">4 - Backup Zone</option>
                </select>
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                Activate zone immediately
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createZoneMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createZoneMutation.isPending ? 'Creating...' : 'Create Zone'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Location Search Modal */}
      {showLocationSearch && (
        <LocationSearchModal
          isOpen={showLocationSearch}
          onClose={() => setShowLocationSearch(false)}
          onSelect={handleLocationSelect}
          title="Select Zone Location"
          multiSelect={false}
        />
      )}
    </>
  );
}