import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { AppConfig, License, Printer, SystemMetrics, HealthStatus, QZTrayStatus } from '../src/types';

interface AppState {
  // Authentication & License
  isAuthenticated: boolean;
  license: License | null;
  branch: any | null;

  // Configuration
  config: Partial<AppConfig>;

  // Printers
  printers: Printer[];
  selectedPrinter: Printer | null;
  printersLoading: boolean;

  // QZ Tray
  qzTrayStatus: boolean;
  qzTrayConnecting: boolean;

  // System Monitoring
  systemMetrics: SystemMetrics | null;
  healthStatus: HealthStatus | null;

  // UI State
  isLoading: boolean;
  error: string | null;
  notifications: any[];

  // Actions
  initialize: () => Promise<void>;
  setAuthenticated: (authenticated: boolean) => void;
  setLicense: (license: License | null) => void;
  updateConfig: (updates: Partial<AppConfig>) => Promise<void>;
  setPrinters: (printers: Printer[]) => void;
  addPrinter: (printer: Printer) => void;
  updatePrinter: (printer: Printer) => void;
  setSelectedPrinter: (printer: Printer | null) => void;
  setPrintersLoading: (loading: boolean) => void;
  setQZTrayStatus: (status: boolean) => void;
  setQZTrayConnecting: (connecting: boolean) => void;
  setSystemMetrics: (metrics: SystemMetrics | null) => void;
  setHealthStatus: (status: HealthStatus | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addNotification: (notification: any) => void;
  removeNotification: (id: string) => void;
  refreshPrinters: () => Promise<void>;
  refreshSystemHealth: () => Promise<void>;
  validateLicense: (licenseKey: string) => Promise<boolean>;
  discoverPrinters: () => Promise<void>;
  testPrinter: (printerId: string) => Promise<boolean>;
  connectQZTray: () => Promise<void>;
  reset: () => void;
}

export const useAppStore = create<AppState>()(subscribeWithSelector((set, get) => ({
  // Initial State
  isAuthenticated: false,
  license: null,
  branch: null,
  config: {},
  printers: [],
  selectedPrinter: null,
  printersLoading: false,
  qzTrayStatus: false,
  qzTrayConnecting: false,
  systemMetrics: null,
  healthStatus: null,
  isLoading: false,
  error: null,
  notifications: [],

  // Actions
  initialize: async () => {
    try {
      set({ isLoading: true, error: null });

      // Initialize ElectronAPI if available
      if (typeof window !== 'undefined' && window.electronAPI) {
        // Load configuration
        try {
          const configResponse = await window.electronAPI.getConfig();
          if (configResponse.success) {
            set({ config: configResponse.data });
          }
        } catch (error) {
          console.warn('Failed to load config:', error);
        }

        // Load existing license
        try {
          const licenseResponse = await window.electronAPI.getLicenseInfo();
          if (licenseResponse.success && licenseResponse.data) {
            set({ 
              license: licenseResponse.data,
              isAuthenticated: true 
            });
          }
        } catch (error) {
          console.warn('Failed to load license:', error);
        }

        // Initial data load if authenticated
        if (get().isAuthenticated) {
          await Promise.all([
            get().refreshPrinters(),
            get().refreshSystemHealth(),
            get().connectQZTray(),
          ]);
        }
      }

      set({ isLoading: false });
    } catch (error) {
      console.error('Failed to initialize app store:', error);
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to initialize application' 
      });
    }
  },

  setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
  setLicense: (license) => set({ license }),

  updateConfig: async (updates) => {
    try {
      if (window.electronAPI) {
        const response = await window.electronAPI.setConfig('', updates); // Using the simplified API
        if (response.success) {
          set({ config: { ...get().config, ...updates } });
        } else {
          throw new Error(response.error || 'Failed to update configuration');
        }
      }
    } catch (error) {
      console.error('Failed to update config:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to update configuration' });
    }
  },

  setPrinters: (printers) => set({ printers }),

  addPrinter: (printer) => {
    const printers = get().printers;
    const existingIndex = printers.findIndex(p => p.id === printer.id);
    
    if (existingIndex >= 0) {
      printers[existingIndex] = printer;
    } else {
      printers.push(printer);
    }
    
    set({ printers: [...printers] });
  },

  updatePrinter: (printer) => {
    const printers = get().printers.map(p => 
      p.id === printer.id ? printer : p
    );
    set({ printers });
  },

  setSelectedPrinter: (printer) => set({ selectedPrinter: printer }),
  setPrintersLoading: (loading) => set({ printersLoading: loading }),
  setQZTrayStatus: (status) => set({ qzTrayStatus: status }),
  setQZTrayConnecting: (connecting) => set({ qzTrayConnecting: connecting }),
  setSystemMetrics: (metrics) => set({ systemMetrics: metrics }),
  setHealthStatus: (status) => set({ healthStatus: status }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  addNotification: (notification) => {
    const notifications = get().notifications;
    set({ notifications: [...notifications, notification] });
    
    // Auto-remove after 5 seconds for non-error notifications
    if (notification.type !== 'error') {
      setTimeout(() => {
        get().removeNotification(notification.id);
      }, 5000);
    }
  },

  removeNotification: (id) => {
    const notifications = get().notifications.filter(n => n.id !== id);
    set({ notifications });
  },

  refreshPrinters: async () => {
    try {
      set({ printersLoading: true });
      
      if (window.electronAPI) {
        const response = await window.electronAPI.getPrinters();
        if (response.success) {
          set({ printers: response.data || [] });
        } else {
          throw new Error(response.error || 'Failed to load printers');
        }
      }
    } catch (error) {
      console.error('Failed to refresh printers:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to refresh printers' });
    } finally {
      set({ printersLoading: false });
    }
  },

  refreshSystemHealth: async () => {
    try {
      if (window.electronAPI) {
        const healthResponse = await window.electronAPI.getHealthStatus();
        if (healthResponse.success) {
          set({ healthStatus: healthResponse.data });
        }

        const metricsResponse = await window.electronAPI.getSystemMetrics();
        if (metricsResponse.success) {
          set({ systemMetrics: metricsResponse.data });
        }
      }
    } catch (error) {
      console.error('Failed to refresh system health:', error);
    }
  },

  validateLicense: async (licenseKey) => {
    try {
      set({ isLoading: true, error: null });
      
      if (window.electronAPI) {
        const response = await window.electronAPI.validateLicense(licenseKey);
        if (response.success) {
          const license = response.data;
          set({ 
            license,
            isAuthenticated: true,
            isLoading: false 
          });
          
          get().addNotification({
            id: Date.now().toString(),
            type: 'success',
            title: 'License Validated',
            message: `Successfully validated license`,
            timestamp: Date.now(),
          });
          
          return true;
        } else {
          throw new Error(response.error || 'License validation failed');
        }
      }
      
      return false;
    } catch (error) {
      console.error('Failed to validate license:', error);
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'License validation failed' 
      });
      return false;
    }
  },

  discoverPrinters: async () => {
    try {
      set({ printersLoading: true });
      
      if (window.electronAPI) {
        const response = await window.electronAPI.discoverPrinters();
        if (response.success) {
          set({ printers: response.data || [] });
          
          get().addNotification({
            id: Date.now().toString(),
            type: 'success',
            title: 'Printer Discovery',
            message: `Found ${response.data?.length || 0} printers`,
            timestamp: Date.now(),
          });
        } else {
          throw new Error(response.error || 'Printer discovery failed');
        }
      }
    } catch (error) {
      console.error('Failed to discover printers:', error);
      set({ error: error instanceof Error ? error.message : 'Printer discovery failed' });
    } finally {
      set({ printersLoading: false });
    }
  },

  testPrinter: async (printerId) => {
    try {
      if (window.electronAPI) {
        const response = await window.electronAPI.testPrinter(printerId, 'print_test');
        if (response.success) {
          get().addNotification({
            id: Date.now().toString(),
            type: 'success',
            title: 'Printer Test',
            message: `Printer test completed successfully`,
            timestamp: Date.now(),
          });
          return true;
        } else {
          throw new Error(response.error || 'Printer test failed');
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to test printer:', error);
      get().addNotification({
        id: Date.now().toString(),
        type: 'error',
        title: 'Printer Test Failed',
        message: error instanceof Error ? error.message : 'Printer test failed',
        timestamp: Date.now(),
      });
      return false;
    }
  },

  connectQZTray: async () => {
    try {
      set({ qzTrayConnecting: true });
      
      if (window.electronAPI) {
        // For now, just simulate QZ Tray connection
        await new Promise(resolve => setTimeout(resolve, 1000));
        set({ qzTrayStatus: true });
      }
    } catch (error) {
      console.error('Failed to connect to QZ Tray:', error);
      set({ qzTrayStatus: false });
    } finally {
      set({ qzTrayConnecting: false });
    }
  },

  reset: () => {
    set({
      isAuthenticated: false,
      license: null,
      branch: null,
      printers: [],
      selectedPrinter: null,
      qzTrayStatus: false,
      systemMetrics: null,
      healthStatus: null,
      error: null,
      notifications: [],
    });
  },
})));

// Subscribe to authentication changes
useAppStore.subscribe(
  (state) => state.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      // Auto-refresh data when authenticated
      const store = useAppStore.getState();
      store.refreshPrinters();
      store.refreshSystemHealth();
      store.connectQZTray();
    }
  }
);

// Auto-refresh system health every 30 seconds
setInterval(() => {
  const store = useAppStore.getState();
  if (store.isAuthenticated) {
    store.refreshSystemHealth();
  }
}, 30000);