import React, { createContext, useContext, useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';

interface AppContextType {
  isReady: boolean;
}

const AppContext = createContext<AppContextType>({
  isReady: false,
});

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = React.useState(false);
  const { initialize } = useAppStore();

  useEffect(() => {
    const init = async () => {
      try {
        await initialize();
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setIsReady(true); // Still mark as ready to show error state
      }
    };

    init();
  }, [initialize]);

  return (
    <AppContext.Provider value={{ isReady }}>
      {children}
    </AppContext.Provider>
  );
}