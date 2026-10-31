-- =====================================================================
-- Migration: 20261019000000_create_ipo_tracker_schema.sql
-- Description: Complete schema for IPO Tracker India
-- Complies with PostgreSQL / Supabase RLS and explicit indexing
-- =====================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    industry VARCHAR(120),
    website_url VARCHAR(500),
    logo_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. IPO Sources Table (Data Providers & Origin Registry)
CREATE TABLE IF NOT EXISTS ipo_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_name VARCHAR(120) NOT NULL UNIQUE,
    source_type VARCHAR(60) NOT NULL CHECK (source_type IN ('exchange', 'regulatory', 'registrar', 'community_estimate', 'manual')),
    base_url VARCHAR(500),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    configuration JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. IPOs Table (Core Offering Information)
CREATE TABLE IF NOT EXISTS ipos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(20) NOT NULL CHECK (category IN ('Mainboard', 'SME')),
    exchange VARCHAR(30) NOT NULL CHECK (exchange IN ('NSE', 'BSE', 'NSE, BSE', 'BSE SME', 'NSE Emerge')),
    status VARCHAR(30) NOT NULL CHECK (status IN ('upcoming', 'ongoing', 'closed', 'listed', 'postponed', 'withdrawn')),
    announcement_status VARCHAR(40) NOT NULL DEFAULT 'expected' CHECK (announcement_status IN ('confirmed', 'dates_announced', 'expected', 'awaiting_details', 'postponed', 'withdrawn')),
    open_date DATE,
    close_date DATE,
    allotment_date DATE,
    refund_date DATE,
    demat_credit_date DATE,
    listing_date DATE,
    price_band_min NUMERIC(12, 2),
    price_band_max NUMERIC(12, 2),
    issue_price NUMERIC(12, 2),
    lot_size INTEGER,
    issue_size NUMERIC(15, 2), -- In Crores INR
    fresh_issue_size NUMERIC(15, 2), -- In Crores INR
    offer_for_sale_size NUMERIC(15, 2), -- In Crores INR
    retail_quota_percent NUMERIC(5, 2) DEFAULT 35.0,
    qib_quota_percent NUMERIC(5, 2) DEFAULT 50.0,
    nii_quota_percent NUMERIC(5, 2) DEFAULT 15.0,
    registrar_name VARCHAR(255),
    registrar_url VARCHAR(500),
    drhp_url VARCHAR(500),
    rhp_url VARCHAR(500),
    official_source_url VARCHAR(500),
    data_verified_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. IPO Important Dates Table
CREATE TABLE IF NOT EXISTS ipo_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
    event_type VARCHAR(40) NOT NULL CHECK (event_type IN ('open', 'close', 'allotment', 'refund', 'demat_credit', 'listing')),
    event_date DATE NOT NULL,
    confirmation_status VARCHAR(30) NOT NULL DEFAULT 'expected' CHECK (confirmation_status IN ('confirmed', 'expected', 'tentative')),
    source_id UUID REFERENCES ipo_sources(id) ON DELETE SET NULL,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Grey Market Premium (GMP) Snapshots
CREATE TABLE IF NOT EXISTS gmp_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
    gmp_amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    unit VARCHAR(20) NOT NULL DEFAULT 'per share',
    source_id UUID REFERENCES ipo_sources(id) ON DELETE SET NULL,
    source_name VARCHAR(120),
    source_url VARCHAR(500),
    observed_at TIMESTAMPTZ NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verification_status VARCHAR(30) NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('verified', 'unverified', 'rejected', 'superseded')),
    created_by VARCHAR(120) DEFAULT 'system_sync',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Subscription Snapshots Table
