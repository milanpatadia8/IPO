// =====================================================================
// In-Memory & Persistent Application Data Store: src/lib/store.ts
// Compliant with PostgreSQL schema, RLS simulation, and audit logging
// =====================================================================

import {
  IPO,
  Company,
  GMPSnapshot,
  SubscriptionSnapshot,
  ListingResult,
  IPOSource,
  FeedRun,
  AuditLog,
  AdminUser,
  MarketSummary,
  IPOCategory,
  IPOExchange,
  IPOStatus,
  AnnouncementStatus,
} from '../types/ipo';
import {
  calculateListingGainPercentage,
  calculateIndicativeGainPercentage,
  getValidDocUrl,
  SEBI_PUBLIC_ISSUES_URL,
} from './calculations';

// Initial Companies
const INITIAL_COMPANIES: Company[] = [
  {
    id: '33333333-3333-3333-3333-333333330001',
    name: 'Waaree Energies Limited',
    slug: 'waaree-energies',
    description: 'India largest manufacturer of solar PV modules with aggregate installed capacity of 12 GW.',
    industry: 'Solar & Renewable Energy',
    website_url: 'https://www.waaree.com',
    logo_url: '',
    created_at: '2024-10-01T10:00:00Z',
    updated_at: '2024-10-01T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330002',
    name: 'Bajaj Housing Finance Limited',
    slug: 'bajaj-housing-finance',
    description: 'Non-deposit-taking Housing Finance Company (HFC) registered with NHB and RBI.',
    industry: 'Financial Services / NBFC',
    website_url: 'https://www.bajajhousingfinance.in',
    logo_url: '',
    created_at: '2024-09-01T10:00:00Z',
    updated_at: '2024-09-01T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330003',
    name: 'Premier Energies Limited',
    slug: 'premier-energies',
    description: 'Integrated solar cell and module manufacturing company in India with 25+ years track record.',
    industry: 'Solar Technology',
    website_url: 'https://www.premierenergies.com',
    logo_url: '',
    created_at: '2024-08-15T10:00:00Z',
    updated_at: '2024-08-15T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330004',
    name: 'Hyundai Motor India Limited',
    slug: 'hyundai-motor-india',
    description: 'Second largest passenger vehicle manufacturer in India with iconic models like Creta & Venue.',
    industry: 'Automobile Manufacturing',
    website_url: 'https://www.hyundai.com/in',
    logo_url: '',
    created_at: '2024-10-01T10:00:00Z',
    updated_at: '2024-10-01T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330005',
    name: 'Swiggy Limited',
    slug: 'swiggy',
    description: 'Pioneer consumer-tech on-demand platform offering food delivery and quick commerce (Instamart).',
    industry: 'Consumer Tech / Logistics',
    website_url: 'https://www.swiggy.com',
    logo_url: '',
    created_at: '2024-10-20T10:00:00Z',
    updated_at: '2024-10-20T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330006',
    name: 'NTPC Green Energy Limited',
    slug: 'ntpc-green-energy',
    description: 'Wholly owned subsidiary of NTPC Limited driving renewable energy portfolio development.',
    industry: 'Renewable Power Generation',
    website_url: 'https://www.ngel.in',
    logo_url: '',
    created_at: '2024-11-01T10:00:00Z',
    updated_at: '2024-11-01T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330007',
    name: 'Enviro Infra Engineers Limited',
    slug: 'enviro-infra-engineers',
    description: 'Designs and builds Sewage Treatment Plants (STPs) and Water Supply Projects (WSPs) for municipal corporations.',
    industry: 'Infrastructure & Environmental Utilities',
    website_url: 'https://www.eiel.in',
    logo_url: '',
    created_at: '2024-11-15T10:00:00Z',
    updated_at: '2024-11-15T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330008',
    name: 'Rajputana Biodiesel Limited',
    slug: 'rajputana-biodiesel',
    description: 'Manufacturer of biofuels, crude glycerine, and distilled fatty acids operating in Phulera, Rajasthan.',
    industry: 'Biofuels & Green Chemicals',
    website_url: 'https://www.rajputanabiodiesel.com',
    logo_url: '',
    created_at: '2024-11-15T10:00:00Z',
    updated_at: '2024-11-15T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330009',
    name: 'Suraksha Diagnostic Limited',
    slug: 'suraksha-diagnostic',
    description: 'Leading medical diagnostics network with extensive pathology and radiology center network across Eastern India.',
    industry: 'Healthcare & Medical Diagnostics',
    website_url: 'https://www.surakshanet.com',
    logo_url: '',
    created_at: '2024-11-10T10:00:00Z',
    updated_at: '2024-11-10T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330010',
    name: 'Vishal Mega Mart Limited',
    slug: 'vishal-mega-mart',
    description: 'Leading value-fashion and grocery retail chain with 645+ hypermarket format stores across 414 Indian cities.',
    industry: 'Apparel & Grocery Retail',
    website_url: 'https://www.vishalmegamart.com',
    logo_url: '',
    created_at: '2024-11-12T10:00:00Z',
    updated_at: '2024-11-12T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330011',
    name: 'Hexaware Technologies Limited',
    slug: 'hexaware-technologies',
    description: 'Global IT automation and next-generation cloud services powerhouse returning to public markets.',
    industry: 'Enterprise Software & IT Services',
    website_url: 'https://www.hexaware.com',
    logo_url: '',
    created_at: '2024-11-01T10:00:00Z',
    updated_at: '2024-11-01T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330012',
    name: 'Ganesh Green Bharat Limited',
    slug: 'ganesh-green-bharat',
    description: 'Premier solar EPC player supplying solar submersible pump systems and decentralized electrical infrastructure.',
    industry: 'SME CleanTech & Solar EPC',
    website_url: 'https://www.ganeshgreen.com',
    logo_url: '',
    created_at: '2024-07-01T10:00:00Z',
    updated_at: '2024-07-01T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330013',
    name: 'Ventive Hospitality Limited',
    slug: 'ventive-hospitality',
    description: 'Luxury hospitality owner-developer jointly held by Panchshil and Blackstone, operating marquee assets like JW Marriott, Ritz-Carlton Pune, and Conrad Pune.',
    industry: 'Luxury Hospitality & Resorts',
    website_url: 'https://www.ventivehospitality.com',
    logo_url: '',
    created_at: '2024-11-20T10:00:00Z',
    updated_at: '2024-11-20T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330014',
    name: 'Senores Pharmaceuticals Limited',
    slug: 'senores-pharmaceuticals',
    description: 'Research-driven specialty pharmaceutical company commercializing complex ANDAs, sterile injectables, and generic formulations in the United States and Canada.',
    industry: 'Pharmaceuticals & Life Sciences',
    website_url: 'https://www.senorespharma.com',
    logo_url: '',
    created_at: '2024-11-20T10:00:00Z',
    updated_at: '2024-11-20T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330015',
    name: 'Carraro India Limited',
    slug: 'carraro-india',
    description: 'Indian division of Carraro Group, manufacturing precision transmission systems, driveline axles, and gear sets for agricultural tractors and heavy construction machinery.',
    industry: 'Automotive & Heavy Equipment Components',
    website_url: 'https://www.carraro.com/en/carraro-india',
    logo_url: '',
    created_at: '2024-11-22T10:00:00Z',
    updated_at: '2024-11-22T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330016',
    name: 'Unimech Aerospace and Manufacturing Limited',
    slug: 'unimech-aerospace',
    description: 'High-precision engineering and aerospace tooling enterprise supplying complex mechanical assemblies and ground support tooling to global aerospace OEMs.',
    industry: 'Aerospace & Defence Manufacturing',
    website_url: 'https://www.unimechaerospace.com',
    logo_url: '',
    created_at: '2024-11-22T10:00:00Z',
    updated_at: '2024-11-22T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330017',
    name: 'Indo Farm Equipment Limited',
    slug: 'indo-farm-equipment',
    description: 'Renowned manufacturer of world-class agricultural tractors, mobile pick-and-carry cranes, harvester combines, and heavy diesel generator sets.',
    industry: 'Agricultural & Farm Mechanization',
    website_url: 'https://www.indofarm.in',
    logo_url: '',
    created_at: '2024-11-25T10:00:00Z',
    updated_at: '2024-11-25T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330018',
    name: 'Mamata Machinery Limited',
    slug: 'mamata-machinery',
    description: 'Pioneering global packaging machinery manufacturer offering high-speed automated pouch-making, bag-making, and robotic packaging lines installed in 85+ countries.',
    industry: 'Industrial Packaging Automation',
    website_url: 'https://www.mamata.com',
    logo_url: '',
    created_at: '2024-11-25T10:00:00Z',
    updated_at: '2024-11-25T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330019',
    name: 'DAM Capital Advisors Limited',
    slug: 'dam-capital-advisors',
    description: 'Prominent domestic institutional equities, investment banking, and capital advisory platform spearheading benchmark marquee transactions.',
    industry: 'Investment Banking & Capital Markets',
    website_url: 'https://www.damcapital.in',
    logo_url: '',
    created_at: '2024-11-26T10:00:00Z',
    updated_at: '2024-11-26T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330020',
    name: 'Jio Platforms Limited',
    slug: 'jio-platforms',
    description: 'Digital and telecom flagship subsidiary of Reliance Industries Limited powering India largest digital ecosystem (Jio Infocomm, 5G, cloud services, and digital media) with 490+ million active subscribers.',
    industry: 'Telecom, 5G & Digital Platforms',
    website_url: 'https://www.jio.com',
    logo_url: '',
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-22T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330021',
    name: 'Paras Healthcare Limited',
    slug: 'paras-healthcare',
    description: 'Leading healthcare provider operating network of super-specialty hospitals delivering oncology, cardiac, neurosciences, and tertiary care across North and Eastern India.',
    industry: 'Healthcare & Hospital Chains',
    website_url: 'https://www.parashospitals.com',
    logo_url: '',
    created_at: '2026-10-05T10:00:00Z',
    updated_at: '2026-10-22T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330022',
    name: 'Acme India Industries Limited',
    slug: 'acme-india-industries',
    description: 'Industrial engineering powerhouse manufacturing heavy process machinery, specialized fabrication, and automated manufacturing systems.',
    industry: 'Industrial Machinery & Equipment',
    website_url: 'https://www.acmeindia.com',
    logo_url: '',
    created_at: '2026-10-05T10:00:00Z',
    updated_at: '2026-10-22T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330023',
    name: 'HD Fire Protect Limited',
    slug: 'hd-fire-protect',
    description: 'Premier manufacturer and exporter of heavy-duty fire protection equipment, automatic foam deluge systems, and industrial safety valves exported to 75+ countries.',
    industry: 'Fire Protection & Safety Equipment',
    website_url: 'https://www.hdfire.com',
    logo_url: '',
    created_at: '2026-09-15T10:00:00Z',
    updated_at: '2026-10-20T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330024',
    name: 'Bonfiglioli Transmissions Limited',
    slug: 'bonfiglioli-transmissions',
    description: 'Leading global provider of gearmotors, drive systems, and planetary gearboxes serving industrial and mobile machinery applications across India and worldwide.',
    industry: 'Industrial Gearmotors & Power Transmission',
    website_url: 'https://www.bonfiglioli.com/india/en',
    logo_url: '',
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-22T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330025',
    name: 'Tonbo Imaging Limited',
    slug: 'tonbo-imaging',
    description: 'Pioneering deep-tech electro-optics and defense technology company designing military-grade AI vision, thermal imaging, and fire control systems.',
    industry: 'Defense Tech & Electro-Optics',
    website_url: 'https://www.tonboimaging.com',
    logo_url: '',
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-22T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330026',
    name: 'SFC Environmental Technologies Limited',
    slug: 'sfc-environmental',
    description: 'Cutting-edge environmental and wastewater engineering enterprise specializing in advanced biological wastewater treatment and nutrient recovery plants.',
    industry: 'Water & Wastewater CleanTech',
    website_url: 'https://www.sfctech.com',
    logo_url: '',
    created_at: '2026-10-10T10:00:00Z',
    updated_at: '2026-10-22T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330027',
    name: 'BLS Polymers Limited',
    slug: 'bls-polymers',
    description: 'Specialty chemical and polymer manufacturing company producing high-performance polymer masterbatches and custom engineering plastics compounds.',
    industry: 'Specialty Polymers & Masterbatches',
    website_url: 'https://www.blspolymers.com',
    logo_url: '',
    created_at: '2026-10-10T10:00:00Z',
    updated_at: '2026-10-22T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330028',
    name: 'Danish Power Limited',
    slug: 'danish-power',
    description: 'Premier manufacturer of power & distribution transformers, inverter duty transformers for solar plants, and substations powering India green grid expansion.',
    industry: 'Power Transformers & Green Grid Equipment',
    website_url: 'https://www.danish.co.in',
    logo_url: '',
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-22T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330029',
    name: 'United Heat Transfer Limited',
    slug: 'united-heat-transfer',
    description: 'Precision engineering manufacturer of shell and tube heat exchangers, moisture separators, and pressure vessels for marine and oil & gas sectors.',
    industry: 'Heat Exchangers & Heavy Engineering',
    website_url: 'https://www.uhtl.in',
    logo_url: '',
    created_at: '2026-10-05T10:00:00Z',
    updated_at: '2026-10-22T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333330030',
    name: 'Deepak Builders & Engineers Limited',
    slug: 'deepak-builders',
    description: 'Integrated engineering and infrastructure construction company executing hospital complexes, administrative buildings, flyovers, and railway projects.',
    industry: 'Infrastructure & EPC Construction',
    website_url: 'https://www.deepakbuilders.in',
    logo_url: '',
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-22T10:00:00Z',
  },
];

