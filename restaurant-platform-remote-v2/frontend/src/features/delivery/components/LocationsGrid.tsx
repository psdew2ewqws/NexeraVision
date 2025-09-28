import React, { useState, useEffect, useCallback, Fragment, useMemo } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, PlusIcon, EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, Transition, Listbox } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/20/solid';
import apiClient from '../../../lib/api';
import { debounce } from 'lodash';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import PigeonMapComponent from '../../../components/shared/PigeonMapComponent';

interface Assignment {
  branchId: string;
  branchName: string;
  branchNameAr: string;
  companyId: string;
  companyName: string;
  deliveryFee: number;
  isActive: boolean;
  zoneId: string;
}

interface GlobalLocation {
  id: string;
  area: string;
  areaNameAr: string;
  city: string;
  governorate: string;
  averageDeliveryFee: number;
  isActive: boolean;
  assignedBranches: Assignment[];
}

interface Branch {
  id: string;
  name: string;
  nameAr?: string;
  companyId: string;
  company?: {
    id: string;
    name: string;
  };
}

interface LocationFormData {
  area: string;
  areaNameAr: string;
  city: string;
  governorate: string;
}

// Utility functions
const applyFilters = (
  locations: GlobalLocation[],
  filters: {
    searchTerm: string;
    city: string;
    governorate: string;
    onlyAssigned: boolean;
  }
): GlobalLocation[] => {
  let filtered = locations;

  if (filters.searchTerm) {
    const searchLower = filters.searchTerm.toLowerCase();
    filtered = filtered.filter((location) => 
      location.area.toLowerCase().includes(searchLower) ||
      location.areaNameAr.includes(filters.searchTerm) ||
      location.city.toLowerCase().includes(searchLower) ||
      location.governorate.toLowerCase().includes(searchLower)
    );
  }

  if (filters.city) {
    filtered = filtered.filter((location) => location.city === filters.city);
  }

  if (filters.governorate) {
    filtered = filtered.filter((location) => location.governorate === filters.governorate);
  }

  if (filters.onlyAssigned) {
    filtered = filtered.filter((location) => location.assignedBranches && location.assignedBranches.length > 0);
  }

  return filtered;
};

const sortLocations = (
  locations: GlobalLocation[],
  sortBy: 'area' | 'city' | 'status',
  sortOrder: 'asc' | 'desc'
): GlobalLocation[] => {
  return locations.sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'area':
        aValue = a.area;
        bValue = b.area;
        break;
      case 'city':
        aValue = a.city;
        bValue = b.city;
        break;
      case 'status':
        aValue = a.isActive;
        bValue = b.isActive;
        break;
      default:
        aValue = a.area;
        bValue = b.area;
    }
    
    if (sortOrder === 'desc') {
      return aValue > bValue ? -1 : 1;
    } else {
      return aValue < bValue ? -1 : 1;
    }
  });
};

const GOVERNORATE_TO_CITY = {
  'Amman': 'عمان',
  'Irbid': 'اربد', 
  'Zarqa': 'الزرقاء',
  'Aqaba': 'العقبة',
  'Ma\'an': 'معان',
  'Tafilah': 'الطفيلة',
  'Karak': 'الكرك',
  'Madaba': 'مادبا',
  'Jarash': 'جرش',
  'Ajloun': 'عجلون',
  'Balqa': 'السلط',
  'Mafraq': 'المفرق'
} as const;

const GOVERNORATES = Object.keys(GOVERNORATE_TO_CITY);


