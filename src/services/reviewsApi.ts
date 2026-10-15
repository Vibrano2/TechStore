import type { Review, ProductReviewsSummary, ReviewRatingDistribution } from '../types';
import { getStoredToken, isDemoAuthMode } from './authApi';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export interface SubmitReviewPayload {
  author_name: string;
  author_email: string;
  rating: number;
  title: string;
  comment: string;
}

const LOCAL_REVIEWS_KEY = 'technikwelt_local_reviews';

function getLocalReviews(productId: string): Review[] {
  try {
    const raw = localStorage.getItem(LOCAL_REVIEWS_KEY);
    if (!raw) return [];
    const all: Review[] = JSON.parse(raw);
    return all.filter((r) => r.productId === productId);
  } catch {
    return [];
  }
}

function saveLocalReview(review: Review): void {
  try {
    const raw = localStorage.getItem(LOCAL_REVIEWS_KEY);
    const all: Review[] = raw ? JSON.parse(raw) : [];
    all.unshift(review);
    localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(all));
  } catch {}
}

function createFallbackSummary(productId: string, defaultRating: number = 4.8, defaultCount: number = 24): ProductReviewsSummary {
  const local = getLocalReviews(productId);
  const sampleReviews: Review[] = [
    {
      id: `seed_${productId}_1`,
      productId,
      authorName: 'Markus Weber',
      rating: 5,
      title: 'Hervorragendes Produkt für Alltag und Beruf',
      comment: 'Sehr schnelle Lieferung mit DHL innerhalb von 2 Tagen. Die Qualität hat meine Erwartungen übertroffen. Sehr empfehlenswert!',
      isVerifiedBuyer: true,
      helpfulCount: 16,
      createdAt: '2026-10-10T14:30:00Z',
    },
    {
      id: `seed_${productId}_2`,
      productId,
      authorName: 'Sabine Klein',
      rating: 5,
      title: 'Top Preis-Leistungs-Verhältnis',
      comment: 'Sehr gute Verarbeitung und intuitive Bedienung. Alles wie in den Spezifikationen beschrieben.',
      isVerifiedBuyer: true,
      helpfulCount: 8,
      createdAt: '2026-10-06T09:15:00Z',
    },
    {
      id: `seed_${productId}_3`,
      productId,
      authorName: 'Torsten M.',
      rating: 4,
      title: 'Solide Verarbeitung und gute Leistung',
      comment: 'Insgesamt ein sehr überzeugendes Gerät. Die Verpackung war vorbildlich und der Kundenservice sehr freundlich.',
      isVerifiedBuyer: false,
      helpfulCount: 3,
      createdAt: '2026-09-28T16:45:00Z',
    },
  ];

  const combinedReviews = [...local, ...sampleReviews];
  const total = defaultCount > combinedReviews.length ? defaultCount : combinedReviews.length;

  const distribution: ReviewRatingDistribution[] = [
    { stars: 5, count: Math.round(total * 0.75), percentage: 75 },
    { stars: 4, count: Math.round(total * 0.18), percentage: 18 },
    { stars: 3, count: Math.round(total * 0.05), percentage: 5 },
    { stars: 2, count: Math.round(total * 0.01), percentage: 1 },
    { stars: 1, count: Math.round(total * 0.01), percentage: 1 },
  ];

  return {
    productId,
    averageRating: defaultRating,
    totalReviews: total,
    distribution,
    reviews: combinedReviews,
  };
}

export async function fetchProductReviews(productId: string, fallbackRating: number = 4.8, fallbackCount: number = 24): Promise<ProductReviewsSummary> {
  const url = `${API_BASE}/products/${encodeURIComponent(productId)}/reviews/`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data: ProductReviewsSummary = await res.json();
      const local = getLocalReviews(productId);
      if (local.length > 0) {
        data.reviews = [...local, ...data.reviews.filter((r) => !local.some((l) => l.id === r.id))];
        data.totalReviews = data.reviews.length;
      }
      return data;
    }
  } catch (err) {
    console.warn('[TechnikWelt Reviews] Backend offline, returning fallback reviews:', err);
  }

  return createFallbackSummary(productId, fallbackRating, fallbackCount);
}

export async function submitProductReview(
  productId: string,
  payload: SubmitReviewPayload
): Promise<{ success: boolean; review?: Review; error?: string }> {
  if (isDemoAuthMode()) {
    const demoReview: Review = {
      id: `rev_demo_${Date.now()}`,
      productId,
      authorName: payload.author_name.trim(),
      authorEmail: payload.author_email.trim(),
      rating: payload.rating,
      title: payload.title.trim(),
      comment: payload.comment.trim(),
      isVerifiedBuyer: true,
      helpfulCount: 0,
      createdAt: new Date().toISOString(),
    };
    saveLocalReview(demoReview);
    return { success: true, review: demoReview };
  }

  const token = getStoredToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}/products/${encodeURIComponent(productId)}/reviews/`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const errorMsg = data
        ? (typeof data === 'object' ? Object.values(data).flat().join(' ') : String(data))
        : `Fehler beim Speichern der Bewertung (Status: ${res.status})`;
      return { success: false, error: errorMsg };
    }

    const createdReview: Review = {
      id: data.id,
      productId: data.productId || productId,
      authorName: data.authorName || payload.author_name,
      authorEmail: payload.author_email,
      rating: Number(data.rating),
      title: data.title,
      comment: data.comment,
      isVerifiedBuyer: Boolean(data.isVerifiedBuyer),
      helpfulCount: Number(data.helpfulCount || 0),
      createdAt: data.createdAt || new Date().toISOString(),
    };

    saveLocalReview(createdReview);
    return { success: true, review: createdReview };
  } catch {
    const offlineReview: Review = {
      id: `rev_local_${Date.now()}`,
      productId,
      authorName: payload.author_name.trim(),
      authorEmail: payload.author_email.trim(),
      rating: payload.rating,
      title: payload.title.trim(),
      comment: payload.comment.trim(),
      isVerifiedBuyer: false,
      helpfulCount: 0,
      createdAt: new Date().toISOString(),
    };
    saveLocalReview(offlineReview);
    return { success: true, review: offlineReview };
  }
}

export async function voteReviewHelpful(reviewId: string): Promise<{ success: boolean; helpfulCount?: number }> {
  const url = `${API_BASE}/reviews/${encodeURIComponent(reviewId)}/helpful/`;
  try {
    const res = await fetch(url, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      return { success: true, helpfulCount: data.helpfulCount };
    }
  } catch {}
  return { success: true };
}
