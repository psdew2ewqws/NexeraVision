'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark'; // The actual resolved theme (light/dark)
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export const ThemeProvider = ({
  children,
  defaultTheme = 'system',
  storageKey = 'integration-platform-theme',
}: ThemeProviderProps) => {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  // Function to get system theme
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  // Function to resolve actual theme
  const resolveTheme = (selectedTheme: Theme): 'light' | 'dark' => {
    if (selectedTheme === 'system') {
      return getSystemTheme();
    }
    return selectedTheme;
  };

  // Initialize theme from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedTheme = localStorage.getItem(storageKey) as Theme;
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeState(savedTheme);
        setActualTheme(resolveTheme(savedTheme));
      } else {
        setActualTheme(resolveTheme(defaultTheme));
      }
    } catch (error) {
      console.error('Error loading theme from localStorage:', error);
      setActualTheme(resolveTheme(defaultTheme));
    }
  }, [defaultTheme, storageKey]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        setActualTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = window.document.documentElement;

    // Remove previous theme classes
    root.classList.remove('light', 'dark');

    // Add current theme class
    root.classList.add(actualTheme);

    // Set CSS custom property for theme
    root.style.setProperty('--theme', actualTheme);

    // Set data attribute for CSS selectors
    root.setAttribute('data-theme', actualTheme);
  }, [actualTheme]);

  const setTheme = (newTheme: Theme) => {
    try {
      setThemeState(newTheme);
      setActualTheme(resolveTheme(newTheme));

      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, newTheme);
      }
    } catch (error) {
      console.error('Error saving theme to localStorage:', error);
    }
  };

  const value: ThemeContextType = {
    theme,
    setTheme,
    actualTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Theme toggle hook for convenience
export const useThemeToggle = () => {
  const { theme, setTheme, actualTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const setLightTheme = () => setTheme('light');
  const setDarkTheme = () => setTheme('dark');
  const setSystemTheme = () => setTheme('system');

  return {
    theme,
    actualTheme,
    toggleTheme,
    setLightTheme,
    setDarkTheme,
    setSystemTheme,
    setTheme,
  };
};

// Theme-aware component wrapper
interface ThemeAwareProps {
  children: ReactNode;
  lightComponent?: ReactNode;
  darkComponent?: ReactNode;
}

export const ThemeAware: React.FC<ThemeAwareProps> = ({
  children,
  lightComponent,
  darkComponent
}) => {
  const { actualTheme } = useTheme();

  if (actualTheme === 'dark' && darkComponent) {
    return <>{darkComponent}</>;
  }

  if (actualTheme === 'light' && lightComponent) {
    return <>{lightComponent}</>;
  }

  return <>{children}</>;
};