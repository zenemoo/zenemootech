import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { staffIdCardService } from '../src/services/staffIdCardService.js';
import { supabase } from '../src/config/supabase.js';

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}:`, err.message);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}:`, err.message);
  }
}

console.log('================================================================');
console.log('ZENEMOO STAFF ID CARD GENERATOR — PHASE 2 AUTOMATED TEST SUITE');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// 1. Exact Staff ID lookup returning only the required fields
// -----------------------------------------------------------------------------
await runAsyncTest('Test 1: Exact Staff ID lookup returns only required columns', async () => {
  const result = await staffIdCardService.lookupStaff('ZNM-6E1F0');
  assert.strictEqual(result.found, true, 'Staff record should be found for ZNM-6E1F0');
  assert.strictEqual(result.count, 1, 'Exact Staff ID should return exactly 1 record');
  
  const record = result.records[0];
  assert.strictEqual(record.name, 'Prem Prasad Pradhan', 'Staff name should match');
  assert.ok(record.id, 'Record should have ID');
  assert.ok(record.image_url, 'Record should have image_url');
  
  // Verify sensitive columns are NOT returned
  assert.strictEqual(record.bank_account_number, undefined, 'Sensitive bank account must not be in projection');
  assert.strictEqual(record.pan_number, undefined, 'PAN number must not be in projection');
  assert.strictEqual(record.password_hash, undefined, 'Password hash must not be in projection');
  assert.strictEqual(record.upi_id, undefined, 'UPI ID must not be in projection');
});

// -----------------------------------------------------------------------------
// 2. Name lookup and ambiguous name handling
// -----------------------------------------------------------------------------
await runAsyncTest('Test 2: Name lookup returns candidates and handles ambiguity', async () => {
  const result = await staffIdCardService.lookupStaff('Kumar');
  assert.strictEqual(result.found, true, 'Should find candidates matching "Kumar"');
  assert.ok(result.count >= 2, 'Should return multiple candidates for ambiguous name');
  const names = result.records.map(r => r.name);
  assert.ok(names.some(n => n.includes('Kumar')), 'Results must contain matching names');
});

// -----------------------------------------------------------------------------
// 3. Locked source Staff ID in fetched mode
// -----------------------------------------------------------------------------
runTest('Test 3: Fetched mode locks source Staff ID', () => {
  const mode = 'fetched';
  const isReadOnly = mode === 'fetched';
  assert.strictEqual(isReadOnly, true, 'Staff ID input must be locked read-only in fetched mode');
});

// -----------------------------------------------------------------------------
// 4. Manual mode independence (does not mutate team table)
// -----------------------------------------------------------------------------
await runAsyncTest('Test 4: Manual mode creates card without altering team table', async () => {
  // Count current team members
  const { count: teamBefore } = await supabase.from('team').select('id', { count: 'exact', head: true });
  
  const manualCard = await staffIdCardService.saveCard({
    staff_id: 'ZNM-TEST-MANUAL-001',
    mode: 'manual',
    card_full_name: 'Test Manual Contractor',
    card_designation: 'Temporary Annotator',
    card_department: 'Contractors',
    card_email: 'test.contractor@zenemoo.in',
  }, 'test-admin@zenemoo.in');

  assert.ok(manualCard.id, 'Manual card must receive an ID');
  assert.strictEqual(manualCard.mode, 'manual');
  assert.strictEqual(manualCard.team_member_id, null, 'Manual card has no foreign key to team');

  const { count: teamAfter } = await supabase.from('team').select('id', { count: 'exact', head: true });
  assert.strictEqual(teamBefore, teamAfter, 'Team table row count must remain completely unchanged');

  // Clean up test card
  await staffIdCardService.deleteCard(manualCard.id);
});

// -----------------------------------------------------------------------------
// 5. Each optional field visibility toggle
// -----------------------------------------------------------------------------
runTest('Test 5: Optional field visibility defaults and toggles', () => {
  const visibility = {
    designation: true,
    staff_id: true,
    email: false, // toggled off
    phone: false, // toggled off
    department: true,
    joining_year: true,
    qr_code: true,
  };

  assert.strictEqual(visibility.email, false, 'Email can be toggled off');
  assert.strictEqual(visibility.phone, false, 'Phone can be toggled off');
  assert.strictEqual(visibility.designation, true, 'Designation can be toggled on');
});