// Initial Data Sources
const INITIAL_SOURCES: IPOSource[] = [
  {
    id: '11111111-1111-1111-1111-111111110001',
    provider_name: 'NSE Official Ingestion Feed',
    source_type: 'exchange',
    base_url: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
    enabled: true,
    configuration: { rate_limit: '60/min', priority: 1, automated: true },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '11111111-1111-1111-1111-111111110002',
    provider_name: 'BSE Listing & Public Offerings',
    source_type: 'exchange',
    base_url: 'https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx',
    enabled: true,
    configuration: { rate_limit: '60/min', priority: 1, automated: true },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '11111111-1111-1111-1111-111111110003',
    provider_name: 'SEBI Public Issues Repository',
    source_type: 'regulatory',
    base_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    enabled: true,
    configuration: { priority: 2, legal_documents: true },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '11111111-1111-1111-1111-111111110004',
    provider_name: 'InvestorGain Market Estimates',
    source_type: 'community_estimate',
    base_url: 'https://www.investorgain.com/report/live-ipo-gmp/331/',
    enabled: true,
    configuration: { disclaimer: 'Unofficial grey market quotes', speculative: true },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '11111111-1111-1111-1111-111111110005',
    provider_name: 'IPOWatch Market Research',
    source_type: 'community_estimate',
    base_url: 'https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/',
    enabled: true,
    configuration: { disclaimer: 'Dealer circle observations', speculative: true },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '11111111-1111-1111-1111-111111110006',
    provider_name: 'Registrar Direct Feed (Link Intime & KFin)',
    source_type: 'registrar',
    base_url: 'https://linkintime.co.in',
    enabled: true,
    configuration: { priority: 1, allotment_status: true },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// Helper to compute date string relative to today
const getRelativeDate = (daysOffset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
};

// Initial IPOs
const INITIAL_IPOS: IPO[] = [
  // 1. Waaree Energies (Listed)
  {
    id: '44444444-4444-4444-4444-444444440001',
    company_id: '33333333-3333-3333-3333-333333330001',
    slug: 'waaree-energies-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'listed',
    announcement_status: 'confirmed',
    open_date: '2024-10-21',
    close_date: '2024-10-23',
    allotment_date: '2024-10-24',
    refund_date: '2024-10-25',
    demat_credit_date: '2024-10-25',
    listing_date: '2024-10-28',
    price_band_min: 1427.0,
    price_band_max: 1503.0,
    issue_price: 1503.0,
    lot_size: 9,
    issue_size: 4321.44,
    fresh_issue_size: 3600.0,
    offer_for_sale_size: 721.44,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'Link Intime India Private Limited',
    registrar_url: 'https://linkintime.co.in/initial_offerings/public-issues.html',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.nseindia.com/get-quotes/equity?symbol=WAAREEENER',
    data_verified_at: '2024-10-28T10:00:00Z',
    published_at: '2024-10-05T08:00:00Z',
    created_at: '2024-10-01T00:00:00Z',
    updated_at: '2024-10-28T16:00:00Z',
  },
  // 2. Bajaj Housing Finance (Listed)
  {
    id: '44444444-4444-4444-4444-444444440002',
    company_id: '33333333-3333-3333-3333-333333330002',
    slug: 'bajaj-housing-finance-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'listed',
    announcement_status: 'confirmed',
    open_date: '2024-09-09',
    close_date: '2024-09-11',
    allotment_date: '2024-09-12',
    refund_date: '2024-09-13',
    demat_credit_date: '2024-09-13',
    listing_date: '2024-09-16',
    price_band_min: 66.0,
    price_band_max: 70.0,
    issue_price: 70.0,
    lot_size: 214,
    issue_size: 6560.0,
    fresh_issue_size: 3560.0,
    offer_for_sale_size: 3000.0,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'KFin Technologies Limited',
    registrar_url: 'https://kosmic.kfintech.com/ipostatus/',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.nseindia.com/get-quotes/equity?symbol=BAJAJHFL',
    data_verified_at: '2024-09-16T10:00:00Z',
    published_at: '2024-09-01T08:00:00Z',
    created_at: '2024-09-01T00:00:00Z',
    updated_at: '2024-09-16T16:00:00Z',
  },
  // 3. Premier Energies (Listed)
  {
    id: '44444444-4444-4444-4444-444444440003',
    company_id: '33333333-3333-3333-3333-333333330003',
    slug: 'premier-energies-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'listed',
    announcement_status: 'confirmed',
    open_date: '2024-08-27',
    close_date: '2024-08-29',
    allotment_date: '2024-08-30',
    refund_date: '2024-09-02',
    demat_credit_date: '2024-09-02',
    listing_date: '2024-09-03',
    price_band_min: 427.0,
    price_band_max: 450.0,
    issue_price: 450.0,
    lot_size: 33,
    issue_size: 2830.4,
    fresh_issue_size: 1291.4,
    offer_for_sale_size: 1539.0,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'KFin Technologies Limited',
    registrar_url: 'https://kosmic.kfintech.com/ipostatus/',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.nseindia.com/get-quotes/equity?symbol=PREMIERENE',
    data_verified_at: '2024-09-03T10:00:00Z',
    published_at: '2024-08-20T08:00:00Z',
    created_at: '2024-08-20T00:00:00Z',
    updated_at: '2024-09-03T16:00:00Z',
  },
  // 4. Hyundai Motor India (Listed)
  {
    id: '44444444-4444-4444-4444-444444440004',
    company_id: '33333333-3333-3333-3333-333333330004',
    slug: 'hyundai-motor-india-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'listed',
    announcement_status: 'confirmed',
    open_date: '2024-10-15',
    close_date: '2024-10-17',
    allotment_date: '2024-10-18',
    refund_date: '2024-10-21',
    demat_credit_date: '2024-10-21',
    listing_date: '2024-10-22',
    price_band_min: 1865.0,
    price_band_max: 1960.0,
    issue_price: 1960.0,
    lot_size: 7,
    issue_size: 27870.16,
    fresh_issue_size: 0.0,
    offer_for_sale_size: 27870.16,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'KFin Technologies Limited',
    registrar_url: 'https://kosmic.kfintech.com/ipostatus/',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.nseindia.com/get-quotes/equity?symbol=HYUNDAI',
    data_verified_at: '2024-10-22T10:00:00Z',
    published_at: '2024-10-01T08:00:00Z',
    created_at: '2024-10-01T00:00:00Z',
    updated_at: '2024-10-22T16:00:00Z',
  },
  // 5. Swiggy Limited (Listed)
  {
    id: '44444444-4444-4444-4444-444444440005',
    company_id: '33333333-3333-3333-3333-333333330005',
    slug: 'swiggy-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'listed',
    announcement_status: 'confirmed',
    open_date: '2024-11-06',
    close_date: '2024-11-08',
    allotment_date: '2024-11-11',
    refund_date: '2024-11-12',
    demat_credit_date: '2024-11-12',
    listing_date: '2024-11-13',
    price_band_min: 371.0,
    price_band_max: 390.0,
    issue_price: 390.0,
    lot_size: 38,
    issue_size: 11327.43,
    fresh_issue_size: 4499.0,
    offer_for_sale_size: 6828.43,
    retail_quota_percent: 10.0,
    qib_quota_percent: 75.0,
    nii_quota_percent: 15.0,
    registrar_name: 'Link Intime India Private Limited',
    registrar_url: 'https://linkintime.co.in/initial_offerings/public-issues.html',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.nseindia.com/get-quotes/equity?symbol=SWIGGY',
    data_verified_at: '2024-11-13T10:00:00Z',
    published_at: '2024-10-25T08:00:00Z',
    created_at: '2024-10-25T00:00:00Z',
    updated_at: '2024-11-13T16:00:00Z',
  },
  // 6. NTPC Green Energy (Listed)
  {
    id: '44444444-4444-4444-4444-444444440012',
    company_id: '33333333-3333-3333-3333-333333330006',
    slug: 'ntpc-green-energy-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'listed',
    announcement_status: 'confirmed',
    open_date: '2024-11-19',
    close_date: '2024-11-22',
    allotment_date: '2024-11-25',
    refund_date: '2024-11-26',
    demat_credit_date: '2024-11-26',
    listing_date: '2024-11-27',
    price_band_min: 102.0,
    price_band_max: 108.0,
    issue_price: 108.0,
    lot_size: 138,
    issue_size: 10000.0,
    fresh_issue_size: 10000.0,
    offer_for_sale_size: 0.0,
    retail_quota_percent: 10.0,
    qib_quota_percent: 75.0,
    nii_quota_percent: 15.0,
    registrar_name: 'KFin Technologies Limited',
    registrar_url: 'https://kosmic.kfintech.com/ipostatus/',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.nseindia.com/get-quotes/equity?symbol=NTPCGREEN',
    data_verified_at: '2024-11-27T10:00:00Z',
    published_at: '2024-11-13T08:00:00Z',
    created_at: '2024-11-13T00:00:00Z',
    updated_at: '2024-11-27T16:00:00Z',
  },
  // 7. Ganesh Green Bharat (SME Listed)
  {
    id: '44444444-4444-4444-4444-444444440006',
    company_id: '33333333-3333-3333-3333-333333330012',
    slug: 'ganesh-green-bharat-ipo',
    category: 'SME',
    exchange: 'NSE Emerge',
    status: 'listed',
    announcement_status: 'confirmed',
    open_date: '2024-07-05',
    close_date: '2024-07-09',
    allotment_date: '2024-07-10',
    refund_date: '2024-07-11',
    demat_credit_date: '2024-07-11',
    listing_date: '2024-07-12',
    price_band_min: 181.0,
    price_band_max: 190.0,
    issue_price: 190.0,
    lot_size: 600,
    issue_size: 125.23,
    fresh_issue_size: 125.23,
    offer_for_sale_size: 0.0,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'KFin Technologies Limited',
    registrar_url: 'https://kosmic.kfintech.com/ipostatus/',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.nseindia.com/get-quotes/equity?symbol=GGBL',
    data_verified_at: '2024-07-12T10:00:00Z',
    published_at: '2024-06-25T08:00:00Z',
    created_at: '2024-06-25T00:00:00Z',
    updated_at: '2024-07-12T16:00:00Z',
  },
  // 7. HD Fire Protect (Listed October 2026)
  {
    id: '44444444-4444-4444-4444-444444440023',
    company_id: '33333333-3333-3333-3333-333333330023',
    slug: 'hd-fire-protect-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'listed',
    announcement_status: 'confirmed',
    open_date: '2026-10-12',
    close_date: '2026-10-14',
    allotment_date: '2026-10-15',
    refund_date: '2026-10-16',
    demat_credit_date: '2026-10-19',
    listing_date: '2026-10-20',
    price_band_min: 258.0,
    price_band_max: 271.0,
    issue_price: 271.0,
    lot_size: 55,
    issue_size: 380.0,
    fresh_issue_size: 300.0,
    offer_for_sale_size: 80.0,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'Link Intime India Private Limited',
    registrar_url: 'https://linkintime.co.in/initial_offerings/public-issues.html',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx',
    data_verified_at: '2026-10-20T10:00:00Z',
    published_at: '2026-10-01T08:00:00Z',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-20T16:00:00Z',
  },
  // 8. Jio Platforms Limited (Reliance Jio IPO - LIVE NOW)
  {
    id: '44444444-4444-4444-4444-444444440020',
    company_id: '33333333-3333-3333-3333-333333330020',
    slug: 'jio-platforms-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'ongoing',
    announcement_status: 'confirmed',
    open_date: '2026-10-21',
    close_date: '2026-10-23',
    allotment_date: '2026-10-24',
    refund_date: '2026-10-27',
    demat_credit_date: '2026-10-27',
    listing_date: '2026-10-28',
    price_band_min: 1065.0,
    price_band_max: 1119.0,
    issue_price: undefined,
    lot_size: 12,
    issue_size: 30213.0,
    fresh_issue_size: 30213.0,
    offer_for_sale_size: 0.0,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'KFin Technologies Limited',
    registrar_url: 'https://kosmic.kfintech.com/ipostatus/',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
    data_verified_at: new Date().toISOString(),
    published_at: '2026-10-10T08:00:00Z',
    created_at: '2026-10-10T00:00:00Z',
    updated_at: new Date().toISOString(),
  },
  // 9. Paras Healthcare Limited (Ongoing Mainboard - LIVE NOW)
  {
    id: '44444444-4444-4444-4444-444444440021',
    company_id: '33333333-3333-3333-3333-333333330021',
    slug: 'paras-healthcare-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'ongoing',
    announcement_status: 'confirmed',
    open_date: '2026-10-21',
    close_date: '2026-10-23',
    allotment_date: '2026-10-24',
    refund_date: '2026-10-27',
    demat_credit_date: '2026-10-27',
    listing_date: '2026-10-28',
    price_band_min: 660.0,
    price_band_max: 693.0,
    issue_price: undefined,
    lot_size: 21,
    issue_size: 850.0,
    fresh_issue_size: 500.0,
    offer_for_sale_size: 350.0,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'Link Intime India Private Limited',
    registrar_url: 'https://linkintime.co.in/initial_offerings/public-issues.html',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx',
    data_verified_at: new Date().toISOString(),
    published_at: '2026-10-12T08:00:00Z',
    created_at: '2026-10-12T00:00:00Z',
    updated_at: new Date().toISOString(),
  },
  // 10. Acme India Industries Limited (Ongoing Mainboard - LIVE NOW)
  {
    id: '44444444-4444-4444-4444-444444440022',
    company_id: '33333333-3333-3333-3333-333333330022',
    slug: 'acme-india-industries-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'ongoing',
    announcement_status: 'confirmed',
    open_date: '2026-10-21',
    close_date: '2026-10-23',
    allotment_date: '2026-10-24',
    refund_date: '2026-10-27',
    demat_credit_date: '2026-10-27',
    listing_date: '2026-10-28',
    price_band_min: 186.0,
    price_band_max: 196.0,
    issue_price: undefined,
    lot_size: 76,
    issue_size: 122.0,
    fresh_issue_size: 105.98,
    offer_for_sale_size: 16.02,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'Bigshare Services Private Limited',
    registrar_url: 'https://www.bigshareonline.com/ipo_Allotment.html',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
    data_verified_at: new Date().toISOString(),
    published_at: '2026-10-14T08:00:00Z',
    created_at: '2026-10-14T00:00:00Z',
    updated_at: new Date().toISOString(),
  },
  // 11. Bonfiglioli Transmissions Limited (Closed Oct 19 - Allotment Awaiting)
  {
    id: '44444444-4444-4444-4444-444444440024',
    company_id: '33333333-3333-3333-3333-333333330024',
    slug: 'bonfiglioli-transmissions-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'closed',
    announcement_status: 'confirmed',
    open_date: '2026-10-15',
    close_date: '2026-10-19',
    allotment_date: '2026-10-23',
    refund_date: '2026-10-24',
    demat_credit_date: '2026-10-24',
    listing_date: '2026-10-25',
    price_band_min: 585.0,
    price_band_max: 615.0,
    issue_price: 615.0,
    lot_size: 24,
    issue_size: 1000.0,
    fresh_issue_size: 400.0,
    offer_for_sale_size: 600.0,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'Link Intime India Private Limited',
    registrar_url: 'https://linkintime.co.in/initial_offerings/public-issues.html',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
    data_verified_at: new Date().toISOString(),
    published_at: '2026-10-05T08:00:00Z',
    created_at: '2026-10-05T00:00:00Z',
    updated_at: new Date().toISOString(),
  },
  // 12. Tonbo Imaging Limited (Closed Oct 19 - High Demand GMP)
  {
    id: '44444444-4444-4444-4444-444444440025',
    company_id: '33333333-3333-3333-3333-333333330025',
    slug: 'tonbo-imaging-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'closed',
    announcement_status: 'confirmed',
    open_date: '2026-10-15',
    close_date: '2026-10-19',
    allotment_date: '2026-10-23',
    refund_date: '2026-10-24',
    demat_credit_date: '2026-10-24',
    listing_date: '2026-10-25',
    price_band_min: 675.0,
    price_band_max: 710.0,
    issue_price: 710.0,
    lot_size: 21,
    issue_size: 650.0,
    fresh_issue_size: 350.0,
    offer_for_sale_size: 300.0,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'KFin Technologies Limited',
    registrar_url: 'https://kosmic.kfintech.com/ipostatus/',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx',
    data_verified_at: new Date().toISOString(),
    published_at: '2026-10-05T08:00:00Z',
    created_at: '2026-10-05T00:00:00Z',
    updated_at: new Date().toISOString(),
  },
  // 13. SFC Environmental Technologies Limited (Upcoming Mainboard)
  {
    id: '44444444-4444-4444-4444-444444440026',
    company_id: '33333333-3333-3333-3333-333333330026',
    slug: 'sfc-environmental-technologies-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'upcoming',
    announcement_status: 'dates_announced',
    open_date: '2026-10-27',
    close_date: '2026-10-29',
    allotment_date: '2026-10-30',
    refund_date: '2026-11-02',
    demat_credit_date: '2026-11-02',
    listing_date: '2026-11-03',
    price_band_min: 310.0,
    price_band_max: 326.0,
    issue_price: undefined,
    lot_size: 46,
    issue_size: 320.0,
    fresh_issue_size: 200.0,
    offer_for_sale_size: 120.0,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'Link Intime India Private Limited',
    registrar_url: 'https://linkintime.co.in/initial_offerings/public-issues.html',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
    data_verified_at: new Date().toISOString(),
    published_at: '2026-10-18T08:00:00Z',
    created_at: '2026-10-18T00:00:00Z',
    updated_at: new Date().toISOString(),
  },
  // 14. BLS Polymers Limited (Upcoming Mainboard)
  {
    id: '44444444-4444-4444-4444-444444440027',
    company_id: '33333333-3333-3333-3333-333333330027',
    slug: 'bls-polymers-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'upcoming',
    announcement_status: 'dates_announced',
    open_date: '2026-10-27',
    close_date: '2026-10-29',
    allotment_date: '2026-10-30',
    refund_date: '2026-11-02',
    demat_credit_date: '2026-11-02',
    listing_date: '2026-11-03',
    price_band_min: 142.0,
    price_band_max: 150.0,
    issue_price: undefined,
    lot_size: 100,
    issue_size: 180.0,
    fresh_issue_size: 140.0,
    offer_for_sale_size: 40.0,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'Bigshare Services Private Limited',
    registrar_url: 'https://www.bigshareonline.com/ipo_Allotment.html',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx',
    data_verified_at: new Date().toISOString(),
    published_at: '2026-10-18T08:00:00Z',
    created_at: '2026-10-18T00:00:00Z',
    updated_at: new Date().toISOString(),
  },
  // 15. Danish Power Limited (SME Emerge - Super Subscribed 88.5x)
  {
    id: '44444444-4444-4444-4444-444444440028',
    company_id: '33333333-3333-3333-3333-333333330028',
    slug: 'danish-power-ipo',
    category: 'SME',
    exchange: 'NSE Emerge',
    status: 'closed',
    announcement_status: 'confirmed',
    open_date: '2026-10-18',
    close_date: '2026-10-21',
    allotment_date: '2026-10-23',
    refund_date: '2026-10-24',
    demat_credit_date: '2026-10-24',
    listing_date: '2026-10-25',
    price_band_min: 360.0,
    price_band_max: 380.0,
    issue_price: 380.0,
    lot_size: 300,
    issue_size: 197.9,
    fresh_issue_size: 197.9,
    offer_for_sale_size: 0.0,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'Link Intime India Private Limited',
    registrar_url: 'https://linkintime.co.in/initial_offerings/public-issues.html',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
    data_verified_at: new Date().toISOString(),
    published_at: '2026-10-10T08:00:00Z',
    created_at: '2026-10-10T00:00:00Z',
    updated_at: new Date().toISOString(),
  },
  // 16. United Heat Transfer Limited (SME Emerge - LIVE NOW)
  {
    id: '44444444-4444-4444-4444-444444440029',
    company_id: '33333333-3333-3333-3333-333333330029',
    slug: 'united-heat-transfer-ipo',
    category: 'SME',
    exchange: 'NSE Emerge',
    status: 'ongoing',
    announcement_status: 'confirmed',
    open_date: '2026-10-20',
    close_date: '2026-10-22',
    allotment_date: '2026-10-23',
    refund_date: '2026-10-24',
    demat_credit_date: '2026-10-24',
    listing_date: '2026-10-25',
    price_band_min: 56.0,
    price_band_max: 59.0,
    issue_price: undefined,
    lot_size: 2000,
    issue_size: 30.0,
    fresh_issue_size: 30.0,
    offer_for_sale_size: 0.0,
    retail_quota_percent: 50.0,
    qib_quota_percent: 0.0,
    nii_quota_percent: 50.0,
    registrar_name: 'Bigshare Services Private Limited',
    registrar_url: 'https://www.bigshareonline.com/ipo_Allotment.html',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
    data_verified_at: new Date().toISOString(),
    published_at: '2026-10-12T08:00:00Z',
    created_at: '2026-10-12T00:00:00Z',
    updated_at: new Date().toISOString(),
  },
  // 17. Deepak Builders & Engineers Limited (Mainboard Closed)
  {
    id: '44444444-4444-4444-4444-444444440030',
    company_id: '33333333-3333-3333-3333-333333330030',
    slug: 'deepak-builders-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'closed',
    announcement_status: 'confirmed',
    open_date: '2026-10-18',
    close_date: '2026-10-21',
    allotment_date: '2026-10-23',
    refund_date: '2026-10-24',
    demat_credit_date: '2026-10-24',
    listing_date: '2026-10-25',
    price_band_min: 192.0,
    price_band_max: 203.0,
    issue_price: 203.0,
    lot_size: 73,
    issue_size: 260.04,
    fresh_issue_size: 217.21,
    offer_for_sale_size: 42.83,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'KFin Technologies Limited',
    registrar_url: 'https://kosmic.kfintech.com/ipostatus/',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx',
    data_verified_at: new Date().toISOString(),
    published_at: '2026-10-10T08:00:00Z',
    created_at: '2026-10-10T00:00:00Z',
    updated_at: new Date().toISOString(),
  },
  // 11. Ventive Hospitality (Ongoing Mainboard)
  {
    id: '44444444-4444-4444-4444-444444440013',
    company_id: '33333333-3333-3333-3333-333333330013',
    slug: 'ventive-hospitality-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'ongoing',
    announcement_status: 'confirmed',
    open_date: getRelativeDate(-1),
    close_date: getRelativeDate(2),
    allotment_date: getRelativeDate(3),
    refund_date: getRelativeDate(4),
    demat_credit_date: getRelativeDate(4),
    listing_date: getRelativeDate(6),
    price_band_min: 610.0,
    price_band_max: 643.0,
    issue_price: undefined,
    lot_size: 23,
    issue_size: 2000.0,
    fresh_issue_size: 2000.0,
    offer_for_sale_size: 0.0,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'KFin Technologies Limited',
    registrar_url: 'https://kosmic.kfintech.com/ipostatus/',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx',
    data_verified_at: new Date().toISOString(),
    published_at: getRelativeDate(-4),
    created_at: getRelativeDate(-4),
    updated_at: new Date().toISOString(),
  },
  // 9. Senores Pharmaceuticals (Ongoing Mainboard)
  {
    id: '44444444-4444-4444-4444-444444440014',
    company_id: '33333333-3333-3333-3333-333333330014',
    slug: 'senores-pharmaceuticals-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'ongoing',
    announcement_status: 'confirmed',
    open_date: getRelativeDate(0),
    close_date: getRelativeDate(3),
    allotment_date: getRelativeDate(4),
    refund_date: getRelativeDate(5),
    demat_credit_date: getRelativeDate(5),
    listing_date: getRelativeDate(7),
    price_band_min: 371.0,
    price_band_max: 391.0,
    issue_price: undefined,
    lot_size: 38,
    issue_size: 582.0,
    fresh_issue_size: 500.0,
    offer_for_sale_size: 82.0,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'Link Intime India Private Limited',
    registrar_url: 'https://linkintime.co.in/initial_offerings/public-issues.html',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
    data_verified_at: new Date().toISOString(),
    published_at: getRelativeDate(-3),
    created_at: getRelativeDate(-3),
    updated_at: new Date().toISOString(),
  },
  // 10. Carraro India (Ongoing Mainboard)
  {
    id: '44444444-4444-4444-4444-444444440015',
    company_id: '33333333-3333-3333-3333-333333330015',
    slug: 'carraro-india-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'ongoing',
    announcement_status: 'confirmed',
    open_date: getRelativeDate(-2),
    close_date: getRelativeDate(1),
    allotment_date: getRelativeDate(2),
    refund_date: getRelativeDate(3),
    demat_credit_date: getRelativeDate(3),
    listing_date: getRelativeDate(5),
    price_band_min: 668.0,
    price_band_max: 704.0,
    issue_price: undefined,
    lot_size: 21,
    issue_size: 1811.65,
    fresh_issue_size: 0.0,
    offer_for_sale_size: 1811.65,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'Link Intime India Private Limited',
    registrar_url: 'https://linkintime.co.in/initial_offerings/public-issues.html',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
    data_verified_at: new Date().toISOString(),
    published_at: getRelativeDate(-5),
    created_at: getRelativeDate(-5),
    updated_at: new Date().toISOString(),
  },
  // 11. Unimech Aerospace and Manufacturing (Ongoing Mainboard)
  {
    id: '44444444-4444-4444-4444-444444440016',
    company_id: '33333333-3333-3333-3333-333333330016',
    slug: 'unimech-aerospace-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'ongoing',
    announcement_status: 'confirmed',
    open_date: getRelativeDate(-1),
    close_date: getRelativeDate(2),
    allotment_date: getRelativeDate(3),
    refund_date: getRelativeDate(4),
    demat_credit_date: getRelativeDate(4),
    listing_date: getRelativeDate(6),
    price_band_min: 745.0,
    price_band_max: 785.0,
    issue_price: undefined,
    lot_size: 19,
    issue_size: 500.0,
    fresh_issue_size: 250.0,
    offer_for_sale_size: 250.0,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'KFin Technologies Limited',
    registrar_url: 'https://kosmic.kfintech.com/ipostatus/',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx',
    data_verified_at: new Date().toISOString(),
    published_at: getRelativeDate(-4),
    created_at: getRelativeDate(-4),
    updated_at: new Date().toISOString(),
  },
  // 12. Enviro Infra Engineers (Ongoing Mainboard)
  {
    id: '44444444-4444-4444-4444-444444440007',
    company_id: '33333333-3333-3333-3333-333333330007',
    slug: 'enviro-infra-engineers-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'ongoing',
    announcement_status: 'confirmed',
    open_date: getRelativeDate(-1),
    close_date: getRelativeDate(2),
    allotment_date: getRelativeDate(3),
    refund_date: getRelativeDate(4),
    demat_credit_date: getRelativeDate(4),
    listing_date: getRelativeDate(6),
    price_band_min: 140.0,
    price_band_max: 148.0,
    issue_price: undefined,
    lot_size: 101,
    issue_size: 650.43,
    fresh_issue_size: 572.46,
    offer_for_sale_size: 77.97,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'Bigshare Services Private Limited',
    registrar_url: 'https://www.bigshareonline.com/ipo_Allotment.html',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
    data_verified_at: new Date().toISOString(),
    published_at: getRelativeDate(-5),
    created_at: getRelativeDate(-5),
    updated_at: new Date().toISOString(),
  },
  // 13. Rajputana Biodiesel (Ongoing SME)
  {
    id: '44444444-4444-4444-4444-444444440008',
    company_id: '33333333-3333-3333-3333-333333330008',
    slug: 'rajputana-biodiesel-ipo',
    category: 'SME',
    exchange: 'NSE Emerge',
    status: 'ongoing',
    announcement_status: 'confirmed',
    open_date: getRelativeDate(0),
    close_date: getRelativeDate(3),
    allotment_date: getRelativeDate(4),
    refund_date: getRelativeDate(5),
    demat_credit_date: getRelativeDate(5),
    listing_date: getRelativeDate(7),
    price_band_min: 123.0,
    price_band_max: 130.0,
    issue_price: undefined,
    lot_size: 1000,
    issue_size: 24.7,
    fresh_issue_size: 24.7,
    offer_for_sale_size: 0.0,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'Maashitla Securities Private Limited',
    registrar_url: 'https://maashitla.com/allotment-status',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
    data_verified_at: new Date().toISOString(),
    published_at: getRelativeDate(-3),
    created_at: getRelativeDate(-3),
    updated_at: new Date().toISOString(),
  },
  // 14. Vishal Mega Mart (Upcoming Mainboard)
  {
    id: '44444444-4444-4444-4444-444444440010',
    company_id: '33333333-3333-3333-3333-333333330010',
    slug: 'vishal-mega-mart-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'upcoming',
    announcement_status: 'dates_announced',
    open_date: getRelativeDate(4),
    close_date: getRelativeDate(7),
    allotment_date: getRelativeDate(8),
    refund_date: getRelativeDate(9),
    demat_credit_date: getRelativeDate(9),
    listing_date: getRelativeDate(11),
    price_band_min: 74.0,
    price_band_max: 78.0,
    issue_price: undefined,
    lot_size: 190,
    issue_size: 8000.0,
    fresh_issue_size: 0.0,
    offer_for_sale_size: 8000.0,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'KFin Technologies Limited',
    registrar_url: 'https://kosmic.kfintech.com/ipostatus/',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
    data_verified_at: new Date().toISOString(),
    published_at: getRelativeDate(-2),
    created_at: getRelativeDate(-2),
    updated_at: new Date().toISOString(),
  },
  // 15. Indo Farm Equipment (Upcoming Mainboard)
  {
    id: '44444444-4444-4444-4444-444444440017',
    company_id: '33333333-3333-3333-3333-333333330017',
    slug: 'indo-farm-equipment-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'upcoming',
    announcement_status: 'dates_announced',
    open_date: getRelativeDate(6),
    close_date: getRelativeDate(9),
    allotment_date: getRelativeDate(10),
    refund_date: getRelativeDate(11),
    demat_credit_date: getRelativeDate(11),
    listing_date: getRelativeDate(13),
    price_band_min: 205.0,
    price_band_max: 215.0,
    issue_price: undefined,
    lot_size: 69,
    issue_size: 275.0,
    fresh_issue_size: 275.0,
    offer_for_sale_size: 0.0,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'Link Intime India Private Limited',
    registrar_url: 'https://linkintime.co.in/initial_offerings/public-issues.html',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx',
    data_verified_at: new Date().toISOString(),
    published_at: getRelativeDate(-1),
    created_at: getRelativeDate(-1),
    updated_at: new Date().toISOString(),
  },
  // 16. Mamata Machinery (Upcoming Mainboard)
  {
    id: '44444444-4444-4444-4444-444444440018',
    company_id: '33333333-3333-3333-3333-333333330018',
    slug: 'mamata-machinery-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'upcoming',
    announcement_status: 'dates_announced',
    open_date: getRelativeDate(9),
    close_date: getRelativeDate(12),
    allotment_date: getRelativeDate(13),
    refund_date: getRelativeDate(14),
    demat_credit_date: getRelativeDate(14),
    listing_date: getRelativeDate(16),
    price_band_min: 230.0,
    price_band_max: 243.0,
    issue_price: undefined,
    lot_size: 61,
    issue_size: 400.0,
    fresh_issue_size: 0.0,
    offer_for_sale_size: 400.0,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'Link Intime India Private Limited',
    registrar_url: 'https://linkintime.co.in/initial_offerings/public-issues.html',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
    data_verified_at: new Date().toISOString(),
    published_at: getRelativeDate(-2),
    created_at: getRelativeDate(-2),
    updated_at: new Date().toISOString(),
  },
  // 17. DAM Capital Advisors (Upcoming Mainboard)
  {
    id: '44444444-4444-4444-4444-444444440019',
    company_id: '33333333-3333-3333-3333-333333330019',
    slug: 'dam-capital-advisors-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'upcoming',
    announcement_status: 'dates_announced',
    open_date: getRelativeDate(12),
    close_date: getRelativeDate(15),
    allotment_date: getRelativeDate(16),
    refund_date: getRelativeDate(17),
    demat_credit_date: getRelativeDate(17),
    listing_date: getRelativeDate(19),
    price_band_min: 269.0,
    price_band_max: 283.0,
    issue_price: undefined,
    lot_size: 53,
    issue_size: 840.0,
    fresh_issue_size: 0.0,
    offer_for_sale_size: 840.0,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'Link Intime India Private Limited',
    registrar_url: 'https://linkintime.co.in/initial_offerings/public-issues.html',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
    data_verified_at: new Date().toISOString(),
    published_at: getRelativeDate(-3),
    created_at: getRelativeDate(-3),
    updated_at: new Date().toISOString(),
  },
  // 18. Hexaware Technologies (Upcoming Expected)
  {
    id: '44444444-4444-4444-4444-444444440011',
    company_id: '33333333-3333-3333-3333-333333330011',
    slug: 'hexaware-technologies-ipo',
    category: 'Mainboard',
    exchange: 'NSE, BSE',
    status: 'upcoming',
    announcement_status: 'expected',
    open_date: getRelativeDate(16),
    close_date: getRelativeDate(20),
    allotment_date: getRelativeDate(21),
    refund_date: getRelativeDate(22),
    demat_credit_date: getRelativeDate(22),
    listing_date: getRelativeDate(24),
    price_band_min: undefined,
    price_band_max: undefined,
    issue_price: undefined,
    lot_size: undefined,
    issue_size: 9950.0,
    fresh_issue_size: 0.0,
    offer_for_sale_size: 9950.0,
    retail_quota_percent: 35.0,
    qib_quota_percent: 50.0,
    nii_quota_percent: 15.0,
    registrar_name: 'Link Intime India Private Limited',
    registrar_url: 'https://linkintime.co.in/initial_offerings/public-issues.html',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    official_source_url: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
    data_verified_at: new Date().toISOString(),
    published_at: getRelativeDate(-4),
    created_at: getRelativeDate(-4),
    updated_at: new Date().toISOString(),
  },
];

// Initial Listing Results
const INITIAL_LISTING_RESULTS: ListingResult[] = [
  {
    id: '55555555-5555-5555-5555-555555550001',
    ipo_id: '44444444-4444-4444-4444-444444440001',
    issue_price: 1503.0,
    listing_price: 2550.0,
    listing_date: '2024-10-28',
    first_day_close: 2345.0,
    previous_close: 2550.0,
    verified_at: '2024-10-28T10:00:00Z',
    created_at: '2024-10-28T10:00:00Z',
    updated_at: '2024-10-28T16:00:00Z',
  },
  {
    id: '55555555-5555-5555-5555-555555550002',
    ipo_id: '44444444-4444-4444-4444-444444440002',
    issue_price: 70.0,
    listing_price: 150.0,
    listing_date: '2024-09-16',
    first_day_close: 165.0,
    previous_close: 150.0,
    verified_at: '2024-09-16T10:00:00Z',
    created_at: '2024-09-16T10:00:00Z',
    updated_at: '2024-09-16T16:00:00Z',
  },
  {
    id: '55555555-5555-5555-5555-555555550003',
    ipo_id: '44444444-4444-4444-4444-444444440003',
    issue_price: 450.0,
    listing_price: 991.0,
    listing_date: '2024-09-03',
    first_day_close: 990.0,
    previous_close: 991.0,
    verified_at: '2024-09-03T10:00:00Z',
    created_at: '2024-09-03T10:00:00Z',
    updated_at: '2024-09-03T16:00:00Z',
  },
  {
    id: '55555555-5555-5555-5555-555555550004',
    ipo_id: '44444444-4444-4444-4444-444444440004',
    issue_price: 1960.0,
    listing_price: 1934.0,
    listing_date: '2024-10-22',
    first_day_close: 1819.6,
    previous_close: 1934.0,
    verified_at: '2024-10-22T10:00:00Z',
    created_at: '2024-10-22T10:00:00Z',
    updated_at: '2024-10-22T16:00:00Z',
  },
  {
    id: '55555555-5555-5555-5555-555555550005',
    ipo_id: '44444444-4444-4444-4444-444444440005',
    issue_price: 390.0,
    listing_price: 420.0,
    listing_date: '2024-11-13',
    first_day_close: 456.0,
    previous_close: 420.0,
    verified_at: '2024-11-13T10:00:00Z',
    created_at: '2024-11-13T10:00:00Z',
    updated_at: '2024-11-13T16:00:00Z',
  },
  {
    id: '55555555-5555-5555-5555-555555550006',
    ipo_id: '44444444-4444-4444-4444-444444440006',
    issue_price: 190.0,
    listing_price: 361.0,
    listing_date: '2024-07-12',
    first_day_close: 379.05,
    previous_close: 361.0,
    verified_at: '2024-07-12T10:00:00Z',
    created_at: '2024-07-12T10:00:00Z',
    updated_at: '2024-07-12T16:00:00Z',
  },
  {
    id: '55555555-5555-5555-5555-555555550007',
    ipo_id: '44444444-4444-4444-4444-444444440012',
    issue_price: 108.0,
    listing_price: 111.5,
    listing_date: '2024-11-27',
    first_day_close: 122.0,
    previous_close: 111.5,
    verified_at: '2024-11-27T10:00:00Z',
    created_at: '2024-11-27T10:00:00Z',
    updated_at: '2024-11-27T16:00:00Z',
  },
  {
    id: '55555555-5555-5555-5555-555555550008',
    ipo_id: '44444444-4444-4444-4444-444444440023',
    issue_price: 271.0,
    listing_price: 340.0,
    listing_date: '2026-10-20',
    first_day_close: 338.5,
    previous_close: 340.0,
    verified_at: '2026-10-20T10:00:00Z',
    created_at: '2026-10-20T10:00:00Z',
    updated_at: '2026-10-20T16:00:00Z',
  },
];

// Initial GMP Snapshots (Rich time-series for trend charts)
const INITIAL_GMP_SNAPSHOTS: GMPSnapshot[] = [
  // 0. Jio Platforms Limited (Reliance Jio IPO - LIVE NOW)
  {
    id: '66666666-6666-6666-6666-666666660030',
    ipo_id: '44444444-4444-4444-4444-444444440020',
    gmp_amount: 180.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'InvestorGain Market Estimates',
    source_url: 'https://www.investorgain.com',
    observed_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Initial dealer consensus pre-bidding',
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666660031',
    ipo_id: '44444444-4444-4444-4444-444444440020',
    gmp_amount: 215.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'IPOWatch Market Research',
    source_url: 'https://ipowatch.in',
    observed_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Massive Day 1 bidding surge expanding premium',
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666660032',
    ipo_id: '44444444-4444-4444-4444-444444440020',
    gmp_amount: 246.0,
    currency: 'INR',
    unit: 'per share',
    kostak_rate: 750,
    subject_to_sauda_rate: 6500,
    fire_rating: 5,
    source_name: 'InvestorGain Market Estimates',
    source_url: 'https://www.investorgain.com',
    observed_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Live premium holding firm at 22% on 4.35x subscription',
    created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  },
  // Paras Healthcare Limited (Live)
  {
    id: '66666666-6666-6666-6666-666666660033',
    ipo_id: '44444444-4444-4444-4444-444444440021',
    gmp_amount: 45.0,
    currency: 'INR',
    unit: 'per share',
    kostak_rate: 250,
    subject_to_sauda_rate: 2000,
    fire_rating: 3,
    source_name: 'InvestorGain Market Estimates',
    source_url: 'https://www.investorgain.com',
    observed_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Active hospital network valuation quote',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  // Acme India Industries Limited (Live)
  {
    id: '66666666-6666-6666-6666-666666660034',
    ipo_id: '44444444-4444-4444-4444-444444440022',
    gmp_amount: 38.0,
    currency: 'INR',
    unit: 'per share',
    kostak_rate: 220,
    subject_to_sauda_rate: 1800,
    fire_rating: 4,
    source_name: 'IPOWatch Market Research',
    source_url: 'https://ipowatch.in',
    observed_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Robust machinery engineering order book',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  // Bonfiglioli Transmissions Limited (Closed Oct 19)
  {
    id: '66666666-6666-6666-6666-666666660035',
    ipo_id: '44444444-4444-4444-4444-444444440024',
    gmp_amount: 78.0,
    currency: 'INR',
    unit: 'per share',
    kostak_rate: 350,
    subject_to_sauda_rate: 2200,
    fire_rating: 3,
    source_name: 'IPO Premium Dealer Consensus',
    source_url: 'https://www.ipopremium.in',
    observed_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Gearmotors market leader steady quotation',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  // Tonbo Imaging Limited (Closed Oct 19 - High Demand)
  {
    id: '66666666-6666-6666-6666-666666660036',
    ipo_id: '44444444-4444-4444-4444-444444440025',
    gmp_amount: 455.0,
    currency: 'INR',
    unit: 'per share',
    kostak_rate: 800,
    subject_to_sauda_rate: 6800,
    fire_rating: 5,
    source_name: 'IPO Premium Dealer Consensus',
    source_url: 'https://www.ipopremium.in',
    observed_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Defence electro-optics high demand +64% premium',
    created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  },
  // SFC Environmental Technologies Limited (Upcoming)
  {
    id: '66666666-6666-6666-6666-666666660037',
    ipo_id: '44444444-4444-4444-4444-444444440026',
    gmp_amount: 20.0,
    currency: 'INR',
    unit: 'per share',
    kostak_rate: 150,
    subject_to_sauda_rate: 1100,
    fire_rating: 2,
    source_name: 'IPO Premium Dealer Consensus',
    source_url: 'https://www.ipopremium.in',
    observed_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'CleanTech wastewater initial pre-IPO quote',
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  // BLS Polymers Limited (Upcoming)
  {
    id: '66666666-6666-6666-6666-666666660038',
    ipo_id: '44444444-4444-4444-4444-444444440027',
    gmp_amount: 29.0,
    currency: 'INR',
    unit: 'per share',
    kostak_rate: 200,
    subject_to_sauda_rate: 1600,
    fire_rating: 3,
    source_name: 'IPO Premium Dealer Consensus',
    source_url: 'https://www.ipopremium.in',
    observed_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Polymer masterbatches +19.3% expected listing gain',
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  // Danish Power Limited (SME Emerge)
  {
    id: '66666666-6666-6666-6666-666666660039',
    ipo_id: '44444444-4444-4444-4444-444444440028',
    gmp_amount: 280.0,
    currency: 'INR',
    unit: 'per share',
    kostak_rate: 1200,
    subject_to_sauda_rate: 12000,
    fire_rating: 5,
    source_name: 'IPO Premium Dealer Consensus',
    source_url: 'https://www.ipopremium.in',
    observed_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Massive solar inverter transformer demand +73.7%',
    created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  },
  // United Heat Transfer Limited (SME Emerge)
  {
    id: '66666666-6666-6666-6666-666666660040',
    ipo_id: '44444444-4444-4444-4444-444444440029',
    gmp_amount: 26.0,
    currency: 'INR',
    unit: 'per share',
    kostak_rate: 600,
    subject_to_sauda_rate: 4500,
    fire_rating: 4,
    source_name: 'IPO Premium Dealer Consensus',
    source_url: 'https://www.ipopremium.in',
    observed_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Heavy heat exchangers engineering +44.1%',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  // Deepak Builders & Engineers Limited (Mainboard)
  {
    id: '66666666-6666-6666-6666-666666660041',
    ipo_id: '44444444-4444-4444-4444-444444440030',
    gmp_amount: 40.0,
    currency: 'INR',
    unit: 'per share',
    kostak_rate: 250,
    subject_to_sauda_rate: 2200,
    fire_rating: 3,
    source_name: 'IPO Premium Dealer Consensus',
    source_url: 'https://www.ipopremium.in',
    observed_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Hospital & infrastructure orderbook +19.7%',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  // 1. Ventive Hospitality (Ongoing)
  {
    id: '66666666-6666-6666-6666-666666660010',
    ipo_id: '44444444-4444-4444-4444-444444440013',
    gmp_amount: 55.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'InvestorGain Market Estimates',
    source_url: 'https://www.investorgain.com',
    observed_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Pre-bidding quotation',
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666660011',
    ipo_id: '44444444-4444-4444-4444-444444440013',
    gmp_amount: 68.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'IPOWatch Market Research',
    source_url: 'https://ipowatch.in',
    observed_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Institutional interest expanding premium',
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666660012',
    ipo_id: '44444444-4444-4444-4444-444444440013',
    gmp_amount: 75.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'InvestorGain Market Estimates',
    source_url: 'https://www.investorgain.com',
    observed_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Firm bids on luxury hotel assets',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },

  // 2. Senores Pharmaceuticals (Ongoing)
  {
    id: '66666666-6666-6666-6666-666666660013',
    ipo_id: '44444444-4444-4444-4444-444444440014',
    gmp_amount: 65.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'IPOWatch Market Research',
    source_url: 'https://ipowatch.in',
    observed_at: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Initial dealer consensus',
    created_at: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666660014',
    ipo_id: '44444444-4444-4444-4444-444444440014',
    gmp_amount: 76.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'InvestorGain Market Estimates',
    source_url: 'https://www.investorgain.com',
    observed_at: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Robust retail subscription drive',
    created_at: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666660015',
    ipo_id: '44444444-4444-4444-4444-444444440014',
    gmp_amount: 88.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'InvestorGain Market Estimates',
    source_url: 'https://www.investorgain.com',
    observed_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'High demand for specialty generic portfolio',
    created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  },

  // 3. Carraro India (Ongoing)
  {
    id: '66666666-6666-6666-6666-666666660016',
    ipo_id: '44444444-4444-4444-4444-444444440015',
    gmp_amount: 40.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'InvestorGain Market Estimates',
    source_url: 'https://www.investorgain.com',
    observed_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Initial quotation',
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666660017',
    ipo_id: '44444444-4444-4444-4444-444444440015',
    gmp_amount: 52.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'IPOWatch Market Research',
    source_url: 'https://ipowatch.in',
    observed_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Solid tractor OEM orders',
    created_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666660018',
    ipo_id: '44444444-4444-4444-4444-444444440015',
    gmp_amount: 60.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'InvestorGain Market Estimates',
    source_url: 'https://www.investorgain.com',
    observed_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Active market rate',
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },

  // 4. Unimech Aerospace (Ongoing)
  {
    id: '66666666-6666-6666-6666-666666660019',
    ipo_id: '44444444-4444-4444-4444-444444440016',
    gmp_amount: 125.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'IPOWatch Market Research',
    source_url: 'https://ipowatch.in',
    observed_at: new Date(Date.now() - 44 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 44 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'High aerospace sector valuation benchmark',
    created_at: new Date(Date.now() - 44 * 3600 * 1000).toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666660020',
    ipo_id: '44444444-4444-4444-4444-444444440016',
    gmp_amount: 148.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'InvestorGain Market Estimates',
    source_url: 'https://www.investorgain.com',
    observed_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Strong NII interest',
    created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666660021',
    ipo_id: '44444444-4444-4444-4444-444444440016',
    gmp_amount: 165.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'InvestorGain Market Estimates',
    source_url: 'https://www.investorgain.com',
    observed_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Premium steady at 21%',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },

  // 5. Enviro Infra Engineers (Ongoing)
  {
    id: '66666666-6666-6666-6666-666666660001',
    ipo_id: '44444444-4444-4444-4444-444444440007',
    gmp_amount: 32.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'InvestorGain Market Estimates',
    source_url: 'https://www.investorgain.com',
    observed_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Initial unofficial quotation',
    created_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666660002',
    ipo_id: '44444444-4444-4444-4444-444444440007',
    gmp_amount: 37.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'IPOWatch Market Research',
    source_url: 'https://ipowatch.in',
    observed_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Firm retail inquiries reported',
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666660003',
    ipo_id: '44444444-4444-4444-4444-444444440007',
    gmp_amount: 41.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'InvestorGain Market Estimates',
    source_url: 'https://www.investorgain.com',
    observed_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Subscription multiples driving GMP expansion',
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666660004',
    ipo_id: '44444444-4444-4444-4444-444444440007',
    gmp_amount: 44.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'InvestorGain Market Estimates',
    source_url: 'https://www.investorgain.com',
    observed_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Current active observation',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },

  // 6. Rajputana Biodiesel (SME Ongoing)
  {
    id: '66666666-6666-6666-6666-666666660005',
    ipo_id: '44444444-4444-4444-4444-444444440008',
    gmp_amount: 70.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'IPOWatch Market Research',
    source_url: 'https://ipowatch.in',
    observed_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Initial quote',
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666660006',
    ipo_id: '44444444-4444-4444-4444-444444440008',
    gmp_amount: 85.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'InvestorGain Market Estimates',
    source_url: 'https://www.investorgain.com',
    observed_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Significant premium over issue price',
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },

  // 7. Vishal Mega Mart (Upcoming)
  {
    id: '66666666-6666-6666-6666-666666660009',
    ipo_id: '44444444-4444-4444-4444-444444440010',
    gmp_amount: 14.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'IPOWatch Market Research',
    source_url: 'https://ipowatch.in',
    observed_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Early pre-IPO dealer bids',
    created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666660022',
    ipo_id: '44444444-4444-4444-4444-444444440010',
    gmp_amount: 18.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'InvestorGain Market Estimates',
    source_url: 'https://www.investorgain.com',
    observed_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Strong consumer brand appetite',
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  },

  // 8. Indo Farm Equipment (Upcoming)
  {
    id: '66666666-6666-6666-6666-666666660023',
    ipo_id: '44444444-4444-4444-4444-444444440017',
    gmp_amount: 30.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'InvestorGain Market Estimates',
    source_url: 'https://www.investorgain.com',
    observed_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Initial unofficial quote',
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666660024',
    ipo_id: '44444444-4444-4444-4444-444444440017',
    gmp_amount: 35.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'IPOWatch Market Research',
    source_url: 'https://ipowatch.in',
    observed_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Healthy indicative listing expectations',
    created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
  },

  // 9. Mamata Machinery (Upcoming)
  {
    id: '66666666-6666-6666-6666-666666660025',
    ipo_id: '44444444-4444-4444-4444-444444440018',
    gmp_amount: 36.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'IPOWatch Market Research',
    source_url: 'https://ipowatch.in',
    observed_at: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Packaging automation peer comparison',
    created_at: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666660026',
    ipo_id: '44444444-4444-4444-4444-444444440018',
    gmp_amount: 42.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'InvestorGain Market Estimates',
    source_url: 'https://www.investorgain.com',
    observed_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Export order book driving sentiment',
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },

  // 10. DAM Capital Advisors (Upcoming)
  {
    id: '66666666-6666-6666-6666-666666660027',
    ipo_id: '44444444-4444-4444-4444-444444440019',
    gmp_amount: 40.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'InvestorGain Market Estimates',
    source_url: 'https://www.investorgain.com',
    observed_at: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Capital markets momentum tailwind',
    created_at: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666660028',
    ipo_id: '44444444-4444-4444-4444-444444440019',
    gmp_amount: 48.0,
    currency: 'INR',
    unit: 'per share',
    source_name: 'IPOWatch Market Research',
    source_url: 'https://ipowatch.in',
    observed_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_by: 'system_sync',
    notes: 'Leadership reputation under Dharmesh Mehta',
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  },
];

// Initial Subscriptions
const INITIAL_SUBSCRIPTIONS: SubscriptionSnapshot[] = [
  // Jio Platforms Limited (Day 2 LIVE NOW - Reliance Jio)
  {
    id: '77777777-7777-7777-7777-777777770020',
    ipo_id: '44444444-4444-4444-4444-444444440020',
    retail_multiple: 1.35,
    nii_multiple: 5.80,
    qib_multiple: 9.80,
    employee_multiple: 2.10,
    shareholder_multiple: 0.0,
    total_multiple: 4.35,
    unit: 'times',
    day_number: 2,
    observed_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  },
  // Paras Healthcare Limited (Day 2 LIVE NOW)
  {
    id: '77777777-7777-7777-7777-777777770021',
    ipo_id: '44444444-4444-4444-4444-444444440021',
    retail_multiple: 2.40,
    nii_multiple: 3.80,
    qib_multiple: 1.95,
    employee_multiple: 1.05,
    shareholder_multiple: 0.0,
    total_multiple: 2.65,
    unit: 'times',
    day_number: 2,
    observed_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  // Acme India Industries Limited (Day 2 LIVE NOW)
  {
    id: '77777777-7777-7777-7777-777777770022',
    ipo_id: '44444444-4444-4444-4444-444444440022',
    retail_multiple: 8.50,
    nii_multiple: 14.20,
    qib_multiple: 3.40,
    employee_multiple: 0.0,
    shareholder_multiple: 0.0,
    total_multiple: 8.10,
    unit: 'times',
    day_number: 2,
    observed_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  // Tonbo Imaging Limited (Final Subscribed)
  {
    id: '77777777-7777-7777-7777-777777770025',
    ipo_id: '44444444-4444-4444-4444-444444440025',
    retail_multiple: 16.80,
    nii_multiple: 56.40,
    qib_multiple: 88.50,
    employee_multiple: 0.0,
    shareholder_multiple: 0.0,
    total_multiple: 42.60,
    unit: 'times',
    day_number: 3,
    observed_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
  },
  // Bonfiglioli Transmissions Limited (Final Subscribed)
  {
    id: '77777777-7777-7777-7777-777777770024',
    ipo_id: '44444444-4444-4444-4444-444444440024',
    retail_multiple: 7.42,
    nii_multiple: 18.50,
    qib_multiple: 28.20,
    employee_multiple: 0.0,
    shareholder_multiple: 0.0,
    total_multiple: 14.85,
    unit: 'times',
    day_number: 3,
    observed_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  // Danish Power Limited (SME Emerge Final)
  {
    id: '77777777-7777-7777-7777-777777770028',
    ipo_id: '44444444-4444-4444-4444-444444440028',
    retail_multiple: 64.20,
    nii_multiple: 144.50,
    qib_multiple: 112.00,
    employee_multiple: 0.0,
    shareholder_multiple: 0.0,
    total_multiple: 88.50,
    unit: 'times',
    day_number: 3,
    observed_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
  },
  // United Heat Transfer Limited (SME Emerge Day 2)
  {
    id: '77777777-7777-7777-7777-777777770029',
    ipo_id: '44444444-4444-4444-4444-444444440029',
    retail_multiple: 15.60,
    nii_multiple: 24.10,
    qib_multiple: 0.0,
    employee_multiple: 0.0,
    shareholder_multiple: 0.0,
    total_multiple: 18.20,
    unit: 'times',
    day_number: 2,
    observed_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  // Deepak Builders & Engineers Limited (Final)
  {
    id: '77777777-7777-7777-7777-777777770030',
    ipo_id: '44444444-4444-4444-4444-444444440030',
    retail_multiple: 12.50,
    nii_multiple: 42.80,
    qib_multiple: 36.40,
    employee_multiple: 0.0,
    shareholder_multiple: 0.0,
    total_multiple: 24.10,
    unit: 'times',
    day_number: 3,
    observed_at: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_at: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
  },
  // Ventive Hospitality (Day 2)
  {
    id: '77777777-7777-7777-7777-777777770010',
    ipo_id: '44444444-4444-4444-4444-444444440013',
    retail_multiple: 2.85,
    nii_multiple: 4.12,
    qib_multiple: 1.45,
    employee_multiple: 1.10,
    shareholder_multiple: 0.0,
    total_multiple: 2.65,
    unit: 'times',
    day_number: 2,
    observed_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  // Senores Pharmaceuticals (Day 1)
  {
    id: '77777777-7777-7777-7777-777777770011',
    ipo_id: '44444444-4444-4444-4444-444444440014',
    retail_multiple: 5.42,
    nii_multiple: 8.90,
    qib_multiple: 2.10,
    employee_multiple: 0.0,
    shareholder_multiple: 0.0,
    total_multiple: 4.80,
    unit: 'times',
    day_number: 1,
    observed_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  // Carraro India (Day 2)
  {
    id: '77777777-7777-7777-7777-777777770012',
    ipo_id: '44444444-4444-4444-4444-444444440015',
    retail_multiple: 1.95,
    nii_multiple: 3.20,
    qib_multiple: 1.15,
    employee_multiple: 0.0,
    shareholder_multiple: 0.0,
    total_multiple: 1.85,
    unit: 'times',
    day_number: 2,
    observed_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  // Unimech Aerospace (Day 2)
  {
    id: '77777777-7777-7777-7777-777777770013',
    ipo_id: '44444444-4444-4444-4444-444444440016',
    retail_multiple: 7.15,
    nii_multiple: 12.40,
    qib_multiple: 3.50,
    employee_multiple: 2.40,
    shareholder_multiple: 0.0,
    total_multiple: 6.85,
    unit: 'times',
    day_number: 2,
    observed_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  },
  // Enviro Infra Engineers (Day 2)
  {
    id: '77777777-7777-7777-7777-777777770001',
    ipo_id: '44444444-4444-4444-4444-444444440007',
    retail_multiple: 16.42,
    nii_multiple: 31.85,
    qib_multiple: 5.12,
    employee_multiple: 0.0,
    shareholder_multiple: 0.0,
    total_multiple: 16.78,
    unit: 'times',
    day_number: 2,
    observed_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  // Rajputana Biodiesel (Day 1 SME)
  {
    id: '77777777-7777-7777-7777-777777770002',
    ipo_id: '44444444-4444-4444-4444-444444440008',
    retail_multiple: 38.6,
    nii_multiple: 22.1,
    qib_multiple: 2.4,
    employee_multiple: 0.0,
    shareholder_multiple: 0.0,
    total_multiple: 24.35,
    unit: 'times',
    day_number: 1,
    observed_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    ingested_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    verification_status: 'verified',
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  },
  // NTPC Green Energy (Final)
  {
    id: '77777777-7777-7777-7777-777777770014',
    ipo_id: '44444444-4444-4444-4444-444444440012',
    retail_multiple: 3.44,
    nii_multiple: 4.83,
    qib_multiple: 3.32,
    employee_multiple: 3.80,
    shareholder_multiple: 0.0,
    total_multiple: 3.36,
    unit: 'times',
    day_number: 3,
    observed_at: '2024-11-22T17:00:00Z',
    ingested_at: '2024-11-22T17:10:00Z',
    verification_status: 'verified',
    created_at: '2024-11-22T17:10:00Z',
  },
  // Historical Waaree Final
  {
    id: '77777777-7777-7777-7777-777777770004',
    ipo_id: '44444444-4444-4444-4444-444444440001',
    retail_multiple: 10.79,
    nii_multiple: 62.48,
    qib_multiple: 208.63,
    employee_multiple: 5.17,
    shareholder_multiple: 0.0,
    total_multiple: 76.34,
    unit: 'times',
    day_number: 3,
    observed_at: '2024-10-23T17:00:00Z',
    ingested_at: '2024-10-23T17:05:00Z',
    verification_status: 'verified',
    created_at: '2024-10-23T17:05:00Z',
  },
  // Historical Swiggy Final
  {
    id: '77777777-7777-7777-7777-777777770005',
    ipo_id: '44444444-4444-4444-4444-444444440005',
    retail_multiple: 1.14,
    nii_multiple: 0.41,
    qib_multiple: 6.02,
    employee_multiple: 1.65,
    shareholder_multiple: 0.0,
    total_multiple: 3.59,
    unit: 'times',
    day_number: 3,
    observed_at: '2024-11-08T17:00:00Z',
    ingested_at: '2024-11-08T17:05:00Z',
    verification_status: 'verified',
    created_at: '2024-11-08T17:05:00Z',
  },
];

// Initial Admin Users
const INITIAL_ADMINS: AdminUser[] = [
  {
    id: '22222222-2222-2222-2222-222222220001',
    email: 'milanpatadia8@gmail.com',
    role: 'admin',
    full_name: 'Milan Patadia',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '22222222-2222-2222-2222-222222220002',
    email: 'editor@ipotracker.in',
    role: 'editor',
    full_name: 'Senior Research Analyst',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '22222222-2222-2222-2222-222222220003',
    email: 'auditor@ipotracker.in',
    role: 'reviewer',
    full_name: 'Compliance Officer',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
];

// Initial Feed Runs
const INITIAL_FEED_RUNS: FeedRun[] = [
  {
    id: '88888888-8888-8888-8888-888888880001',
    source_id: '11111111-1111-1111-1111-111111110001',
    provider_name: 'NSE Official Ingestion Feed',
    job_type: 'ipo_discovery',
    started_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    finished_at: new Date(Date.now() - 34 * 60 * 1000).toISOString(),
    status: 'success',
    records_fetched: 12,
    records_accepted: 12,
    records_rejected: 0,
    error_summary: undefined,
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
  {
    id: '88888888-8888-8888-8888-888888880002',
    source_id: '11111111-1111-1111-1111-111111110004',
    provider_name: 'InvestorGain Market Estimates',
    job_type: 'gmp_sync',
    started_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    finished_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    status: 'success',
    records_fetched: 8,
    records_accepted: 8,
    records_rejected: 0,
    error_summary: undefined,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: '88888888-8888-8888-8888-888888880003',
    source_id: '11111111-1111-1111-1111-111111110002',
    provider_name: 'BSE Listing & Public Offerings',
    job_type: 'subscription_sync',
    started_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    finished_at: new Date(Date.now() - 59 * 60 * 1000).toISOString(),
    status: 'success',
    records_fetched: 5,
    records_accepted: 5,
    records_rejected: 0,
    error_summary: undefined,
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
];

// Initial Audit Logs
const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: '99999999-9999-9999-9999-999999990001',
    actor_id: '22222222-2222-2222-2222-222222220001',
    actor_name: 'Milan Patadia',
    action: 'SYSTEM_INITIALIZE',
    entity_type: 'system',
    entity_id: 'schema_boot',
    before_values: null,
    after_values: { message: 'Database initialized with verified Indian IPO fixtures' },
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
  {
    id: '99999999-9999-9999-9999-999999990002',
    actor_id: '22222222-2222-2222-2222-222222220002',
    actor_name: 'Senior Research Analyst',
    action: 'GMP_UPDATE_VERIFIED',
    entity_type: 'gmp_snapshot',
    entity_id: 'enviro-infra-engineers-ipo',
    before_values: { gmp_amount: 41 },
    after_values: { gmp_amount: 44, source: 'InvestorGain' },
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
];

class IPODataStore {
  private companies: Map<string, Company> = new Map();
  private ipos: Map<string, IPO> = new Map();
  private gmpSnapshots: GMPSnapshot[] = [];
  private subscriptionSnapshots: SubscriptionSnapshot[] = [];
  private listingResults: Map<string, ListingResult> = new Map();
  private sources: Map<string, IPOSource> = new Map();
  private feedRuns: FeedRun[] = [];
  private auditLogs: AuditLog[] = [];
  private adminUsers: Map<string, AdminUser> = new Map();

  constructor() {
    this.seed();
  }

  private seed() {
    // Populate maps
    INITIAL_COMPANIES.forEach((c) => this.companies.set(c.id, { ...c }));
    INITIAL_SOURCES.forEach((s) => this.sources.set(s.id, { ...s }));
    INITIAL_ADMINS.forEach((u) => this.adminUsers.set(u.id, { ...u }));
    INITIAL_LISTING_RESULTS.forEach((lr) => this.listingResults.set(lr.ipo_id, { ...lr }));
    INITIAL_GMP_SNAPSHOTS.forEach((g) => this.gmpSnapshots.push({ ...g }));
    INITIAL_SUBSCRIPTIONS.forEach((sub) => this.subscriptionSnapshots.push({ ...sub }));
    INITIAL_FEED_RUNS.forEach((fr) => this.feedRuns.push({ ...fr }));
    INITIAL_AUDIT_LOGS.forEach((al) => this.auditLogs.push({ ...al }));
    INITIAL_IPOS.forEach((ipo) => this.ipos.set(ipo.id, { ...ipo }));
  }

  // --- Read Operations ---

  public getCompany(companyId: string): Company | undefined {
    return this.companies.get(companyId);
  }

  public getAllIPOs(filter?: {
    status?: IPOStatus | 'all';
    category?: IPOCategory | 'all';
    exchange?: string;
    search?: string;
    sort?: 'date_desc' | 'date_asc' | 'gain_desc' | 'gain_asc' | 'size_desc' | 'name_asc';
  }): IPO[] {
    let list: IPO[] = Array.from(this.ipos.values()).map((ipo) => this.hydrateIPO(ipo));

    if (filter) {
      if (filter.status && filter.status !== 'all') {
        list = list.filter((i) => i.status === filter.status);
      }
      if (filter.category && filter.category !== 'all') {
        list = list.filter((i) => i.category === filter.category);
      }
      if (filter.exchange && filter.exchange !== 'all') {
        list = list.filter((i) => i.exchange.includes(filter.exchange!));
      }
      if (filter.search && filter.search.trim()) {
        const query = filter.search.toLowerCase().trim();
        list = list.filter(
          (i) =>
            i.company?.name.toLowerCase().includes(query) ||
            i.slug.toLowerCase().includes(query) ||
            i.category.toLowerCase().includes(query) ||
            i.exchange.toLowerCase().includes(query)
        );
      }

      // Sorting
      if (filter.sort) {
        switch (filter.sort) {
          case 'date_desc':
            list.sort(
              (a, b) =>
                new Date(b.open_date || b.listing_date || 0).getTime() -
                new Date(a.open_date || a.listing_date || 0).getTime()
            );
            break;
          case 'date_asc':
            list.sort(
              (a, b) =>
                new Date(a.open_date || a.listing_date || 0).getTime() -
                new Date(b.open_date || b.listing_date || 0).getTime()
            );
            break;
          case 'gain_desc':
            list.sort((a, b) => {
              const gainA = a.listing_result
                ? calculateListingGainPercentage(a.listing_result.issue_price, a.listing_result.listing_price)
                : -9999;
              const gainB = b.listing_result
                ? calculateListingGainPercentage(b.listing_result.issue_price, b.listing_result.listing_price)
                : -9999;
              return gainB - gainA;
            });
            break;
          case 'gain_asc':
            list.sort((a, b) => {
              const gainA = a.listing_result
                ? calculateListingGainPercentage(a.listing_result.issue_price, a.listing_result.listing_price)
                : 9999;
              const gainB = b.listing_result
                ? calculateListingGainPercentage(b.listing_result.issue_price, b.listing_result.listing_price)
                : 9999;
              return gainA - gainB;
            });
            break;
          case 'size_desc':
            list.sort((a, b) => (b.issue_size || 0) - (a.issue_size || 0));
            break;
          case 'name_asc':
            list.sort((a, b) =>
              (a.company?.name || a.slug).localeCompare(b.company?.name || b.slug)
            );
            break;
        }
      } else {
        // Default: Sort by open/listing date descending
        list.sort(
          (a, b) =>
            new Date(b.open_date || b.listing_date || 0).getTime() -
            new Date(a.open_date || a.listing_date || 0).getTime()
        );
      }
    }

    return list;
  }

  public getIPOBySlug(slug: string): IPO | undefined {
    const raw = Array.from(this.ipos.values()).find((i) => i.slug === slug);
    if (!raw) return undefined;
    return this.hydrateIPO(raw);
  }

  public getIPOById(id: string): IPO | undefined {
    const raw = this.ipos.get(id);
    if (!raw) return undefined;
    return this.hydrateIPO(raw);
  }

  private hydrateIPO(ipo: IPO): IPO {
    const company = this.companies.get(ipo.company_id);

    // GMP history in chronological order
    const gmpHistory = this.gmpSnapshots
      .filter((g) => g.ipo_id === ipo.id)
      .sort((a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime());

    const latest_gmp = gmpHistory.length > 0 ? gmpHistory[gmpHistory.length - 1] : undefined;
    const previous_gmp = gmpHistory.length > 1 ? gmpHistory[gmpHistory.length - 2] : undefined;

    // Subscriptions
    const subHistory = this.subscriptionSnapshots
      .filter((s) => s.ipo_id === ipo.id)
      .sort((a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime());

    const latest_subscription = subHistory.length > 0 ? subHistory[subHistory.length - 1] : undefined;

    // Listing result
    const listing_result = this.listingResults.get(ipo.id);

    return {
      ...ipo,
      drhp_url: getValidDocUrl(ipo.drhp_url),
      rhp_url: getValidDocUrl(ipo.rhp_url),
      company,
      latest_gmp,
      previous_gmp,
      gmp_history: gmpHistory,
      latest_subscription,
      subscription_history: subHistory,
      listing_result,
    };
  }

  public getMarketSummary(): MarketSummary {
    const all = this.getAllIPOs();
    const open_ipos = all.filter((i) => i.status === 'ongoing');
    const upcoming_ipos = all.filter((i) => i.status === 'upcoming');
    const listed_ipos = all.filter((i) => i.status === 'listed');
    const mainboard = all.filter((i) => i.category === 'Mainboard');
    const sme = all.filter((i) => i.category === 'SME');

    // Top gainers
    const topGainers = listed_ipos
      .filter((i) => i.listing_result)
      .map((i) => {
        const gainPct = calculateListingGainPercentage(
          i.listing_result!.issue_price,
          i.listing_result!.listing_price
        );
        return {
          id: i.id,
          company_name: i.company?.name || i.slug,
          slug: i.slug,
          category: i.category,
          issue_price: i.listing_result!.issue_price,
          listing_price: i.listing_result!.listing_price,
          gain_percentage: gainPct,
          listing_date: i.listing_result!.listing_date,
        };
      })
      .sort((a, b) => b.gain_percentage - a.gain_percentage)
      .slice(0, 5);

    // Top GMP IPOs
    const topGmp = all
      .filter((i) => i.latest_gmp && (i.status === 'ongoing' || i.status === 'upcoming'))
      .map((i) => {
        const basePrice = i.issue_price || i.price_band_max;
        const indicativeGainPct = calculateIndicativeGainPercentage(basePrice, i.latest_gmp?.gmp_amount);
        return {
          id: i.id,
          company_name: i.company?.name || i.slug,
          slug: i.slug,
          category: i.category,
          gmp_amount: i.latest_gmp!.gmp_amount,
          indicative_gain_pct: indicativeGainPct ?? undefined,
          observed_at: i.latest_gmp!.observed_at,
        };
      })
      .sort((a, b) => (b.indicative_gain_pct || 0) - (a.indicative_gain_pct || 0))
      .slice(0, 5);

    return {
      total_ipos: all.length,
      open_ipos_count: open_ipos.length,
      upcoming_ipos_count: upcoming_ipos.length,
      recently_listed_count: listed_ipos.length,
      mainboard_count: mainboard.length,
      sme_count: sme.length,
      last_sync_timestamp: new Date().toISOString(),
      top_gainers: topGainers,
      top_gmp_ipos: topGmp,
    };
  }

  // --- Admin & Mutation Operations ---

  public createIPO(
    data: {
      companyName: string;
      description?: string;
      industry?: string;
      category: IPOCategory;
      exchange: IPOExchange;
      status: IPOStatus;
      announcement_status: AnnouncementStatus;
      open_date?: string;
      close_date?: string;
      allotment_date?: string;
      listing_date?: string;
      price_band_min?: number;
      price_band_max?: number;
      issue_price?: number;
      lot_size?: number;
      issue_size?: number;
      fresh_issue_size?: number;
      offer_for_sale_size?: number;
      registrar_name?: string;
      registrar_url?: string;
      drhp_url?: string;
      rhp_url?: string;
    },
    actor: { id: string; name: string }
  ): IPO {
    const companySlug = data.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const companyId = `comp-${Date.now()}`;
    const newCompany: Company = {
      id: companyId,
      name: data.companyName,
      slug: companySlug,
      description: data.description || '',
      industry: data.industry || 'Diversified',
      website_url: '',
      logo_url: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.companies.set(companyId, newCompany);

    const ipoSlug = `${companySlug}-ipo`;
    const ipoId = `ipo-${Date.now()}`;
    const newIPO: IPO = {
      id: ipoId,
      company_id: companyId,
      slug: ipoSlug,
      category: data.category,
      exchange: data.exchange,
      status: data.status,
      announcement_status: data.announcement_status,
      open_date: data.open_date,
      close_date: data.close_date,
      allotment_date: data.allotment_date,
      listing_date: data.listing_date,
      price_band_min: data.price_band_min,
      price_band_max: data.price_band_max,
      issue_price: data.issue_price,
      lot_size: data.lot_size,
      issue_size: data.issue_size,
      fresh_issue_size: data.fresh_issue_size,
      offer_for_sale_size: data.offer_for_sale_size,
      retail_quota_percent: 35.0,
      qib_quota_percent: 50.0,
      nii_quota_percent: 15.0,
      registrar_name: data.registrar_name,
      registrar_url: data.registrar_url,
      drhp_url: getValidDocUrl(data.drhp_url),
      rhp_url: getValidDocUrl(data.rhp_url),
      official_source_url: '',
      data_verified_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.ipos.set(ipoId, newIPO);

    this.logAudit({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'IPO_CREATE',
      entity_type: 'ipo',
      entity_id: ipoId,
      before_values: null,
      after_values: { slug: ipoSlug, company: data.companyName, category: data.category },
    });

    return this.hydrateIPO(newIPO);
  }

  public updateIPO(
    id: string,
    updates: Partial<IPO>,
    actor: { id: string; name: string }
  ): IPO | undefined {
    const existing = this.ipos.get(id);
    if (!existing) return undefined;

    const before = { ...existing };
    const updated = {
      ...existing,
      ...updates,
      drhp_url: updates.drhp_url !== undefined ? getValidDocUrl(updates.drhp_url) : existing.drhp_url,
      rhp_url: updates.rhp_url !== undefined ? getValidDocUrl(updates.rhp_url) : existing.rhp_url,
      updated_at: new Date().toISOString(),
    };
    this.ipos.set(id, updated);

    this.logAudit({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'IPO_UPDATE',
      entity_type: 'ipo',
      entity_id: id,
      before_values: before as unknown as Record<string, unknown>,
      after_values: updates as unknown as Record<string, unknown>,
    });

    return this.hydrateIPO(updated);
  }

  public deleteIPO(id: string, actor: { id: string; name: string }): boolean {
    const existing = this.ipos.get(id);
    if (!existing) return false;

    this.ipos.delete(id);

    this.logAudit({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'IPO_DELETE',
      entity_type: 'ipo',
      entity_id: id,
      before_values: { slug: existing.slug },
      after_values: null,
    });

    return true;
  }

  public addGMPSnapshot(
    data: {
      ipo_id: string;
      gmp_amount: number;
      source_name: string;
      source_url?: string;
      notes?: string;
      observed_at?: string;
      verification_status?: 'verified' | 'unverified';
    },
    actor: { id: string; name: string }
  ): GMPSnapshot {
    const newSnapshot: GMPSnapshot = {
      id: `gmp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ipo_id: data.ipo_id,
      gmp_amount: data.gmp_amount,
      currency: 'INR',
      unit: 'per share',
      source_name: data.source_name || 'Manual Admin Quote',
      source_url: data.source_url,
      observed_at: data.observed_at || new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      verification_status: data.verification_status || 'verified',
      created_by: actor.name,
      notes: data.notes,
      created_at: new Date().toISOString(),
    };

    this.gmpSnapshots.push(newSnapshot);

    this.logAudit({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'GMP_ADD',
      entity_type: 'gmp_snapshot',
      entity_id: newSnapshot.id,
      before_values: null,
      after_values: {
        ipo_id: data.ipo_id,
        gmp_amount: data.gmp_amount,
        source: data.source_name,
      },
    });

    return newSnapshot;
  }

  public addSubscriptionSnapshot(
    data: {
      ipo_id: string;
      retail_multiple: number;
      nii_multiple: number;
      qib_multiple: number;
      employee_multiple?: number;
      shareholder_multiple?: number;
      day_number?: number;
      observed_at?: string;
    },
    actor: { id: string; name: string }
  ): SubscriptionSnapshot {
    // Total weighted or unweighted composite estimate:
    // Retail + NII + QIB multiple average weighted approximation
    const totalMultiple = Number(
      (
        data.retail_multiple * 0.35 +
        data.nii_multiple * 0.15 +
        data.qib_multiple * 0.5
      ).toFixed(2)
    );

    const newSnapshot: SubscriptionSnapshot = {
      id: `sub-${Date.now()}`,
      ipo_id: data.ipo_id,
      retail_multiple: data.retail_multiple,
      nii_multiple: data.nii_multiple,
      qib_multiple: data.qib_multiple,
      employee_multiple: data.employee_multiple || 0,
      shareholder_multiple: data.shareholder_multiple || 0,
      total_multiple: totalMultiple,
      unit: 'times',
      day_number: data.day_number || 1,
      observed_at: data.observed_at || new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      verification_status: 'verified',
      created_at: new Date().toISOString(),
    };

    this.subscriptionSnapshots.push(newSnapshot);

    this.logAudit({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'SUBSCRIPTION_UPDATE',
      entity_type: 'subscription_snapshot',
      entity_id: newSnapshot.id,
      before_values: null,
      after_values: { ipo_id: data.ipo_id, total: totalMultiple },
    });

    return newSnapshot;
  }

  public recordListingResult(
    data: {
      ipo_id: string;
      issue_price: number;
      listing_price: number;
      listing_date: string;
      first_day_close?: number;
    },
    actor: { id: string; name: string }
  ): ListingResult {
    const newResult: ListingResult = {
      id: `list-${Date.now()}`,
      ipo_id: data.ipo_id,
      issue_price: data.issue_price,
      listing_price: data.listing_price,
      listing_date: data.listing_date,
      first_day_close: data.first_day_close,
      previous_close: data.listing_price,
      verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.listingResults.set(data.ipo_id, newResult);

    // Update IPO status to 'listed'
    const ipo = this.ipos.get(data.ipo_id);
    if (ipo) {
      ipo.status = 'listed';
      ipo.issue_price = data.issue_price;
      ipo.listing_date = data.listing_date;
      this.ipos.set(data.ipo_id, ipo);
    }

    this.logAudit({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'LISTING_RESULT_RECORD',
      entity_type: 'listing_results',
      entity_id: data.ipo_id,
      before_values: null,
      after_values: {
        issue_price: data.issue_price,
        listing_price: data.listing_price,
      },
    });

    return newResult;
  }

  // --- CSV Import Pipeline ---
  public importFromCSV(
    csvText: string,
    actor: { id: string; name: string },
    options: { dryRun?: boolean } = {}
  ): {
    totalRows: number;
    accepted: number;
    rejected: number;
    errors: string[];
    importedIPOs: Array<{ name: string; slug: string; status: string }>;
  } {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return {
        totalRows: 0,
        accepted: 0,
        rejected: 0,
        errors: ['CSV file is empty or missing header row.'],
        importedIPOs: [],
      };
    }

    const header = lines[0].split(',').map((c) => c.trim().toLowerCase());
    const expectedCols = ['company', 'category', 'exchange', 'price', 'lot_size', 'issue_size', 'status'];
    const missing = expectedCols.filter((col) => !header.includes(col));
    if (missing.length > 0) {
      return {
        totalRows: lines.length - 1,
        accepted: 0,
        rejected: lines.length - 1,
        errors: [`Missing required columns: ${missing.join(', ')}`],
        importedIPOs: [],
      };
    }

    const colIndex = (col: string) => header.indexOf(col);
    const errors: string[] = [];
    const importedIPOs: Array<{ name: string; slug: string; status: string }> = [];
    let accepted = 0;
    let rejected = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map((c) => c.trim());
      if (row.length < header.length) {
        errors.push(`Row ${i + 1}: Malformed line, column count mismatch.`);
        rejected++;
        continue;
      }

      const companyName = row[colIndex('company')];
      const category = row[colIndex('category')] as IPOCategory;
      const exchange = row[colIndex('exchange')] as IPOExchange;
      const price = parseFloat(row[colIndex('price')]);
      const lotSize = parseInt(row[colIndex('lot_size')], 10);
      const issueSize = parseFloat(row[colIndex('issue_size')]);
      const status = row[colIndex('status')] as IPOStatus;

      if (!companyName) {
        errors.push(`Row ${i + 1}: Missing Company name.`);
        rejected++;
        continue;
      }
      if (category !== 'Mainboard' && category !== 'SME') {
        errors.push(`Row ${i + 1}: Invalid category "${category}". Must be Mainboard or SME.`);
        rejected++;
        continue;
      }

      // Check duplicates
      const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-ipo';
      if (this.getIPOBySlug(slug) && !options.dryRun) {
        errors.push(`Row ${i + 1}: IPO with slug "${slug}" already exists. Skipped duplicate.`);
        rejected++;
        continue;
      }

      if (!options.dryRun) {
        this.createIPO(
          {
            companyName,
            category,
            exchange,
            status: status || 'upcoming',
            announcement_status: 'confirmed',
            price_band_min: price || undefined,
            price_band_max: price || undefined,
            issue_price: status === 'listed' ? price : undefined,
            lot_size: lotSize || undefined,
            issue_size: issueSize || undefined,
          },
          actor
        );
      }

      accepted++;
      importedIPOs.push({ name: companyName, slug, status: status || 'upcoming' });
    }

    this.feedRuns.unshift({
      id: `import-${Date.now()}`,
      job_type: 'csv_import',
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      status: rejected === 0 ? 'success' : accepted > 0 ? 'partial' : 'failed',
      records_fetched: lines.length - 1,
      records_accepted: accepted,
      records_rejected: rejected,
      error_summary: errors.length > 0 ? errors.slice(0, 3).join('; ') : undefined,
      created_at: new Date().toISOString(),
    });

    return {
      totalRows: lines.length - 1,
      accepted,
      rejected,
      errors,
      importedIPOs,
    };
  }

  // --- Provider Feed Synchronization ---
  public syncProvider(
    sourceId: string,
    actor: { id: string; name: string }
  ): FeedRun {
    const source = this.sources.get(sourceId);
    const startedAt = new Date().toISOString();

    // Provider synchronization simulation with authentic logic
    let recordsFetched = 0;
    let recordsAccepted = 0;
    let jobType: FeedRun['job_type'] = 'ipo_discovery';

    if (source?.source_type === 'exchange') {
      jobType = 'ipo_discovery';
      recordsFetched = 4;
      recordsAccepted = 4;
      // Mark verified timestamps on ongoing IPOs
      this.ipos.forEach((ipo) => {
        if (ipo.status === 'ongoing') {
          ipo.data_verified_at = new Date().toISOString();
        }
      });
    } else if (source?.source_type === 'community_estimate') {
      jobType = 'gmp_sync';
      recordsFetched = 3;
      recordsAccepted = 3;
      // Add a fresh verified quote with timestamp to active ongoing IPO
      const ongoing = Array.from(this.ipos.values()).find((i) => i.status === 'ongoing');
      if (ongoing) {
        const latestGmp = this.gmpSnapshots
          .filter((g) => g.ipo_id === ongoing.id)
          .slice(-1)[0]?.gmp_amount || 40;
        // Small realistic micro fluctuation
        const delta = Math.random() > 0.5 ? 1 : -1;
        this.addGMPSnapshot(
          {
            ipo_id: ongoing.id,
            gmp_amount: Math.max(5, latestGmp + delta),
            source_name: source.provider_name,
            source_url: source.base_url,
            notes: 'Automated periodic sync observation',
          },
          actor
        );
      }
    } else if (source?.source_type === 'registrar') {
      jobType = 'subscription_sync';
      recordsFetched = 2;
      recordsAccepted = 2;
    }

    const finishedAt = new Date().toISOString();
    const run: FeedRun = {
      id: `run-${Date.now()}`,
      source_id: sourceId,
      provider_name: source?.provider_name || 'System Provider',
      job_type: jobType,
      started_at: startedAt,
      finished_at: finishedAt,
      status: 'success',
      records_fetched: recordsFetched,
      records_accepted: recordsAccepted,
      records_rejected: 0,
      created_at: finishedAt,
    };

    this.feedRuns.unshift(run);

    this.logAudit({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'FEED_SYNC_TRIGGER',
      entity_type: 'feed_run',
      entity_id: run.id,
      before_values: null,
      after_values: {
        provider: source?.provider_name,
        accepted: recordsAccepted,
        status: 'success',
      },
    });

    return run;
  }

  // --- Observability & Metadata ---
  public getSources(): IPOSource[] {
    return Array.from(this.sources.values());
  }

  public getFeedRuns(): FeedRun[] {
    return this.feedRuns.slice(0, 50);
  }

  public getAuditLogs(): AuditLog[] {
    return this.auditLogs.slice(0, 100);
  }

  public getAdminUsers(): AdminUser[] {
    return Array.from(this.adminUsers.values());
  }

  private logAudit(entry: Omit<AuditLog, 'id' | 'created_at'>) {
    const log: AuditLog = {
      ...entry,
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
  }
}

// Global Singleton Instance
export const ipoStore = new IPODataStore();
