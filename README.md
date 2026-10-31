# IPO Tracker India 🇮🇳

A comprehensive, production-grade Indian IPO tracking and intelligence platform built for monitoring Mainboard and SME Initial Public Offerings across the **National Stock Exchange (NSE)** and **Bombay Stock Exchange (BSE)**.

---

## 🌟 Key Features

1. **Market Discovery & Overview**:
   - Database-derived summary metrics: Open IPOs, Upcoming issues, Recently listed, Mainboard vs. SME counts.
   - Live subscription status tracker with category breakdown (QIB 50%, NII 15%, Retail 35%).
   - Active countdown for issues closing today and days remaining.

2. **Grey Market Premium (GMP) Desk**:
   - Live tracking of unofficial dealer circle bids with currency, unit, source name, and observation timestamps.
   - Indicative estimated listing price calculation: `Applicable Issue Price + GMP`.
   - Indicative listing gain percentage calculation: `(GMP / Applicable Issue Price) * 100`.
   - Staleness indicator flagging quotes older than 24 hours.
   - Interactive Recharts area chart displaying historical GMP trends over time.
   - Statutory speculative risk disclaimer.

3. **Past IPOs & Listing Performance**:
   - Searchable and filterable database of historical IPOs.
   - Verified listing gain or loss calculation: `Actual Listing Price − Issue Price`.
   - Verified listing gain percentage: `((Actual Listing Price − Issue Price) / Issue Price) * 100`.
   - Visual listing day performance comparison chart.
   - Sorting by highest gain, largest loss, listing date, and issue size.

4. **Announced & Upcoming Pipeline**:
   - Clear distinction between officially confirmed issue dates and expected issues with draft DRHP filings.
   - Direct access to Draft Red Herring Prospectus (DRHP) and Red Herring Prospectus (RHP) documents.
   - Lot size, price bands, minimum investment amounts, and registrar assignment.

5. **Interactive IPO Calendar**:
   - Dual-mode: Chronological schedule view and interactive monthly grid.
   - Event types: Issue Opens, Issue Closes, Basis of Allotment, Demat Credit, and Exchange Listing.
   - Filters by Mainboard, SME, and event stage.

6. **Full-Featured Administrative Control Desk**:
   - Secure authentication with role-based authorization (`admin`, `editor`, `reviewer`).
   - Complete CRUD operations for IPO offerings, price bands, timetables, and documents.
   - Record listing price results with automated status transition to "Listed".
   - GMP management: Record manual observations, approve or reject quotes, and maintain audit integrity.
   - Subscription management: Record daily bidding multiples by investor category.
   - Bulk CSV data ingestion pipeline: Validates column headers, checks data types, detects duplicates, and previews errors in dry-run mode.
   - Live data feed monitoring: Inspect provider status, retry attempts, records fetched/accepted, and manual sync triggers.
   - Tamper-resistant audit log recording actor identity, action, timestamp, and state diffs.

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: React 19 + TypeScript (Strict Mode) + Vite + Tailwind CSS v4.
- **Design System**: Light financial dashboard constitution, zero-pill metadata discipline, tabular numerals (`tabular-nums font-mono`), and Recharts for interactive visualizations.
- **Backend**: Express REST API server running on port 3000 mounting Vite middleware in development.
- **Database & Migration Engine**:
  - Full PostgreSQL schema in `supabase/migrations/20261019000000_create_ipo_tracker_schema.sql` with Row Level Security (RLS) policies and indexes.
  - Authentic development seed script in `supabase/seed.sql` with real Indian IPOs (Waaree Energies, Bajaj Housing Finance, Premier Energies, Hyundai Motor India, Swiggy, Enviro Infra, Rajputana Biodiesel, Vishal Mega Mart, etc.).
  - Self-contained relational in-memory & local store (`src/lib/store.ts`) ensuring flawless operation across demo, preview, and production environments.
- **Data Ingestion Engine**:
  - Pluggable provider architecture with support for NSE feeds, BSE feeds, SEBI filings, and Registrar feeds.
  - Staleness and rate-limit backoff handling.

---

## 📁 Project Structure

