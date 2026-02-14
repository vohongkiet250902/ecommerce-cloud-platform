import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Handle token refresh automatically
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: AxiosError) => void;
}> = [];

const processQueue = (
  error: AxiosError | null,
  token: string | null = null,
) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });

  isRefreshing = false;
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Do not retry for specific endpoints to avoid infinite loops
    // Also skip if no config/url
    if (!originalRequest || !originalRequest.url || originalRequest.url.includes('/users/me') || originalRequest.url.includes('/auth/login')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err: AxiosError) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await apiClient.post('/auth/refresh');
        const { accessToken } = res.data;
        
        isRefreshing = false;
        processQueue(null, accessToken);
        
        // Update the header for the original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (err) {
        processQueue(err as AxiosError, null);
        // Redirect to login only if we are in the browser and not already on auth page
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth';
        }
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  },
);

// API Endpoints
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),

  register: (fullName: string, email: string, password: string) =>
    apiClient.post('/auth/register', { fullName, email, password }),

  refresh: () => apiClient.post('/auth/refresh'),
  logout: () => apiClient.post('/auth/logout'),
  getCurrentUser: () => apiClient.get('/users/me'),
};

export const productApi = {
  getProducts: (params?: Record<string, unknown>) =>
    apiClient.get('/products', { params }),
  getProduct: (id: string) => apiClient.get(`/admin/products/${id}`),
  getProductDetail: (slug: string) => apiClient.get(`/products/${slug}`),
  createProduct: (data: Record<string, unknown>) =>
    apiClient.post('/admin/products', data),
  updateProduct: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/admin/products/${id}`, data),
  deleteProduct: (id: string) => apiClient.delete(`/admin/products/${id}`),
};

export const categoryApi = {
  getCategories: () => apiClient.get('/categories'),
  createCategory: (data: Record<string, unknown>) =>
    apiClient.post('/admin/categories', data),
  updateCategory: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/admin/categories/${id}`, data),
  deleteCategory: (id: string) =>
    apiClient.delete(`/admin/categories/${id}`),
};

export const brandApi = {
  getBrands: () => apiClient.get('/brands'),
  getBrand: (id: string) => apiClient.get(`/admin/brands/${id}`),
  createBrand: (data: Record<string, unknown>) =>
    apiClient.post('/admin/brands', data),
  updateBrand: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/admin/brands/${id}`, data),
  deleteBrand: (id: string) => apiClient.delete(`/admin/brands/${id}`),
};

export const usersApi = {
  getUsers: (params?: Record<string, unknown>) =>
    apiClient.get('admin/users', { params }),
  getUser: (id: string) => apiClient.get(`/users/${id}`),
  updateUser: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/users/${id}`, data),
  toggleUserStatus: (id: string, isActive: boolean) =>
    apiClient.patch(`/admin/users/${id}/status`, { isActive }),
};

export const orderApi = {
  getOrders: () => apiClient.get('/admin/orders'),
  updateStatus: (id: string, data: { status?: string; paymentStatus?: string }) =>
    apiClient.patch(`/admin/orders/${id}/status`, data),
  cancelOrder: (id: string) => apiClient.post(`/admin/orders/${id}/cancel`),
};

export default apiClient;
