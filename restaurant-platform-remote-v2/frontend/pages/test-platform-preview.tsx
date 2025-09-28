import React, { useState } from 'react';
import { PlatformProductPreview } from '../src/features/menu/components/PlatformProductPreview';

export default function TestPlatformPreview() {
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Platform Product Preview Test</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Careem Platform</h3>
            <PlatformProductPreview
              platformId="careem-menu-001"
              platformName="Careem Now Express Menu"
              selectedBranches={selectedBranches}
            />
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Talabat Platform</h3>
            <PlatformProductPreview
              platformId="talabat-menu-001"
              platformName="Talabat Delivery Menu"
              selectedBranches={selectedBranches}
            />
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Dine-In Platform</h3>
            <PlatformProductPreview
              platformId="dine-in-menu-001"
              platformName="Dine-In Restaurant Menu"
              selectedBranches={selectedBranches}
            />
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Call Center Platform</h3>
            <PlatformProductPreview
              platformId="call-center-menu-001"
              platformName="Phone Order Menu"
              selectedBranches={selectedBranches}
            />
          </div>
        </div>

        <div className="mt-8 bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Debug Info</h3>
          <div className="text-sm text-gray-600">
            <p>Selected Branches: {selectedBranches.length > 0 ? selectedBranches.join(', ') : 'None'}</p>
            <p>Test environment with auth token from localStorage</p>
          </div>
        </div>
      </div>
    </div>
  );
}