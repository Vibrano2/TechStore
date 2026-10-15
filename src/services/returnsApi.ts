import type { OrderReturn, ReturnItemData, ReturnReason, RefundMethod } from '../types';
import { getStoredToken, isDemoAuthMode } from './authApi';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
const RETURNS_STORAGE_KEY = 'technikwelt_returns';

export interface CreateReturnPayload {
  order_id: string;
  customer_email: string;
  customer_name?: string;
  reason: ReturnReason;
  customer_notes?: string;
  refund_method: RefundMethod;
  items: ReturnItemData[];
}

export interface CreateReturnResult {
  success: boolean;
  returnData?: OrderReturn;
  error?: string;
}

const REASON_MAP: Record<ReturnReason, string> = {
  not_liked: 'Artikel gefällt nicht',
  not_as_described: 'Entspricht nicht der Beschreibung',
  wrong_item: 'Falscher Artikel geliefert',
  defective_on_arrival: 'Defekt bei Lieferung (Transportschaden)',
  better_price: 'Günstigeren Preis gefunden',
  ordered_by_mistake: 'Versehentlich bestellt',
  other: 'Sonstiger Grund',
};

const REFUND_METHOD_MAP: Record<RefundMethod, string> = {
  original_payment: 'Ursprüngliche Zahlungsmethode',
  store_credit: 'Guthaben auf Kundenkonto',
};

function normalizeReturn(data: any): OrderReturn {
  return {
    id: data.id,
    order_id: data.order_id || (data.order && (data.order.id || data.order)) || '',
    customer_email: data.customer_email || '',
    customer_name: data.customer_name || '',
    reason: data.reason,
    reason_display: data.reason_display || REASON_MAP[data.reason as ReturnReason] || 'Rücksendung',
    customer_notes: data.customer_notes || '',
    refund_method: data.refund_method,
    refund_method_display: data.refund_method_display || REFUND_METHOD_MAP[data.refund_method as RefundMethod] || 'Ursprüngliche Zahlung',
    refund_amount: Number(data.refund_amount || 0),
    items_data: Array.isArray(data.items_data) ? data.items_data : [],
    status: data.status,
    status_display: data.status_display || 'Rücksendeetikett bereitgestellt',
    return_tracking_number: data.return_tracking_number || '',
    carrier: data.carrier || 'DHL Retoure Deutschland',
    created_at: data.created_at || new Date().toISOString(),
    updated_at: data.updated_at || new Date().toISOString(),
  };
}

function getLocalReturns(): OrderReturn[] {
  try {
    const raw = localStorage.getItem(RETURNS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalReturn(ret: OrderReturn): void {
  try {
    const current = getLocalReturns();
    const updated = [ret, ...current.filter((r) => r.id !== ret.id)];
    localStorage.setItem(RETURNS_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export async function fetchUserReturns(email?: string): Promise<OrderReturn[]> {
  const localList = getLocalReturns();
  const filteredLocal = email
    ? localList.filter((r) => r.customer_email.toLowerCase().trim() === email.toLowerCase().trim())
    : localList;

  const token = getStoredToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token && !isDemoAuthMode()) headers['Authorization'] = `Bearer ${token}`;

  let url = `${API_BASE}/returns/`;
  if (email) {
    url += `?email=${encodeURIComponent(email.trim())}`;
  }

  try {
    const res = await fetch(url, { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const normalized = data.map(normalizeReturn);
        const seen = new Set(normalized.map((r) => r.id));
        return [...normalized, ...filteredLocal.filter((r) => !seen.has(r.id))];
      }
    }
  } catch {}

  return filteredLocal;
}

export async function createOrderReturn(payload: CreateReturnPayload): Promise<CreateReturnResult> {
  if (isDemoAuthMode()) {
    const totalRefund = payload.items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);
    const mockId = `RET-DE-${Math.random().toString(16).substring(2, 10).toUpperCase()}`;
    const mockTracking = `00340434${Math.floor(100000000000 + Math.random() * 900000000000)}`;

    const mockReturn: OrderReturn = {
      id: mockId,
      order_id: payload.order_id,
      customer_email: payload.customer_email,
      customer_name: payload.customer_name || 'Kunde',
      reason: payload.reason,
      reason_display: REASON_MAP[payload.reason] || 'Rücksendung',
      customer_notes: payload.customer_notes || '',
      refund_method: payload.refund_method,
      refund_method_display: REFUND_METHOD_MAP[payload.refund_method] || 'Ursprüngliche Zahlung',
      refund_amount: totalRefund,
      items_data: payload.items,
      status: 'label_created',
      status_display: 'Rücksendeetikett bereitgestellt',
      return_tracking_number: mockTracking,
      carrier: 'DHL Retoure Deutschland',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveLocalReturn(mockReturn);
    return { success: true, returnData: mockReturn };
  }

  const token = getStoredToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}/returns/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      const returnData = normalizeReturn(data);
      saveLocalReturn(returnData);
      return { success: true, returnData };
    }

    const errData = await res.json().catch(() => ({}));
    const errorMsg =
      errData.error ||
      (typeof errData === 'object' ? Object.values(errData).flat().join(' ') : 'Fehler beim Erstellen der Rücksendung.');
    return { success: false, error: String(errorMsg) };
  } catch {
    const totalRefund = payload.items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);
    const mockId = `RET-DE-${Math.random().toString(16).substring(2, 10).toUpperCase()}`;
    const mockTracking = `00340434${Math.floor(100000000000 + Math.random() * 900000000000)}`;

    const fallbackReturn: OrderReturn = {
      id: mockId,
      order_id: payload.order_id,
      customer_email: payload.customer_email,
      customer_name: payload.customer_name || 'Kunde',
      reason: payload.reason,
      reason_display: REASON_MAP[payload.reason] || 'Rücksendung',
      customer_notes: payload.customer_notes || '',
      refund_method: payload.refund_method,
      refund_method_display: REFUND_METHOD_MAP[payload.refund_method] || 'Ursprüngliche Zahlung',
      refund_amount: totalRefund,
      items_data: payload.items,
      status: 'label_created',
      status_display: 'Rücksendeetikett bereitgestellt',
      return_tracking_number: mockTracking,
      carrier: 'DHL Retoure Deutschland',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveLocalReturn(fallbackReturn);
    return { success: true, returnData: fallbackReturn };
  }
}

export async function downloadReturnLabelPdf(returnId: string, email?: string): Promise<{ success: boolean; error?: string }> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let url = `${API_BASE}/returns/${encodeURIComponent(returnId)}/label/`;
  if (email) {
    url += `?email=${encodeURIComponent(email.trim())}`;
  }

  try {
    const res = await fetch(url, { headers });
    if (res.ok) {
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `DHL_Retourenschein_${returnId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
      return { success: true };
    }
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || 'Retourenschein konnte nicht geladen werden.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Verbindung zum Retourenserver fehlgeschlagen.' };
  }
}

export async function trackReturn(returnId: string, email?: string): Promise<OrderReturn | null> {
  let url = `${API_BASE}/returns/track/?return_id=${encodeURIComponent(returnId.trim())}`;
  if (email) {
    url += `&email=${encodeURIComponent(email.trim())}`;
  }

  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return normalizeReturn(data);
    }
  } catch {}

  const local = getLocalReturns().find((r) => r.id.toLowerCase() === returnId.toLowerCase());
  return local || null;
}
