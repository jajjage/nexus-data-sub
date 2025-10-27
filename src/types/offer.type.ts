// =================================================================
// Offer-facing Interfaces (DTOs)
// =================================================================

export interface Offer {
  id: string;
  code: string | null;
  title: string;
  description: string | null;
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'expired' | 'cancelled';
  discount_type: 'percentage' | 'fixed_amount' | 'fixed_price' | 'buy_x_get_y';
  discount_value: number;
  per_user_limit: number | null;
  total_usage_limit: number | null;
  usage_count: number;
  apply_to: 'operator_product' | 'supplier_product' | 'all';
  allow_all: boolean;
  eligibility_logic: 'all' | 'any';
  starts_at: Date | null;
  ends_at: Date | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface OfferProduct {
  id: string;
  offer_id: string;
  operator_product_id: string | null;
  supplier_product_mapping_id: string | null;
  price_override: number | null;
  max_quantity_per_purchase: number | null;
  created_at: Date;
}

export interface OfferAllowedUser {
  id: string;
  offer_id: string;
  user_id: string;
  created_at: Date;
}

export interface OfferAllowedRole {
  id: string;
  offer_id: string;
  role_name: string;
}

export interface OfferRedemption {
  id: string;
  offer_id: string;
  user_id: string;
  operator_product_id: string | null;
  supplier_product_mapping_id: string | null;
  supplier_id: string | null;
  order_id: string | null;
  price_paid: number;
  discount_amount: number;
  created_at: Date;
}

export interface OfferEligibilityRule {
  id: string;
  offer_id: string;
  rule_key: string;
  rule_type: string;
  params: Record<string, any>;
  description: string | null;
  created_at: Date;
}

export interface OfferSegmentMember {
  offer_id: string;
  user_id: string;
  created_at: Date;
}
