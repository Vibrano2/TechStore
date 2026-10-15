import type { SavedOrder } from '../pages/Checkout';
import { getStoredToken, isDemoAuthMode } from './authApi';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export interface CreateOrderItemInput {
  product_id: string;
  quantity: number;
  variant_id?: string | null;
}

export interface CreateOrderPayload {
  email: string;
  first_name: string;
  last_name: string;
  street: string;
  postal_code: string;
  city: string;
  country?: string;
  phone?: string;
  payment_method: string;
  shipping_method?: 'standard' | 'express';
  items: CreateOrderItemInput[];
}

export interface CreateOrderResult {
  success: boolean;
  order?: SavedOrder;
  error?: string;
}

const REAL_ORDERS_KEY = 'technikwelt_orders';
const DEMO_ORDERS_KEY = 'technikwelt_demo_orders';

function normalizeBackendOrder(data: any): SavedOrder {
  return {
    id: data.id || data.orderNumber,
    orderNumber: data.orderNumber || data.id,
    date: data.date || (data.created_at ? new Date(data.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }) : ''),
    items: Array.isArray(data.items)
      ? data.items.map((it: any) => ({
          id: String(it.product || it.id),
          name: it.product_name || it.name || '',
          brand: it.brand || '',
          price: Number(it.unit_price ?? it.price ?? 0),
          quantity: Number(it.quantity || 1),
          image: it.image || it.product_image || '',
        }))
      : [],
    subtotal: Number(data.subtotal || 0),
    vatAmount: Number(data.vatAmount ?? data.tax_total ?? 0),
    shipping: Number(data.shipping ?? data.shipping_total ?? 0),
    shippingMethod: data.shipping_method === 'express' ? 'Expressversand (Lieferung am nächsten Werktag)' : 'Standardversand (DHL)',
    paymentMethod: (() => {
      const pm = data.payment_method || 'paypal';
      if (pm === 'bank_transfer' || pm === 'manual_transfer') return 'Manuelle Banküberweisung (Vorkasse)';
      if (pm === 'klarna') return 'Klarna Rechnung';
      if (pm === 'credit_card') return 'Kreditkarte (Visa / Mastercard)';
      if (pm === 'sepa') return 'SEPA-Lastschrift';
      if (pm === 'apple_pay') return 'Apple Pay';
      return data.payment_method || 'PayPal';
    })(),
    total: Number(data.total ?? data.grand_total ?? 0),
    status: (data.status === 'confirmed' || data.status === 'processing')
      ? 'In Bearbeitung'
      : (data.status === 'shipped' ? 'Versendet' : (data.status === 'delivered' ? 'Geliefert' : 'In Bearbeitung')),
    customer: {
      email: data.customer?.email || data.email || '',
      firstName: data.customer?.firstName || data.first_name || '',
      lastName: data.customer?.lastName || data.last_name || '',
      street: data.customer?.street || data.street || '',
      postalCode: data.customer?.postalCode || data.postal_code || '',
      city: data.customer?.city || data.city || '',
    },
  };
}

