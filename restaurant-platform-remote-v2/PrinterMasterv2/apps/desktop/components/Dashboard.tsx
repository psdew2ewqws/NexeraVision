import { useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Button } from './ui/button';
import { LoadingSpinner } from './ui/loading-spinner';
import { cn } from '@/lib/utils';

export function Dashboard() {
  const {
    license,
    branch,
    printers,
    qzTrayStatus,
    systemMetrics,
    healthStatus,
    printersLoading,
    isLoading,
    refreshPrinters,
    discoverPrinters,
    testPrinter,
    connectQZTray,
  } = useAppStore();

  useEffect(() => {
    // Initial data load
    refreshPrinters();
    connectQZTray();
  }, [refreshPrinters, connectQZTray]);

  const onlinePrinters = printers.filter(p => p.status === 'online').length;
  const offlinePrinters = printers.filter(p => p.status === 'offline').length;
  const errorPrinters = printers.filter(p => p.status === 'error').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-100';
      case 'offline': return 'text-red-600 bg-red-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'testing': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  RestaurantPrint Pro
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {branch?.name || 'Unknown Branch'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  qzTrayStatus ? 'bg-green-500' : 'bg-red-500'
                )} />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  QZ Tray: {qzTrayStatus ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              <Button
                onClick={() => window.electronAPI?.quitApp()}
                variant="ghost"
                size="sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Printers</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{printers.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Online</p>
                <p className="text-2xl font-semibold text-green-600">{onlinePrinters}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Offline</p>
                <p className="text-2xl font-semibold text-red-600">{offlinePrinters}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Errors</p>
                <p className="text-2xl font-semibold text-yellow-600">{errorPrinters}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button
            onClick={discoverPrinters}
            disabled={printersLoading}
          >
            {printersLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Discovering...
              </>
            ) : (
              'Discover Printers'
            )}
          </Button>
          
          <Button
            onClick={refreshPrinters}
            variant="outline"
            disabled={printersLoading}
          >
            Refresh
          </Button>
          
          <Button
            onClick={connectQZTray}
            variant="outline"
            disabled={!!qzTrayStatus}
          >
            {qzTrayStatus ? 'QZ Tray Connected' : 'Connect QZ Tray'}
          </Button>
        </div>

        {/* Printers List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Printers ({printers.length})
            </h2>
          </div>
          
          <div className="p-6">
            {isLoading || printersLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading printers...</span>
              </div>
            ) : printers.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No printers found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Click "Discover Printers" to find available printers.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {printers.map((printer) => (
                  <div key={printer.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {printer.name}
                      </h3>
                      <span className={cn(
                        'px-2 py-1 text-xs font-medium rounded-full',
                        getStatusColor(printer.status)
                      )}>
                        {printer.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <p>Type: {printer.connectionType}</p>
                      {printer.ipAddress && <p>IP: {printer.ipAddress}</p>}
                      {printer.lastSeen && (
                        <p>Last Seen: {new Date(printer.lastSeen).toLocaleTimeString()}</p>
                      )}
                    </div>
                    
                    <div className="mt-4 flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => testPrinter(printer.id)}
                        disabled={printer.status === 'testing'}
                      >
                        {printer.status === 'testing' ? 'Testing...' : 'Test'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* System Health */}
        {healthStatus && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              System Health
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className={cn(
                  'w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2',
                  healthStatus.status === 'healthy' ? 'bg-green-100' :
                  healthStatus.status === 'degraded' ? 'bg-yellow-100' : 'bg-red-100'
                )}>
                  <svg className={cn(
                    'w-6 h-6',
                    healthStatus.status === 'healthy' ? 'text-green-600' :
                    healthStatus.status === 'degraded' ? 'text-yellow-600' : 'text-red-600'
                  )} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {healthStatus.status.toUpperCase()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Score: {healthStatus.overall?.score || 0}/100
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {systemMetrics?.uptime ? Math.floor(systemMetrics.uptime / 3600) : 0}h
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Uptime</p>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {systemMetrics?.memory ? Math.round(systemMetrics.memory.heapUsed / 1024 / 1024) : 0}MB
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Memory</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}