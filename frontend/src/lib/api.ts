import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { Address, AuthResponse, StoreConfig } from '@/types';

/**
 * The access token lives in this module's memory only — never in localStorage — so an XSS payload has
 * nothing to read off disk. The refresh token is an HttpOnly cookie the SPA cannot even see: a page
 * reload trades that cookie for a new access token, and an expired access token is refreshed in place.
 */
let accessToken: string | null = null;
let sessionExpiredHandler: (() => void) | null = null;
let cachedCsrfToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function onSessionExpired(handler: () => void) {
  sessionExpiredHandler = handler;
}

function readCsrfCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * The cookie is the authority when the browser already has it; otherwise the token is asked of the API,
 * which writes the cookie. Cached so a request fired in the same tick as `bootstrap()` does not race an
 * unreadable cookie and get rejected with 403.
 */
async function csrfToken(): Promise<string | null> {
  const fromCookie = readCsrfCookie();
  if (fromCookie) {
    cachedCsrfToken = fromCookie;
    return fromCookie;
  }
  if (!cachedCsrfToken) {
    cachedCsrfToken = (await api.get<{ token: string }>('/auth/csrf')).data.token;
  }
  return cachedCsrfToken;
}

function forgetCsrfToken() {
  document.cookie = 'XSRF-TOKEN=; path=/; max-age=0';
  cachedCsrfToken = null;
}

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  const method = (config.method ?? 'get').toLowerCase();
  if (method !== 'get' && method !== 'head' && method !== 'options') {
    const token = await csrfToken();
    if (token) {
      config.headers['X-XSRF-TOKEN'] = token;
    }
  }
  return config;
});

type RetriableConfig = AxiosRequestConfig & { retriedAfterRefresh?: boolean; retriedAfterCsrfReset?: boolean };

/** Single-flight: a burst of 401s must produce one refresh call, not one per request. */
let pendingRefresh: Promise<string | null> | null = null;

function refreshSession(): Promise<string | null> {
  if (!pendingRefresh) {
    pendingRefresh = api
      .post<AuthResponse>('/auth/refresh')
      .then((res) => {
        accessToken = res.data.token;
        return accessToken;
      })
      .catch(() => {
        accessToken = null;
        return null;
      })
      .finally(() => {
        pendingRefresh = null;
      });
  }
  return pendingRefresh;
}

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const config = err.config as RetriableConfig | undefined;
    const url = config?.url ?? '';
    const isAuthHandshake = url.includes('/auth/refresh') || url.includes('/auth/login');
    const isCookieAuthenticated = url.startsWith('/auth/');

    if (
      err.response?.status === 403 &&
      config &&
      isCookieAuthenticated &&
      !config.retriedAfterCsrfReset
    ) {
      config.retriedAfterCsrfReset = true;
      forgetCsrfToken();
      return api.request(config);
    }

    if (err.response?.status === 401 && config && !config.retriedAfterRefresh && !isAuthHandshake) {
      config.retriedAfterRefresh = true;
      if (await refreshSession()) {
        return api.request(config);
      }
      sessionExpiredHandler?.();
    }
    return Promise.reject(err);
  }
);

export const store = {
  config: () => api.get<StoreConfig>('/config'),
};

export const auth = {
  /** Materializes the CSRF cookie that the refresh call has to echo back, and caches its token. */
  bootstrap: async () => {
    const res = await api.get<{ token: string }>('/auth/csrf');
    cachedCsrfToken = res.data.token;
    return res;
  },
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  register: (data: { firstName: string; lastName: string; email: string; password: string; phone?: string }) =>
    api.post<AuthResponse>('/auth/register', data),
  refresh: () => api.post<AuthResponse>('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
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
