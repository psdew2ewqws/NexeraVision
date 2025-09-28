import React, { useState } from 'react';
import { 
  UsersIcon, 
  BuildingOfficeIcon, 
  MapPinIcon, 
  CheckIcon, 
  XMarkIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import LocationSearchModal from './LocationSearchModal';

interface GlobalLocation {
  id: string;
  originalId: string; // Added missing property
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

interface DeliveryZone {
  id: string;
  zoneName: { en: string; ar: string };
  branch: {
    id: string;
    name: string;
    company: {
      id: string;
      name: string;
    };
  };
}

interface Company {
  id: string;
  name: string;
  status: string;
}

interface Branch {
  id: string;
  name: string;
  companyId: string;
}

interface BulkLocationAssignmentProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
  companyId?: string;
  branchId?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

export default function BulkLocationAssignment({
  isOpen,
  onClose,
  userRole,
  companyId,
  branchId
}: BulkLocationAssignmentProps) {
  const [selectedLocations, setSelectedLocations] = useState<GlobalLocation[]>([]);
  const [selectedCompany, setSelectedCompany] = useState(companyId || '');
  const [selectedBranch, setSelectedBranch] = useState(branchId || '');
  const [selectedZone, setSelectedZone] = useState('');
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Select Company/Branch, 2: Select Zone, 3: Select Locations, 4: Review
  const queryClient = useQueryClient();

  // Fetch companies (super_admin only)
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    enabled: isOpen && userRole === 'super_admin'
  });

  // Fetch branches based on selected company
  const { data: branches = [] } = useQuery({
    queryKey: ['branches', selectedCompany],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/branches${selectedCompany ? `?companyId=${selectedCompany}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    enabled: isOpen && !!selectedCompany
  });

  // Fetch delivery zones for selected branch
  const { data: zones = [] } = useQuery({
    queryKey: ['delivery-zones', selectedBranch],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/delivery/zones${selectedBranch ? `?branchId=${selectedBranch}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    enabled: isOpen && !!selectedBranch
  });

  // Bulk assignment mutation
  const bulkAssignMutation = useMutation({
    mutationFn: async (data: {
      locationIds: string[];
      zoneId: string;
      companyId?: string;
      branchId?: string;
    }) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/delivery/locations/bulk-assign`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Successfully assigned ${selectedLocations.length} locations to delivery zone`);
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      handleReset();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to assign locations');
    }
  });

  const handleReset = () => {
    setSelectedLocations([]);
    setSelectedCompany(companyId || '');
    setSelectedBranch(branchId || '');
    setSelectedZone('');
    setCurrentStep(1);
  };

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleLocationSelect = (location: GlobalLocation) => {
    const isSelected = selectedLocations.some(loc => loc.id === location.id);
    if (isSelected) {
      setSelectedLocations(prev => prev.filter(loc => loc.id !== location.id));
    } else {
      setSelectedLocations(prev => [...prev, location]);
    }
  };

  const handleSubmit = () => {
    if (!selectedZone || selectedLocations.length === 0) {
      toast.error('Please select a zone and at least one location');
      return;
    }

    bulkAssignMutation.mutate({
      locationIds: selectedLocations.map(loc => loc.id),
      zoneId: selectedZone,
      companyId: selectedCompany || undefined,
      branchId: selectedBranch || undefined
    });
  };

  const canProceedToStep = (step: number) => {
    switch (step) {
      case 2:
        return !!selectedCompany && !!selectedBranch;
      case 3:
        return !!selectedZone;
      case 4:
        return selectedLocations.length > 0;
      default:
        return true;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
        <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Bulk Location Assignment</h3>
              <p className="text-sm text-gray-500 mt-1">
                Assign multiple locations to delivery zones • Step {currentStep} of 4
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-8">
              {[
                { step: 1, label: 'Company & Branch', icon: BuildingOfficeIcon },
                { step: 2, label: 'Delivery Zone', icon: MapPinIcon },
                { step: 3, label: 'Select Locations', icon: MagnifyingGlassIcon },
                { step: 4, label: 'Review & Assign', icon: CheckIcon }
              ].map(({ step, label, icon: Icon }) => (
                <div key={step} className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep >= step 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {currentStep > step ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className={`text-sm ${
                    currentStep >= step ? 'text-blue-600 font-medium' : 'text-gray-500'
                  }`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-auto p-6">
            {currentStep === 1 && (
              <div className="space-y-6">
                <h4 className="font-medium text-gray-900">Select Target Hierarchy</h4>
                
                {/* Role-based hierarchy display */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <UsersIcon className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-900">Your Access Level: {userRole}</span>
                  </div>
                  <div className="text-sm text-blue-700">
                    {userRole === 'super_admin' && 'You can assign locations to any company and branch'}
                    {userRole === 'company_owner' && 'You can assign locations to branches in your company'}
                    {userRole === 'branch_manager' && 'You can assign locations to your branch only'}
                  </div>
                </div>

                {userRole === 'super_admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                    <select
                      value={selectedCompany}
                      onChange={(e) => {
                        setSelectedCompany(e.target.value);
                        setSelectedBranch(''); // Reset branch when company changes
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Company</option>
                      {companies.map((company: Company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedCompany && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Branch</option>
                      {branches.map((branch: Branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h4 className="font-medium text-gray-900">Select Delivery Zone</h4>
                
                {zones.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No delivery zones</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Create a delivery zone for this branch first
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {zones.map((zone: DeliveryZone) => (
                      <div
                        key={zone.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedZone === zone.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedZone(zone.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium text-gray-900">{zone.zoneName.en}</h5>
                            <p className="text-sm text-gray-600">{zone.zoneName.ar}</p>
                            <p className="text-xs text-blue-600 mt-1">
                              {zone.branch.name} • {zone.branch.company.name}
                            </p>
                          </div>
                          {selectedZone === zone.id && (
                            <CheckIcon className="h-6 w-6 text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Select Locations</h4>
                  <button
                    onClick={() => setShowLocationSearch(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <MagnifyingGlassIcon className="h-4 w-4 mr-2 inline" />
                    Search Locations
                  </button>
                </div>

                {selectedLocations.length === 0 ? (
                  <div className="text-center py-12">
                    <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No locations selected</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Use the search button to select locations from 3,979+ available
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4 text-sm text-gray-600">
                      {selectedLocations.length} location(s) selected
                    </div>
                    <div className="space-y-2 max-h-60 overflow-auto">
                      {selectedLocations.map((location) => (
                        <div
                          key={location.id}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
                        >
                          <div>
                            <div className="font-medium text-gray-900">
                              {location.subArea || location.area}
                            </div>
                            <div className="text-sm text-gray-600">
                              {location.city} • {location.governorate} • {location.averageDeliveryFee} JOD
                            </div>
                          </div>
                          <button
                            onClick={() => handleLocationSelect(location)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <h4 className="font-medium text-gray-900">Review Assignment</h4>
                
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div>
                    <span className="font-medium text-gray-700">Target Zone:</span>
                    <div className="mt-1">
                      {zones.find((z: DeliveryZone) => z.id === selectedZone)?.zoneName.en}
                      <span className="text-gray-600 ml-2">
                        ({zones.find((z: DeliveryZone) => z.id === selectedZone)?.branch.name})
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Locations to Assign:</span>
                    <div className="mt-1 text-blue-600 font-medium">
                      {selectedLocations.length} locations across Jordan
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <span className="font-medium text-gray-700">Preview:</span>
                    <div className="mt-2 space-y-1 text-sm text-gray-600 max-h-32 overflow-auto">
                      {selectedLocations.slice(0, 5).map((location) => (
                        <div key={location.id}>
                          • {location.subArea || location.area}, {location.city}
                        </div>
                      ))}
                      {selectedLocations.length > 5 && (
                        <div className="text-gray-500">
                          ... and {selectedLocations.length - 5} more locations
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <button
              onClick={currentStep === 1 ? onClose : handleBack}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </button>
            
            <div className="flex space-x-3">
              {currentStep < 4 ? (
                <button
                  onClick={handleNext}
                  disabled={!canProceedToStep(currentStep + 1)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={bulkAssignMutation.isPending || selectedLocations.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkAssignMutation.isPending ? 'Assigning...' : 'Assign Locations'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Location Search Modal */}
      {showLocationSearch && (
        <LocationSearchModal
          isOpen={showLocationSearch}
          onClose={() => setShowLocationSearch(false)}
          onSelect={handleLocationSelect}
          selectedLocations={selectedLocations}
          multiSelect={true}
          title="Select Locations for Bulk Assignment"
        />
      )}
    </>
  );
}