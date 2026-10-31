// =====================================================================
// Domain Types: src/types/ipo.ts
// Comprehensive TypeScript Interfaces for IPO Tracker India
// =====================================================================

export type IPOCategory = 'Mainboard' | 'SME';

export type IPOExchange = 'NSE' | 'BSE' | 'NSE, BSE' | 'BSE SME' | 'NSE Emerge';

export type IPOStatus =
  | 'upcoming'
  | 'ongoing'
  | 'closed'
  | 'listed'
  | 'postponed'
  | 'withdrawn';

export type AnnouncementStatus =
  | 'confirmed'
  | 'dates_announced'
  | 'expected'
  | 'awaiting_details'
  | 'postponed'
  | 'withdrawn';

export type EventType =
  | 'open'
  | 'close'
  | 'allotment'
  | 'refund'
  | 'demat_credit'
  | 'listing';

export type ConfirmationStatus = 'confirmed' | 'expected' | 'tentative';

export type VerificationStatus =
  | 'verified'
  | 'unverified'
  | 'rejected'
  | 'superseded';

export type SourceType =
  | 'exchange'
  | 'regulatory'
  | 'registrar'
  | 'community_estimate'
  | 'manual';

export type AdminRole = 'admin' | 'editor' | 'reviewer';

export interface Company {
  id: string;
  name: string;
  slug: string;
  description?: string;
  industry?: string;
  website_url?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface IPOSource {
  id: string;
  provider_name: string;
  source_type: SourceType;
  base_url?: string;
  enabled: boolean;
  configuration?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface IPODateEvent {
  id: string;
  ipo_id: string;
  event_type: EventType;
  event_date: string; // YYYY-MM-DD
  confirmation_status: ConfirmationStatus;
  source_id?: string;
  observed_at: string;
  created_at: string;
}

export interface GMPSnapshot {
  id: string;
  ipo_id: string;
  gmp_amount: number;
  currency: string;
  unit: string;
  kostak_rate?: number;
  subject_to_sauda_rate?: number;
  fire_rating?: number;
  source_id?: string;
  source_name: string;
  source_url?: string;
  observed_at: string;
  ingested_at: string;
  verification_status: VerificationStatus;
  created_by?: string;
  notes?: string;
  created_at: string;
}

export interface SubscriptionSnapshot {
  id: string;
  ipo_id: string;
  source_id?: string;
  retail_multiple: number;
  nii_multiple: number;
  qib_multiple: number;
  employee_multiple?: number;
  shareholder_multiple?: number;
  total_multiple: number;
  unit: string;
  day_number?: number;
  observed_at: string;
  ingested_at: string;
  verification_status: 'verified' | 'unverified' | 'rejected';
  created_at: string;
}

export interface ListingResult {
  id: string;
  ipo_id: string;
  issue_price: number;
  listing_price: number;
  listing_date: string; // YYYY-MM-DD
  first_day_close?: number;
  previous_close?: number;
  source_id?: string;
  verified_at: string;
  created_at: string;
  updated_at: string;
}

export interface IPO {
  id: string;
  company_id: string;
  company?: Company;
  slug: string;
  category: IPOCategory;
  exchange: IPOExchange;
  status: IPOStatus;
  announcement_status: AnnouncementStatus;
  open_date?: string; // YYYY-MM-DD
  close_date?: string; // YYYY-MM-DD
  allotment_date?: string;
  refund_date?: string;
  demat_credit_date?: string;
  listing_date?: string;
  price_band_min?: number;
  price_band_max?: number;
  issue_price?: number;
  lot_size?: number;
  issue_size?: number; // In Crores INR
  fresh_issue_size?: number;
  offer_for_sale_size?: number;
  retail_quota_percent?: number;
  qib_quota_percent?: number;
  nii_quota_percent?: number;
  registrar_name?: string;
  registrar_url?: string;
  drhp_url?: string;
  rhp_url?: string;
  official_source_url?: string;
  data_verified_at?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;

  // Joined dynamic analytics
  latest_gmp?: GMPSnapshot;
  previous_gmp?: GMPSnapshot;
  gmp_history?: GMPSnapshot[];
  latest_subscription?: SubscriptionSnapshot;
  subscription_history?: SubscriptionSnapshot[];
  listing_result?: ListingResult;
  important_dates?: IPODateEvent[];
}

export interface FeedRun {
  id: string;
  source_id?: string;
  provider_name?: string;
  job_type: 'ipo_discovery' | 'subscription_sync' | 'gmp_sync' | 'listing_sync' | 'csv_import';
  started_at: string;
  finished_at?: string;
  status: 'running' | 'success' | 'partial' | 'failed';
  records_fetched: number;
  records_accepted: number;
  records_rejected: number;
  error_summary?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_values?: Record<string, unknown> | null;
  after_values?: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface MarketSummary {
  total_ipos: number;
  open_ipos_count: number;
  upcoming_ipos_count: number;
  recently_listed_count: number;
  mainboard_count: number;
  sme_count: number;
  last_sync_timestamp: string;
  top_gainers: Array<{
    id: string;
    company_name: string;
    slug: string;
    category: IPOCategory;
    issue_price: number;
    listing_price: number;
    gain_percentage: number;
    listing_date: string;
  }>;
  top_gmp_ipos: Array<{
    id: string;
    company_name: string;
    slug: string;
    category: IPOCategory;
    gmp_amount: number;
    indicative_gain_pct?: number;
    observed_at: string;
  }>;
}
