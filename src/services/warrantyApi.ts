import type { WarrantyClaim, DefectCategory, RemedyPreference } from '../types';
import { getStoredToken, isDemoAuthMode } from './authApi';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
const WARRANTY_STORAGE_KEY = 'technikwelt_warranty_claims';

export interface CreateWarrantyClaimPayload {
  customer_email: string;
  customer_name: string;
  order_id?: string;
  product: string;
  product_name?: string;
  serial_number?: string;
  defect_category: DefectCategory;
  remedy_preference: RemedyPreference;
  description: string;
}

export interface CreateWarrantyClaimResult {
  success: boolean;
  claim?: WarrantyClaim;
  error?: string;
}

const DEFECT_CATEGORY_MAP: Record<DefectCategory, string> = {
  technical_fault: 'Technischer Defekt / Gerät startet nicht',
  display_fault: 'Displayfehler / Pixelfehler / Touchscreen',
  battery_power: 'Akku lädt nicht / Schaltet unerwartet ab',
  transport_damage: 'Transportschaden / Gehäuse beschädigt',
  connectivity: 'WLAN / Bluetooth / Verbindungsproblem',
  other: 'Sonstiger Mangel',
};

const REMEDY_MAP: Record<RemedyPreference, string> = {
  repair: 'Reparatur / Nachbesserung (§ 439 Abs. 1 BGB)',
  replacement: 'Ersatzlieferung / Neugerät (§ 439 Abs. 1 BGB)',
};

const STATUS_MAP: Record<string, string> = {
  submitted: 'Eingereicht',
  under_review: 'In Prüfung',
  approved: 'Genehmigt',
  repairing: 'In Reparatur',
  replaced: 'Austauschgerät versandt',
  rejected: 'Abgelehnt',
  completed: 'Abgeschlossen',
};

function normalizeClaim(data: any): WarrantyClaim {
  return {
    id: data.id,
    claim_number: data.claim_number,
    customer_email: data.customer_email || '',
    customer_name: data.customer_name || '',
    order_id: data.order_id || '',
    product: String(data.product || ''),
    product_name: data.product_name || (data.product && data.product.name) || 'Elektronikartikel',
    serial_number: data.serial_number || '',
    defect_category: data.defect_category,
    defect_category_display: data.defect_category_display || DEFECT_CATEGORY_MAP[data.defect_category as DefectCategory] || 'Mangel',
    remedy_preference: data.remedy_preference,
    remedy_preference_display: data.remedy_preference_display || REMEDY_MAP[data.remedy_preference as RemedyPreference] || 'Nachbesserung',
    description: data.description || '',
    status: data.status,
    status_display: data.status_display || STATUS_MAP[data.status] || 'Eingereicht',
    created_at: data.created_at || new Date().toISOString(),
    updated_at: data.updated_at || new Date().toISOString(),
  };
}

function getLocalClaims(): WarrantyClaim[] {
  try {
    const raw = localStorage.getItem(WARRANTY_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalClaim(claim: WarrantyClaim): void {
  try {
    const current = getLocalClaims();
    const updated = [claim, ...current.filter((c) => c.claim_number !== claim.claim_number)];
    localStorage.setItem(WARRANTY_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export async function fetchUserWarrantyClaims(email?: string): Promise<WarrantyClaim[]> {
  const localList = getLocalClaims();
  const filteredLocal = email
    ? localList.filter((c) => c.customer_email.toLowerCase().trim() === email.toLowerCase().trim())
    : localList;

  const token = getStoredToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token && !isDemoAuthMode()) headers['Authorization'] = `Bearer ${token}`;

  let url = `${API_BASE}/warranty-claims/`;
  if (email) {
    url += `?email=${encodeURIComponent(email.trim())}`;
  }

  try {
    const res = await fetch(url, { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const normalized = data.map(normalizeClaim);
        const seen = new Set(normalized.map((c) => c.claim_number));
        return [...normalized, ...filteredLocal.filter((c) => !seen.has(c.claim_number))];
      }
    }
  } catch {}

  return filteredLocal;
}

export async function createWarrantyClaim(payload: CreateWarrantyClaimPayload): Promise<CreateWarrantyClaimResult> {
  if (isDemoAuthMode()) {
    const mockClaimNumber = `WAR-DE-${Math.random().toString(16).substring(2, 10).toUpperCase()}`;
    const mockClaim: WarrantyClaim = {
      id: mockClaimNumber,
      claim_number: mockClaimNumber,
      customer_email: payload.customer_email,
      customer_name: payload.customer_name,
      order_id: payload.order_id || '',
      product: payload.product,
      product_name: payload.product_name || 'Technik-Produkt',
      serial_number: payload.serial_number || '',
      defect_category: payload.defect_category,
      defect_category_display: DEFECT_CATEGORY_MAP[payload.defect_category] || 'Mangel',
      remedy_preference: payload.remedy_preference,
      remedy_preference_display: REMEDY_MAP[payload.remedy_preference] || 'Nachbesserung',
      description: payload.description,
      status: 'submitted',
      status_display: 'Eingereicht',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveLocalClaim(mockClaim);
    return { success: true, claim: mockClaim };
  }

  const token = getStoredToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token && !isDemoAuthMode()) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}/warranty-claims/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      const claim = normalizeClaim(data);
      saveLocalClaim(claim);
      return { success: true, claim };
    }

    const errData = await res.json().catch(() => ({}));
    const errorMsg =
      errData.error ||
      (typeof errData === 'object' ? Object.values(errData).flat().join(' ') : 'Fehler beim Einreichen des Garantieantrags.');
    return { success: false, error: String(errorMsg) };
  } catch {
    const mockClaimNumber = `WAR-DE-${Math.random().toString(16).substring(2, 10).toUpperCase()}`;
    const fallbackClaim: WarrantyClaim = {
      id: mockClaimNumber,
      claim_number: mockClaimNumber,
      customer_email: payload.customer_email,
      customer_name: payload.customer_name,
      order_id: payload.order_id || '',
      product: payload.product,
      product_name: payload.product_name || 'Technik-Produkt',
      serial_number: payload.serial_number || '',
      defect_category: payload.defect_category,
      defect_category_display: DEFECT_CATEGORY_MAP[payload.defect_category] || 'Mangel',
      remedy_preference: payload.remedy_preference,
      remedy_preference_display: REMEDY_MAP[payload.remedy_preference] || 'Nachbesserung',
      description: payload.description,
      status: 'submitted',
      status_display: 'Eingereicht',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveLocalClaim(fallbackClaim);
    return { success: true, claim: fallbackClaim };
  }
}

export async function trackWarrantyClaim(claimNumber: string, email?: string): Promise<WarrantyClaim | null> {
  let url = `${API_BASE}/warranty-claims/track/?claim_number=${encodeURIComponent(claimNumber.trim())}`;
  if (email) {
    url += `&email=${encodeURIComponent(email.trim())}`;
  }

  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return normalizeClaim(data);
    }
  } catch {}

  const local = getLocalClaims().find((c) => c.claim_number.toLowerCase() === claimNumber.toLowerCase());
  return local || null;
}
