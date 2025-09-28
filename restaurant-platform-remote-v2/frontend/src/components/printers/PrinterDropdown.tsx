import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, PrinterIcon, WifiIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Printer {
  id: string;
  name: string;
  type: string;
  status: string;
  isOnline: boolean;
  capabilities?: string[];
  location?: string;
}

interface PrinterDropdownProps {
  value?: string;
  onChange: (printerId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  showStatus?: boolean;
  filterByCapability?: string[];
  onlyOnline?: boolean;
}

export default function PrinterDropdown({
  value,
  onChange,
  placeholder = "Select a printer...",
  disabled = false,
  required = false,
  className = "",
  showStatus = true,
  filterByCapability = [],
  onlyOnline = true
}: PrinterDropdownProps) {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available printers
  useEffect(() => {
    fetchPrinters();
  }, []);

  const fetchPrinters = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get printers directly from PrinterMaster for real-time status
      const response = await fetch('http://127.0.0.1:8182/printers');

      if (!response.ok) {
        throw new Error('Failed to fetch printers from PrinterMaster');
      }

      const data = await response.json();
      let fetchedPrinters = data.data || data;

      // Transform PrinterMaster format to expected format
      fetchedPrinters = fetchedPrinters.map((printer: any) => ({
        id: printer.id,
        name: printer.name,
        type: printer.type,
        status: printer.status === 'online' ? 'ready' : 'offline',
        isOnline: printer.status === 'online',
        capabilities: printer.capabilities || (['cut', 'paper_cut', 'thermal']), // Default thermal capabilities including cut
        location: printer.location || ''
      }));

      // Apply filters
      if (onlyOnline) {
        fetchedPrinters = fetchedPrinters.filter((p: Printer) => p.isOnline);
      }

      if (filterByCapability.length > 0) {
        fetchedPrinters = fetchedPrinters.filter((p: Printer) =>
          p.capabilities && filterByCapability.some(cap => p.capabilities?.includes(cap))
        );
      }

      setPrinters(fetchedPrinters);
    } catch (err) {
      console.error('Error fetching printers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load printers');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPrinter = printers.find(p => p.name === value);

  const getStatusIcon = (printer: Printer) => {
    if (!printer.isOnline) {
      return <XMarkIcon className="w-4 h-4 text-red-500" />;
    }
    return <WifiIcon className="w-4 h-4 text-green-500" />;
  };

  const getStatusColor = (printer: Printer) => {
    if (!printer.isOnline) return 'text-red-600 bg-red-50';
    if (printer.status === 'error') return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className={`
          relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm
          ${disabled || isLoading ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'hover:border-gray-400'}
          ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
        `}
      >
        <span className="flex items-center">
          <PrinterIcon className="w-5 h-5 text-gray-400 mr-2" />

          {isLoading ? (
            <span className="text-gray-500">Loading printers...</span>
          ) : selectedPrinter ? (
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <span className="block truncate">{selectedPrinter.name}</span>
              {showStatus && (
                <div className="flex items-center space-x-1">
                  {getStatusIcon(selectedPrinter)}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedPrinter)}`}>
                    {selectedPrinter.status}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </span>

        <span className="ml-3 absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-56 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {error ? (
            <div className="px-3 py-2 text-sm text-red-600 bg-red-50">
              <p>{error}</p>
              <button
                onClick={fetchPrinters}
                className="mt-1 text-blue-600 hover:text-blue-800 underline text-xs"
              >
                Retry
              </button>
            </div>
          ) : isLoading ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Loading printers...
              </div>
            </div>
          ) : printers.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              <p>No printers available</p>
              <button
                onClick={fetchPrinters}
                className="mt-1 text-blue-600 hover:text-blue-800 underline text-xs"
              >
                Refresh
              </button>
            </div>
          ) : (
            <>
              {!required && (
                <div
                  onClick={() => {
                    onChange(null);
                    setIsOpen(false);
                  }}
                  className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <PrinterIcon className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-gray-500 italic">No printer selected</span>
                  </div>
                </div>
              )}

              {printers.map((printer) => (
                <div
                  key={printer.id}
                  onClick={() => {
                    onChange(printer.name);
                    setIsOpen(false);
                  }}
                  className={`
                    cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50
                    ${value === printer.name ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <PrinterIcon className={`w-5 h-5 ${value === printer.name ? 'text-blue-600' : 'text-gray-400'} mr-2`} />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{printer.name}</span>
                        {printer.location && (
                          <span className="block text-xs text-gray-500 truncate">{printer.location}</span>
                        )}
                      </div>
                    </div>

                    {showStatus && (
                      <div className="flex items-center space-x-1 ml-2">
                        {getStatusIcon(printer)}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(printer)}`}>
                          {printer.status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}