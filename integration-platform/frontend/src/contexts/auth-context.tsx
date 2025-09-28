'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, LoginForm, ApiResponse } from '@/types';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginForm) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  const login = async (credentials: LoginForm): Promise<boolean> => {
    try {
      console.log('Attempting login with:', credentials.email);
      const response = await apiClient.post<any>(
        '/auth/login',
        credentials
      );

      console.log('Login response:', response.data);

      // Handle the response from our test server
      if (response.data.success || response.data.access_token) {
        const token = response.data.access_token || response.data.token;
        const userData = response.data.user || {
          id: '1',
          name: response.data.user?.name || 'Admin',
          email: credentials.email,
          role: 'admin'
        };

        localStorage.setItem('auth_token', token);
        setUser(userData as User);
        toast.success('Login successful');

        // Redirect to dashboard
        window.location.href = '/dashboard';
        return true;
      } else {
        toast.error(response.data.message || 'Login failed');
        return false;
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || error.message || 'Login failed');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    toast.success('Logged out successfully');
    // Redirect to login page
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setUser(null);
        return;
      }

      // For now, just set a mock user if token exists
      // since the test server doesn't have a profile endpoint
      setUser({
        id: '1',
        name: 'Admin User',
        email: 'admin@test.com',
        role: 'admin'
      } as User);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      localStorage.removeItem('auth_token');
      setUser(null);
    }
  };

  useEffect(() => {
    // Check auth on mount
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          await refreshUser();
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        // Always set loading to false after a short delay
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      }
    };

    initAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};