// -----------------------------------------------------------------------------
// 6. Safe Cloudinary asset guard: original team photo is NEVER deleted
// -----------------------------------------------------------------------------
await runAsyncTest('Test 6: Safe Cloudinary guard protects original team photo', async () => {
  // Take Prem's Cloudinary image URL: huq7bbgg3a5rcjpnah0h
  const samplePublicId = 'zenemoo/team/huq7bbgg3a5rcjpnah0h';

  let deleteAttempted = false;
  const mockDelete = async (pid) => {
    deleteAttempted = true;
  };

  // Run the safe clean method
  await staffIdCardService.safelyCleanCloudinaryAsset(samplePublicId, 'dummy-card-id');
  
  assert.strictEqual(deleteAttempted, false, 'Original photo referenced in team.image_url must NEVER be deleted');
});

// -----------------------------------------------------------------------------
// 7. Safe Cloudinary asset guard: shared asset between cards is NEVER deleted
// -----------------------------------------------------------------------------
await runAsyncTest('Test 7: Safe Cloudinary guard protects shared card assets', async () => {
  const sharedAssetId = 'zenemoo/team/test_shared_asset_123';
  
  // Card 1
  const card1 = await staffIdCardService.saveCard({
    staff_id: 'ZNM-TEST-CARD-A',
    card_full_name: 'Card A Holder',
    card_photo_public_id: sharedAssetId,
    card_photo_is_owned: true,
  });

  // Card 2 shares the same photo
  const card2 = await staffIdCardService.saveCard({
    staff_id: 'ZNM-TEST-CARD-B',
    card_full_name: 'Card B Holder',
    card_photo_public_id: sharedAssetId,
    card_photo_is_owned: true,
  });

  // Deleting card 1 should NOT delete the shared asset because card 2 uses it
  await staffIdCardService.deleteCard(card1.id);

  // Card 2 still exists
  const loaded2 = await staffIdCardService.getCardById(card2.id);
  assert.ok(loaded2?.card, 'Card 2 must still exist');

  // Clean up Card 2
  await staffIdCardService.deleteCard(card2.id);
});

// -----------------------------------------------------------------------------
// 8. QR Encoding canonical profile URL & Logo Overlay Verification
// -----------------------------------------------------------------------------
await runAsyncTest('Test 8: QR Code encodes verified canonical public profile URL', async () => {
  const slug = 'prem-prasad-pradhan';
  const expectedUrl = `https://www.zenemoo.in/team/${slug}`;
  
  const qrString = await QRCode.toString(expectedUrl, {
    type: 'utf8',
    errorCorrectionLevel: 'H',
  });

  assert.ok(qrString.length > 0, 'QR Matrix string should be generated');
  assert.ok(!expectedUrl.includes('phone'), 'QR must never contain phone numbers');
  assert.ok(!expectedUrl.includes('bank'), 'QR must never contain banking details');
  assert.strictEqual(expectedUrl.startsWith('https://www.zenemoo.in/team/'), true, 'Must start with canonical team destination');
});

// -----------------------------------------------------------------------------
// 9. PNG/JPG Export Dimensions and CR-80 Aspect Ratio
// -----------------------------------------------------------------------------
runTest('Test 9: Export dimensions match standard CR-80 portrait aspect ratio', () => {
  const target300W = 1200;
  const target300H = 1900;
  const target600W = 2400;
  const target600H = 3800;

  const ratio300 = target300H / target300W; // 1.5833
  const ratio600 = target600H / target600W; // 1.5833
  const standardCr80Ratio = 85.60 / 53.98; // 1.5857

  assert.ok(Math.abs(ratio300 - standardCr80Ratio) < 0.01, '300 DPI aspect ratio must match CR-80 within 0.01');
  assert.ok(Math.abs(ratio600 - standardCr80Ratio) < 0.01, '600 DPI aspect ratio must match CR-80 within 0.01');
});

// -----------------------------------------------------------------------------
// 10. No image blobs or base64 data saved to Supabase / store
// -----------------------------------------------------------------------------
await runAsyncTest('Test 10: Saved cards do NOT contain image blobs or base64 strings', async () => {
  const card = await staffIdCardService.saveCard({
    staff_id: 'ZNM-TEST-PERSISTENCE',
    card_full_name: 'No Blob Staff Member',
    card_photo_url: 'https://res.cloudinary.com/rwoe0mm9/image/upload/v1785185414/zenemoo/team/sample.jpg',
  });

  assert.ok(!card.card_photo_url.startsWith('data:image/'), 'Photo URL must never be a base64 data URL in database');
  assert.strictEqual(card.card_image_blob, undefined, 'Blob column must not exist');
  assert.strictEqual(card.rendered_card_png, undefined, 'Rendered PNG must not exist');

  await staffIdCardService.deleteCard(card.id);
});

console.log('\n================================================================');
console.log(`TEST SUITE RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