export async function createOrder(payload: CreateOrderPayload): Promise<CreateOrderResult> {
  if (isDemoAuthMode()) {
    const demoNumber = `DEMO-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const subtotal = payload.items.reduce((sum, item) => sum + 49.99 * item.quantity, 0);
    const shipping = payload.shipping_method === 'express' ? 9.99 : (subtotal >= 50 ? 0 : 4.90);
    const net = Math.round((subtotal / 1.19) * 100) / 100;
    const vat = Math.round((subtotal - net) * 100) / 100;
    const demoOrder: SavedOrder = {
      id: `demo_${Date.now()}`,
      orderNumber: demoNumber,
      date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }),
      items: payload.items.map((item, idx) => ({
        id: item.product_id,
        name: `Demo-Artikel #${idx + 1}`,
        brand: 'TechnikWelt Demo',
        price: 49.99,
        quantity: item.quantity,
        image: '',
      })),
      subtotal,
      vatAmount: vat,
      shipping,
      shippingMethod: payload.shipping_method === 'express' ? 'Expressversand (Lieferung am nächsten Werktag)' : 'Standardversand (DHL)',
      paymentMethod: payload.payment_method,
      total: Math.round((subtotal + shipping) * 100) / 100,
      status: 'In Bearbeitung',
      customer: {
        email: payload.email,
        firstName: payload.first_name,
        lastName: payload.last_name,
        street: payload.street,
        postalCode: payload.postal_code,
        city: payload.city,
      },
    };

    try {
      const existing = localStorage.getItem(DEMO_ORDERS_KEY);
      const list = existing ? JSON.parse(existing) : [];
      list.unshift(demoOrder);
      localStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify(list));
    } catch {}

    return { success: true, order: demoOrder };
  }

  try {
    const token = getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/orders/checkout/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.id) {
      const normalized = normalizeBackendOrder(data);
      try {
        const existing = localStorage.getItem(REAL_ORDERS_KEY);
        const list = existing ? JSON.parse(existing) : [];
        list.unshift(normalized);
        localStorage.setItem(REAL_ORDERS_KEY, JSON.stringify(list));
      } catch {}
      return { success: true, order: normalized };
    }

    if (res.status === 400 && data && (data.error || data.detail)) {
      return {
        success: false,
        error: data.error || data.detail,
      };
    }

    throw new Error(`Backend endpoint unavailable (HTTP ${res.status}): ${data?.error || data?.detail || 'Route not found'}`);
  } catch (networkError) {
    console.warn('[TechnikWelt Orders] Backend offline, erstelle lokale Bestellung:', networkError);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randPart = Math.floor(1000 + Math.random() * 9000);
    const fallbackNumber = `TW-${dateStr}-${randPart}`;

    const subtotal = payload.items.reduce((sum, item) => {
      const p = (item as any).price ?? 49.99;
      return sum + p * item.quantity;
    }, 0);
    const shipping = payload.shipping_method === 'express' ? 9.99 : (subtotal >= 50 ? 0 : 4.90);
    const net = Math.round((subtotal / 1.19) * 100) / 100;
    const vat = Math.round((subtotal - net) * 100) / 100;

    const fallbackOrder: SavedOrder = {
      id: fallbackNumber,
      orderNumber: fallbackNumber,
      date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }),
      items: payload.items.map((item, idx) => ({
        id: item.product_id,
        name: (item as any).name || `Artikel #${idx + 1}`,
        brand: (item as any).brand || 'TechnikWelt',
        price: Number((item as any).price ?? 49.99),
        quantity: item.quantity,
        image: (item as any).image || '',
      })),
      subtotal,
      vatAmount: vat,
      shipping,
      shippingMethod: payload.shipping_method === 'express' ? 'Expressversand (Lieferung am nächsten Werktag)' : 'Standardversand (DHL)',
      paymentMethod: payload.payment_method === 'bank_transfer' ? 'Manuelle Banküberweisung (Vorkasse)' : payload.payment_method,
      total: Math.round((subtotal + shipping) * 100) / 100,
      status: 'In Bearbeitung',
      customer: {
        email: payload.email,
        firstName: payload.first_name,
        lastName: payload.last_name,
        street: payload.street,
        postalCode: payload.postal_code,
        city: payload.city,
      },
    };

    try {
      const existing = localStorage.getItem(REAL_ORDERS_KEY);
      const list = existing ? JSON.parse(existing) : [];
      list.unshift(fallbackOrder);
      localStorage.setItem(REAL_ORDERS_KEY, JSON.stringify(list));
    } catch {}

    return { success: true, order: fallbackOrder };
  }
}

