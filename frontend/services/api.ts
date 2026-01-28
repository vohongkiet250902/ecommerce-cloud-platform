import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Để gửi cookies cùng với request
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Xử lý token hết hạn tự động
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (error: AxiosError): Promise<any> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalRequest = (error.config || {}) as Record<string, any>;

    // Không retry /users/me endpoint
    if (originalRequest.url?.includes('/users/me')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers = originalRequest.headers || {};
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
        isRefreshing = false;
        processQueue(null, res.data.accessToken);
        return apiClient(originalRequest);
      } catch (err) {
        processQueue(err as AxiosError, null);
        // Redirect đến trang login khi refresh token hết hạn
        if (typeof window !== 'undefined') {
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
  // Đăng nhập
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),

  // Đăng ký
  register: (fullName: string, email: string, password: string) =>
    apiClient.post('/auth/register', { fullName, email, password }),

  // Refresh token
  refresh: () => apiClient.post('/auth/refresh'),

  // Đăng xuất
  logout: () => apiClient.post('/auth/logout'),

  // Lấy thông tin user hiện tại
  getCurrentUser: () => apiClient.get('/users/me'),
};

export const productApi = {
  // Lấy danh sách sản phẩm
  getProducts: (params?: Record<string, unknown>) =>
    apiClient.get('/products', { params }),

  // Lấy chi tiết sản phẩm
  getProduct: (id: string) => apiClient.get(`/admin/products/${id}`),
  // Tạo sản phẩm mới
  createProduct: (data: Record<string, unknown>) =>
    apiClient.post('/admin/products', data),

  // Cập nhật sản phẩm
  updateProduct: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/admin/products/${id}`, data),
  // Xóa sản phẩm
  deleteProduct: (id: string) => apiClient.delete(`/admin/products/${id}`),
};

export const categoryApi = {
  // Lấy danh sách danh mục
  getCategories: () => apiClient.get('/categories'),

  // Lấy chi tiết danh mục
  getCategory: (id: string) => apiClient.get(`/admin/categories/${id}`),

  // Tạo danh mục mới
  createCategory: (data: Record<string, unknown>) =>
    apiClient.post('/admin/categories', data),

  // Cập nhật danh mục
  updateCategory: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/admin/categories/${id}`, data),

  // Xóa danh mục
  deleteCategory: (id: string) => apiClient.delete(`/admin/categories/${id}`),
};

export const brandApi = {
  // Lấy danh sách thương hiệu
  getBrands: () => apiClient.get('/brands'),
};

export const usersApi = {
  // Lấy danh sách người dùng
  getUsers: (params?: Record<string, unknown>) =>
    apiClient.get('admin/users', { params }),

  // Lấy chi tiết người dùng
  getUser: (id: string) => apiClient.get(`/users/${id}`),

  // Cập nhật người dùng
  updateUser: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/users/${id}`, data),

  // Khóa/mở khóa người dùng
  toggleUserStatus: (id: string, status: string) =>
    apiClient.patch(`/users/${id}/status`, { status }),
};

export default apiClient;
