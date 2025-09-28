import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import io from 'socket.io-client';
import {
  ArrowLeftIcon,
  PrinterIcon,
  CogIcon,
  WifiIcon,
  ComputerDesktopIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  BuildingStorefrontIcon,
  CloudIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  TagIcon,
  SignalIcon,
  CpuChipIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../src/contexts/AuthContext';
import { ProtectedRoute } from '../../src/components/shared/ProtectedRoute';
import toast from 'react-hot-toast';

// Node.js Printer Service Interface - Cross-platform Compatible
interface NodeJSPrinter {
  id: string;
  name: string;
  type: 'thermal' | 'receipt' | 'kitchen' | 'label' | 'barcode' | 'unknown';
  connectionType: 'network' | 'usb' | 'bluetooth' | 'serial';
  ipAddress?: string;
  port?: number;
  model?: string;
  manufacturer?: string;
  status: 'online' | 'offline' | 'error' | 'busy' | 'low_paper' | 'no_paper' | 'unknown';
  isDefault: boolean;
  companyId: string;
  companyName?: string; // For super admin view
  branchId?: string;
  branchName?: string;
  assignedTo: 'kitchen' | 'cashier' | 'bar' | 'all';
  capabilities?: string[];
  lastSeen?: string;
  isAutoDetected?: boolean;
  platform?: 'windows' | 'macos' | 'linux';
  deliveryPlatforms?: {
    dhub?: boolean;
    careem?: boolean;
    talabat?: boolean;
    callCenter?: boolean;
    website?: boolean;
  };
  queueLength?: number;
  description?: string;
  // Multi-tenant display info
  company?: {
    id: string;
    name: string;
  };
  branch?: {
    id: string;
    name: string;
  };
}

export default function NodeJSPrintingSettingsPage() {
  const { user } = useAuth();
  const [printers, setPrinters] = useState<NodeJSPrinter[]>([]);
  const [loading, setLoading] = useState(false);
  const [printerServiceStatus, setPrinterServiceStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  const [wsConnected, setWsConnected] = useState(false);
  const [phase4Analytics, setPhase4Analytics] = useState(null);
  const [showAdvancedFeatures, setShowAdvancedFeatures] = useState(false);
  // Force webpack to recompile

  // Load printers from PrinterBridge (bypasses WebSocket authentication issues)
  const loadPrinters = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Loading printers via PrinterBridge...');

      // Use the PrinterBridge endpoint which bypasses authentication issues
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/printer-bridge/get-printers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('PrinterBridge printers loaded:', data.count || 0, 'printers');

        if (data.success && data.data) {
          // Transform the PrinterBridge response to match the frontend interface
          const transformedPrinters: NodeJSPrinter[] = data.data.map((printer: any) => ({
            id: printer.id,
            name: printer.name,
            type: printer.type || 'thermal',
            connectionType: printer.connection === 'usb' ? 'usb' : 'network',
            status: printer.status,
            isDefault: false,
            companyId: user?.companyId || '',
            branchId: user?.branchId,
            assignedTo: 'all' as const,
            capabilities: printer.capabilities || ['text'],
            lastSeen: new Date().toISOString(),
            isAutoDetected: true,
            platform: 'linux' as const,
            company: user?.company,
            branch: user?.branch,
            deliveryPlatforms: {
              dhub: true,
              careem: true,
              talabat: true,
              callCenter: true,
              website: true
            }
          }));

          setPrinters(transformedPrinters);
        } else {
          console.warn('PrinterBridge returned unsuccessful response:', data);
          setPrinters([]);
        }
      } else {
        console.error('PrinterBridge endpoint failed:', response.status, response.statusText);

        // Fallback to old endpoints if PrinterBridge fails
        console.log('Falling back to old authentication endpoints...');
        const token = localStorage.getItem('auth-token');

        if (token && user) {
          const endpoint = user.role === 'super_admin'
            ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/printing/printers`
            : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/printing/printers/branch/${user.branchId}`;

          const fallbackResponse = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            console.log('Fallback printers loaded:', fallbackData.printers?.length || 0);
            setPrinters(fallbackData.printers || []);
            return;
          }
        }

        setPrinters([]);
      }
    } catch (error) {
      console.error('Error loading printers:', error);
      setPrinters([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Check Node.js Printer Service status
  const checkPrinterServiceStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth-token');
      
      // Try authenticated endpoint first
      if (token && user) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/printing/service/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Service status response:', data);
          const serviceConnected = data.isRunning || data.menuHere?.connected || data.services?.nodejs?.connected || data.printerService?.connected || false;
          setPrinterServiceStatus(serviceConnected ? 'connected' : 'disconnected');
          return;
        }
      }
      
      // Fallback to public service status check (if available)
      const publicResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/printing/service/status`);
      
      if (publicResponse.ok) {
        const data = await publicResponse.json();
        console.log('Public service status response:', data);
        const serviceConnected = data.isRunning || data.menuHere?.connected || data.services?.nodejs?.connected || data.printerService?.connected || false;
        setPrinterServiceStatus(serviceConnected ? 'connected' : 'disconnected');
      } else {
        console.log('Service status check failed, assuming disconnected');
        setPrinterServiceStatus('disconnected');
      }
    } catch (error) {
      console.error('Failed to check printer service status:', error);
      setPrinterServiceStatus('disconnected');
    }
  }, [user]);

  // Test printer connection via PrinterBridge
  const testPrinter = useCallback(async (printerId: string) => {
    console.log('Testing printer via PrinterBridge:', printerId);

    // Show loading toast
    const testToastId = toast.loading('Testing printer connection...', {
      duration: 15000
    });

    try {
      // Find printer name from current printers list
      const printer = printers.find(p => p.id === printerId);
      const printerName = printer?.name || printerId;

      console.log('Using PrinterBridge test-print for printer:', printerName);

      // Use the PrinterBridge test-print endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/printer-bridge/test-print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          printer: printerName,
          text: `Dashboard Test Print - ${new Date().toLocaleString()}`,
          id: `dashboard-test-${Date.now()}`
        })
      });

      console.log('PrinterBridge test response:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('PrinterBridge test result:', data);

        // Dismiss loading toast
        toast.dismiss(testToastId);

        if (data.success) {
          toast.success(data.message || 'Test print successful via PrinterBridge!', {
            duration: 5000,
            icon: '🖨️'
          });

          // Show job details in console
          if (data.data?.jobId) {
            console.log('Print job details:', {
              jobId: data.data.jobId,
              printer: data.data.printerName,
              method: data.method
            });
          }

          // Refresh printer list to get updated status
          setTimeout(() => {
            loadPrinters();
          }, 1000);
        } else {
          toast.error(data.message || 'Test print failed via PrinterBridge', {
            duration: 8000
          });

          // Show specific error details if available
          if (data.error) {
            console.error('PrinterBridge error details:', data.error);
            if (data.error.includes('connect') || data.error.includes('PrinterMaster')) {
              toast.error('PrinterMaster service is not running. Please check the service status.', {
                duration: 10000,
                icon: '💻'
              });
            }
          }
        }

        return;
      } else {
        toast.dismiss(testToastId);
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('PrinterBridge test error response:', errorData);

        // Fallback to old endpoint if PrinterBridge fails
        console.log('PrinterBridge failed, trying fallback endpoint...');
        try {
          const token = localStorage.getItem('auth-token');
          const fallbackResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/printing/printers/${printerId}/test`, {
            method: 'POST',
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json'
            }
          });

          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            if (fallbackData.success) {
              toast.success('Test print successful via fallback endpoint!', {
                duration: 5000,
                icon: '🖨️'
              });
              return;
            }
          }
        } catch (fallbackError) {
          console.warn('Fallback test also failed:', fallbackError);
        }

        toast.error(errorData.message || 'Test print failed - check printer connection', {
          duration: 8000
        });
      }
    } catch (error) {
      toast.dismiss(testToastId);
      console.error('Test print error:', error);
      toast.error('Error testing printer - check network connection', {
        duration: 8000
      });
    }
  }, [printers, loadPrinters]);

  // Delete printer
  const deletePrinter = useCallback(async (printerId: string, printerName: string) => {
    const token = localStorage.getItem('auth-token');
    
    if (!token || !user) {
      toast.error('Please log in to delete printers');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete printer "${printerName}"? This action cannot be undone.`)) {
      return;
    }

    // Temporarily disabled - delete endpoint not implemented in new backend
    toast.error('Delete printer functionality is temporarily disabled while we integrate the new backend system');
  }, [loadPrinters, user]);

  // Configure printer
  const configurePrinter = useCallback((printer: NodeJSPrinter) => {
    // For now, we'll show a configuration modal with basic settings
    const newName = prompt(`Configure printer name:`, printer.name);
    if (newName && newName !== printer.name) {
      updatePrinterConfig(printer.id, { name: newName });
    }
  }, []);

  // Update printer configuration
  const updatePrinterConfig = useCallback(async (printerId: string, config: any) => {
    const token = localStorage.getItem('auth-token');
    
    if (!token || !user) {
      toast.error('Please log in to update printer configuration');
      return;
    }
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/printing/printers/${printerId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        toast.success('Printer configuration updated successfully');
        loadPrinters(); // Refresh the list
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to update printer configuration');
      }
    } catch (error) {
      console.error('Update printer config error:', error);
      toast.error('Error updating printer configuration');
    }
  }, [loadPrinters, user]);

  // Load Phase 4 Analytics
  const loadPhase4Analytics = useCallback(async () => {
    const token = localStorage.getItem('auth-token');
    
    if (!token || !user) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/printing/phase4/analytics/system`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Phase 4 analytics loaded:', data);
        setPhase4Analytics(data);
      } else {
        console.warn('Phase 4 analytics not available');
      }
    } catch (error) {
      console.error('Error loading Phase 4 analytics:', error);
    }
  }, [user]);

  // Run quick test on printer
  const runQuickTest = useCallback(async (printerId: string) => {
    const token = localStorage.getItem('auth-token');
    
    if (!token || !user) {
      toast.error('Please log in to run printer tests');
      return;
    }
    
    try {
      toast.loading('Running printer test...', { id: 'quick-test' });
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/printing/phase4/testing/printer/${printerId}/quick`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success('Quick test completed successfully!', { id: 'quick-test' });
        console.log('Quick test results:', data);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Quick test failed', { id: 'quick-test' });
      }
    } catch (error) {
      console.error('Quick test error:', error);
      toast.error('Error running quick test', { id: 'quick-test' });
    }
  }, [user]);

  // Socket.io connection for real-time updates
  const connectWebSocket = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const token = localStorage.getItem('auth-token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      const socket = io(`${apiUrl}/printing-ws`, {
        auth: {
          token: token,
          branchId: user?.branchId,
          companyId: user?.companyId,
          userRole: user?.role
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        timeout: 20000,
        forceNew: true
      });

      socket.on('connect', () => {
        console.log('Printer Socket.io connected');
        setWsConnected(true);

        // Join company/branch room for targeted updates
        if (user?.branchId) {
          socket.emit('join:branch', { branchId: user.branchId });
        }
        if (user?.companyId) {
          socket.emit('join:company', { companyId: user.companyId });
        }

        // Request current printer status immediately
        socket.emit('requestPrinterStatus', {});
      });

      socket.on('disconnect', (reason) => {
        console.log('Printer Socket.io disconnected:', reason);
        setWsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('Printer Socket.io connection error:', error);
        setWsConnected(false);
      });
      
      // Listen for real-time printer events
      socket.on('printer:added', (printer) => {
        console.log('New printer discovered:', printer);
        setPrinters(prev => {
          const exists = prev.find(p => p.id === printer.id);
          if (exists) return prev;
          return [...prev, printer];
        });
        toast.success(`New printer discovered: ${printer.name}`, {
          duration: 5000,
          icon: '🖨️',
        });
      });
      
      socket.on('printer:updated', (printer) => {
        console.log('Printer updated:', printer);
        setPrinters(prev => prev.map(p => 
          p.id === printer.id ? { ...p, ...printer } : p
        ));
      });
      
      socket.on('printer:status', (data) => {
        console.log('Printer status update:', data);
        setPrinters(prev => prev.map(p => 
          p.id === data.printerId 
            ? { ...p, status: data.status, lastSeen: new Date().toISOString() }
            : p
        ));
      });
      
      socket.on('printer:removed', (printerId) => {
        console.log('Printer removed:', printerId);
        setPrinters(prev => prev.filter(p => p.id !== printerId));
        toast('Printer disconnected', { icon: '❌' });
      });
      
      // Listen for print job updates
      socket.on('print:job:created', (job) => {
        console.log('Print job created:', job);
        // Update printer queue length if available
        if (job.printerId) {
          setPrinters(prev => prev.map(p => 
            p.id === job.printerId 
              ? { ...p, queueLength: (p.queueLength || 0) + 1 }
              : p
          ));
        }
      });
      
      socket.on('print:job:completed', (job) => {
        console.log('Print job completed:', job);
        // Update printer queue length if available
        if (job.printerId) {
          setPrinters(prev => prev.map(p => 
            p.id === job.printerId 
              ? { ...p, queueLength: Math.max(0, (p.queueLength || 0) - 1) }
              : p
          ));
        }
      });
      
      return socket;
    } catch (error) {
      console.error('Failed to create Socket.io connection:', error);
      setWsConnected(false);
      return null;
    }
  }, [loadPrinters, user]);

  useEffect(() => {
    loadPrinters();
    checkPrinterServiceStatus();
    loadPhase4Analytics(); // Load Phase 4 analytics
    
    // Connect WebSocket for real-time updates
    const ws = connectWebSocket();
    
    // Check service status periodically
    const statusInterval = setInterval(checkPrinterServiceStatus, 30000); // Every 30 seconds
    
    return () => {
      clearInterval(statusInterval);
      if (ws) {
        ws.disconnect();
      }
    };
  }, [loadPrinters, checkPrinterServiceStatus, connectWebSocket, loadPhase4Analytics]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-100';
      case 'offline': return 'text-gray-600 bg-gray-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'busy': return 'text-blue-600 bg-blue-100';
      case 'low_paper': return 'text-orange-600 bg-orange-100';
      case 'no_paper': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircleIcon className="w-4 h-4" />;
      case 'offline': return <XCircleIcon className="w-4 h-4" />;
      case 'error': return <ExclamationTriangleIcon className="w-4 h-4" />;
      default: return <ExclamationTriangleIcon className="w-4 h-4" />;
    }
  };

  const getConnectionIcon = (connection: string) => {
    switch (connection) {
      case 'network': return <WifiIcon className="w-5 h-5 text-blue-600" />;
      case 'usb': return <ComputerDesktopIcon className="w-5 h-5 text-green-600" />;
      case 'bluetooth': return <SignalIcon className="w-5 h-5 text-blue-600" />;
      case 'serial': return <CpuChipIcon className="w-5 h-5 text-purple-600" />;
      default: return <CogIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getDeliveryPlatformBadges = (platforms?: NodeJSPrinter['deliveryPlatforms']) => {
    if (!platforms) return null;
    
    const badges = [];
    if (platforms.talabat) badges.push(<span key="talabat" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Talabat</span>);
    if (platforms.careem) badges.push(<span key="careem" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Careem</span>);
    if (platforms.dhub) badges.push(<span key="dhub" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">DHUB</span>);
    if (platforms.callCenter) badges.push(<span key="callCenter" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Call Center</span>);
    if (platforms.website) badges.push(<span key="website" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Website</span>);
    
    return <div className="flex flex-wrap gap-1">{badges}</div>;
  };

  return (
    <ProtectedRoute>
      <Head>
        <title>Node.js Printer Service - Restaurant Management</title>
        <meta name="description" content="Cross-platform printer management with real-time detection" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Navigation */}
              <div className="flex items-center space-x-4">
                <Link href="/dashboard" className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
                <div className="h-6 w-px bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <PrinterIcon className="w-5 h-5 text-gray-600" />
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">Node.js Printer Service</h1>
                    <p className="text-sm text-gray-500">Cross-platform real-time printer management</p>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center space-x-3">
                {/* Template Builder Link */}
                <Link href="/settings/template-builder" className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors">
                  <Squares2X2Icon className="w-4 h-4 mr-2" />
                  Template Builder
                </Link>
                {/* Node.js Service Status */}
                <div className="flex items-center space-x-2 px-3 py-2 rounded-md bg-gray-50">
                  <div className={`w-2 h-2 rounded-full ${
                    printerServiceStatus === 'connected' ? 'bg-green-500' : 
                    printerServiceStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <span className="text-xs font-medium text-gray-600">
                    Service: {printerServiceStatus}
                  </span>
                </div>
                
                {/* WebSocket Status */}
                <div className="flex items-center space-x-2 px-3 py-2 rounded-md bg-gray-50">
                  <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs font-medium text-gray-600">
                    WebSocket: {wsConnected ? 'connected' : 'disconnected'}
                  </span>
                </div>
                
                {/* Info about Node.js service */}
                <div className="text-sm text-gray-500 px-3 py-2 bg-green-50 rounded-md">
                  <span className="text-green-700">🚀 Automatic cross-platform printer detection active</span>
                </div>
                
                {/* Phase 4 Features Toggle */}
                {phase4Analytics && (
                  <button 
                    onClick={() => setShowAdvancedFeatures(!showAdvancedFeatures)}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                  >
                    <CpuChipIcon className="w-4 h-4 mr-2" />
                    {showAdvancedFeatures ? 'Hide Advanced' : 'Show Advanced'}
                  </button>
                )}
                
                <button 
                  onClick={loadPrinters}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                >
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Multi-Tenant Context */}
          {user && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <BuildingOfficeIcon className="w-5 h-5 text-blue-500 mr-2" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Company:</span>
                      <span className="ml-2 text-sm text-gray-600">{user.company?.name || 'Unknown Company'}</span>
                    </div>
                  </div>
                  {user.branchId && (
                    <div className="flex items-center">
                      <BuildingStorefrontIcon className="w-5 h-5 text-green-500 mr-2" />
                      <div>
                        <span className="text-sm font-medium text-gray-900">Branch:</span>
                        <span className="ml-2 text-sm text-gray-600">{user.branch?.name || 'Unknown Branch'}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center">
                    <TagIcon className="w-5 h-5 text-purple-500 mr-2" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Role:</span>
                      <span className="ml-2 text-sm text-gray-600 capitalize">{user.role.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {user.role === 'super_admin' ? 'Viewing all companies' : 'Company-specific view'}
                </div>
              </div>
            </div>
          )}
          
          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <PrinterIcon className="w-8 h-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Printers</p>
                  <p className="text-2xl font-semibold text-gray-900">{printers.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="w-8 h-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Online</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {printers.filter(p => p.status === 'online').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircleIcon className="w-8 h-8 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Offline</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {printers.filter(p => p.status === 'offline').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ComputerDesktopIcon className="w-8 h-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">USB Direct</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {printers.filter(p => p.connectionType === 'usb').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CloudIcon className="w-8 h-8 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Platforms</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {printers.filter(p => p.deliveryPlatforms && Object.values(p.deliveryPlatforms).some(Boolean)).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 4 Advanced Features */}
          {showAdvancedFeatures && phase4Analytics && (
            <div className="bg-white shadow rounded-lg mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <CpuChipIcon className="w-5 h-5 mr-2 text-purple-600" />
                  RestaurantPrint Pro - Phase 4 Enterprise Features
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Advanced analytics, testing, and monitoring capabilities
                </p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Advanced Analytics */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-blue-900">Advanced Analytics</h4>
                        <p className="text-sm text-blue-700 mt-1">Real-time performance metrics</p>
                      </div>
                      <div className="text-2xl text-blue-600">📊</div>
                    </div>
                    <div className="mt-4 text-xs text-blue-800">
                      <div>• Predictive maintenance alerts</div>
                      <div>• Performance optimization reports</div>
                      <div>• Multi-location monitoring</div>
                    </div>
                  </div>

                  {/* Comprehensive Testing */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-green-900">Testing Framework</h4>
                        <p className="text-sm text-green-700 mt-1">Enterprise-grade testing</p>
                      </div>
                      <div className="text-2xl text-green-600">🧪</div>
                    </div>
                    <div className="mt-4 text-xs text-green-800">
                      <div>• Automated test suites</div>
                      <div>• Network latency testing</div>
                      <div>• Stress testing capabilities</div>
                    </div>
                  </div>

                  {/* Enterprise Monitoring */}
                  <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-purple-900">Enterprise Monitoring</h4>
                        <p className="text-sm text-purple-700 mt-1">24/7 system oversight</p>
                      </div>
                      <div className="text-2xl text-purple-600">🔍</div>
                    </div>
                    <div className="mt-4 text-xs text-purple-800">
                      <div>• Custom alert rules</div>
                      <div>• Branch comparison tools</div>
                      <div>• Executive dashboards</div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions for Phase 4 */}
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={loadPhase4Analytics}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 transition-colors"
                  >
                    📊 Refresh Analytics
                  </button>
                  {printers.length > 0 && (
                    <button
                      onClick={() => testPrinter(printers[0].id)}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-green-600 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 transition-colors"
                    >
                      🧪 Test First Printer
                    </button>
                  )}
                  <button
                    disabled
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-purple-400 bg-purple-50 border border-purple-200 rounded-md cursor-not-allowed"
                  >
                    🔍 Enterprise Dashboard (Coming Soon)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Printers List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Node.js Printer Management</h3>
              <p className="mt-1 text-sm text-gray-500">
                Real-time cross-platform printer detection and monitoring
              </p>
            </div>
            
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Loading printers...</p>
              </div>
            ) : printers.length === 0 ? (
              <div className="p-6 text-center">
                <PrinterIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No printers detected</h3>
                <p className="text-gray-500 mb-4">Waiting for PrinterMaster desktop app to discover and register printers.</p>
                <div className="text-sm text-blue-600 bg-blue-50 rounded-lg p-4 max-w-md mx-auto">
                  <strong>To add printers:</strong><br />
                  💻 1. Start PrinterMaster desktop app<br />
                  🔄 2. App will auto-discover printers<br />
                  🚀 3. Printers sync to web interface<br />
                  ⚡ 4. Real-time status updates
                </div>
                {!wsConnected && (
                  <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 max-w-md mx-auto mt-3">
                    <strong>Connection Issue:</strong><br />
                    Real-time connection is disconnected. Please refresh the page.
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Printer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type & Connection
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Delivery Platforms
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assignment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {printers.map((printer) => (
                      <tr key={printer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <PrinterIcon className="w-8 h-8 text-gray-400 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900 flex items-center">
                                {printer.name}
                                {printer.isDefault && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    Default
                                  </span>
                                )}
                                {printer.isAutoDetected && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                    Auto-detected
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {printer.ipAddress && `${printer.ipAddress}${printer.port ? `:${printer.port}` : ''}`}
                                {printer.platform && (
                                  <span className="ml-2 text-xs text-gray-400 capitalize">({printer.platform})</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {user?.role === 'super_admin' ? (
                              // Super admin sees company + branch
                              <div>
                                <div className="font-medium flex items-center">
                                  <BuildingOfficeIcon className="w-4 h-4 mr-1 text-blue-500" />
                                  {printer.company?.name || printer.companyName || 'Unknown Company'}
                                </div>
                                <div className="text-gray-500 flex items-center">
                                  <BuildingStorefrontIcon className="w-4 h-4 mr-1 text-gray-400" />
                                  {printer.branch?.name || printer.branchName || 'Unknown Branch'}
                                </div>
                              </div>
                            ) : (
                              // Company users see branch only
                              <div className="font-medium flex items-center">
                                <BuildingStorefrontIcon className="w-4 h-4 mr-1 text-gray-500" />
                                {printer.branch?.name || printer.branchName || 'Unknown Branch'}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getConnectionIcon(printer.connectionType)}
                            <div>
                              <div className="text-sm text-gray-900 capitalize">{printer.type}</div>
                              <div className="text-sm text-gray-500 capitalize">{printer.connectionType}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(printer.status)}`}>
                            {getStatusIcon(printer.status)}
                            <span className="ml-1 capitalize">{printer.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getDeliveryPlatformBadges(printer.deliveryPlatforms) || (
                            <span className="text-sm text-gray-400">Not assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                          <div className="flex items-center">
                            <TagIcon className="w-4 h-4 mr-1 text-gray-400" />
                            {printer.assignedTo}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => testPrinter(printer.id)}
                            className="text-blue-600 hover:text-blue-900 inline-flex items-center transition-colors"
                          >
                            <EyeIcon className="w-4 h-4 mr-1" />
                            Test
                          </button>
                          <button 
                            onClick={() => configurePrinter(printer)}
                            className="text-gray-600 hover:text-gray-900 inline-flex items-center transition-colors"
                          >
                            <PencilIcon className="w-4 h-4 mr-1" />
                            Configure
                          </button>
                          {user?.role === 'super_admin' && (
                            <button 
                              onClick={() => deletePrinter(printer.id, printer.name)}
                              className="text-red-600 hover:text-red-900 inline-flex items-center transition-colors"
                            >
                              <TrashIcon className="w-4 h-4 mr-1" />
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}