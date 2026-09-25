'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, UserDTO } from '../lib/api-client';

interface AuthContextType {
  user: UserDTO | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  register: (data: { email: string; name: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    setIsLoading(true);
    try {
      const res = await api.auth.me();
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (data: { email: string; password: string }) => {
    const res = await api.auth.login(data);
    if (res.success && res.data) {
      setUser(res.data);
      return { success: true };
    }
    return {
      success: false,
      error: res.error?.message || 'Invalid credentials',
    };
  };

  const register = async (data: { email: string; name: string; password: string }) => {
    const res = await api.auth.register(data);
    if (res.success && res.data) {
      setUser(res.data);
      return { success: true };
    }
    return {
      success: false,
      error: res.error?.message || 'Registration failed',
    };
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
