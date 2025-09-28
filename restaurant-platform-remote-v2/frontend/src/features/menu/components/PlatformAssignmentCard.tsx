import React, { useState } from 'react';
import {
  CloudIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  TrashIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import {
  CompanyChannelAssignment,
  PlatformMenuAssignment,
  useUpdateCompanyChannelAssignment,
  useDeleteCompanyChannelAssignment,
} from '../hooks/usePlatformSettings';
import { useSyncManager } from '../hooks/useSyncManagement';

interface PlatformAssignmentCardProps {
  assignment: CompanyChannelAssignment;
  platformAssignments: PlatformMenuAssignment[];
  onSelect: () => void;
  isSelected: boolean;
}

export const PlatformAssignmentCard: React.FC<PlatformAssignmentCardProps> = ({
  assignment,
  platformAssignments,
  onSelect,
  isSelected,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateAssignment = useUpdateCompanyChannelAssignment();
  const deleteAssignment = useDeleteCompanyChannelAssignment();
  const { isActive, status, progress, triggerSync, cancelSync, isTriggering } = useSyncManager(assignment.id);

  // Get status color and icon
  const getStatusInfo = () => {
    if (!assignment.isEnabled) {
      return {
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        icon: XCircleIcon,
        text: 'Disabled',
      };
    }

    if (isActive) {
      return {
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        icon: ArrowPathIcon,
        text: status === 'pending' ? 'Pending' : 'Syncing',
      };
    }

    if (assignment.syncStatus === 'completed') {
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        icon: CheckCircleIcon,
        text: 'Synced',
      };
    }

    if (assignment.syncStatus === 'failed') {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: ExclamationTriangleIcon,
        text: 'Failed',
      };
    }

    return {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      icon: ClockIcon,
      text: 'Pending',
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const handleToggleEnabled = async () => {
    await updateAssignment.mutateAsync({
      assignmentId: assignment.id,
      data: { isEnabled: !assignment.isEnabled },
    });
  };

  const handleDelete = async () => {
    await deleteAssignment.mutateAsync(assignment.id);
    setShowDeleteConfirm(false);
  };

  return (
    <div
      className={`bg-white rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
        isSelected ? 'border-indigo-500 shadow-md' : 'border-gray-200'
      }`}
    >
      {/* Card Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CloudIcon className="w-10 h-10 text-indigo-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">
                {assignment.channel.name}
              </h3>
              <p className="text-sm text-gray-500">
                {assignment.channel.providerName} • {assignment.channel.channelType}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-4 flex items-center justify-between">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
            <StatusIcon className={`w-4 h-4 mr-1.5 ${isActive ? 'animate-spin' : ''}`} />
            {statusInfo.text}
          </div>

          <div className="flex items-center space-x-2">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={assignment.isEnabled}
                onChange={handleToggleEnabled}
                disabled={updateAssignment.isPending}
                className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
              />
              <span className="ml-2 text-sm text-gray-700">Enabled</span>
            </label>
          </div>
        </div>

        {/* Progress Bar (when syncing) */}
        {isActive && progress && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>Sync Progress</span>
              <span>{progress.processed} / {progress.total} items ({progress.percentage}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-6">
        {/* Platform Assignments Count */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Platform Menus</p>
            <p className="text-sm text-gray-500">
              {platformAssignments.length} menu{platformAssignments.length !== 1 ? 's' : ''} assigned
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">Priority</p>
            <p className="text-sm text-gray-500">{assignment.priority}</p>
          </div>
        </div>

        {/* Last Sync Info */}
        {assignment.lastSyncAt && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-900">Last Sync</p>
            <p className="text-sm text-gray-500">
              {format(new Date(assignment.lastSyncAt), 'MMM d, yyyy HH:mm')}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={triggerSync}
            disabled={!assignment.isEnabled || isActive || isTriggering}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`w-4 h-4 mr-2 ${isTriggering ? 'animate-spin' : ''}`} />
            {isTriggering ? 'Starting...' : 'Sync Now'}
          </button>

          <button
            onClick={onSelect}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Details
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auto Sync Interval (minutes)
              </label>
              <input
                type="number"
                min="5"
                max="1440"
                value={assignment.autoSyncInterval || 15}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value >= 5 && value <= 1440) {
                    updateAssignment.mutate({
                      assignmentId: assignment.id,
                      data: { autoSyncInterval: value },
                    });
                  }
                }}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={assignment.syncEnabled}
                  onChange={(e) => {
                    updateAssignment.mutate({
                      assignmentId: assignment.id,
                      data: { syncEnabled: e.target.checked },
                    });
                  }}
                  className="form-checkbox h-4 w-4 text-indigo-600"
                />
                <span className="ml-2 text-sm text-gray-700">Auto Sync Enabled</span>
              </label>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center px-2 py-1 text-sm text-red-600 hover:text-red-800"
              >
                <TrashIcon className="w-4 h-4 mr-1" />
                Remove
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <ExclamationTriangleIcon className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Remove Channel Assignment</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to remove the assignment for {assignment.channel.name}?
                  This will stop all synchronization and cannot be undone.
                </p>
              </div>
              <div className="flex items-center justify-center space-x-3 mt-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteAssignment.isPending}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:bg-gray-300"
                >
                  {deleteAssignment.isPending ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};