CREATE TABLE IF NOT EXISTS subscription_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
    source_id UUID REFERENCES ipo_sources(id) ON DELETE SET NULL,
    retail_multiple NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    nii_multiple NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    qib_multiple NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    employee_multiple NUMERIC(10, 2) DEFAULT 0.00,
    shareholder_multiple NUMERIC(10, 2) DEFAULT 0.00,
    total_multiple NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(20) NOT NULL DEFAULT 'times',
    day_number INTEGER DEFAULT 1,
    observed_at TIMESTAMPTZ NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verification_status VARCHAR(30) NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('verified', 'unverified', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Listing Results Table (Historical Performance)
CREATE TABLE IF NOT EXISTS listing_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE UNIQUE,
    issue_price NUMERIC(12, 2) NOT NULL,
    listing_price NUMERIC(12, 2) NOT NULL,
    listing_date DATE NOT NULL,
    first_day_close NUMERIC(12, 2),
    previous_close NUMERIC(12, 2),
    source_id UUID REFERENCES ipo_sources(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Feed Runs Table (Sync & Job Observability)
CREATE TABLE IF NOT EXISTS feed_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES ipo_sources(id) ON DELETE SET NULL,
    job_type VARCHAR(60) NOT NULL CHECK (job_type IN ('ipo_discovery', 'subscription_sync', 'gmp_sync', 'listing_sync', 'csv_import')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL CHECK (status IN ('running', 'success', 'partial', 'failed')),
    records_fetched INTEGER NOT NULL DEFAULT 0,
    records_accepted INTEGER NOT NULL DEFAULT 0,
    records_rejected INTEGER NOT NULL DEFAULT 0,
    error_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Audit Logs Table (Tamper-Resistant Administrative Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id VARCHAR(120) NOT NULL,
    actor_name VARCHAR(120) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id VARCHAR(120) NOT NULL,
    before_values JSONB,
    after_values JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Admin Roles & Users Table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(30) NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor', 'reviewer')),
    full_name VARCHAR(120),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- PERFORMANCE INDEXES
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_ipos_slug ON ipos(slug);
CREATE INDEX IF NOT EXISTS idx_ipos_status ON ipos(status);
CREATE INDEX IF NOT EXISTS idx_ipos_category ON ipos(category);
CREATE INDEX IF NOT EXISTS idx_ipos_exchange ON ipos(exchange);
CREATE INDEX IF NOT EXISTS idx_ipos_dates ON ipos(open_date, close_date, listing_date);
CREATE INDEX IF NOT EXISTS idx_gmp_snapshots_ipo_observed ON gmp_snapshots(ipo_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sub_snapshots_ipo_observed ON subscription_snapshots(ipo_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_results_ipo ON listing_results(ipo_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_runs_source_started ON feed_runs(source_id, started_at DESC);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmp_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Public Read Policies
CREATE POLICY "Public Read Published IPOs" ON ipos FOR SELECT USING (published_at IS NOT NULL);
CREATE POLICY "Public Read Companies" ON companies FOR SELECT USING (true);
CREATE POLICY "Public Read Dates" ON ipo_dates FOR SELECT USING (true);
CREATE POLICY "Public Read Verified GMP" ON gmp_snapshots FOR SELECT USING (verification_status = 'verified');
CREATE POLICY "Public Read Verified Subscriptions" ON subscription_snapshots FOR SELECT USING (verification_status = 'verified');
CREATE POLICY "Public Read Listing Results" ON listing_results FOR SELECT USING (true);
CREATE POLICY "Public Read Active Sources" ON ipo_sources FOR SELECT USING (enabled = true);

-- Admin Mutation Policies (Authenticated admin users only)
CREATE POLICY "Admin All Companies" ON companies FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin All IPOs" ON ipos FOR ALL TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'editor'));
CREATE POLICY "Admin All GMP" ON gmp_snapshots FOR ALL TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'editor', 'reviewer'));
CREATE POLICY "Admin All Subscriptions" ON subscription_snapshots FOR ALL TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'editor'));
CREATE POLICY "Admin All Feed Runs" ON feed_runs FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin Read Audit Logs" ON audit_logs FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
