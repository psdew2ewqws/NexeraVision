import React, { useState, useEffect } from 'react';
import {
  Cog6ToothIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  PlusIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../../shared/contexts/AuthContext';
import {
  useDeliveryChannels,
  useCompanyChannelAssignments,
  usePlatformMenuAssignments,
  useCreateCompanyChannelAssignment,
} from '../hooks/usePlatformSettings';
import { useSyncManager } from '../hooks/useSyncManagement';
import { PlatformAssignmentCard } from './PlatformAssignmentCard';
import { ChannelSelector } from './ChannelSelector';
import { SyncControls } from './SyncControls';
import toast from 'react-hot-toast';

export const PlatformSettings: React.FC = () => {
  const { user } = useAuth();
  const [showChannelSelector, setShowChannelSelector] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);

  // Fetch data
  const {
    data: channelsData,
    isLoading: channelsLoading,
    error: channelsError,
  } = useDeliveryChannels();

  const {
    data: assignmentsData,
    isLoading: assignmentsLoading,
    error: assignmentsError,
    refetch: refetchAssignments,
  } = useCompanyChannelAssignments();

  const {
    data: platformAssignmentsData,
    isLoading: platformAssignmentsLoading,
  } = usePlatformMenuAssignments();

  const createChannelAssignment = useCreateCompanyChannelAssignment();

  // Handle assignment creation
  const handleCreateAssignment = async (channelId: string, config: any) => {
    try {
      await createChannelAssignment.mutateAsync({
        channelId,
        isEnabled: true,
        priority: 0,
        syncEnabled: true,
        autoSyncInterval: 15,
        ...config,
      });
      setShowChannelSelector(false);
      refetchAssignments();
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Loading state
  if (channelsLoading || assignmentsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Platform Settings</h3>
          <p className="text-gray-600">Fetching channel configurations...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (channelsError || assignmentsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircleIcon className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Settings</h3>
          <p className="text-gray-600 mb-4">
            {channelsError?.message || assignmentsError?.message || 'Unable to fetch platform settings'}
          </p>
          <button
            onClick={() => {
              refetchAssignments();
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const availableChannels = channelsData?.channels || [];
  const companyAssignments = assignmentsData?.assignments || [];
  const platformAssignments = platformAssignmentsData?.assignments || [];

  // Get unassigned channels
  const assignedChannelIds = new Set(companyAssignments.map(a => a.channelId));
  const unassignedChannels = availableChannels.filter(channel =>
    !assignedChannelIds.has(channel.id) && channel.isActive
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Cog6ToothIcon className="w-8 h-8 mr-3 text-indigo-600" />
                Platform Settings
              </h1>
              <p className="mt-2 text-gray-600">
                Manage delivery channel assignments and synchronization settings for your menus
              </p>
            </div>

            {unassignedChannels.length > 0 && (
              <button
                onClick={() => setShowChannelSelector(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Channel
              </button>
            )}
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Channel Assignment Rules:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Each platform menu can be assigned to exactly one delivery channel</li>
                <li>Sync settings control how often menu data is synchronized with the channel</li>
                <li>Manual sync can be triggered at any time for immediate updates</li>
                <li>Monitor sync status and logs to ensure successful data transfer</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {companyAssignments.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <CloudArrowUpIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Channels Assigned</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Get started by assigning your first delivery channel. This will enable menu synchronization
              with external platforms like Talabat, Careem, and others.
            </p>
            {unassignedChannels.length > 0 ? (
              <button
                onClick={() => setShowChannelSelector(true)}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Assign First Channel
              </button>
            ) : (
              <div className="text-gray-500">
                <p>No channels available for assignment.</p>
                <p className="text-sm mt-1">Contact support to enable additional channels.</p>
              </div>
            )}
          </div>
        ) : (
          /* Channel Assignments Grid */
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {companyAssignments.map((assignment) => (
              <PlatformAssignmentCard
                key={assignment.id}
                assignment={assignment}
                platformAssignments={platformAssignments.filter(
                  pa => pa.companyChannelAssignmentId === assignment.id
                )}
                onSelect={() => setSelectedAssignment(assignment.id)}
                isSelected={selectedAssignment === assignment.id}
              />
            ))}
          </div>
        )}

        {/* Sync Controls Panel */}
        {selectedAssignment && (
          <div className="mt-8">
            <SyncControls assignmentId={selectedAssignment} />
          </div>
        )}

        {/* Channel Selector Modal */}
        {showChannelSelector && (
          <ChannelSelector
            availableChannels={unassignedChannels}
            onSelect={handleCreateAssignment}
            onClose={() => setShowChannelSelector(false)}
            isCreating={createChannelAssignment.isPending}
          />
        )}
      </div>
    </div>
  );
};