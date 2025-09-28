import React from 'react';
import { Save, X, Undo, Redo, Play, Eye } from 'lucide-react';
import { useTemplateBuilderStore } from '../stores/template-builder.store';

interface TemplateHeaderProps {
  onSave?: () => void;
  onCancel?: () => void;
}

export function TemplateHeader({ onSave, onCancel }: TemplateHeaderProps) {
  const {
    currentTemplate,
    hasUnsavedChanges,
    isSaving,
    history,
    historyIndex,
    undo,
    redo,
  } = useTemplateBuilderStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
      {/* Left section */}
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-semibold text-gray-900">
          {currentTemplate?.name || 'Template Builder'}
        </h1>
        {hasUnsavedChanges && (
          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
            Unsaved changes
          </span>
        )}
      </div>

      {/* Center section - Tools */}
      <div className="flex items-center space-x-2">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          title="Undo"
        >
          <Undo size={18} />
        </button>

        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          title="Redo"
        >
          <Redo size={18} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        <button
          className="flex items-center px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          title="Test Print"
        >
          <Play size={16} className="mr-2" />
          Test Print
        </button>

        <button
          className="flex items-center px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          title="Preview"
        >
          <Eye size={16} className="mr-2" />
          Preview
        </button>
      </div>

      {/* Right section */}
      <div className="flex items-center space-x-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex items-center px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          >
            <X size={16} className="mr-2" />
            Cancel
          </button>
        )}

        <button
          onClick={onSave}
          disabled={isSaving || !hasUnsavedChanges}
          className="flex items-center px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} className="mr-2" />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

