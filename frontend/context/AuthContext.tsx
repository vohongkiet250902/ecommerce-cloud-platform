"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/services/api';
import { AxiosError } from 'axios';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin';
  isActive: boolean;
  phone?: string;
  addresses?: any[];
}

interface AuthError {
  message: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: AuthError | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  verifyAccount: (email: string, otp: string) => Promise<{ error?: AuthError | null }>;
  resendActivation: (email: string) => Promise<{ error?: AuthError | null }>;
  forgotPassword: (email: string) => Promise<{ error?: AuthError | null }>;
  verifyResetOtp: (email: string, otp: string) => Promise<{ error?: AuthError | null }>;
  resetPassword: (data: any) => Promise<{ error?: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const response = await authApi.getCurrentUser();
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check auth on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error?: AuthError | null }> => {
      try {
        await authApi.login(email, password);
        await fetchUser();
        return { error: null };
      } catch (error) {
        const axiosError = error as AxiosError;
        return { 
          error: { 
            message: (axiosError.response?.data as any)?.message || 'Đăng nhập thất bại' 
          },
          status: axiosError.response?.status
        } as any;
      }
    },
    [fetchUser]
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName: string): Promise<{ error?: AuthError | null }> => {
      try {
        await authApi.register(fullName, email, password);
        return { error: null };
      } catch (error) {
        const axiosError = error as AxiosError;
        return { 
          error: { 
            message: (axiosError.response?.data as any)?.message || 'Đăng ký thất bại' 
          },
          status: axiosError.response?.status
        } as any;
      }
    },
    []
  );

  const verifyAccount = useCallback(async (email: string, otp: string) => {
    try {
      await authApi.verifyAccount(email, otp);
      return { error: null };
    } catch (error) {
      const axiosError = error as AxiosError;
      return { 
        error: { message: (axiosError.response?.data as any)?.message || 'Xác thực thất bại' },
        status: axiosError.response?.status
      } as any;
    }
  }, []);

  const resendActivation = useCallback(async (email: string) => {
    try {
      await authApi.resendActivation(email);
      return { error: null };
    } catch (error) {
      const axiosError = error as AxiosError;
      return { 
        error: { message: (axiosError.response?.data as any)?.message || 'Gửi lại mã thất bại' },
        status: axiosError.response?.status
      } as any;
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    try {
      await authApi.forgotPassword(email);
      return { error: null };
    } catch (error) {
      const axiosError = error as AxiosError;
      return { 
        error: { message: (axiosError.response?.data as any)?.message || 'Yêu cầu thất bại' },
        status: axiosError.response?.status
      } as any;
    }
  }, []);

  const verifyResetOtp = useCallback(async (email: string, otp: string) => {
    try {
      await authApi.verifyResetOtp(email, otp);
      return { error: null };
    } catch (error) {
      const axiosError = error as AxiosError;
      return { 
        error: { message: (axiosError.response?.data as any)?.message || 'Xác thực mã OTP thất bại' },
        status: axiosError.response?.status
      } as any;
    }
  }, []);

  const resetPassword = useCallback(async (data: any) => {
    try {
      await authApi.resetPassword(data);
      return { error: null };
    } catch (error) {
      const axiosError = error as AxiosError;
      return { 
        error: { message: (axiosError.response?.data as any)?.message || 'Đặt lại mật khẩu thất bại' },
        status: axiosError.response?.status
      } as any;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      router.push('/auth');
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        signIn,
        signUp,
        signOut,
        refreshUser: fetchUser,
        verifyAccount,
        resendActivation,
        forgotPassword,
        verifyResetOtp,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
