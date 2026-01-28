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
}

export function useAuth(): AuthContextType {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Kiểm tra xem user đã đăng nhập chưa khi mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Lấy thông tin user từ API (token ở cookies)
        const response = await authApi.getCurrentUser();
        const userData = response.data;
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        // Nếu lỗi 401 hoặc không có token, user chưa login
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 401) {
          // Silently fail - user chưa login
          setUser(null);
          setIsAuthenticated(false);
        } else {
          // Lỗi khác (network, server error), vẫn set loading = false
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error?: AuthError | null }> => {
      try {
        const response = await authApi.login(email, password);
        const userData = response.data;

        setUser(userData);
        setIsAuthenticated(true);

        return { error: null };
      } catch (error) {
        const axiosError = error as AxiosError;
        let errorMessage = 'Đăng nhập thất bại';

        // Lấy error message từ response data trước tiên
        if (axiosError.response?.data) {
          const responseData = axiosError.response.data as Record<string, unknown>;
          if (responseData.message && typeof responseData.message === 'string') {
            errorMessage = responseData.message;
          } else if (axiosError.response?.status === 401) {
            errorMessage = 'Invalid login credentials';
          } else if (axiosError.response?.status === 403) {
            errorMessage = 'Email not confirmed';
          }
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        } else {
          errorMessage = 'Có lỗi xảy ra. Vui lòng thử lại.';
        }

        return { error: { message: errorMessage } };
      }
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName: string): Promise<{ error?: AuthError | null }> => {
      try {
        await authApi.register(fullName, email, password);
        return { error: null };
      } catch (error) {
        const axiosError = error as AxiosError;
        let errorMessage = 'Đăng ký thất bại';

        // Lấy error message từ response data
        if (axiosError.response?.data) {
          const responseData = axiosError.response.data as Record<string, unknown>;
          if (responseData.message && typeof responseData.message === 'string') {
            errorMessage = responseData.message;
          } else if (axiosError.response?.status === 409) {
            errorMessage = 'User already registered';
          } else if (axiosError.response?.status === 400) {
            errorMessage = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.';
          }
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        } else {
          errorMessage = 'Có lỗi xảy ra. Vui lòng thử lại.';
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
  };
}
