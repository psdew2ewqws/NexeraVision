// Header component with save button and title

import React from 'react';
import { DocumentTextIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface MenuBuilderHeaderProps {
  onSave: () => void;
  saving: boolean;
  canSave: boolean;
}

export const MenuBuilderHeader: React.FC<MenuBuilderHeaderProps> = ({
  onSave,
  saving,
  canSave
}) => {
  return (
    <div className="border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <DocumentTextIcon className="h-6 w-6 text-gray-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Menu Builder</h2>
            <p className="text-sm text-gray-500">
              Create and customize your menu for different branches and channels
            </p>
          </div>
        </div>
        <button
          onClick={onSave}
          disabled={saving || !canSave}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Save menu"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Save Menu
            </>
          )}
        </button>
      </div>
    </div>
  );
};
