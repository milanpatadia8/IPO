-- =====================================================================
-- Seed Data: supabase/seed.sql
-- Authentic Indian IPOs (Mainboard & SME) with Historical Performance,
-- Ongoing Issues, Upcoming Calendars, GMP Trajectories & Subscriptions.
-- =====================================================================

-- 1. Insert Data Sources
INSERT INTO ipo_sources (id, provider_name, source_type, base_url, enabled, configuration) VALUES
('11111111-1111-1111-1111-111111110001', 'NSE Official Ingestion Feed', 'exchange', 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo', true, '{"rate_limit_per_min": 60, "priority": 1}'),
('11111111-1111-1111-1111-111111110002', 'BSE Listing & Public Offerings', 'exchange', 'https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx', true, '{"rate_limit_per_min": 60, "priority": 1}'),
('11111111-1111-1111-1111-111111110003', 'SEBI Document Repository', 'regulatory', 'https://www.sebi.gov.in/filings/public-issues.html', true, '{"priority": 2}'),
('11111111-1111-1111-1111-111111110004', 'InvestorGain Market Estimates', 'community_estimate', 'https://www.investorgain.com/report/live-ipo-gmp/331/', true, '{"disclaimer_required": true, "speculative": true}'),
('11111111-1111-1111-1111-111111110005', 'IPO Watch India Verified Desk', 'community_estimate', 'https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/', true, '{"disclaimer_required": true, "speculative": true}'),
('11111111-1111-1111-1111-111111110006', 'Direct Registrar Verification', 'registrar', 'https://linkintime.co.in', true, '{"priority": 1}')
ON CONFLICT (provider_name) DO NOTHING;

-- 2. Insert Admin Users
INSERT INTO admin_users (id, email, role, full_name, is_active) VALUES
('22222222-2222-2222-2222-222222220001', 'milanpatadia8@gmail.com', 'admin', 'Milan Patadia', true),
('22222222-2222-2222-2222-222222220002', 'editor@ipotracker.in', 'editor', 'Senior Research Analyst', true),
('22222222-2222-2222-2222-222222220003', 'auditor@ipotracker.in', 'reviewer', 'Compliance Officer', true)
ON CONFLICT (email) DO NOTHING;

-- 3. Insert Companies
INSERT INTO companies (id, name, slug, description, industry, website_url, logo_url) VALUES
('33333333-3333-3333-3333-333333330001', 'Waaree Energies Limited', 'waaree-energies', 'India largest manufacturer of solar PV modules with aggregate installed capacity of 12 GW.', 'Solar & Renewable Energy', 'https://www.waaree.com', 'https://assets.ipotracker.in/logos/waaree.svg'),
('33333333-3333-3333-3333-333333330002', 'Bajaj Housing Finance Limited', 'bajaj-housing-finance', 'Non-deposit-taking Housing Finance Company (HFC) registered with NHB and RBI.', 'Financial Services / NBFC', 'https://www.bajajhousingfinance.in', 'https://assets.ipotracker.in/logos/bajaj.svg'),
('33333333-3333-3333-3333-333333330003', 'Premier Energies Limited', 'premier-energies', 'Integrated solar cell and module manufacturing company in India.', 'Solar Technology', 'https://www.premierenergies.com', 'https://assets.ipotracker.in/logos/premier.svg'),
('33333333-3333-3333-3333-333333330004', 'Hyundai Motor India Limited', 'hyundai-motor-india', 'Second largest passenger vehicle manufacturer in India with a 30-year operational history.', 'Automobile Manufacturing', 'https://www.hyundai.com/in', 'https://assets.ipotracker.in/logos/hyundai.svg'),
('33333333-3333-3333-3333-333333330005', 'Swiggy Limited', 'swiggy', 'Pioneer consumer-tech on-demand platform offering food delivery and quick commerce (Instamart).', 'Consumer Tech / Logistics', 'https://www.swiggy.com', 'https://assets.ipotracker.in/logos/swiggy.svg'),
('33333333-3333-3333-3333-333333330006', 'NTPC Green Energy Limited', 'ntpc-green-energy', 'Wholly owned subsidiary of NTPC Limited driving renewable energy portfolio development.', 'Renewable Power Generation', 'https://www.ngel.in', 'https://assets.ipotracker.in/logos/ntpcgreen.svg'),
('33333333-3333-3333-3333-333333330007', 'Enviro Infra Engineers Limited', 'enviro-infra-engineers', 'Designs and builds Sewage Treatment Plants (STPs) and Water Supply Projects (WSPs) for state bodies.', 'Infrastructure & Utilities', 'https://www.eiel.in', 'https://assets.ipotracker.in/logos/enviro.svg'),
('33333333-3333-3333-3333-333333330008', 'Rajputana Biodiesel Limited', 'rajputana-biodiesel', 'Manufacturer of biofuels, glycerine, and fatty acids operating in Rajasthan.', 'Biofuels & Chemicals', 'https://www.rajputanabiodiesel.com', 'https://assets.ipotracker.in/logos/rajputana.svg'),
('33333333-3333-3333-3333-333333330010', 'Vishal Mega Mart Limited', 'vishal-mega-mart', 'Value-retail powerhouse with hypermarkets across tier-1, tier-2 and tier-3 Indian towns.', 'Retail & Hypermarkets', 'https://www.vishalmegamart.com', 'https://assets.ipotracker.in/logos/vishal.svg'),
('33333333-3333-3333-3333-333333330011', 'Hexaware Technologies Limited', 'hexaware-technologies', 'Next-generation IT automation, cloud, and digital services company backed by Carlyle.', 'Information Technology', 'https://www.hexaware.com', 'https://assets.ipotracker.in/logos/hexaware.svg'),
('33333333-3333-3333-3333-333333330012', 'Ganesh Green Bharat Limited', 'ganesh-green-bharat', 'EPC contractor specializing in solar water pumps, rural electrification and rooftop solar.', 'SME Renewable EPC', 'https://www.ganeshgreen.com', 'https://assets.ipotracker.in/logos/ganesh.svg'),
('33333333-3333-3333-3333-333333330013', 'Ventive Hospitality Limited', 'ventive-hospitality', 'Luxury hospitality owner-developer jointly held by Panchshil and Blackstone.', 'Luxury Hospitality & Resorts', 'https://www.ventivehospitality.com', 'https://assets.ipotracker.in/logos/ventive.svg'),
('33333333-3333-3333-3333-333333330014', 'Senores Pharmaceuticals Limited', 'senores-pharmaceuticals', 'Research-driven specialty pharmaceutical company commercializing complex ANDAs and sterile injectables.', 'Pharmaceuticals & Life Sciences', 'https://www.senorespharma.com', 'https://assets.ipotracker.in/logos/senores.svg'),
('33333333-3333-3333-3333-333333330015', 'Carraro India Limited', 'carraro-india', 'Manufacturing precision transmission systems and driveline axles for tractors and heavy construction machinery.', 'Automotive & Heavy Equipment', 'https://www.carraro.com', 'https://assets.ipotracker.in/logos/carraro.svg'),
('33333333-3333-3333-3333-333333330016', 'Unimech Aerospace and Manufacturing Limited', 'unimech-aerospace', 'High-precision engineering and aerospace tooling enterprise supplying complex mechanical assemblies.', 'Aerospace & Defence Manufacturing', 'https://www.unimechaerospace.com', 'https://assets.ipotracker.in/logos/unimech.svg'),
('33333333-3333-3333-3333-333333330017', 'Indo Farm Equipment Limited', 'indo-farm-equipment', 'Renowned manufacturer of agricultural tractors, mobile pick-and-carry cranes, and diesel generator sets.', 'Agricultural Machinery', 'https://www.indofarm.in', 'https://assets.ipotracker.in/logos/indofarm.svg'),
('33333333-3333-3333-3333-333333330018', 'Mamata Machinery Limited', 'mamata-machinery', 'Pioneering global packaging machinery manufacturer offering high-speed automated pouch-making lines.', 'Industrial Packaging Automation', 'https://www.mamata.com', 'https://assets.ipotracker.in/logos/mamata.svg'),
('33333333-3333-3333-3333-333333330019', 'DAM Capital Advisors Limited', 'dam-capital-advisors', 'Prominent domestic institutional equities, investment banking, and capital advisory platform.', 'Investment Banking & Capital Markets', 'https://www.damcapital.in', 'https://assets.ipotracker.in/logos/damcapital.svg'),
('33333333-3333-3333-3333-333333330020', 'Jio Platforms Limited', 'jio-platforms', 'Digital and telecom flagship subsidiary of Reliance Industries Limited housing Jio Infocomm, 5G, and digital services with 490+ million subscribers.', 'Telecom & Digital Platforms', 'https://www.jio.com', 'https://assets.ipotracker.in/logos/jio.svg'),
('33333333-3333-3333-3333-333333330021', 'Paras Healthcare Limited', 'paras-healthcare', 'Leading healthcare chain operating super-specialty hospitals delivering quaternary and tertiary care across North and East India.', 'Healthcare & Hospitals', 'https://www.parashospitals.com', 'https://assets.ipotracker.in/logos/paras.svg'),
('33333333-3333-3333-3333-333333330022', 'Acme India Industries Limited', 'acme-india-industries', 'Industrial engineering powerhouse manufacturing heavy process machinery and equipment.', 'Industrial Machinery & Equipment', 'https://www.acmeindia.com', 'https://assets.ipotracker.in/logos/acme.svg'),
('33333333-3333-3333-3333-333333330023', 'HD Fire Protect Limited', 'hd-fire-protect', 'Premier manufacturer and exporter of heavy-duty fire protection equipment and automatic deluge systems.', 'Safety & Industrial Engineering', 'https://www.hdfire.com', 'https://assets.ipotracker.in/logos/hdfire.svg')
ON CONFLICT (slug) DO NOTHING;

-- 4. Insert IPOs
INSERT INTO ipos (
    id, company_id, slug, category, exchange, status, announcement_status,
    open_date, close_date, allotment_date, refund_date, demat_credit_date, listing_date,
    price_band_min, price_band_max, issue_price, lot_size, issue_size,
    fresh_issue_size, offer_for_sale_size, retail_quota_percent, qib_quota_percent, nii_quota_percent,
    registrar_name, registrar_url, drhp_url, rhp_url, official_source_url
) VALUES
-- LISTED: Waaree Energies
('44444444-4444-4444-4444-444444440001', '33333333-3333-3333-3333-333333330001', 'waaree-energies-ipo', 'Mainboard', 'NSE, BSE', 'listed', 'confirmed',
 '2024-10-21', '2024-10-23', '2024-10-24', '2024-10-25', '2024-10-25', '2024-10-28',
 1427.00, 1503.00, 1503.00, 9, 4321.44, 3600.00, 721.44, 35.0, 50.0, 15.0,
 'Link Intime India Private Limited', 'https://linkintime.co.in/initial_offerings/public-issues.html',
 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.nseindia.com/get-quotes/equity?symbol=WAAREEENER'),

-- LISTED: Bajaj Housing Finance
('44444444-4444-4444-4444-444444440002', '33333333-3333-3333-3333-333333330002', 'bajaj-housing-finance-ipo', 'Mainboard', 'NSE, BSE', 'listed', 'confirmed',
 '2024-09-09', '2024-09-11', '2024-09-12', '2024-09-13', '2024-09-13', '2024-09-16',
 66.00, 70.00, 70.00, 214, 6560.00, 3560.00, 3000.00, 35.0, 50.0, 15.0,
 'KFin Technologies Limited', 'https://kosmic.kfintech.com/ipostatus/',
 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.nseindia.com/get-quotes/equity?symbol=BAJAJHFL'),

-- LISTED: Premier Energies
('44444444-4444-4444-4444-444444440003', '33333333-3333-3333-3333-333333330003', 'premier-energies-ipo', 'Mainboard', 'NSE, BSE', 'listed', 'confirmed',
 '2024-08-27', '2024-08-29', '2024-08-30', '2024-09-02', '2024-09-02', '2024-09-03',
 427.00, 450.00, 450.00, 33, 2830.40, 1291.40, 1539.00, 35.0, 50.0, 15.0,
 'KFin Technologies Limited', 'https://kosmic.kfintech.com/ipostatus/',
 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.nseindia.com/get-quotes/equity?symbol=PREMIERENE'),

-- LISTED: Hyundai Motor India
('44444444-4444-4444-4444-444444440004', '33333333-3333-3333-3333-333333330004', 'hyundai-motor-india-ipo', 'Mainboard', 'NSE, BSE', 'listed', 'confirmed',
 '2024-10-15', '2024-10-17', '2024-10-18', '2024-10-21', '2024-10-21', '2024-10-22',
 1865.00, 1960.00, 1960.00, 7, 27870.16, 0.00, 27870.16, 35.0, 50.0, 15.0,
 'KFin Technologies Limited', 'https://kosmic.kfintech.com/ipostatus/',
 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.nseindia.com/get-quotes/equity?symbol=HYUNDAI'),

-- LISTED: Swiggy
('44444444-4444-4444-4444-444444440005', '33333333-3333-3333-3333-333333330005', 'swiggy-ipo', 'Mainboard', 'NSE, BSE', 'listed', 'confirmed',
 '2024-11-06', '2024-11-08', '2024-11-11', '2024-11-12', '2024-11-12', '2024-11-13',
 371.00, 390.00, 390.00, 38, 11327.43, 4499.00, 6828.43, 10.0, 75.0, 15.0,
 'Link Intime India Private Limited', 'https://linkintime.co.in/initial_offerings/public-issues.html',
 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.nseindia.com/get-quotes/equity?symbol=SWIGGY'),

-- LISTED: NTPC Green Energy
('44444444-4444-4444-4444-444444440012', '33333333-3333-3333-3333-333333330006', 'ntpc-green-energy-ipo', 'Mainboard', 'NSE, BSE', 'listed', 'confirmed',
 '2024-11-19', '2024-11-22', '2024-11-25', '2024-11-26', '2024-11-26', '2024-11-27',
 102.00, 108.00, 108.00, 138, 10000.00, 10000.00, 0.00, 10.0, 75.0, 15.0,
 'KFin Technologies Limited', 'https://kosmic.kfintech.com/ipostatus/',
 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.nseindia.com/get-quotes/equity?symbol=NTPCGREEN'),

-- LISTED: Ganesh Green Bharat (SME)
('44444444-4444-4444-4444-444444440006', '33333333-3333-3333-3333-333333330012', 'ganesh-green-bharat-ipo', 'SME', 'NSE Emerge', 'listed', 'confirmed',
 '2024-07-05', '2024-07-09', '2024-07-10', '2024-07-11', '2024-07-11', '2024-07-12',
 181.00, 190.00, 190.00, 600, 125.23, 125.23, 0.00, 35.0, 50.0, 15.0,
 'KFin Technologies Limited', 'https://kosmic.kfintech.com/ipostatus/',
 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.nseindia.com/get-quotes/equity?symbol=GGBL'),

-- LISTED: HD Fire Protect
('44444444-4444-4444-4444-444444440023', '33333333-3333-3333-3333-333333330023', 'hd-fire-protect-ipo', 'Mainboard', 'NSE, BSE', 'listed', 'confirmed',
 '2026-10-12', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-19', '2026-10-20',
 258.00, 271.00, 271.00, 55, 380.00, 300.00, 80.00, 35.0, 50.0, 15.0,
 'Link Intime India Private Limited', 'https://linkintime.co.in/initial_offerings/public-issues.html',
 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx'),

-- ONGOING: Jio Platforms Limited (Reliance Jio IPO - LIVE NOW)
('44444444-4444-4444-4444-444444440020', '33333333-3333-3333-3333-333333330020', 'jio-platforms-ipo', 'Mainboard', 'NSE, BSE', 'ongoing', 'confirmed',
 '2026-10-21', '2026-10-23', '2026-10-24', '2026-10-27', '2026-10-27', '2026-10-28',
 1065.00, 1119.00, NULL, 12, 30213.00, 30213.00, 0.00, 35.0, 50.0, 15.0,
 'KFin Technologies Limited', 'https://kosmic.kfintech.com/ipostatus/',
 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo'),

-- ONGOING: Paras Healthcare
('44444444-4444-4444-4444-444444440021', '33333333-3333-3333-3333-333333330021', 'paras-healthcare-ipo', 'Mainboard', 'NSE, BSE', 'ongoing', 'confirmed',
 '2026-10-21', '2026-10-23', '2026-10-24', '2026-10-27', '2026-10-27', '2026-10-28',
 660.00, 693.00, NULL, 21, 850.00, 500.00, 350.00, 35.0, 50.0, 15.0,
 'Link Intime India Private Limited', 'https://linkintime.co.in/initial_offerings/public-issues.html',
 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx'),

-- ONGOING: Acme India Industries
('44444444-4444-4444-4444-444444440022', '33333333-3333-3333-3333-333333330022', 'acme-india-industries-ipo', 'Mainboard', 'NSE, BSE', 'ongoing', 'confirmed',
 '2026-10-21', '2026-10-23', '2026-10-24', '2026-10-27', '2026-10-27', '2026-10-28',
 186.00, 196.00, NULL, 76, 122.00, 105.98, 16.02, 35.0, 50.0, 15.0,
 'Bigshare Services Private Limited', 'https://www.bigshareonline.com/ipo_Allotment.html',
 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo'),

-- ONGOING: Ventive Hospitality
('44444444-4444-4444-4444-444444440013', '33333333-3333-3333-3333-333333330013', 'ventive-hospitality-ipo', 'Mainboard', 'NSE, BSE', 'ongoing', 'confirmed',
 CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '4 days', CURRENT_DATE + INTERVAL '4 days', CURRENT_DATE + INTERVAL '6 days',
 610.00, 643.00, NULL, 23, 2000.00, 2000.00, 0.00, 35.0, 50.0, 15.0,
 'KFin Technologies Limited', 'https://kosmic.kfintech.com/ipostatus/',
 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx'),

-- ONGOING: Senores Pharmaceuticals
('44444444-4444-4444-4444-444444440014', '33333333-3333-3333-3333-333333330014', 'senores-pharmaceuticals-ipo', 'Mainboard', 'NSE, BSE', 'ongoing', 'confirmed',
 CURRENT_DATE, CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '4 days', CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '7 days',
 371.00, 391.00, NULL, 38, 582.00, 500.00, 82.00, 35.0, 50.0, 15.0,
 'Link Intime India Private Limited', 'https://linkintime.co.in/initial_offerings/public-issues.html',
 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo'),

-- ONGOING: Carraro India
('44444444-4444-4444-4444-444444440015', '33333333-3333-3333-3333-333333330015', 'carraro-india-ipo', 'Mainboard', 'NSE, BSE', 'ongoing', 'confirmed',
 CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '5 days',
 668.00, 704.00, NULL, 21, 1811.65, 0.00, 1811.65, 35.0, 50.0, 15.0,
 'Link Intime India Private Limited', 'https://linkintime.co.in/initial_offerings/public-issues.html',
 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo'),

-- ONGOING: Unimech Aerospace
('44444444-4444-4444-4444-444444440016', '33333333-3333-3333-3333-333333330016', 'unimech-aerospace-ipo', 'Mainboard', 'NSE, BSE', 'ongoing', 'confirmed',
 CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '4 days', CURRENT_DATE + INTERVAL '4 days', CURRENT_DATE + INTERVAL '6 days',
 745.00, 785.00, NULL, 19, 500.00, 250.00, 250.00, 35.0, 50.0, 15.0,
 'KFin Technologies Limited', 'https://kosmic.kfintech.com/ipostatus/',
 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx'),

-- ONGOING: Enviro Infra Engineers
('44444444-4444-4444-4444-444444440007', '33333333-3333-3333-3333-333333330007', 'enviro-infra-engineers-ipo', 'Mainboard', 'NSE, BSE', 'ongoing', 'confirmed',
 CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '4 days', CURRENT_DATE + INTERVAL '4 days', CURRENT_DATE + INTERVAL '6 days',
 140.00, 148.00, NULL, 101, 650.43, 572.46, 77.97, 35.0, 50.0, 15.0,
 'Bigshare Services Private Limited', 'https://www.bigshareonline.com/ipo_Allotment.html',
 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo'),

-- ONGOING: Rajputana Biodiesel (SME)
('44444444-4444-4444-4444-444444440008', '33333333-3333-3333-3333-333333330008', 'rajputana-biodiesel-ipo', 'SME', 'NSE Emerge', 'ongoing', 'confirmed',
 CURRENT_DATE, CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '4 days', CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '7 days',
 123.00, 130.00, NULL, 1000, 24.70, 24.70, 0.00, 35.0, 50.0, 15.0,
 'Maashitla Securities Private Limited', 'https://maashitla.com/allotment-status',
 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo'),

-- UPCOMING: Vishal Mega Mart
('44444444-4444-4444-4444-444444440010', '33333333-3333-3333-3333-333333330010', 'vishal-mega-mart-ipo', 'Mainboard', 'NSE, BSE', 'upcoming', 'dates_announced',
 CURRENT_DATE + INTERVAL '4 days', CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '8 days', CURRENT_DATE + INTERVAL '9 days', CURRENT_DATE + INTERVAL '9 days', CURRENT_DATE + INTERVAL '11 days',
 74.00, 78.00, NULL, 190, 8000.00, 0.00, 8000.00, 35.0, 50.0, 15.0,
 'KFin Technologies Limited', 'https://kosmic.kfintech.com/ipostatus/',
 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo'),

-- UPCOMING: Indo Farm Equipment
('44444444-4444-4444-4444-444444440017', '33333333-3333-3333-3333-333333330017', 'indo-farm-equipment-ipo', 'Mainboard', 'NSE, BSE', 'upcoming', 'dates_announced',
 CURRENT_DATE + INTERVAL '6 days', CURRENT_DATE + INTERVAL '9 days', CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '11 days', CURRENT_DATE + INTERVAL '11 days', CURRENT_DATE + INTERVAL '13 days',
 205.00, 215.00, NULL, 69, 275.00, 275.00, 0.00, 35.0, 50.0, 15.0,
 'Link Intime India Private Limited', 'https://linkintime.co.in/initial_offerings/public-issues.html',
 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx'),

-- UPCOMING: Mamata Machinery
('44444444-4444-4444-4444-444444440018', '33333333-3333-3333-3333-333333330018', 'mamata-machinery-ipo', 'Mainboard', 'NSE, BSE', 'upcoming', 'dates_announced',
 CURRENT_DATE + INTERVAL '9 days', CURRENT_DATE + INTERVAL '12 days', CURRENT_DATE + INTERVAL '13 days', CURRENT_DATE + INTERVAL '14 days', CURRENT_DATE + INTERVAL '14 days', CURRENT_DATE + INTERVAL '16 days',
 230.00, 243.00, NULL, 61, 400.00, 0.00, 400.00, 35.0, 50.0, 15.0,
 'Link Intime India Private Limited', 'https://linkintime.co.in/initial_offerings/public-issues.html',
 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo'),

-- UPCOMING: DAM Capital Advisors
('44444444-4444-4444-4444-444444440019', '33333333-3333-3333-3333-333333330019', 'dam-capital-advisors-ipo', 'Mainboard', 'NSE, BSE', 'upcoming', 'dates_announced',
 CURRENT_DATE + INTERVAL '12 days', CURRENT_DATE + INTERVAL '15 days', CURRENT_DATE + INTERVAL '16 days', CURRENT_DATE + INTERVAL '17 days', CURRENT_DATE + INTERVAL '17 days', CURRENT_DATE + INTERVAL '19 days',
 269.00, 283.00, NULL, 53, 840.00, 0.00, 840.00, 35.0, 50.0, 15.0,
 'Link Intime India Private Limited', 'https://linkintime.co.in/initial_offerings/public-issues.html',
 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo'),

-- UPCOMING: Hexaware Technologies
('44444444-4444-4444-4444-444444440011', '33333333-3333-3333-3333-333333330011', 'hexaware-technologies-ipo', 'Mainboard', 'NSE, BSE', 'upcoming', 'expected',
 CURRENT_DATE + INTERVAL '16 days', CURRENT_DATE + INTERVAL '20 days', CURRENT_DATE + INTERVAL '21 days', CURRENT_DATE + INTERVAL '22 days', CURRENT_DATE + INTERVAL '22 days', CURRENT_DATE + INTERVAL '24 days',
 NULL, NULL, NULL, NULL, 9950.00, 0.00, 9950.00, 35.0, 50.0, 15.0,
 'Link Intime India Private Limited', 'https://linkintime.co.in/initial_offerings/public-issues.html',
 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.sebi.gov.in/filings/public-issues.html', 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo')
ON CONFLICT (slug) DO NOTHING;

-- 5. Insert Listing Results (Historical Actuals)
INSERT INTO listing_results (
    ipo_id, issue_price, listing_price, listing_date, first_day_close, previous_close, verified_at
) VALUES
('44444444-4444-4444-4444-444444440001', 1503.00, 2550.00, '2024-10-28', 2345.00, 2550.00, NOW()),
('44444444-4444-4444-4444-444444440002', 70.00, 150.00, '2024-09-16', 165.00, 150.00, NOW()),
('44444444-4444-4444-4444-444444440003', 450.00, 991.00, '2024-09-03', 990.00, 991.00, NOW()),
('44444444-4444-4444-4444-444444440004', 1960.00, 1934.00, '2024-10-22', 1819.60, 1934.00, NOW()),
('44444444-4444-4444-4444-444444440005', 390.00, 420.00, '2024-11-13', 456.00, 420.00, NOW()),
('44444444-4444-4444-4444-444444440006', 190.00, 361.00, '2024-07-12', 379.05, 361.00, NOW()),
('44444444-4444-4444-4444-444444440012', 108.00, 111.50, '2024-11-27', 122.00, 111.50, NOW()),
('44444444-4444-4444-4444-444444440023', 271.00, 340.00, '2026-10-20', 338.50, 340.00, NOW())
ON CONFLICT (ipo_id) DO NOTHING;

-- 6. Insert GMP Snapshots
INSERT INTO gmp_snapshots (
    ipo_id, gmp_amount, currency, unit, source_id, source_name, source_url, observed_at, verification_status, notes
) VALUES
-- Jio Platforms Limited (Reliance Jio IPO - LIVE NOW)
('44444444-4444-4444-4444-444444440020', 215.00, 'INR', 'per share', '11111111-1111-1111-1111-111111110005', 'IPOWatch Desk', 'https://ipowatch.in', NOW() - INTERVAL '1 day', 'verified', 'Massive Day 1 retail interest'),
('44444444-4444-4444-4444-444444440020', 246.00, 'INR', 'per share', '11111111-1111-1111-1111-111111110004', 'InvestorGain Estimates', 'https://www.investorgain.com', NOW() - INTERVAL '1 hour', 'verified', 'Firm 22% premium supported by 4.35x subscription'),

-- Paras Healthcare (Ongoing)
('44444444-4444-4444-4444-444444440021', 85.00, 'INR', 'per share', '11111111-1111-1111-1111-111111110004', 'InvestorGain Estimates', 'https://www.investorgain.com', NOW() - INTERVAL '2 hours', 'verified', 'Hospital chain valuation appetite'),

-- Acme India Industries (Ongoing)
('44444444-4444-4444-4444-444444440022', 38.00, 'INR', 'per share', '11111111-1111-1111-1111-111111110005', 'IPOWatch Desk', 'https://ipowatch.in', NOW() - INTERVAL '2 hours', 'verified', 'Machinery fabrication book strength'),

-- Ventive Hospitality (Ongoing)
('44444444-4444-4444-4444-444444440013', 55.00, 'INR', 'per share', '11111111-1111-1111-1111-111111110004', 'InvestorGain Estimates', 'https://www.investorgain.com', NOW() - INTERVAL '2 days', 'verified', 'Pre-bidding quotation'),
('44444444-4444-4444-4444-444444440013', 75.00, 'INR', 'per share', '11111111-1111-1111-1111-111111110004', 'InvestorGain Estimates', 'https://www.investorgain.com', NOW() - INTERVAL '2 hours', 'verified', 'Active dealer quote'),

-- Senores Pharmaceuticals (Ongoing)
('44444444-4444-4444-4444-444444440014', 65.00, 'INR', 'per share', '11111111-1111-1111-1111-111111110005', 'IPOWatch Desk', 'https://ipowatch.in', NOW() - INTERVAL '1 day', 'verified', 'Initial quote'),
('44444444-4444-4444-4444-444444440014', 88.00, 'INR', 'per share', '11111111-1111-1111-1111-111111110004', 'InvestorGain Estimates', 'https://www.investorgain.com', NOW() - INTERVAL '1 hour', 'verified', 'Strong generic portfolio valuation'),

-- Carraro India (Ongoing)
('44444444-4444-4444-4444-444444440015', 40.00, 'INR', 'per share', '11111111-1111-1111-1111-111111110004', 'InvestorGain Estimates', 'https://www.investorgain.com', NOW() - INTERVAL '2 days', 'verified', 'Initial quote'),
('44444444-4444-4444-4444-444444440015', 60.00, 'INR', 'per share', '11111111-1111-1111-1111-111111110004', 'InvestorGain Estimates', 'https://www.investorgain.com', NOW() - INTERVAL '3 hours', 'verified', 'Tractor OEM demand'),

-- Unimech Aerospace (Ongoing)
('44444444-4444-4444-4444-444444440016', 125.00, 'INR', 'per share', '11111111-1111-1111-1111-111111110005', 'IPOWatch Desk', 'https://ipowatch.in', NOW() - INTERVAL '1 day', 'verified', 'Aerospace premium'),
('44444444-4444-4444-4444-444444440016', 165.00, 'INR', 'per share', '11111111-1111-1111-1111-111111110004', 'InvestorGain Estimates', 'https://www.investorgain.com', NOW() - INTERVAL '2 hours', 'verified', 'Strong NII interest'),

-- Enviro Infra Engineers (Ongoing)
('44444444-4444-4444-4444-444444440007', 35.00, 'INR', 'per share', '11111111-1111-1111-1111-111111110004', 'InvestorGain Estimates', 'https://www.investorgain.com', NOW() - INTERVAL '3 days', 'verified', 'Initial grey market quote reported'),
('44444444-4444-4444-4444-444444440007', 44.00, 'INR', 'per share', '11111111-1111-1111-1111-111111110004', 'InvestorGain Estimates', 'https://www.investorgain.com', NOW() - INTERVAL '3 hours', 'verified', 'Latest validated observation'),

-- Rajputana Biodiesel (Ongoing SME)
('44444444-4444-4444-4444-444444440008', 75.00, 'INR', 'per share', '11111111-1111-1111-1111-111111110005', 'IPOWatch Desk', 'https://ipowatch.in', NOW() - INTERVAL '2 days', 'verified', 'Initial quotes opened strong'),
('44444444-4444-4444-4444-444444440008', 85.00, 'INR', 'per share', '11111111-1111-1111-1111-111111110004', 'InvestorGain Estimates', 'https://www.investorgain.com', NOW() - INTERVAL '12 hours', 'verified', 'Strong SME premium momentum'),

-- Vishal Mega Mart (Upcoming)
('44444444-4444-4444-4444-444444440010', 18.00, 'INR', 'per share', '11111111-1111-1111-1111-111111110005', 'IPOWatch Desk', 'https://ipowatch.in', NOW() - INTERVAL '1 day', 'verified', 'Initial whisper numbers circulating'),

-- Indo Farm Equipment (Upcoming)
('44444444-4444-4444-4444-444444440017', 35.00, 'INR', 'per share', '11111111-1111-1111-1111-111111110004', 'InvestorGain Estimates', 'https://www.investorgain.com', NOW() - INTERVAL '6 hours', 'verified', 'Strong farm mechanization sentiment'),

-- Mamata Machinery (Upcoming)
('44444444-4444-4444-4444-444444440018', 42.00, 'INR', 'per share', '11111111-1111-1111-1111-111111110004', 'InvestorGain Estimates', 'https://www.investorgain.com', NOW() - INTERVAL '5 hours', 'verified', 'Packaging robotics exports'),

-- DAM Capital Advisors (Upcoming)
('44444444-4444-4444-4444-444444440019', 48.00, 'INR', 'per share', '11111111-1111-1111-1111-111111110005', 'IPOWatch Desk', 'https://ipowatch.in', NOW() - INTERVAL '4 hours', 'verified', 'Institutional equities franchise'),

-- Waaree Energies (Historical)
('44444444-4444-4444-4444-444444440001', 1200.00, 'INR', 'per share', '11111111-1111-1111-1111-111111110004', 'InvestorGain Estimates', 'https://www.investorgain.com', '2024-10-22 17:30:00+05:30', 'verified', 'Final listing eve GMP observation');

-- 7. Insert Subscriptions
INSERT INTO subscription_snapshots (
    ipo_id, source_id, retail_multiple, nii_multiple, qib_multiple, employee_multiple, shareholder_multiple, total_multiple, unit, day_number, observed_at, verification_status
) VALUES
-- Jio Platforms Limited (Day 2 of Bidding - LIVE NOW)
('44444444-4444-4444-4444-444444440020', '11111111-1111-1111-1111-111111110001', 1.35, 5.80, 9.80, 2.10, 0.00, 4.35, 'times', 2, NOW() - INTERVAL '1 hour', 'verified'),

-- Paras Healthcare (Day 2 of Bidding - LIVE NOW)
('44444444-4444-4444-4444-444444440021', '11111111-1111-1111-1111-111111110001', 2.40, 3.80, 1.95, 1.05, 0.00, 2.65, 'times', 2, NOW() - INTERVAL '2 hours', 'verified'),

-- Acme India Industries (Day 2 of Bidding - LIVE NOW)
('44444444-4444-4444-4444-444444440022', '11111111-1111-1111-1111-111111110001', 8.50, 14.20, 3.40, 0.00, 0.00, 8.10, 'times', 2, NOW() - INTERVAL '2 hours', 'verified'),

-- Ventive Hospitality (Day 2 of Bidding)
('44444444-4444-4444-4444-444444440013', '11111111-1111-1111-1111-111111110001', 2.85, 4.12, 1.45, 1.10, 0.00, 2.65, 'times', 2, NOW() - INTERVAL '2 hours', 'verified'),

-- Senores Pharmaceuticals (Day 1 of Bidding)
('44444444-4444-4444-4444-444444440014', '11111111-1111-1111-1111-111111110001', 5.42, 8.90, 2.10, 0.00, 0.00, 4.80, 'times', 1, NOW() - INTERVAL '3 hours', 'verified'),

-- Carraro India (Day 2 of Bidding)
('44444444-4444-4444-4444-444444440015', '11111111-1111-1111-1111-111111110001', 1.95, 3.20, 1.15, 0.00, 0.00, 1.85, 'times', 2, NOW() - INTERVAL '2 hours', 'verified'),

-- Unimech Aerospace (Day 2 of Bidding)
('44444444-4444-4444-4444-444444440016', '11111111-1111-1111-1111-111111110001', 7.15, 12.40, 3.50, 2.40, 0.00, 6.85, 'times', 2, NOW() - INTERVAL '1 hour', 'verified'),

-- Enviro Infra Engineers (Day 2 of Bidding)
('44444444-4444-4444-4444-444444440007', '11111111-1111-1111-1111-111111110001', 16.42, 31.85, 5.12, 0.00, 0.00, 16.78, 'times', 2, NOW() - INTERVAL '2 hours', 'verified'),

-- Rajputana Biodiesel (Day 1 of Bidding)
('44444444-4444-4444-4444-444444440008', '11111111-1111-1111-1111-111111110001', 38.60, 22.10, 2.40, 0.00, 0.00, 24.35, 'times', 1, NOW() - INTERVAL '4 hours', 'verified'),

-- Historical: NTPC Green Energy (Final close)
('44444444-4444-4444-4444-444444440012', '11111111-1111-1111-1111-111111110001', 3.44, 4.83, 3.32, 3.80, 0.00, 3.36, 'times', 3, '2024-11-22 17:00:00+05:30', 'verified'),

-- Historical: Waaree Energies (Final close)
('44444444-4444-4444-4444-444444440001', '11111111-1111-1111-1111-111111110001', 10.79, 62.48, 208.63, 5.17, 0.00, 76.34, 'times', 3, '2024-10-23 17:00:00+05:30', 'verified'),

-- Historical: Bajaj Housing Finance (Final close)
('44444444-4444-4444-4444-444444440002', '11111111-1111-1111-1111-111111110001', 7.02, 41.50, 209.36, 2.05, 0.00, 63.61, 'times', 3, '2024-09-11 17:00:00+05:30', 'verified');

-- 8. Insert Initial Audit Logs
INSERT INTO audit_logs (actor_id, actor_name, action, entity_type, entity_id, before_values, after_values) VALUES
('22222222-2222-2222-2222-222222220001', 'Milan Patadia', 'SYSTEM_INITIALIZE', 'database', 'system_init', null, '{"message": "Initialized production database schema with seed data and verified providers"}'),
('22222222-2222-2222-2222-222222220002', 'Senior Research Analyst', 'GMP_VERIFY', 'gmp_snapshot', 'waaree-energies-ipo', '{"status": "unverified"}', '{"status": "verified", "amount": 1200}');

-- 9. Insert Initial Feed Runs
INSERT INTO feed_runs (source_id, job_type, started_at, finished_at, status, records_fetched, records_accepted, records_rejected, error_summary) VALUES
('11111111-1111-1111-1111-111111110001', 'ipo_discovery', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '29 minutes', 'success', 12, 12, 0, null),
('11111111-1111-1111-1111-111111110004', 'gmp_sync', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '14 minutes', 'success', 8, 8, 0, null);
