import axios, { AxiosError } from 'axios';
import { Address, AuthResponse, StoreConfig } from '@/types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const store = {
  config: () => api.get<StoreConfig>('/config'),
};

export const auth = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  register: (data: { firstName: string; lastName: string; email: string; password: string; phone?: string }) =>
    api.post<AuthResponse>('/auth/register', data),
};

export const products = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get('/products', { params }),
  featured: (page = 0, size = 8) =>
    api.get('/products/featured', { params: { page, size } }),
  bySlug: (slug: string) =>
    api.get(`/products/${slug}`),
};

export const categories = {
  list: () => api.get('/categories'),
  bySlug: (slug: string) => api.get(`/categories/${slug}`),
};

export const cart = {
  get: () => api.get('/cart'),
  add: (data: { productId: number; variantId?: number; quantity: number }) =>
    api.post('/cart/items', data),
  updateQuantity: (cartItemId: number, quantity: number) =>
    api.put(`/cart/items/${cartItemId}`, null, { params: { quantity } }),
  remove: (cartItemId: number) => api.delete(`/cart/items/${cartItemId}`),
  clear: () => api.delete('/cart'),
};

export const orders = {
  list: (page = 0, size = 10) =>
    api.get('/orders', { params: { page, size } }),
  checkout: (data: Record<string, unknown>) =>
    api.post('/orders/checkout', data),
  get: (orderId: number) =>
    api.get(`/orders/${orderId}`),
};

export const users = {
  me: () => api.get('/users/me'),
  update: (data: Record<string, unknown>) =>
    api.put('/users/me', data),
  addresses: () => api.get('/users/me/addresses'),
  addAddress: (data: Address) => api.post('/users/me/addresses', data),
  updateAddress: (id: number, data: Address) => api.put(`/users/me/addresses/${id}`, data),
  deleteAddress: (id: number) =>
    api.delete(`/users/me/addresses/${id}`),
};

export const reviews = {
  forProduct: (productId: number) =>
    api.get(`/products/${productId}/reviews`),
  add: (productId: number, data: { rating: number; title?: string; comment?: string }) =>
    api.post(`/products/${productId}/reviews`, data),
  update: (productId: number, reviewId: number, data: { rating: number; title?: string; comment?: string }) =>
    api.put(`/products/${productId}/reviews/${reviewId}`, data),
  delete: (productId: number, reviewId: number) =>
    api.delete(`/products/${productId}/reviews/${reviewId}`),
};

export const wishlist = {
  list: () => api.get('/wishlist'),
  add: (productId: number) => api.post(`/wishlist/${productId}`),
  remove: (productId: number) => api.delete(`/wishlist/${productId}`),
};

export const admin = {
  analytics: (days = 30) => api.get('/admin/analytics', { params: { days } }),
  orders: (page = 0, size = 20) =>
    api.get('/admin/orders', { params: { page, size } }),
  updateOrderStatus: (orderId: number, status: string) =>
    api.patch(`/admin/orders/${orderId}/status`, null, { params: { status } }),
  products: (page = 0, size = 20, search?: string) =>
    api.get('/admin/products', { params: { page, size, search } }),
  createProduct: (data: Record<string, unknown>) =>
    api.post('/admin/products', data),
  updateProduct: (id: number, data: Record<string, unknown>) =>
    api.put(`/admin/products/${id}`, data),
  deleteProduct: (id: number) => api.delete(`/admin/products/${id}`),
};

export function httpStatus(error: unknown): number | undefined {
  return error instanceof AxiosError ? error.response?.status : undefined;
}

export default api;
