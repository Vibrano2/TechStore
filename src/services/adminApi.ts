/**
 * Dedicated Admin & Internal Control API Client for TechnikWelt.
 * Connects to /api/v1/intern/ endpoints with Bearer token authentication.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const TOKEN_KEY = 'technikwelt_admin_token';
const USER_KEY = 'technikwelt_admin_user';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  is_staff: boolean;
  is_superuser: boolean;
}

export interface AdminStats {
  metrics: {
    total_revenue: number;
    revenue_7d: number;
    total_orders: number;
    orders_today: number;
    pending_payment_proofs: number;
    pending_orders: number;
    active_returns: number;
    active_warranties: number;
    low_stock_products: number;
    total_products: number;
    total_customers: number;
  };
  daily_points: Array<{
    date: string;
    day_name: string;
    revenue: number;
    orders: number;
  }>;
  status_counts: Record<string, number>;
}

export interface AdminOrderItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface AdminOrder {
  id: string;
  created_at: string;
  status: string;
  payment_status: string;
  payment_method: string;
  customer_name: string;
  email: string;
  phone: string;
  shipping_address: {
    street: string;
    postal_code: string;
    city: string;
    country: string;
  };
  subtotal: number;
  shipping_total: number;
  tax_total: number;
  grand_total: number;
  currency: string;
  tracking_number: string;
  payment_proof_url: string | null;
  payment_proof_note: string;
  payment_proof_uploaded_at: string | null;
  items: AdminOrderItem[];
}

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  category_slug: string;
  price: number;
  original_price: number | null;
  stock: number;
  status: 'active' | 'draft' | 'archived';
  featured: boolean;
  image: string;
  road_legal: boolean | null;
  abe_number: string | null;
  updated_at: string;
}

export interface AdminReturn {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  reason: string;
  reason_code: string;
  customer_notes: string;
  status: string;
  status_display: string;
  refund_amount: number;
  refund_method: string;
  carrier: string;
  return_tracking_number: string;
  created_at: string;
}

export interface AdminWarrantyClaim {
  id: number;
  claim_number: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  product_name: string;
  serial_number: string;
  defect_category: string;
  remedy_preference: string;
  description: string;
  status: string;
  status_display: string;
  created_at: string;
}

export interface AdminCustomer {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  city: string;
  country: string;
  date_joined: string;
  order_count: number;
  total_spent: number;
}

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getAdminUser(): AdminUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeAdminSession(token: string, user: AdminUser, remember: boolean = true) {
  try {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, token);
    storage.setItem(USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.warn('Failed to store admin session:', err);
  }
}

export function clearAdminSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  } catch (err) {
    console.warn('Failed to clear admin session:', err);
  }
}

async function adminFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = getAdminToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Fallback to internal master key if passed in dev
  headers.set('Accept', 'application/json');

  const normalizedBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${normalizedBase}${cleanEndpoint}`;

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 || res.status === 403) {
    // If unauthorized on a protected endpoint, clear session
    if (!endpoint.includes('/intern/login/')) {
      clearAdminSession();
    }
  }

  const contentType = res.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const errorMessage = typeof data === 'object' && data?.error ? data.error : `HTTP Fehler ${res.status}`;
    throw new Error(errorMessage);
  }

  return data;
}

export async function adminLogin(credentials: { username: string; password: string; remember?: boolean }): Promise<{ success: boolean; token: string; user: AdminUser }> {
  const data = await adminFetch('/intern/login/', {
    method: 'POST',
    body: JSON.stringify({
      username: credentials.username,
      password: credentials.password,
    }),
  });

  if (data?.token && data?.user) {
    storeAdminSession(data.token, data.user, credentials.remember ?? true);
  }

  return data;
}

export async function adminLogout(): Promise<void> {
  clearAdminSession();
}

export async function fetchAdminStats(): Promise<AdminStats> {
  return await adminFetch('/intern/stats/');
}

export async function fetchAdminOrders(params: {
  status?: string;
  payment_status?: string;
  payment_method?: string;
  search?: string;
} = {}): Promise<{ count: number; orders: AdminOrder[] }> {
  const q = new URLSearchParams();
  if (params.status && params.status !== 'all') q.set('status', params.status);
  if (params.payment_status && params.payment_status !== 'all') q.set('payment_status', params.payment_status);
  if (params.payment_method && params.payment_method !== 'all') q.set('payment_method', params.payment_method);
  if (params.search) q.set('search', params.search);

  const queryStr = q.toString() ? `?${q.toString()}` : '';
  return await adminFetch(`/intern/orders/${queryStr}`);
}

export async function fetchAdminOrderDetail(orderId: string): Promise<AdminOrder> {
  return await adminFetch(`/intern/orders/${orderId}/`);
}

export async function updateAdminOrderStatus(orderId: string, statusVal: string, trackingNumber?: string): Promise<any> {
  return await adminFetch(`/intern/orders/${orderId}/update-status/`, {
    method: 'POST',
    body: JSON.stringify({ status: statusVal, tracking_number: trackingNumber }),
  });
}

export async function approveAdminPaymentProof(orderId: string): Promise<{ success: boolean; message: string; payment_status: string }> {
  return await adminFetch(`/intern/orders/${orderId}/approve-payment/`, {
    method: 'POST',
  });
}

export async function rejectAdminPaymentProof(orderId: string, reason: string): Promise<{ success: boolean; message: string }> {
  return await adminFetch(`/intern/orders/${orderId}/reject-payment/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function resendAdminInvoice(orderId: string): Promise<{ success: boolean; message?: string }> {
  return await adminFetch(`/intern/orders/${orderId}/resend-invoice/`, {
    method: 'POST',
  });
}

export async function fetchAdminProducts(params: {
  category?: string;
  search?: string;
  stock_filter?: string;
} = {}): Promise<{ count: number; products: AdminProduct[] }> {
  const q = new URLSearchParams();
  if (params.category && params.category !== 'all') q.set('category', params.category);
  if (params.search) q.set('search', params.search);
  if (params.stock_filter && params.stock_filter !== 'all') q.set('stock_filter', params.stock_filter);

  const queryStr = q.toString() ? `?${q.toString()}` : '';
  return await adminFetch(`/intern/products/${queryStr}`);
}

export async function updateAdminProduct(productId: string, data: {
  stock?: number;
  price?: number;
  original_price?: number | null;
  status?: string;
  featured?: boolean;
  road_legal?: boolean;
}): Promise<any> {
  return await adminFetch(`/intern/products/${productId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function fetchAdminReturns(params: { status?: string } = {}): Promise<{ count: number; returns: AdminReturn[] }> {
  const q = new URLSearchParams();
  if (params.status && params.status !== 'all') q.set('status', params.status);
  const queryStr = q.toString() ? `?${q.toString()}` : '';
  return await adminFetch(`/intern/returns/${queryStr}`);
}

export async function updateAdminReturnStatus(returnId: string, statusVal: string): Promise<any> {
  return await adminFetch(`/intern/returns/${returnId}/update-status/`, {
    method: 'POST',
    body: JSON.stringify({ status: statusVal }),
  });
}

export async function fetchAdminWarrantyClaims(params: { status?: string } = {}): Promise<{ count: number; claims: AdminWarrantyClaim[] }> {
  const q = new URLSearchParams();
  if (params.status && params.status !== 'all') q.set('status', params.status);
  const queryStr = q.toString() ? `?${q.toString()}` : '';
  return await adminFetch(`/intern/warranty-claims/${queryStr}`);
}

export async function updateAdminWarrantyStatus(claimId: string | number, statusVal: string): Promise<any> {
  return await adminFetch(`/intern/warranty-claims/${claimId}/update-status/`, {
    method: 'POST',
    body: JSON.stringify({ status: statusVal }),
  });
}

export async function fetchAdminCustomers(params: { search?: string } = {}): Promise<{ count: number; customers: AdminCustomer[] }> {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  const queryStr = q.toString() ? `?${q.toString()}` : '';
  return await adminFetch(`/intern/customers/${queryStr}`);
}