```
├── .env.example                                  # Documented environment variables
├── index.html                                    # Entry point with SEO & Schema.org JSON-LD
├── metadata.json                                 # Applet metadata configuration
├── package.json                                  # Dependencies and run scripts
├── server.ts                                     # Express full-stack API server + Vite middlewares
├── vite.config.ts                                # Vite bundler configuration
├── supabase/
│   ├── migrations/
│   │   └── 20261019000000_create_ipo_tracker_schema.sql # PostgreSQL schema & RLS policies
│   └── seed.sql                                  # Authentic Indian IPO seed data
├── tests/
│   └── calculations.test.ts                      # Unit tests for financial calculations
└── src/
    ├── main.tsx                                  # Client entry point
    ├── App.tsx                                   # Application router & layout orchestration
    ├── index.css                                 # Tailwind v4 theme and font definitions
    ├── types/
    │   └── ipo.ts                                # Domain interfaces (IPO, GMP, Subscriptions, Feeds)
    ├── lib/
    │   ├── calculations.ts                       # Pure mathematical and financial logic
    │   ├── store.ts                              # In-memory relational database & audit engine
    │   └── api.ts                                # Client API communicating with Express / Store
    ├── components/
    │   ├── Header.tsx                            # Top Bar Contract responsive navigation
    │   ├── Footer.tsx                            # Statutory SEBI & GMP risk disclaimers
    │   ├── StatusIndicator.tsx                   # Unboxed metadata status indicator
    │   ├── GMPDisplay.tsx                        # GMP calculator with staleness flags
    │   ├── SubscriptionProgress.tsx              # Multi-category subscription bar
    │   ├── GMPTrendChart.tsx                     # Recharts area chart for GMP trends
    │   ├── ListingGainChart.tsx                  # Recharts bar chart for listing gains
    │   └── LoginModal.tsx                        # Admin authentication dialog with role presets
    └── pages/
        ├── HomePage.tsx                          # Market overview, open issues, top gainers
        ├── OngoingIPOsPage.tsx                   # Active bidding with live subscription multiples
        ├── UpcomingIPOsPage.tsx                  # Forthcoming issues pipeline with announcement status
        ├── ListedIPOsPage.tsx                    # Historical listing performance database
        ├── GMPTrackerPage.tsx                    # Dedicated Grey Market Premium tracker
        ├── IPODetailPage.tsx                     # Comprehensive prospectus and allotment portal
        ├── CalendarPage.tsx                      # Monthly & chronological IPO calendar
        ├── AboutPage.tsx                         # Data methodology and provenance architecture
        ├── DisclaimerPage.tsx                    # Statutory SEBI and GMP speculative risk notice
        ├── TermsPage.tsx                         # Terms of Service
        ├── PrivacyPage.tsx                       # Privacy Policy
        └── admin/
            ├── AdminLayout.tsx                   # Protected administrative sidebar & session
            ├── AdminOverviewPage.tsx             # Data discrepancies, feed health, and audit trail
            ├── AdminIPOsPage.tsx                 # Full IPO CRUD and listing outcome recorder
            ├── AdminGMPPage.tsx                  # Manual quote logger and verification desk
            ├── AdminSubscriptionsPage.tsx        # Category-wise subscription multiple manager
            ├── AdminFeedsPage.tsx                # Data-feed monitoring and manual sync triggers
            ├── AdminImportsPage.tsx              # Bulk CSV import with schema validation
            ├── AdminAuditPage.tsx                # Tamper-resistant audit log with state diffs
            └── AdminSettingsPage.tsx             # Staleness thresholds and credential manager
```

---

## 🚀 Setup & Execution Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Starts the full-stack server on `http://localhost:3000` with Express handling `/api/*` routes and Vite hot-reloading the frontend.

### 3. Run Automated Tests
```bash
npm test
```
Executes the test suite validating financial listing calculations, GMP gain percentages, staleness detection, and CSV schema validation.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 🗄️ Database & Supabase Deployment

To deploy to Supabase or standard PostgreSQL:

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Run `supabase/migrations/20261019000000_create_ipo_tracker_schema.sql` to initialize tables, indexes, and RLS policies.
4. Run `supabase/seed.sql` to seed authentic Indian Mainboard & SME offerings.
5. Add your credentials to `.env`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

---

## 🔐 Administrative Access

Click **Admin Login** in the top navigation bar or navigate to `/admin`.
Default pre-configured credentials:
- **Email**: `milanpatadia8@gmail.com`
- **Role**: `admin`
- Preset buttons are provided in the login modal for quick switching between `admin`, `editor`, and `reviewer` roles.

---

## ⚖️ Statutory Risk Disclosure

*Grey Market Premium (GMP) is strictly unofficial, speculative, and derived from dealer circle observations. It does not represent an exchange-confirmed transaction price, nor does it guarantee a listing gain. Investments in initial public offerings are subject to market risks; read all offer documents (DRHP/RHP) thoroughly before applying.*
