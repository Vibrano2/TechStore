export interface ProductVariant {
  id: string;
  name: string;
  price?: number;
  stock: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  shortDescription: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  rating: number;
  reviewCount: number;
  stock: number;
  images: string[];
  badges?: string[];
  specifications: Record<string, string>;
  warranty: string;
  delivery: string;
  variants?: ProductVariant[];
  featured?: boolean;
  isNew?: boolean;
  discountPercentage?: number;
  eMobilityCompliance?: {
    roadLegal: boolean;
    abeAvailable: boolean;
    insuranceRequired: boolean;
    registrationRequired: boolean;
    intendedUse: string;
  };
}

export interface CartItem {
  product: Product;
  quantity: number;
  variantId?: string;
}

export interface Review {
  id: string;
  productId: string;
  authorName: string;
  authorEmail?: string;
  rating: number;
  title: string;
  comment: string;
  isVerifiedBuyer: boolean;
  helpfulCount: number;
  createdAt: string;
}

export interface ReviewRatingDistribution {
  stars: number;
  count: number;
  percentage: number;
}

export interface ProductReviewsSummary {
  productId: string;
  averageRating: number;
  totalReviews: number;
  distribution: ReviewRatingDistribution[];
  reviews: Review[];
}

export type ReturnReason =
  | 'not_liked'
  | 'not_as_described'
  | 'wrong_item'
  | 'defective_on_arrival'
  | 'better_price'
  | 'ordered_by_mistake'
  | 'other';

export type ReturnStatus =
  | 'requested'
  | 'label_created'
  | 'in_transit'
  | 'received'
  | 'inspected'
  | 'refunded'
  | 'rejected';

export type RefundMethod = 'original_payment' | 'store_credit';

export interface ReturnItemData {
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface OrderReturn {
  id: string;
  order_id: string;
  customer_email: string;
  customer_name: string;
  reason: ReturnReason;
  reason_display: string;
  customer_notes?: string;
  refund_method: RefundMethod;
  refund_method_display: string;
  refund_amount: number;
  items_data: ReturnItemData[];
  status: ReturnStatus;
  status_display: string;
  return_tracking_number: string;
  carrier: string;
  created_at: string;
  updated_at: string;
}

export type DefectCategory =
  | 'technical_fault'
  | 'display_fault'
  | 'battery_power'
  | 'transport_damage'
  | 'connectivity'
  | 'other';

export type RemedyPreference = 'repair' | 'replacement';

export type WarrantyStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'repairing'
  | 'replaced'
  | 'rejected'
  | 'completed';

export interface WarrantyClaim {
  id: string | number;
  claim_number: string;
  customer_email: string;
  customer_name: string;
  order_id?: string;
  product: string;
  product_name: string;
  serial_number?: string;
  defect_category: DefectCategory;
  defect_category_display: string;
  remedy_preference: RemedyPreference;
  remedy_preference_display: string;
  description: string;
  status: WarrantyStatus;
  status_display: string;
  created_at: string;
  updated_at: string;
}

