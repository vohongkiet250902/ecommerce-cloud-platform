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

    // Avoid infinite loops and skip refresh for non-auth requests if needed
    if (!originalRequest || !originalRequest.url) {
      return Promise.reject(error);
    }

    const isAuthRequest = originalRequest.url.includes('/auth/login') || 
                         originalRequest.url.includes('/auth/register') ||
                         originalRequest.url.includes('/auth/refresh') ||
                         originalRequest.url.includes('/auth/verify-account') ||
                         originalRequest.url.includes('/auth/forgot-password') ||
                         originalRequest.url.includes('/auth/reset-password');

    // 1. If 401 Unauthorized and not a retry
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return apiClient(originalRequest);
          })
          .catch((err: AxiosError) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await apiClient.post('/auth/refresh');
        isRefreshing = false;
        processQueue(null, 'success');
        return apiClient(originalRequest);
      } catch (err) {
        processQueue(err as AxiosError, null);
        // If refresh fails, let the caller handle the error.
        // Redirection to /auth should be managed by protected routes/layouts.
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

  verifyAccount: (email: string, otp: string) =>
    apiClient.post('/auth/verify-account', { email, otp }),

  resendActivation: (email: string) =>
    apiClient.post('/auth/resend-activation', { email }),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  verifyResetOtp: (email: string, otp: string) =>
    apiClient.post('/auth/verify-reset-otp', { email, otp }),

  resetPassword: (data: Record<string, any>) =>
    apiClient.post('/auth/reset-password', data),

  refresh: () => apiClient.post('/auth/refresh'),
  logout: () => apiClient.post('/auth/logout'),
  getCurrentUser: () => apiClient.get('/users/me'),
};

export const productApi = {
  // Public endpoint for user-facing product listing
  getProducts: (params?: Record<string, unknown>) =>
    apiClient.get('/products', { params }),
  // Admin-specific listing (keeps previous behavior)
  getAdminProducts: (params?: Record<string, unknown>) =>
    apiClient.get('/admin/products', { params }),
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
  getAdminCategories: () => apiClient.get('/admin/categories'),
  createCategory: (data: Record<string, unknown>) =>
    apiClient.post('/admin/categories', data),
  updateCategory: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/admin/categories/${id}`, data),
  toggleCategoryStatus: (id: string, isActive: boolean) =>
    apiClient.patch(`/admin/categories/${id}/status`, { isActive }),
  deleteCategory: (id: string) =>
    apiClient.delete(`/admin/categories/${id}`),
};

export const brandApi = {
  getBrands: () => apiClient.get('/brands'),
  getAdminBrands: () => apiClient.get('/admin/brands'),
  getBrand: (id: string) => apiClient.get(`/admin/brands/${id}`),
  createBrand: (data: Record<string, unknown>) =>
    apiClient.post('/admin/brands', data),
  updateBrand: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/admin/brands/${id}`, data),
  toggleBrandStatus: (id: string, isActive: boolean) =>
    apiClient.patch(`/admin/brands/${id}/status`, { isActive }),
  deleteBrand: (id: string) => apiClient.delete(`/admin/brands/${id}`),
};

export const usersApi = {
  getUsers: (params?: Record<string, unknown>) =>
    apiClient.get('admin/users', { params }),
  getUser: (id: string) => apiClient.get(`/admin/users/${id}`),
  updateUser: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/users/${id}`, data),
  toggleUserStatus: (id: string, isActive: boolean) =>
    apiClient.patch(`/admin/users/${id}/status`, { isActive }),
};

export const couponApi = {
  getAdminCoupons: () => apiClient.get('/admin/coupons'),
  createCoupon: (data: Record<string, unknown>) => apiClient.post('/admin/coupons', data),
  toggleCouponStatus: (id: string) => apiClient.patch(`/admin/coupons/${id}/toggle`),
  deleteCoupon: (id: string) => apiClient.delete(`/admin/coupons/${id}`),
};


export const orderApi = {
  getOrders: (params?: { page?: number; limit?: number; status?: string; userId?: string }) =>
    apiClient.get('/admin/orders', { params }),
  getUserOrders: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get('/orders/me', { params }),
  createOrder: (data: { items: { productId: string; sku: string; quantity: number }[]; paymentMethod?: string; idempotencyKey?: string }) => {
    const { idempotencyKey, ...orderData } = data;
    const headers = idempotencyKey ? { 'idempotency-key': idempotencyKey } : {};
    return apiClient.post('/orders', orderData, { headers });
  },
  updateStatus: (id: string, data: { status?: string; paymentStatus?: string }) =>
    apiClient.patch(`/admin/orders/${id}/status`, data),
  cancelOrder: (id: string) => apiClient.post(`/admin/orders/${id}/cancel`),
  cancelMyOrder: (id: string) => apiClient.patch(`/orders/${id}/cancel`),
};

export const paymentApi = {
  createVNPayUrl: (orderId: string) => apiClient.post('/payments/vnpay/create', { orderId }),
};

export const uploadApi = {
  uploadMultiple: (formData: FormData) =>
    apiClient.post('/upload/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const reviewApi = {
  getAdminReviews: (params?: any) => apiClient.get("/admin/reviews", { params }),
  deleteReview: (id: string) => apiClient.delete(`/admin/reviews/${id}`),
  getReviewsByProduct: (productId: string, params?: { page?: number; limit?: number; rating?: number; sortOrder?: string }) =>
    apiClient.get(`/reviews/product/${productId}`, { params }),
  createReview: (data: { productId: string; rating: number; comment: string }) =>
    apiClient.post('/reviews', data),
};

export default apiClient;
