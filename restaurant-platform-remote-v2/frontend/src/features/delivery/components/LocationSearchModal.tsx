import React, { useState, useEffect, useCallback } from 'react';
import { MagnifyingGlassIcon, MapPinIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { debounce } from 'lodash';

interface GlobalLocation {
  id: string;
  originalId: string;
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

interface LocationSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: GlobalLocation) => void;
  selectedLocations?: GlobalLocation[];
  multiSelect?: boolean;
  title?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

export default function LocationSearchModal({
  isOpen,
  onClose,
  onSelect,
  selectedLocations = [],
  multiSelect = false,
  title = 'Search Locations'
}: LocationSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [allLocations, setAllLocations] = useState<GlobalLocation[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Debounce search term
  const debouncedSearch = useCallback(
    debounce((term: string) => setDebouncedSearchTerm(term), 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  // Initial load and search
  const { data: initialLocations = [], isLoading } = useQuery({
    queryKey: ['global-locations-initial', debouncedSearchTerm, selectedCity, selectedGovernorate],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (debouncedSearchTerm) params.append('q', debouncedSearchTerm);
      if (selectedCity) params.append('city', selectedCity);
      if (selectedGovernorate) params.append('governorate', selectedGovernorate);
      
      // Always start with first page
      params.append('limit', '100');
      params.append('offset', '0');
      
      const endpoint = debouncedSearchTerm 
        ? `/delivery/jordan-locations/search?${params.toString()}`
        : `/delivery/jordan-locations?${params.toString()}`;
      
      const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data;
    },
    enabled: isOpen,
    onSuccess: (data) => {
      setAllLocations(data);
      setHasMore(data.length === 100); // If we got 100 results, there might be more
    }
  });

  // Load more function
  const loadMoreLocations = async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (debouncedSearchTerm) params.append('q', debouncedSearchTerm);
      if (selectedCity) params.append('city', selectedCity);
      if (selectedGovernorate) params.append('governorate', selectedGovernorate);
      
      params.append('limit', '100');
      params.append('offset', allLocations.length.toString());
      
      const endpoint = debouncedSearchTerm 
        ? `/delivery/jordan-locations/search?${params.toString()}`
        : `/delivery/jordan-locations?${params.toString()}`;
      
      const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newLocations = response.data;
      setAllLocations(prev => [...prev, ...newLocations]);
      setHasMore(newLocations.length === 100);
    } catch (error) {
      console.error('Error loading more locations:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Fetch unique cities and governorates for filters
  const { data: filters } = useQuery({
    queryKey: ['location-filters'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/delivery/jordan-locations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const locations: GlobalLocation[] = response.data;
      const cities = Array.from(new Set(locations.map(l => l.city))).sort();
      const governorates = Array.from(new Set(locations.map(l => l.governorate))).sort();
      
      return { cities, governorates };
    },
    enabled: isOpen
  });

  const getDifficultyBadge = (difficulty: number) => {
    const configs = {
      1: { label: 'Easy', className: 'bg-green-100 text-green-800' },
      2: { label: 'Normal', className: 'bg-blue-100 text-blue-800' },
      3: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800' },
      4: { label: 'Hard', className: 'bg-red-100 text-red-800' }
    };
    
    const config = configs[difficulty as keyof typeof configs] || configs[2];
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const isLocationSelected = (location: GlobalLocation) => {
    return selectedLocations.some(selected => selected.id === location.id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              Search through 3,979+ locations across Jordan (all areas imported)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by area, city, or location name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={selectedGovernorate}
              onChange={(e) => setSelectedGovernorate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Governorates</option>
              {filters?.governorates.map((governorate) => (
                <option key={governorate} value={governorate}>
                  {governorate}
                </option>
              ))}
            </select>

            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Cities</option>
              {filters?.cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse bg-gray-100 h-20 rounded-lg"></div>
              ))}
            </div>
          ) : allLocations.length === 0 ? (
            <div className="text-center py-12">
              <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No locations found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedCity || selectedGovernorate
                  ? 'Try adjusting your search criteria'
                  : 'Loading initial locations from 3,979+ available locations...'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-gray-600 mb-4">
                Found {allLocations.length} locations {hasMore ? '(showing first results, load more available)' : ''}
              </div>
              
              {allLocations.map((location: GlobalLocation) => (
                <div
                  key={location.id}
                  className={`p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                    isLocationSelected(location) ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => onSelect(location)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <MapPinIcon className="h-4 w-4 text-gray-400" />
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {location.subArea || location.area}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {location.subAreaNameAr || location.areaNameAr}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-500 space-y-1">
                        <div>
                          📍 {location.area} • {location.city} • {location.governorate}
                        </div>
                        <div>
                          🇯🇴 {location.areaNameAr} • {location.cityNameAr}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      {getDifficultyBadge(location.deliveryDifficulty)}
                      <div className="text-sm font-medium text-green-600">
                        {location.averageDeliveryFee} JOD
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Load More Button */}
              {hasMore && (
                <div className="text-center pt-4">
                  <button
                    onClick={loadMoreLocations}
                    disabled={isLoadingMore}
                    className="inline-flex items-center px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingMore ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                        Loading...
                      </>
                    ) : (
                      `Load More (${allLocations.length} of 3,979+)`
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedLocations.length > 0 && `${selectedLocations.length} location(s) selected`}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}