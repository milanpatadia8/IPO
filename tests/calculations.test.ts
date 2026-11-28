// =====================================================================
// Automated Unit Tests: tests/calculations.test.ts
// Verifies core financial, date, and validation logic
// =====================================================================

import {
  calculateListingGain,
  calculateListingGainPercentage,
  calculateIndicativeListingPrice,
  calculateIndicativeGainPercentage,
  calculateDaysRemaining,
  isObservationStale,
  calculateMinApplication,
  getEffectiveMinInvestment,
  buildInvestmentMultiplesSchedule,
  calculateIPOProfit,
  getFireRatingInfo,
  deriveIPOStatusFromDates,
} from '../src/lib/calculations';
import { ipoStore } from '../src/lib/store';
import {
  PRIMARY_ADMIN_EMAIL,
  loginWithPassword,
  signupWithPassword,
  authorizeAdminEmail,
  revokeAdminEmail,
  listAuthorizedAdminEmails,
} from '../src/server-auth';

function runTests() {
  console.log('🧪 Starting IPO Tracker India Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(description: string, condition: boolean) {
    if (condition) {
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${description}`);
      failed++;
    }
  }

  // 0. Clean initial store verification (zero pre-seeded demo records)
  assert(
    'Store starts completely empty with 0 IPOs, 0 clients, 0 feed runs, and 0 audit logs',
    ipoStore.getAllIPOs().length === 0 &&
      ipoStore.getAllClients().length === 0 &&
      ipoStore.getFeedRuns().length === 0 &&
      ipoStore.getAuditLogs().length === 0
  );

  // 1. Listing Gain in Rupees
  // Waaree Energies: Issue 1503, Listing 2550 -> +1047
  const gainWaaree = calculateListingGain(1503, 2550);
  assert('Listing gain calculation in rupees (positive)', gainWaaree === 1047);

  // Hyundai: Issue 1960, Listing 1934 -> -26
  const gainHyundai = calculateListingGain(1960, 1934);
  assert('Listing gain calculation in rupees (discount/loss)', gainHyundai === -26);

  // 2. Listing Gain Percentage
  // Premier Energies: Issue 450, Listing 991 -> +120.22%
  const gainPctPremier = calculateListingGainPercentage(450, 991);
  assert(
    'Listing gain percentage calculation (+120.22%)',
    Math.abs(gainPctPremier - 120.22) < 0.01
  );

  // Bajaj Housing Finance: Issue 70, Listing 150 -> +114.29%
  const gainPctBajaj = calculateListingGainPercentage(70, 150);
  assert('Listing gain percentage for Bajaj Housing Finance (+114.29%)', Math.abs(gainPctBajaj - 114.29) < 0.01);

  // Missing or zero values handling
  assert('Zero issue price returns 0', calculateListingGainPercentage(0, 100) === 0);

  // 3. Indicative Listing Price & Gain % from GMP
  // Enviro Infra: Price band 148, GMP 44 -> 192 (Est. gain: 29.73%)
  const indEst = calculateIndicativeListingPrice(148, 44);
  assert('Indicative listing price = Issue Price + GMP (148 + 44 = 192)', indEst.price === 192);

  const indGainPct = calculateIndicativeGainPercentage(148, 44);
  assert(
    'Indicative gain percentage (44 / 148 * 100 = 29.73%)',
    indGainPct !== null && Math.abs(indGainPct - 29.73) < 0.01
  );

  // 4. Staleness Detection
  const recentObservation = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
  assert('Observation 2 hours old is NOT stale', !isObservationStale(recentObservation, 24));

  const staleObservation = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
  assert('Observation 36 hours old IS stale', isObservationStale(staleObservation, 24));

  // 5. Minimum Application Calculation
  // 148 * 101 shares = 14,948
  const minApp = calculateMinApplication(148, 101);
  assert('Minimum application amount calculation (148 * 101 = 14,948)', minApp === 14948);

  // 6. CSV Importer Validation and Duplicate Detection
  const validCSV = `company,category,exchange,price,lot_size,issue_size,status
Test Solar Limited,Mainboard,NSE, BSE,100,50,500,upcoming`;
  const importResult = ipoStore.importFromCSV(
    validCSV,
    { id: 'test-user', name: 'Tester' },
    { dryRun: true }
  );
  assert('CSV validation dry run accepts valid schema', importResult.accepted === 1 && importResult.rejected === 0);

  const invalidCSV = `company,wrong_category,exchange
Test 1,SME,BSE`;
  const invalidResult = ipoStore.importFromCSV(
    invalidCSV,
    { id: 'test-user', name: 'Tester' },
    { dryRun: true }
  );
  assert('CSV validation rejects missing required columns', invalidResult.rejected === 1 && invalidResult.errors.length > 0);

  // 7. Subscription History Progression & Chronological Sorting (self-contained)
  const subActor = { id: 'test-admin', name: 'Test Admin' };
  const subTestIpo = ipoStore.createIPO(
    {
      companyName: 'Chronological Sub Test Ltd',
      category: 'Mainboard',
      exchange: 'NSE, BSE',
      status: 'ongoing',
      announcement_status: 'confirmed',
      price_band_min: 100,
      price_band_max: 110,
      lot_size: 100,
    },
    subActor
  );
  // Insert out-of-order timestamps to confirm chronological sorting
  ipoStore.addSubscriptionSnapshot(
    {
      ipo_id: subTestIpo.id,
      retail_multiple: 10.5,
      nii_multiple: 62.4,
      qib_multiple: 120.8,
      day_number: 3,
      observed_at: '2026-11-23T17:00:00Z',
    },
    subActor
  );
  ipoStore.addSubscriptionSnapshot(
    {
      ipo_id: subTestIpo.id,
      retail_multiple: 1.8,
      nii_multiple: 2.1,
      qib_multiple: 0.4,
      day_number: 1,
      observed_at: '2026-11-21T17:00:00Z',
    },
    subActor
  );
  ipoStore.addSubscriptionSnapshot(
    {
      ipo_id: subTestIpo.id,
      retail_multiple: 4.5,
      nii_multiple: 11.2,
      qib_multiple: 6.5,
      day_number: 2,
      observed_at: '2026-11-22T17:00:00Z',
    },
    subActor
  );

  const hydratedSubIpo = ipoStore.getIPOById(subTestIpo.id);
  assert(
    'Created IPO retains all multi-day subscription snapshots',
    !!hydratedSubIpo?.subscription_history && hydratedSubIpo.subscription_history.length === 3
  );
  if (hydratedSubIpo?.subscription_history && hydratedSubIpo.subscription_history.length === 3) {
    const isSorted =
      hydratedSubIpo.subscription_history[0].day_number === 1 &&
      hydratedSubIpo.subscription_history[1].day_number === 2 &&
      hydratedSubIpo.subscription_history[2].day_number === 3;
    assert('Subscription snapshots are chronologically sorted across Day 1, 2, and 3', isSorted);
    assert(
      'Latest subscription reflects final Day 3 surge',
      hydratedSubIpo.latest_subscription?.day_number === 3 &&
        (hydratedSubIpo.latest_subscription?.total_multiple || 0) > 70
    );
  }
  ipoStore.deleteIPO(subTestIpo.id, subActor);

  // 8. IPO Profit & Return Estimator (IPO Premium Inspired)
  // Lot size: 100, 2 Lots, Base price: 200, GMP: 50
  // Total investment: 100 * 2 * 200 = 40,000
  // Estimated profit: 100 * 2 * 50 = 10,000
  // ROI %: 25.0%
  const profitEst = calculateIPOProfit(100, 2, 200, 50);
  assert('IPO Profit Estimator total investment (100 * 2 * 200 = 40,000)', profitEst.totalInvestment === 40000);
  assert('IPO Profit Estimator profit from GMP (100 * 2 * 50 = 10,000)', profitEst.estimatedProfit === 10000);
  assert('IPO Profit Estimator debut portfolio value (50,000)', profitEst.totalEstimatedValue === 50000);
  assert('IPO Profit Estimator ROI percentage (25%)', profitEst.roiPercentage === 25);

  // 9. Fire Rating Helper (1-5 flame scale)
  const fire5 = getFireRatingInfo(5);
  assert('Fire rating 5 returns 5 flames', fire5.flames === '🔥🔥🔥🔥🔥');
  assert('Fire rating 5 returns Super Hot label', fire5.label.includes('Super Hot'));

  const fire3 = getFireRatingInfo(3);
  assert('Fire rating 3 returns 3 flames', fire3.flames === '🔥🔥🔥');
  assert('Fire rating 3 returns Moderate label', fire3.label.includes('Moderate'));

  // 10. Admin IPO Management: Create, Update (company + IPO fields), and Delete
  const actor = { id: 'admin-1', name: 'Milan Patadia' };
  const createdIpo = ipoStore.createIPO(
    {
      companyName: 'Test Admin Dynamics Limited',
      description: 'Initial description',
      industry: 'Technology',
      category: 'Mainboard',
      exchange: 'NSE, BSE',
      status: 'upcoming',
      announcement_status: 'confirmed',
      price_band_min: 100,
      price_band_max: 110,
      lot_size: 100,
      issue_size: 500,
    },
    actor
  );
  assert('Admin can create IPO', !!createdIpo.id && createdIpo.company?.name === 'Test Admin Dynamics Limited');

  const updatedIpo = ipoStore.updateIPO(
    createdIpo.id,
    {
      companyName: 'Test Admin Dynamics Updated Ltd',
      description: 'Updated description',
      industry: 'FinTech',
      status: 'ongoing',
      price_band_max: 125,
      lot_size: null as unknown as number,
    },
    actor
  );
  assert('Admin update updates IPO status and price band', updatedIpo?.status === 'ongoing' && updatedIpo?.price_band_max === 125);
  assert('Admin update updates linked company name & industry', updatedIpo?.company?.name === 'Test Admin Dynamics Updated Ltd' && updatedIpo?.company?.industry === 'FinTech');
  assert('Admin update clears nullable numeric fields', updatedIpo?.lot_size === undefined);

  const deletedOk = ipoStore.deleteIPO(createdIpo.id, actor);
  assert('Admin can delete IPO', deletedOk === true && !ipoStore.getIPOById(createdIpo.id));

  // 11. Automatic IPO Status from Entered Dates (Upcoming -> Open -> Closed -> Listed)
  const refDate = new Date('2026-11-25T06:00:00Z'); // 2026-11-25 IST
  assert(
    'Date before open_date resolves to upcoming',
    deriveIPOStatusFromDates(
      { open_date: '2026-11-28', close_date: '2026-11-30', listing_date: '2026-12-03' },
      refDate
    ) === 'upcoming'
  );
  assert(
    'Date between open_date and close_date (inclusive) resolves to ongoing (Open)',
    deriveIPOStatusFromDates(
      { open_date: '2026-11-24', close_date: '2026-11-26', listing_date: '2026-11-30' },
      refDate
    ) === 'ongoing'
  );
  assert(
    'Date equal to open_date resolves to ongoing (Open)',
    deriveIPOStatusFromDates(
      { open_date: '2026-11-25', close_date: '2026-11-27', listing_date: '2026-12-01' },
      refDate
    ) === 'ongoing'
  );
  assert(
    'Date equal to close_date resolves to ongoing (Open)',
    deriveIPOStatusFromDates(
      { open_date: '2026-11-23', close_date: '2026-11-25', listing_date: '2026-11-28' },
      refDate
    ) === 'ongoing'
  );
  assert(
    'Date after close_date and before listing_date resolves to closed',
    deriveIPOStatusFromDates(
      { open_date: '2026-11-20', close_date: '2026-11-23', listing_date: '2026-11-27' },
      refDate
    ) === 'closed'
  );
  assert(
    'Date on or after listing_date resolves to listed',
    deriveIPOStatusFromDates(
      { open_date: '2026-11-18', close_date: '2026-11-20', listing_date: '2026-11-25' },
      refDate
    ) === 'listed'
  );
  assert(
    'Store automatically updates IPO status when dates change',
    (() => {
      const autoIpo = ipoStore.createIPO(
        {
          companyName: 'Auto Date Status Corp',
          category: 'Mainboard',
          exchange: 'NSE, BSE',
          status: 'listed', // intentionally mismatched; dates should win
          announcement_status: 'confirmed',
          open_date: '2099-05-10',
          close_date: '2099-05-12',
          listing_date: '2099-05-16',
        },
        actor
      );
      const isUpcoming = autoIpo.status === 'upcoming';
      const updatedListed = ipoStore.updateIPO(
        autoIpo.id,
        {
          open_date: '2024-01-10',
          close_date: '2024-01-12',
          listing_date: '2024-01-16',
        },
        actor
      );
      const isListed = updatedListed?.status === 'listed';
      ipoStore.deleteIPO(autoIpo.id, actor);
      return isUpcoming && isListed;
    })()
  );

  // 12. Fresh Issue, OFS, Quota Distribution & Category Lot Limits
  const structuredIpo = ipoStore.createIPO(
    {
      companyName: 'Quota & Lots Test Corp',
      category: 'Mainboard',
      exchange: 'NSE, BSE',
      status: 'upcoming',
      announcement_status: 'confirmed',
      price_band_min: 190,
      price_band_max: 200,
      lot_size: 75,
      issue_size: 1200,
      fresh_issue_size: 800,
      offer_for_sale_size: 400,
      qib_quota_percent: 45,
      nii_quota_percent: 15,
      retail_quota_percent: 30,
      employee_quota_percent: 5,
      shareholder_quota_percent: 5,
      other_quota_percent: 0,
      category_lot_limits: {
        Retail: { min_lots: 1, max_lots: 13 },
        Employee: { min_lots: 1, max_lots: 13 },
        Shareholder: { min_lots: 1, max_lots: 13 },
        sHNI: { min_lots: 14, max_lots: 66 },
        bHNI: { min_lots: 67 },
        QIB: { min_lots: 100 },
      },
    },
    actor
  );
  assert(
    'Admin create persists Fresh Issue and OFS sizes',
    structuredIpo.fresh_issue_size === 800 && structuredIpo.offer_for_sale_size === 400
  );
  assert(
    'Admin create persists QIB, NII/HNI, Retail, Employee, Shareholder, and Other quotas',
    structuredIpo.qib_quota_percent === 45 &&
      structuredIpo.nii_quota_percent === 15 &&
      structuredIpo.retail_quota_percent === 30 &&
      structuredIpo.employee_quota_percent === 5 &&
      structuredIpo.shareholder_quota_percent === 5 &&
      structuredIpo.other_quota_percent === 0
  );
  assert(
    'Admin create persists category-wise lot limits for Retail, Employee, Shareholder, sHNI, bHNI, and QIB',
    structuredIpo.category_lot_limits?.Retail?.max_lots === 13 &&
      structuredIpo.category_lot_limits?.Employee?.min_lots === 1 &&
      structuredIpo.category_lot_limits?.Shareholder?.max_lots === 13 &&
      structuredIpo.category_lot_limits?.sHNI?.min_lots === 14 &&
      structuredIpo.category_lot_limits?.bHNI?.min_lots === 67 &&
      structuredIpo.category_lot_limits?.QIB?.min_lots === 100
  );
  ipoStore.deleteIPO(structuredIpo.id, actor);

  // 13. Admin Client Data & Fees Paid Ledger
  const createdClient = ipoStore.createClient(
    {
      full_name: 'Aarav Shah',
      email: 'aarav.shah@example.com',
      phone: '9876543210',
      pan: 'ABCDE1234F',
      demat_id: 'IN30000012345678',
      client_code: 'CL-001',
      service_plan: 'Annual IPO Advisory',
      status: 'active',
      total_fee_agreed: 15000,
      initial_fee_paid: 5000,
      initial_payment_date: '2026-11-20',
      initial_payment_mode: 'UPI',
      initial_payment_ref: 'UTR-10001',
    },
    actor
  );
  assert(
    'Client created with initial payment computes partial status and balance due',
    createdClient.total_fee_agreed === 15000 &&
      createdClient.total_fee_paid === 5000 &&
      createdClient.balance_due === 10000 &&
      createdClient.fee_status === 'partial' &&
      createdClient.payments.length === 1
  );

  const afterSecondPayment = ipoStore.addClientPayment(
    createdClient.id,
    {
      amount: 10000,
      payment_date: '2026-11-25',
      payment_mode: 'NEFT/IMPS',
      reference_no: 'NEFT-20002',
      description: 'Final fee settlement',
    },
    actor
  );
  assert(
    'Adding remaining fee payment transitions client fee_status to paid with 0 balance',
    afterSecondPayment?.total_fee_paid === 15000 &&
      afterSecondPayment?.balance_due === 0 &&
      afterSecondPayment?.fee_status === 'paid' &&
      afterSecondPayment?.payments.length === 2
  );

  const secondPaymentId = afterSecondPayment?.payments[0]?.id;
  const afterDeletePayment = secondPaymentId
    ? ipoStore.deleteClientPayment(createdClient.id, secondPaymentId, actor)
    : undefined;
  assert(
    'Deleting a fee payment recalculates paid total, balance due, and status back to partial',
    afterDeletePayment?.total_fee_paid === 5000 &&
      afterDeletePayment?.balance_due === 10000 &&
      afterDeletePayment?.fee_status === 'partial'
  );

  const updatedClient = ipoStore.updateClient(
    createdClient.id,
    { total_fee_agreed: 5000, status: 'inactive' },
    actor
  );
  assert(
    'Updating agreed fee recalculates status to paid and updates client status',
    updatedClient?.fee_status === 'paid' &&
      updatedClient?.balance_due === 0 &&
      updatedClient?.status === 'inactive'
  );

  const deletedClientOk = ipoStore.deleteClient(createdClient.id, actor);
  assert(
    'Admin can delete client record cleanly',
    deletedClientOk === true && ipoStore.getAllClients().length === 0
  );

  // 14. Primary Admin Automatic Role Login & Delegated Admin Email Authorization
  const primaryLogin = loginWithPassword({
    identifier: PRIMARY_ADMIN_EMAIL,
    password: 'StrongAdminPassword123',
  });
  assert(
    'Logging in with primary admin email automatically grants Admin role',
    primaryLogin.user.email === PRIMARY_ADMIN_EMAIL &&
      primaryLogin.user.role === 'admin' &&
      !!primaryLogin.token
  );

  let wrongPasswordRejected = false;
  try {
    loginWithPassword({
      identifier: PRIMARY_ADMIN_EMAIL,
      password: 'WrongPassword123',
    });
  } catch {
    wrongPasswordRejected = true;
  }
  assert(
    'Subsequent primary admin login rejects incorrect password',
    wrongPasswordRejected
  );

  const delegateEmail = 'authorized.partner@example.com';
  const authEntry = authorizeAdminEmail(delegateEmail, primaryLogin.user);
  assert(
    'Primary admin can pre-authorize another email ID for Admin role access',
    authEntry.email === delegateEmail &&
      listAuthorizedAdminEmails().some((e) => e.email === delegateEmail)
  );

  const delegatedSignup = signupWithPassword({
    name: 'Authorized Partner',
    identifier: delegateEmail,
    password: 'PartnerPassword123',
  });
  assert(
    'Pre-authorized email automatically receives Admin role upon signup/login',
    delegatedSignup.user.role === 'admin'
  );

  const regularSignup = signupWithPassword({
    name: 'Regular Investor',
    identifier: 'regular.investor@example.com',
    password: 'InvestorPassword123',
  });
  assert(
    'Non-authorized email receives standard User role only',
    regularSignup.user.role === 'user'
  );

  revokeAdminEmail(delegateEmail, primaryLogin.user);
  const afterRevokeLogin = loginWithPassword({
    identifier: delegateEmail,
    password: 'PartnerPassword123',
  });
  assert(
    'Revoking admin email immediately downgrades that account back to User role',
    afterRevokeLogin.user.role === 'user' &&
      !listAuthorizedAdminEmails().some((e) => e.email === delegateEmail)
  );

  // 16. SME vs Mainboard IPO creation & optional subscription fields
  const boardActor = { id: 'admin-board-test', name: 'Board Tester' };
  const smeIpo = ipoStore.createIPO(
    {
      companyName: 'Apex Precision SME Ltd',
      category: 'SME',
      exchange: 'NSE Emerge',
      status: 'ongoing',
      announcement_status: 'confirmed',
      retail_quota_percent: 50,
      nii_quota_percent: 50,
      qib_quota_percent: 0,
    },
    boardActor
  );
  assert(
    'Admin can create SME IPO with SME exchange',
    smeIpo.category === 'SME' && smeIpo.exchange === 'NSE Emerge'
  );

  const partialSub = ipoStore.addSubscriptionSnapshot(
    {
      ipo_id: smeIpo.id,
      retail_multiple: 12.5,
      day_number: 1,
    },
    boardActor
  );
  assert(
    'Subscription snapshot succeeds with only Retail entered and QIB/NII omitted',
    partialSub.retail_multiple === 12.5 &&
      partialSub.nii_multiple === 0 &&
      partialSub.qib_multiple === 0 &&
      partialSub.total_multiple === 6.25
  );

  const explicitTotalSub = ipoStore.addSubscriptionSnapshot(
    {
      ipo_id: smeIpo.id,
      total_multiple: 18.4,
      day_number: 2,
    },
    boardActor
  );
  assert(
    'Subscription snapshot accepts explicit Total multiple with all category fields blank',
    explicitTotalSub.total_multiple === 18.4 &&
      explicitTotalSub.retail_multiple === 0 &&
      explicitTotalSub.nii_multiple === 0 &&
      explicitTotalSub.qib_multiple === 0
  );
  ipoStore.deleteIPO(smeIpo.id, boardActor);

  // 17. Strict No-Default-Data Policy (Admin enters everything)
  const cleanIpo = ipoStore.createIPO(
    {
      companyName: 'Zero Defaults Corp',
      category: 'SME',
      exchange: 'BSE SME',
      status: 'upcoming',
      announcement_status: 'confirmed',
      retail_quota_percent: 50,
    },
    boardActor
  );
  assert(
    'Omitted RHP and DRHP URLs remain undefined with no default SEBI link',
    cleanIpo.rhp_url === undefined && cleanIpo.drhp_url === undefined
  );
  assert(
    'Omitted quotas remain undefined while only entered quota is stored',
    cleanIpo.retail_quota_percent === 50 &&
      cleanIpo.qib_quota_percent === undefined &&
      cleanIpo.nii_quota_percent === undefined &&
      cleanIpo.employee_quota_percent === undefined
  );
  assert(
    'Omitted industry, registrar, and lot limits remain undefined with no defaults',
    cleanIpo.company?.industry === undefined &&
      cleanIpo.registrar_name === undefined &&
      cleanIpo.category_lot_limits === undefined
  );

  const attachedRhp = 'https://www.sebi.gov.in/sebi_data/attachdocs/custom-rhp.pdf';
  const attachedDrhp = 'https://example.com/filings/custom-drhp.pdf';
  const updatedWithLinks = ipoStore.updateIPO(
    cleanIpo.id,
    { rhp_url: attachedRhp, drhp_url: attachedDrhp },
    boardActor
  );
  assert(
    'Admin-attached RHP and DRHP PDF links are preserved verbatim without override',
    updatedWithLinks?.rhp_url === attachedRhp && updatedWithLinks?.drhp_url === attachedDrhp
  );

  const clearedLinks = ipoStore.updateIPO(
    cleanIpo.id,
    { rhp_url: '', drhp_url: '' },
    boardActor
  );
  assert(
    'Clearing RHP and DRHP links in Admin removes them completely',
    clearedLinks?.rhp_url === undefined && clearedLinks?.drhp_url === undefined
  );
  ipoStore.deleteIPO(cleanIpo.id, boardActor);

  // 18. Delete Unlisted Price Observation
  const priceTestIpo = ipoStore.createIPO(
    {
      companyName: 'Unlisted Price Delete Test Ltd',
      category: 'Mainboard',
      exchange: 'NSE, BSE',
      status: 'ongoing',
      announcement_status: 'confirmed',
    },
    boardActor
  );
  const priceSnap = ipoStore.addGMPSnapshot(
    {
      ipo_id: priceTestIpo.id,
      gmp_amount: 55,
      source_name: 'Desk Quote',
    },
    boardActor
  );
  const deletedSnap = ipoStore.deleteGMPSnapshot(priceSnap.id, boardActor);
  const afterDeleteIpo = ipoStore.getIPOById(priceTestIpo.id);
  assert(
    'Admin can delete an unlisted price observation and clear it from IPO history',
    deletedSnap === true &&
      afterDeleteIpo?.latest_gmp === undefined &&
      (afterDeleteIpo?.gmp_history?.length || 0) === 0
  );
  ipoStore.deleteIPO(priceTestIpo.id, boardActor);

  // 19. Minimum Investment in Multiples calculation and store persistence
  const multiplesIpo = ipoStore.createIPO(
    {
      companyName: 'Multiples Tech India Ltd',
      category: 'SME',
      exchange: 'NSE Emerge',
      status: 'upcoming',
      announcement_status: 'confirmed',
      price_band_min: 95,
      price_band_max: 100,
      lot_size: 1000,
      min_investment_multiples: {
        min_lots: 2,
        multiple_lots: 1,
        min_shares: 2000,
        multiple_shares: 1000,
        min_amount: 200000,
        multiple_amount: 100000,
        max_multiples: 10,
      },
    },
    boardActor
  );
  const effMin = getEffectiveMinInvestment(multiplesIpo);
  const sched = buildInvestmentMultiplesSchedule({
    min_investment_multiples: multiplesIpo.min_investment_multiples,
    lot_size: multiplesIpo.lot_size,
    price_per_share: multiplesIpo.price_band_max,
    previewCount: 5,
  });
  assert(
    'Admin create persists min_investment_multiples and computes effective min investment (₹2,00,000)',
    effMin === 200000 &&
      multiplesIpo.min_investment_multiples?.min_lots === 2 &&
      multiplesIpo.min_investment_multiples?.multiple_lots === 1
  );
  assert(
    'Investment multiples schedule produces accurate 1x, 2x, and max rows',
    sched !== null &&
      sched.rows.length === 6 &&
      sched.rows[0].lots === 2 &&
      sched.rows[0].amount === 200000 &&
      sched.rows[1].lots === 3 &&
      sched.rows[1].amount === 300000 &&
      sched.rows[5].step === 10 &&
      sched.rows[5].amount === 1100000
  );
  ipoStore.deleteIPO(multiplesIpo.id, boardActor);

  console.log(`\n========================================`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
