/**
 * @file api.js
 * @description Centralised API client for the Next.js frontend.
 *
 * - All requests go to /api/v1/* (proxied to Express via next.config.js).
 * - Inject Bearer token via NextAuth session.
 * - On 401 responses, the user is redirected to /login.
 */

import { getSession } from 'next-auth/react';

const BASE_URL = '/api/v1';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data   = data;
  }
}

async function request(method, path, body = null, options = {}) {
  const config = {
    method,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  };
  if (body) config.body = JSON.stringify(body);

  if (typeof window !== 'undefined') {
    try {
      const session = await getSession();
      if (session?.user?.accessToken) {
        config.headers.Authorization = `Bearer ${session.user.accessToken}`;
      }
    } catch(e) {}
  }

  const res = await fetch(`${BASE_URL}${path}`, config);

  // Note: During the transition to monolithic auth, we disable the auto-redirect on 401. 
  // Component-level error handling should be used instead to prevent loop bugs.
  if (res.status === 401 && typeof window !== 'undefined') {
    console.warn('API 401: Unauthorized access to legacy backend. No auto-redirect.');
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(json.message || 'An unexpected error occurred.', res.status, json);
  }
  return json;
}

// ── Convenience methods ───────────────────────────────────────────────────────
export const api = {
  get:    (path, opts)       => request('GET',    path, null, opts),
  post:   (path, body, opts) => request('POST',   path, body, opts),
  patch:  (path, body, opts) => request('PATCH',  path, body, opts),
  put:    (path, body, opts) => request('PUT',    path, body, opts),
  delete: (path, opts)       => request('DELETE', path, null, opts),
};

// ── Domain-specific helpers ───────────────────────────────────────────────────

// Auth
export const authApi = {
  register: (data)       => api.post('/auth/register', data),
  login:    (data)       => api.post('/auth/login',    data),
  logout:   ()           => api.post('/auth/logout'),
  me:       ()           => api.get('/auth/me'),
};

// Accounts (Chart of Accounts)
export const accountsApi = {
  list:   ()         => api.get('/accounts'),
  create: (data)     => api.post('/accounts', data),
  update: (id, data) => api.patch(`/accounts/${id}`, data),
};

// Journals
export const journalsApi = {
  list:         (period)    => api.get(`/journals${period ? `?period=${period}` : ''}`),
  create:       (data)      => api.post('/journals', data),
  getById:      (id)        => api.get(`/journals/${id}`),
  updateStatus: (id, status) => api.patch(`/journals/${id}/status`, { status }),
};

// Customers
export const customersApi = {
  list:     (params = {}) => api.get(`/customers?${new URLSearchParams(params)}`),
  create:   (data)        => api.post('/customers', data),
  getById:  (id)          => api.get(`/customers/${id}`),
  update:   (id, data)    => api.patch(`/customers/${id}`, data),
};

// Invoices
export const invoicesApi = {
  list:         (params = {}) => api.get(`/invoices?${new URLSearchParams(params)}`),
  create:       (data)        => api.post('/invoices', data),
  getById:      (id)          => api.get(`/invoices/${id}`),
  update:       (id, data)    => api.patch(`/invoices/${id}`, data),
  updateStatus: (id, status)  => api.patch(`/invoices/${id}/status`, { status }),
};

// Products
export const productsApi = {
  list:         (params = {}) => api.get(`/products?${new URLSearchParams(params)}`),
  create:       (data)        => api.post('/products', data),
  getById:      (id)          => api.get(`/products/${id}`),
  update:       (id, data)    => api.patch(`/products/${id}`, data),
  adjust:       (data)        => api.post('/products/adjust', data),
  movements:    (id)          => api.get(`/products/${id}/movements`),
};

// Suppliers
export const suppliersApi = {
  list:    (params = {}) => api.get(`/suppliers?${new URLSearchParams(params)}`),
  create:  (data)        => api.post('/suppliers', data),
  getById: (id)          => api.get(`/suppliers/${id}`),
  update:  (id, data)    => api.patch(`/suppliers/${id}`, data),
};

// Bills
export const billsApi = {
  list:         (params = {}) => api.get(`/bills?${new URLSearchParams(params)}`),
  create:       (data)        => api.post('/bills', data),
  getById:      (id)          => api.get(`/bills/${id}`),
  update:       (id, data)    => api.patch(`/bills/${id}`, data),
  updateStatus: (id, status)  => api.patch(`/bills/${id}/status`, { status }),
};

// Payments & Cheques
export const paymentsApi = {
  list:     (params = {}) => api.get(`/payments?${new URLSearchParams(params)}`),
  create:   (data)        => api.post('/payments', data),
  getById:  (id)          => api.get(`/payments/${id}`),
  verify:   (id, data)    => api.patch(`/payments/${id}/verify`, data),
};

// Reports
export const reportsApi = {
  trialBalance:   (fromDate, toDate) => api.get(`/reports/trial-balance?fromDate=${fromDate}&toDate=${toDate}`),
  profitAndLoss:  (fromDate, toDate) => api.get(`/reports/profit-and-loss?fromDate=${fromDate}&toDate=${toDate}`),
  balanceSheet:   (asOfDate)         => api.get(`/reports/balance-sheet?asOfDate=${asOfDate}`),
  arAging:        (asOfDate)         => api.get(`/reports/ar-aging?asOfDate=${asOfDate}`),
  apAging:        (asOfDate)         => api.get(`/reports/ap-aging?asOfDate=${asOfDate}`),
  glDetail:       (accountId, from, to) => api.get(`/reports/gl/${accountId}?fromDate=${from}&toDate=${to}`),
  lowStock:       ()                 => api.get('/reports/low-stock'),
};

export { ApiError };