export default function LocationsGrid() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(100);
  const [sortBy, setSortBy] = useState<'area' | 'city' | 'status'>('area');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showOnlyAssigned, setShowOnlyAssigned] = useState(false);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [showEditLocationModal, setShowEditLocationModal] = useState<GlobalLocation | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<GlobalLocation | null>(null);
  const [showViewAllModal, setShowViewAllModal] = useState<GlobalLocation | null>(null);
  const [showBranchSelector, setShowBranchSelector] = useState(false);
  const [customDeliveryFee, setCustomDeliveryFee] = useState<string>('');
  
  const { user } = useAuth();
  
  const queryClient = useQueryClient();

  // Mutations
  const assignLocationMutation = useMutation({
    mutationFn: async ({ locationId, branchIds, deliveryFee }: { locationId: string; branchIds: string[]; deliveryFee?: number }) => {
      const promises = branchIds.map(branchId => 
        apiClient.post('/delivery/assign-location-to-branch', {
          locationId,
          branchId,
          ...(deliveryFee !== undefined && { deliveryFee }),
          isActive: true
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations-with-branches'] });
      queryClient.refetchQueries({ queryKey: ['locations-with-branches'] });
      setSelectedBranches(new Set());
      toast.success('Location assigned successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to assign location');
    }
  });

  const bulkAssignMutation = useMutation({
    mutationFn: async ({ locationIds, branchIds, deliveryFee }: { locationIds: string[]; branchIds: string[]; deliveryFee?: number }) => {
      const promises: Promise<any>[] = [];
      locationIds.forEach(locationId => {
        branchIds.forEach(branchId => {
          promises.push(
            apiClient.post('/delivery/assign-locations-to-branch', {
              locationIds: [locationId],
              branchId,
              ...(deliveryFee !== undefined && { deliveryFee }),
              isActive: true
            })
          );
        });
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations-with-branches'] });
      queryClient.refetchQueries({ queryKey: ['locations-with-branches'] });
      setSelectedLocations(new Set());
      setSelectedBranches(new Set());
      toast.success('Locations assigned successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to assign locations');
    }
  });

  const editLocationMutation = useMutation({
    mutationFn: async (data: { id: string; locationData: LocationFormData }) => {
      const payload = {
        ...data.locationData,
        deliveryDifficulty: 2
      };
      const response = await apiClient.put(`/delivery/jordan-locations/${data.id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      setSearchTerm('');
      setDebouncedSearchTerm('');
      setSelectedCity('');
      setSelectedGovernorate('');
      setSelectedCompany('');
      setCurrentPage(1);
      setShowOnlyAssigned(false);
      
      queryClient.invalidateQueries({ queryKey: ['locations-with-branches'] });
      queryClient.refetchQueries({ queryKey: ['locations-with-branches'] });
      queryClient.invalidateQueries({ queryKey: ['filters'] });
      
      setShowEditLocationModal(null);
      toast.success('Location updated successfully!');
    },
    onError: (error: any) => {
      console.log('Backend error response:', error?.response?.data);
      toast.error(error?.response?.data?.message || 'Failed to update location');
    }
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (locationId: string) => {
      const response = await apiClient.delete(`/delivery/jordan-locations/${locationId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations-with-branches'] });
      queryClient.refetchQueries({ queryKey: ['locations-with-branches'] });
      queryClient.invalidateQueries({ queryKey: ['filters'] });
      
      setShowDeleteConfirm(null);
      toast.success('Location deleted successfully!');
    },
    onError: (error: any) => {
      console.log('Backend error response:', error?.response?.data);
      toast.error(error?.response?.data?.message || 'Failed to delete location');
    }
  });

  const addLocationMutation = useMutation({
    mutationFn: async (locationData: LocationFormData) => {
      const payload = {
        ...locationData,
        deliveryDifficulty: 2  // Default value since backend requires it but UI doesn't show it
      };
      const response = await apiClient.post('/delivery/jordan-locations', payload);
      return response.data;
    },
    onSuccess: () => {
      // Reset filters and pagination to ensure new location is visible
      setSearchTerm('');
      setDebouncedSearchTerm('');
      setSelectedCity('');
      setSelectedGovernorate('');
      setSelectedCompany('');
      setCurrentPage(1);
      setShowOnlyAssigned(false);
      
      // Invalidate and refetch to immediately update the list
      queryClient.invalidateQueries({ queryKey: ['locations-with-branches'] });
      queryClient.refetchQueries({ queryKey: ['locations-with-branches'] });
      queryClient.invalidateQueries({ queryKey: ['filters'] });
      
      setShowAddLocationModal(false);
      toast.success('Location added successfully!');
    },
    onError: (error: any) => {
      console.log('Backend error response:', error?.response?.data);
      console.log('Full error:', error);
      toast.error(error?.response?.data?.message || 'Failed to add location');
    }
  });

  const unassignLocationMutation = useMutation({
    mutationFn: async ({ locationId, branchId }: { locationId: string; branchId: string }) => {
      const response = await apiClient.delete('/delivery/unassign-location-from-branch', {
        data: { locationId, branchId }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations-with-branches'] });
      queryClient.refetchQueries({ queryKey: ['locations-with-branches'] });
      
      toast.success('Location unassigned successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to unassign location');
    }
  });

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
  }, [debouncedSearchTerm, selectedCity, selectedGovernorate, selectedCompany, showOnlyAssigned]);

  // Data fetching
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await apiClient.get('/branches');
      return response.data;
    }
  });

  const { data: locationData, isLoading } = useQuery({
    queryKey: ['locations-with-branches', debouncedSearchTerm, selectedCity, selectedGovernorate, selectedCompany, currentPage, sortBy, sortOrder, showOnlyAssigned],
    queryFn: async () => {
      const response = await apiClient.get('/delivery/locations-with-branches', {
        params: { ...(selectedCompany && { companyId: selectedCompany }) }
      });
      
      const originalTotal = response.data.length; // Store original total before filtering
      let locations: GlobalLocation[] = response.data;

      // Apply filters
      locations = applyFilters(locations, {
        searchTerm: debouncedSearchTerm,
        city: selectedCity,
        governorate: selectedGovernorate,
        onlyAssigned: showOnlyAssigned
      });

      // Sort locations
      locations = sortLocations(locations, sortBy, sortOrder);

      // Paginate results
      const offset = (currentPage - 1) * pageSize;
      const paginatedLocations = locations.slice(offset, offset + pageSize);

      // Optional debug logging (can be removed in production)

      return {
        locations: paginatedLocations,
        total: originalTotal, // Always show original total, not filtered
        filteredTotal: locations.length, // Track filtered total separately
        hasMore: offset + pageSize < locations.length
      };
    },
  });

  const { data: filters } = useQuery({
    queryKey: ['location-filters'],
    queryFn: async () => {
      const response = await apiClient.get('/delivery/jordan-locations', {
        params: { limit: 1000 }
      });
      
      const locations: GlobalLocation[] = response.data.locations || response.data;
      const cities = Array.from(new Set(locations.map(l => l.city))).sort();
      const governorates = Array.from(new Set(locations.map(l => l.governorate))).sort();
      
      return { cities, governorates };
    },
  });

  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await apiClient.get('/companies/list');
      return response.data;
    },
    enabled: user?.role === 'super_admin'
  });

  const companies = Array.isArray(companiesData) ? companiesData : (companiesData?.companies || []);
  

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
      const allIds = locationData.locations?.map(l => l.id) || [];
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

  const handleBranchSelect = (branchId: string) => {
    const newSelected = new Set(selectedBranches);
    if (newSelected.has(branchId)) {
      newSelected.delete(branchId);
    } else {
      newSelected.add(branchId);
    }
    setSelectedBranches(newSelected);
  };

  const handleBulkAssign = () => {
    if (selectedLocations.size > 0 && selectedBranches.size > 0) {
      const deliveryFee = customDeliveryFee ? parseFloat(customDeliveryFee) : undefined;
      bulkAssignMutation.mutate({
        locationIds: Array.from(selectedLocations),
        branchIds: Array.from(selectedBranches),
        deliveryFee
      });
    }
  };

  const filteredBranches = useMemo(() => {
    const branchList = Array.isArray(branches) ? branches : (branches?.branches || []);
    
    
    const filtered = branchList.filter((branch: Branch) => {
      // Role-based filtering
      if (user?.role === 'super_admin') {
        // For super admin, show all branches if no company selected, or filter by selected company
        if (selectedCompany && selectedCompany.trim() !== '') {
          // Check both companyId field and company.id (branches might use either)
          const branchCompanyId = branch.companyId || branch.company?.id;
          const matches = String(branchCompanyId) === String(selectedCompany);
          if (!matches) {
            return false;
          }
        }
        return true;
      }
      if (user?.role === 'company_owner') return branch.companyId === user.companyId;
      if (user?.role === 'branch_manager') return branch.id === user.branchId;
      return false;
    });


    return filtered;
  }, [branches, user?.role, user?.companyId, user?.branchId, selectedCompany]);


  const totalPages = Math.ceil((locationData?.filteredTotal || 0) / pageSize);

  // Memoized calculations for pagination (uses filtered results)
  const paginationInfo = useMemo(() => ({
    start: ((currentPage - 1) * pageSize) + 1,
    end: Math.min(currentPage * pageSize, locationData?.filteredTotal || 0),
    total: locationData?.filteredTotal || 0
  }), [currentPage, pageSize, locationData?.filteredTotal]);

  return (
    <div className="p-4">
      {/* Compact Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Jordan Locations Management</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage all <span className="font-medium text-blue-600">{locationData?.total || 457}</span> locations • Assign multiple branches per location
            </p>
          </div>
          
          {/* Compact Stats */}
          <div className="flex space-x-2 text-center">
            <div className="bg-blue-50 rounded px-3 py-2 border border-blue-200">
              <div className="text-lg font-bold text-blue-600">{locationData?.total || 0}</div>
              <div className="text-xs text-blue-600">Total</div>
            </div>
            <div className="bg-green-50 rounded px-3 py-2 border border-green-200">
              <div className="text-lg font-bold text-green-600">
                {locationData?.locations?.filter(l => l.assignedBranches && l.assignedBranches.length > 0).length || 0}
              </div>
              <div className="text-xs text-green-600">Assigned</div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Filters and Search */}
      <div className="bg-white rounded border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-4">
          {/* Search */}
          <div className="relative sm:col-span-2 lg:col-span-2 xl:col-span-2">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by area, city, or location name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          
          {/* Governorate Filter */}
          <div className="relative">
            <select
              value={selectedGovernorate}
              onChange={(e) => setSelectedGovernorate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none bg-white"
            >
              <option value="">All Governorates</option>
              {filters?.governorates?.map((gov) => (
                <option key={gov} value={gov}>{gov}</option>
              )) || []}
            </select>
          </div>

          {/* City Filter */}
          <div className="relative">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none bg-white"
            >
              <option value="">All Cities</option>
              {filters?.cities?.map((city) => (
                <option key={city} value={city}>{city}</option>
              )) || []}
            </select>
          </div>

          {/* Company Filter */}
          <div className="relative">
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none bg-white"
            >
              <option value="">All Companies</option>
              {companies.map((company: any) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggle and Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showOnlyAssigned}
                onChange={(e) => setShowOnlyAssigned(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Show only assigned locations</span>
            </label>
          </div>
          
          <div className="flex items-center space-x-6 text-sm text-gray-500">
            <span>Total: {locationData?.total || 0} locations</span>
            <span className="hidden sm:inline">
              Showing: {locationData?.locations?.length || 0} locations
            </span>
          </div>
        </div>

        {/* Add Location Button */}
        {(user?.role === 'super_admin' || user?.role === 'company_owner' || user?.role === 'branch_manager') && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => setShowAddLocationModal(true)}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Location
            </button>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedLocations.size > 0 && (
          <div className="mt-4 space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-blue-800 font-medium">
                  {selectedLocations.size} locations selected
                </span>
                <div className="flex space-x-2">
                  <button 
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    disabled={selectedLocations.size === 0}
                  >
                    Activate
                  </button>
                  <button 
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    disabled={selectedLocations.size === 0}
                  >
                    Deactivate
                  </button>
                </div>
              </div>
              
              {/* Multi-select Branch Checklist */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Fee (JOD):
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={customDeliveryFee}
                      onChange={(e) => setCustomDeliveryFee(e.target.value)}
                      placeholder="e.g. 3.50"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {user?.role === 'super_admin' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Filter by Company:
                      </label>
                      <select
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">All Companies</option>
                        {companies.map((company: any) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Branches to Assign:
                    </label>
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md bg-white">
                  {filteredBranches.map((branch: any) => (
                    <div key={branch.id} className="flex items-center px-3 py-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        id={`branch-${branch.id}`}
                        checked={selectedBranches.has(branch.id)}
                        onChange={() => handleBranchSelect(branch.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor={`branch-${branch.id}`} className="ml-2 text-sm text-gray-900 flex-1 cursor-pointer">
                        {branch.name}
                        {branch.company?.name && (
                          <span className="text-gray-500 ml-1">({branch.company.name})</span>
                        )}
                      </label>
                    </div>
                  ))}
                  {filteredBranches.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500 italic">
                      No branches available
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleBulkAssign}
                    disabled={selectedBranches.size === 0 || bulkAssignMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bulkAssignMutation.isPending ? 'Assigning...' : `Assign to ${selectedBranches.size} Branch(es)`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Locations Grid/Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {isLoading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-gray-100 h-16 rounded"></div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="border-b border-gray-200 bg-gray-50">
                <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                  <div className="col-span-1 flex items-center">
                    <input
                      type="checkbox"
                      checked={locationData?.locations && selectedLocations.size === locationData.locations.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div 
                    className="col-span-2 flex items-center cursor-pointer hover:text-gray-800 transition-colors"
                    onClick={() => handleSort('area')}
                  >
                    Location {sortBy === 'area' && (
                      <span className="ml-1 text-blue-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                  <div 
                    className="col-span-2 flex items-center cursor-pointer hover:text-gray-800 transition-colors"
                    onClick={() => handleSort('city')}
                  >
                    City/Gov {sortBy === 'city' && (
                      <span className="ml-1 text-blue-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                  <div className="col-span-2 flex items-center">Assigned Branches</div>
                  <div className="col-span-2 flex items-center border-l border-gray-300 pl-3">Assign</div>
                  <div 
                    className="col-span-2 flex items-center cursor-pointer hover:text-gray-800 transition-colors border-l border-gray-300 pl-3"
                    onClick={() => handleSort('status')}
                  >
                    Status {sortBy === 'status' && (
                      <span className="ml-1 text-blue-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                  <div className="col-span-1 flex items-center border-l border-gray-300 pl-3">Actions</div>
                </div>
              </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-100">
              {locationData?.locations?.map((location: GlobalLocation, index) => (
                <div key={location.id} className={`grid grid-cols-12 gap-3 px-4 py-3 hover:bg-blue-50 transition-all duration-200 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                }`}>
                  {/* Checkbox */}
                  <div className="col-span-1 flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedLocations.has(location.id)}
                      onChange={() => handleSelectLocation(location.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  {/* Location */}
                  <div className="col-span-2 flex items-center">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {location.area}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {location.areaNameAr}
                      </div>
                    </div>
                  </div>

                  {/* City/Gov */}
                  <div className="col-span-2 flex items-center">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-900 truncate">{location.city}</div>
                      <div className="text-xs text-gray-500 truncate">{location.governorate}</div>
                    </div>
                  </div>


                  {/* Assigned To */}
                  <div className="col-span-2 flex items-center">
                    <div className="min-w-0 flex-1">
                      {location.assignedBranches && location.assignedBranches.length > 0 ? (
                        <div className="space-y-1">
                          {location.assignedBranches.slice(0, 2).map((assignment, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-blue-50 rounded px-2 py-1 text-xs">
                              <span className="font-medium text-gray-900 truncate">
                                {assignment.branchName}
                              </span>
                              {assignment.deliveryFee != null && (
                                <span className="text-green-600 font-bold ml-2">
                                  {assignment.deliveryFee} JOD
                                </span>
                              )}
                            </div>
                          ))}
                          {location.assignedBranches.length > 2 && (
                            <div className="text-xs text-blue-600 text-center py-1">
                              +{location.assignedBranches.length - 2} more
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 text-center py-2">
                          Unassigned
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add Branches */}
                  <div className="col-span-2 flex items-center border-l border-gray-200 pl-3">
                    <div className="w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Multi-select branches dropdown */}
                      <Listbox>
                        <div className="relative">
                          <Listbox.Button className="relative w-32 cursor-pointer rounded-md bg-white py-1.5 pl-3 pr-8 text-left border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <span className="block truncate">
                              {selectedBranches.size > 0 ? `${selectedBranches.size} selected` : 'Add branches...'}
                            </span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                              <ChevronUpDownIcon
                                className="h-4 w-4 text-gray-400"
                                aria-hidden="true"
                              />
                            </span>
                          </Listbox.Button>
                          <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                          >
                            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-72 overflow-auto rounded-md bg-white py-1 text-xs shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                              {filteredBranches.map((branch: any) => (
                                <div key={branch.id} className="px-3 py-2 hover:bg-gray-50">
                                  <label className="flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={selectedBranches.has(branch.id)}
                                      onChange={() => handleBranchSelect(branch.id)}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                                    />
                                    <span className="flex-1">
                                      {branch.name}
                                      {branch.company?.name && (
                                        <span className="text-gray-500 ml-1">({branch.company.name})</span>
                                      )}
                                    </span>
                                  </label>
                                </div>
                              ))}
                              {filteredBranches.length === 0 && (
                                <div className="px-3 py-2 text-gray-500 italic">
                                  No branches available
                                </div>
                              )}
                              <div className="border-t border-gray-200 p-2">
                                <button
                                  onClick={() => {
                                    if (selectedBranches.size > 0) {
                                      const deliveryFee = customDeliveryFee ? parseFloat(customDeliveryFee) : undefined;
                                      assignLocationMutation.mutate({
                                        locationId: location.id,
                                        branchIds: Array.from(selectedBranches),
                                        deliveryFee
                                      });
                                    }
                                  }}
                                  disabled={selectedBranches.size === 0 || assignLocationMutation.isPending}
                                  className="w-full px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {assignLocationMutation.isPending ? 'Assigning...' : 'Assign Selected'}
                                </button>
                              </div>
                            </Listbox.Options>
                          </Transition>
                        </div>
                      </Listbox>
                      
                      {location.assignedBranches.length > 0 && (
                        <button 
                          className="text-xs text-blue-600 hover:text-blue-900 font-medium"
                          onClick={() => setShowViewAllModal(location)}
                        >
                          <EyeIcon className="h-4 w-4 inline mr-1" />
                          View All ({location.assignedBranches.length})
                        </button>
                      )}
                    </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="col-span-2 flex items-center border-l border-gray-200 pl-3">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      location.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {location.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-center space-x-1 border-l border-gray-200 pl-3">
                    <button
                      onClick={() => setShowEditLocationModal(location)}
                      className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                      title="Edit Location"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(location)}
                      className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                      title="Delete Location"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{paginationInfo.start}</span> to <span className="font-medium">{paginationInfo.end}</span> of <span className="font-medium">{paginationInfo.total}</span> locations
            </div>
            {selectedLocations.size > 0 && (
              <div className="text-sm text-blue-600 font-medium">
                {selectedLocations.size} selected
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
            >
              Previous
            </button>
            <div className="flex items-center space-x-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-2 py-1 text-sm font-medium rounded ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-white'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add Location Modal */}
      <AddLocationModal 
        isOpen={showAddLocationModal}
        onClose={() => setShowAddLocationModal(false)}
        onSubmit={(data) => addLocationMutation.mutate(data)}
        isLoading={addLocationMutation.isPending}
      />

      {/* Edit Location Modal */}
      <EditLocationModal 
        isOpen={!!showEditLocationModal}
        location={showEditLocationModal}
        onClose={() => setShowEditLocationModal(null)}
        onSubmit={(data) => showEditLocationModal && editLocationMutation.mutate({ id: showEditLocationModal.id, locationData: data })}
        isLoading={editLocationMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal 
        isOpen={!!showDeleteConfirm}
        location={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => showDeleteConfirm && deleteLocationMutation.mutate(showDeleteConfirm.id)}
        isLoading={deleteLocationMutation.isPending}
      />

      {/* View All Assignments Modal */}
      <ViewAllModal 
        location={showViewAllModal ? locationData?.locations?.find(l => l.id === showViewAllModal.id) || showViewAllModal : null}
        onClose={() => setShowViewAllModal(null)}
        onUnassign={(locationId, branchId) => unassignLocationMutation.mutate({ locationId, branchId })}
        isLoading={unassignLocationMutation.isPending}
      />
    </div>
  );
}

// Add Location Modal Component
function AddLocationModal({ isOpen, onClose, onSubmit, isLoading }: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    area: '',
    areaNameAr: '',
    city: 'عمان', // Auto-set to Amman's city
    governorate: 'Amman',
    averageDeliveryFee: 2.5
  });

  const [selectedMapLocation, setSelectedMapLocation] = useState<{lat: number, lng: number} | null>(null);

  // Reset form function
  const resetForm = () => {
    setFormData({ 
      area: '', 
      areaNameAr: '', 
      city: 'عمان', 
      governorate: 'Amman',
      averageDeliveryFee: 2.5
    });
    setCoordinates({ latitude: '', longitude: '' });
    setSelectedMapLocation(null);
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Auto-set city when governorate changes
  const handleGovernorateChange = (gov: string) => {
    const autoCity = GOVERNORATE_TO_CITY[gov as keyof typeof GOVERNORATE_TO_CITY];
    setFormData({...formData, governorate: gov, city: autoCity});
  };

  // Separate coordinate state (not sent to backend)
  const [coordinates, setCoordinates] = useState({
    latitude: '',
    longitude: ''
  });

  // Handle map location selection
  const handleMapLocationSelect = (location: {lat: number, lng: number}) => {
    setSelectedMapLocation(location);
    setCoordinates({
      latitude: location.lat.toString(),
      longitude: location.lng.toString()
    });
  };

  // Handle manual coordinate input
  const handleCoordinateChange = (field: 'latitude' | 'longitude', value: string) => {
    const updatedCoordinates = {...coordinates, [field]: value};
    setCoordinates(updatedCoordinates);
    
    // Update map if both coordinates are valid
    const lat = parseFloat(field === 'latitude' ? value : updatedCoordinates.latitude);
    const lng = parseFloat(field === 'longitude' ? value : updatedCoordinates.longitude);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      setSelectedMapLocation({lat, lng});
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Sending to backend:', formData); // Debug what's being sent
    onSubmit(formData); // Only send backend-expected fields
    // Don't reset form here - let the mutation's onSuccess handle it
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Add New Location
                </Dialog.Title>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Area Name (English)
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.area}
                      onChange={(e) => setFormData({...formData, area: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Downtown"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Area Name (Arabic)
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.areaNameAr}
                      onChange={(e) => setFormData({...formData, areaNameAr: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., وسط البلد"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Governorate
                    </label>
                    <select
                      value={formData.governorate}
                      onChange={(e) => handleGovernorateChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {GOVERNORATES.map(gov => (
                        <option key={gov} value={gov}>{gov}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Fee (JOD)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.averageDeliveryFee}
                      onChange={(e) => setFormData({...formData, averageDeliveryFee: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="2.5"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City (Auto-selected)
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
                      placeholder="City will be auto-selected based on governorate"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Coordinates
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Click on the map below to set coordinates for reference (coordinates are not stored on backend)
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <input
                          type="number"
                          step="any"
                          value={coordinates.latitude}
                          onChange={(e) => handleCoordinateChange('latitude', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Latitude (31.9454)"
                        />
                      </div>
                      
                      <div>
                        <input
                          type="number"
                          step="any"
                          value={coordinates.longitude}
                          onChange={(e) => handleCoordinateChange('longitude', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Longitude (35.9284)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Interactive Map */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Location on Map
                    </label>
                    <PigeonMapComponent
                      center={{ lat: 31.9454, lng: 35.9284 }} // Default to Amman center
                      zoom={12}
                      onLocationSelect={handleMapLocationSelect}
                      selectedLocation={selectedMapLocation}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Adding...' : 'Add Location'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// View All Assignments Modal Component
function ViewAllModal({ location, onClose, onUnassign, isLoading }: {
  location: GlobalLocation | null;
  onClose: () => void;
  onUnassign: (locationId: string, branchId: string) => void;
  isLoading: boolean;
}) {
  if (!location) return null;

  return (
    <Transition appear show={!!location} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Branch Assignments for {location.area}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="rounded-md bg-white text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Location:</span> {location.area} ({location.areaNameAr})
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">City:</span> {location.city}, {location.governorate}
                  </p>
                </div>
                
                {location.assignedBranches.length > 0 ? (
                  <div className="space-y-3">
                    {location.assignedBranches.map((assignment, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900 text-sm">
                                {assignment.branchName}
                              </div>
                              <div className="text-xs text-gray-600">
                                {assignment.companyName}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {assignment.deliveryFee != null && (
                                <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded">
                                  {assignment.deliveryFee} JOD
                                </span>
                              )}
                              <span className={`text-xs font-medium px-2 py-1 rounded ${
                                assignment.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {assignment.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => onUnassign(location.id, assignment.branchId)}
                          disabled={isLoading}
                          className="ml-4 px-3 py-1 text-xs text-red-600 hover:text-red-900 hover:bg-red-50 rounded border border-red-200 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No branches assigned to this location.
                  </div>
                )}
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// Edit Location Modal Component
function EditLocationModal({ isOpen, location, onClose, onSubmit, isLoading }: {
  isOpen: boolean;
  location: GlobalLocation | null;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    area: '',
    areaNameAr: '',
    city: '',
    governorate: '',
    averageDeliveryFee: 2.5
  });

  const [selectedMapLocation, setSelectedMapLocation] = useState<{lat: number, lng: number} | null>(null);
  const [coordinates, setCoordinates] = useState({
    latitude: '',
    longitude: ''
  });

  // Reset form when location changes
  useEffect(() => {
    if (isOpen && location) {
      setFormData({
        area: location.area || '',
        areaNameAr: location.areaNameAr || '',
        city: location.city || '',
        governorate: location.governorate || '',
        averageDeliveryFee: location.averageDeliveryFee || 2.5
      });
      setCoordinates({ latitude: '', longitude: '' });
      setSelectedMapLocation(null);
    }
  }, [isOpen, location]);

  // Auto-set city when governorate changes
  const handleGovernorateChange = (gov: string) => {
    const autoCity = GOVERNORATE_TO_CITY[gov as keyof typeof GOVERNORATE_TO_CITY];
    setFormData({...formData, governorate: gov, city: autoCity});
  };

  // Handle map location selection
  const handleMapLocationSelect = (location: {lat: number, lng: number}) => {
    setSelectedMapLocation(location);
    setCoordinates({
      latitude: location.lat.toString(),
      longitude: location.lng.toString()
    });
  };

  // Handle manual coordinate input
  const handleCoordinateChange = (field: 'latitude' | 'longitude', value: string) => {
    const updatedCoordinates = {...coordinates, [field]: value};
    setCoordinates(updatedCoordinates);
    
    // Update map if both coordinates are valid
    const lat = parseFloat(field === 'latitude' ? value : updatedCoordinates.latitude);
    const lng = parseFloat(field === 'longitude' ? value : updatedCoordinates.longitude);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      setSelectedMapLocation({lat, lng});
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!location) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Edit Location: {location.area}
                </Dialog.Title>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Area Name (English)
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.area}
                      onChange={(e) => setFormData({...formData, area: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Downtown"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Area Name (Arabic)
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.areaNameAr}
                      onChange={(e) => setFormData({...formData, areaNameAr: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., وسط البلد"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Governorate
                    </label>
                    <select
                      value={formData.governorate}
                      onChange={(e) => handleGovernorateChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {GOVERNORATES.map(gov => (
                        <option key={gov} value={gov}>{gov}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Fee (JOD)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.averageDeliveryFee}
                      onChange={(e) => setFormData({...formData, averageDeliveryFee: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="2.5"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City (Auto-selected)
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
                      placeholder="City will be auto-selected based on governorate"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Coordinates (Optional)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Click on the map below to set coordinates for reference
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <input
                          type="number"
                          step="any"
                          value={coordinates.latitude}
                          onChange={(e) => handleCoordinateChange('latitude', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Latitude (31.9454)"
                        />
                      </div>
                      
                      <div>
                        <input
                          type="number"
                          step="any"
                          value={coordinates.longitude}
                          onChange={(e) => handleCoordinateChange('longitude', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Longitude (35.9284)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Interactive Map */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Location on Map
                    </label>
                    <PigeonMapComponent
                      center={{ lat: 31.9454, lng: 35.9284 }} // Default to Amman center
                      zoom={12}
                      onLocationSelect={handleMapLocationSelect}
                      selectedLocation={selectedMapLocation}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Updating...' : 'Update Location'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// Delete Confirmation Modal Component
function DeleteConfirmModal({ isOpen, location, onClose, onConfirm, isLoading }: {
  isOpen: boolean;
  location: GlobalLocation | null;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  if (!location) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-center">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <TrashIcon className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                
                <div className="mt-3 text-center">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Delete Location
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete <strong>{location.area}</strong>?
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {location.areaNameAr} • {location.city}, {location.governorate}
                    </p>
                    {location.assignedBranches && location.assignedBranches.length > 0 && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                          ⚠️ This location is assigned to {location.assignedBranches.length} branch(es). 
                          Deleting it will remove all assignments.
                        </p>
                      </div>
                    )}
                    <p className="text-sm text-red-600 font-medium mt-3">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex justify-center space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Deleting...' : 'Delete Location'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}