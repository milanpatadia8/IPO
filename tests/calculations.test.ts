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
  calculateIPOProfit,
  getFireRatingInfo,
} from '../src/lib/calculations';
import { ipoStore } from '../src/lib/store';

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
  // 7. Subscription History Progression & Chronological Sorting
  const waaree = ipoStore.getIPOBySlug('waaree-energies-ipo');
  assert('Waaree Energies has multi-day subscription snapshots', !!waaree?.subscription_history && waaree.subscription_history.length >= 3);
  if (waaree?.subscription_history && waaree.subscription_history.length >= 3) {
    const isSorted = waaree.subscription_history[0].day_number === 1 &&
      waaree.subscription_history[1].day_number === 2 &&
      waaree.subscription_history[2].day_number === 3;
    assert('Subscription snapshots are chronologically sorted across Day 1, 2, and 3', isSorted);
    assert('Day 3 institutional demand reflects final surge', waaree.subscription_history[2].total_multiple === 76.34);
  }

  const jio = ipoStore.getIPOBySlug('jio-platforms-ipo');
  assert('Jio Platforms has multi-day snapshots for active issue', !!jio?.subscription_history && jio.subscription_history.length >= 2);

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

  console.log(`\n========================================`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