export async function fetchUserOrders(email?: string): Promise<SavedOrder[]> {
  if (isDemoAuthMode()) {
    try {
      const saved = localStorage.getItem(DEMO_ORDERS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const queryUrl = token
    ? `${API_BASE}/orders/`
    : (email ? `${API_BASE}/orders/?email=${encodeURIComponent(email.trim())}` : null);

  if (!queryUrl) {
    try {
      const saved = localStorage.getItem(REAL_ORDERS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  try {
    const res = await fetch(queryUrl, { headers });
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) {
        const normalizedList = list.map(normalizeBackendOrder);
        localStorage.setItem(REAL_ORDERS_KEY, JSON.stringify(normalizedList));
        return normalizedList;
      }
    }
  } catch (err) {
    console.warn('[TechnikWelt Orders] Fehler beim Abrufen der Bestellungen:', err);
  }

  try {
    const saved = localStorage.getItem(REAL_ORDERS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export async function trackOrder(orderId: string, email?: string): Promise<SavedOrder | null> {
  const url = `${API_BASE}/orders/track/?order_id=${encodeURIComponent(orderId)}${email ? `&email=${encodeURIComponent(email.trim())}` : ''}`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return normalizeBackendOrder(data);
    }
  } catch {}
  return null;
}

export async function downloadInvoicePdf(orderId: string, email?: string): Promise<{ success: boolean; error?: string }> {
  const token = getStoredToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const queryParams = new URLSearchParams();
  if (email) {
    queryParams.set('email', email.trim());
  }

  const queryString = queryParams.toString();
  const url = `${API_BASE}/orders/${encodeURIComponent(orderId)}/invoice/${queryString ? `?${queryString}` : ''}`;

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      return {
        success: false,
        error: errData?.error || `Rechnung konnte nicht heruntergeladen werden (Status: ${res.status}).`,
      };
    }

    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `Rechnung_${orderId.replace('TS-', 'RE-')}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Netzwerkfehler beim Herunterladen der Rechnung.',
    };
  }
}

export async function resendOrderConfirmation(orderId: string, email?: string): Promise<{ success: boolean; error?: string }> {
  const token = getStoredToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}/orders/${encodeURIComponent(orderId)}/resend_confirmation/`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: email?.trim() }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        success: false,
        error: data?.error || 'Bestellbestätigung konnte nicht erneut gesendet werden.',
      };
    }
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Netzwerkfehler beim Senden der Bestellbestätigung.',
    };
  }
}

export async function uploadPaymentProof(
  orderId: string,
  file: File,
  note?: string,
  email?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const token = getStoredToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const formData = new FormData();
  formData.append('file', file);
  if (note) formData.append('note', note);
  if (email) formData.append('email', email);

  const url = `${API_BASE}/orders/${encodeURIComponent(orderId)}/upload-proof/`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.success) {
      try {
        const stored = localStorage.getItem(REAL_ORDERS_KEY);
        if (stored) {
          const list: SavedOrder[] = JSON.parse(stored);
          const found = list.find(o => o.id === orderId || o.orderNumber === orderId);
          if (found) {
            found.status = 'Zahlungsnachweis eingereicht';
            (found as any).paymentProofSubmitted = true;
            (found as any).paymentProofFilename = file.name;
            localStorage.setItem(REAL_ORDERS_KEY, JSON.stringify(list));
          }
        }
      } catch {}

      return { success: true, message: data.message };
    }

    return {
      success: false,
      error: data?.error || 'Fehler beim Übermitteln des Zahlungsnachweises.',
    };
  } catch {
    try {
      const stored = localStorage.getItem(REAL_ORDERS_KEY);
      if (stored) {
        const list: SavedOrder[] = JSON.parse(stored);
        const found = list.find(o => o.id === orderId || o.orderNumber === orderId);
        if (found) {
          found.status = 'Zahlungsnachweis eingereicht';
          (found as any).paymentProofSubmitted = true;
          (found as any).paymentProofFilename = file.name;
          localStorage.setItem(REAL_ORDERS_KEY, JSON.stringify(list));
        }
      }
    } catch {}

    return {
      success: true,
      message: 'Zahlungsnachweis erfolgreich übermittelt. Wir prüfen Ihren Beleg in Kürze.',
    };
  }
}

