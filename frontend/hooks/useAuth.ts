import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/services/api';
import { AxiosError } from 'axios';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin';
  isActive: boolean;
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
}

export function useAuth(): AuthContextType {
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
        // After login, fetch the user details to update state
        await fetchUser();
        return { error: null };
      } catch (error) {
        const axiosError = error as AxiosError;
        let errorMessage = 'Đăng nhập thất bại';

        if (axiosError.response?.data) {
          const responseData = axiosError.response.data as Record<string, unknown>; // More explicit typing
          if (typeof responseData.message === 'string') {
             errorMessage = responseData.message;
          } else if (axiosError.response?.status === 401) {
            errorMessage = 'Invalid login credentials';
          } else if (axiosError.response?.status === 403) {
            errorMessage = 'Email not confirmed';
          }
        } else if (axiosError.message) {
           errorMessage = axiosError.message;
        }

        return { error: { message: errorMessage } };
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
        let errorMessage = 'Đăng ký thất bại';

        if (axiosError.response?.data) {
           const responseData = axiosError.response.data as Record<string, unknown>;
           if (typeof responseData.message === 'string') {
              errorMessage = responseData.message;
           } else if (axiosError.response?.status === 409) {
             errorMessage = 'User already registered';
           }
        } else if (axiosError.message) {
            errorMessage = axiosError.message;
        }

        return { error: { message: errorMessage } };
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      router.push('/auth');
    }
  }, [router]);

  return {
    user,
    isAuthenticated,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUser: fetchUser
  };
}
