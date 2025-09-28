import React, { useState, useEffect, useCallback } from 'react';
import { MagnifyingGlassIcon, MapPinIcon, CheckIcon, XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { debounce } from 'lodash';
import { toast } from 'react-hot-toast';

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
  isAssigned?: boolean; // Whether this location is assigned to a delivery zone
  assignedTo?: string; // Company/branch it's assigned to
}

interface LocationManagementProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

export default function LocationManagement({ isOpen, onClose, title }: LocationManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50); // Show more items per page for table view
  const [sortBy, setSortBy] = useState<'area' | 'city' | 'difficulty' | 'fee'>('area');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const queryClient = useQueryClient();

  // Debounce search term
  const debouncedSearch = useCallback(
    debounce((term: string) => setDebouncedSearchTerm(term), 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedCity, selectedGovernorate]);

  // Fetch locations with pagination
  const { data: locationData, isLoading } = useQuery({
    queryKey: ['global-locations-table', debouncedSearchTerm, selectedCity, selectedGovernorate, currentPage, sortBy, sortOrder],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (debouncedSearchTerm) params.append('q', debouncedSearchTerm);
      if (selectedCity) params.append('city', selectedCity);
      if (selectedGovernorate) params.append('governorate', selectedGovernorate);
      
      const offset = (currentPage - 1) * pageSize;
      params.append('limit', pageSize.toString());
      params.append('offset', offset.toString());
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      
      const endpoint = debouncedSearchTerm 
        ? `/delivery/jordan-locations/search?${params.toString()}`
        : `/delivery/jordan-locations?${params.toString()}`;
      
      const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Handle new response format from backend
      if (response.data.locations) {
        return {
          locations: response.data.locations,
          total: response.data.total || 0,
          hasMore: response.data.pagination?.hasMore || false
        };
      } else {
        // Fallback for old format
        return {
          locations: response.data,
          total: response.data.length,
          hasMore: response.data.length === pageSize
        };
      }
    },
    enabled: isOpen,
  });

  // Fetch filters
  const { data: filters } = useQuery({
    queryKey: ['location-filters'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/delivery/jordan-locations`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 1000 } // Get enough to build filter lists
      });
      
      const locations: GlobalLocation[] = response.data;
      const cities = Array.from(new Set(locations.map(l => l.city))).sort();
      const governorates = Array.from(new Set(locations.map(l => l.governorate))).sort();
      
      return { cities, governorates };
    },
    enabled: isOpen
  });

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = () => {
    if (locationData?.locations) {
      const allIds = locationData.locations.map(l => l.id);
      if (selectedLocations.size === allIds.length) {
        setSelectedLocations(new Set());
      } else {
        setSelectedLocations(new Set(allIds));
      }
    }
  };

  const handleSelectLocation = (locationId: string) => {
    const newSelected = new Set(selectedLocations);
    if (newSelected.has(locationId)) {
      newSelected.delete(locationId);
    } else {
      newSelected.add(locationId);
    }
    setSelectedLocations(newSelected);
  };

  const getDifficultyText = (difficulty: number) => {
    const configs = {
      1: { label: 'Easy', className: 'text-green-600' },
      2: { label: 'Normal', className: 'text-blue-600' },
      3: { label: 'Medium', className: 'text-yellow-600' },
      4: { label: 'Hard', className: 'text-red-600' }
    };
    return configs[difficulty as keyof typeof configs] || configs[2];
  };

  const totalPages = Math.ceil((locationData?.total || 0) / pageSize);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-7xl max-h-[95vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              Manage all 3,979+ Jordan locations • Select, assign, and configure delivery areas
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Filters and Search */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="relative md:col-span-2">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by area, city, or location name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Governorate Filter */}
            <select
              value={selectedGovernorate}
              onChange={(e) => setSelectedGovernorate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Governorates</option>
              {filters?.governorates.map((gov) => (
                <option key={gov} value={gov}>{gov}</option>
              ))}
            </select>

            {/* City Filter */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Cities</option>
              {filters?.cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedLocations.size > 0 && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
              <span className="text-blue-800 font-medium">
                {selectedLocations.size} locations selected
              </span>
              <div className="flex space-x-2">
                <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                  Assign to Zone
                </button>
                <button className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                  Activate
                </button>
                <button className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                  Deactivate
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="bg-gray-100 h-12 rounded"></div>
                ))}
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={locationData?.locations && selectedLocations.size === locationData.locations.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('area')}
                  >
                    Location {sortBy === 'area' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('city')}
                  >
                    City/Gov {sortBy === 'city' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('difficulty')}
                  >
                    Difficulty {sortBy === 'difficulty' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('fee')}
                  >
                    Avg Fee {sortBy === 'fee' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {locationData?.locations.map((location: GlobalLocation) => (
                  <tr key={location.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedLocations.has(location.id)}
                        onChange={() => handleSelectLocation(location.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {location.subArea || location.area}
                        </div>
                        <div className="text-sm text-gray-500">
                          {location.subAreaNameAr || location.areaNameAr}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{location.city}</div>
                      <div className="text-sm text-gray-500">{location.governorate}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${getDifficultyText(location.deliveryDifficulty).className}`}>
                        {getDifficultyText(location.deliveryDifficulty).label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900">{location.averageDeliveryFee} JOD</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        location.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {location.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">Edit</button>
                      <button className="text-green-600 hover:text-green-900">Assign</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, locationData?.total || 0)} of {locationData?.total || 0} locations
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}