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
  assert('CSV validation detects missing expected headers', invalidResult.rejected > 0);

  console.log(`\n========================================`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
