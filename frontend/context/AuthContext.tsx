'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  apiClient,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
} from '../services/api.client';
import { UserProfile } from '../services/academic.service';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role?: 'student' | 'admin';
    department?: string;
    program?: string;
    semester?: number;
    academicYear?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async () => {
    const storedToken = getAuthToken();
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    setToken(storedToken);
    try {
      const res = await apiClient<UserProfile>('/auth/me');
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        clearAuthToken();
        setUser(null);
        setToken(null);
      }
    } catch {
      clearAuthToken();
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string) => {
    try {
      const res = await apiClient<{ user: UserProfile; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (res.success && res.data) {
        setAuthToken(res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        return { success: true };
      } else {
        return {
          success: false,
          error: res.error?.message || 'Login failed. Please check your credentials.',
        };
      }
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error during login',
      };
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    role?: 'student' | 'admin';
    department?: string;
    program?: string;
    semester?: number;
    academicYear?: string;
  }) => {
    try {
      const res = await apiClient<{ user: UserProfile; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (res.success && res.data) {
        setAuthToken(res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        return { success: true };
      } else {
        return {
          success: false,
          error: res.error?.message || 'Registration failed.',
        };
      }
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error during registration',
      };
    }
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
    setToken(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const isAuthenticated = !!user && !!token;
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        isAdmin,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
