// Summary and bulk actions for selected products

import React from 'react';

interface SelectionSummaryProps {
  selectedCount: number;
  visibleProductIds: string[];
  selectedIds: string[];
  onSelectAllVisible: () => void;
}

export const SelectionSummary: React.FC<SelectionSummaryProps> = ({
  selectedCount,
  visibleProductIds,
  selectedIds,
  onSelectAllVisible
}) => {
  const allVisibleSelected = visibleProductIds.length > 0 &&
    visibleProductIds.every(id => selectedIds.includes(id));

  const summary = selectedCount > 0
    ? `${selectedCount} products selected`
    : 'No products selected';

  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700">Product Selection *</h3>
        <p className="text-xs text-gray-500">{summary}</p>
      </div>
      <button
        onClick={onSelectAllVisible}
        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        disabled={visibleProductIds.length === 0}
      >
        {allVisibleSelected ? 'Deselect All Visible' : 'Select All Visible'}
      </button>
    </div>
  );
};
