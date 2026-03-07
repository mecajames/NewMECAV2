import * as fs from 'fs';

function parseRowValues(rowData: string): string[] {
  const values: string[] = [];
  let current = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < rowData.length; i++) {
    const char = rowData[i];
    if (escaped) { current += char; escaped = false; continue; }
    if (char === '\\') { escaped = true; current += char; continue; }
    if (char === "'" && !escaped) { inString = !inString; continue; }
    if (char === ',' && !inString) { values.push(current.trim()); current = ''; continue; }
    current += char;
  }
  values.push(current.trim());
  return values;
}

const LEVEL_NAMES: Record<number, string> = {
  1: 'Silver Mfr Sponsor', 2: 'Competitor', 3: 'Team', 4: 'Retail',
  6: 'Event Director', 7: 'Site Admin', 8: 'Member Support',
  9: 'Gold Mfr Sponsor', 10: 'Platinum Mfr Sponsor',
};

const sql = fs.readFileSync('C:\\Users\\mmakh\\Downloads\\wp_pmpro_memberships_users.sql', 'utf-8');
const insertRegex = /INSERT INTO `wp_pmpro_memberships_users`[^;]+VALUES\s*([\s\S]+?);/gi;
const records: any[] = [];
let m;
while ((m = insertRegex.exec(sql)) !== null) {
  const rowRegex = /\(([^)]+)\)/g;
  let rm;
  while ((rm = rowRegex.exec(m[1])) !== null) {
    const v = parseRowValues(rm[1]);
    records.push({
      id: parseInt(v[0]),
      user_id: parseInt(v[1]),
      membership_id: parseInt(v[2]),
      initial_payment: parseFloat(v[4]),
      billing_amount: parseFloat(v[5]),
      cycle_number: parseInt(v[6]),
      cycle_period: v[7],
      status: v[11],
      startdate: v[12],
      enddate: v[13],
    });
  }
}

const active = records.filter(r => r.status === 'active');
console.log('Total records: ' + records.length);
console.log('Active records: ' + active.length);
console.log('');

const isAutoRenew = (r: any) => r.cycle_number > 0 && r.billing_amount > 0;
const isZeroDate = (d: string | null) => d === '0000-00-00 00:00:00';
const isNull = (d: string | null) => !d || d === 'NULL';
const isReal = (d: string | null) => d && d !== 'NULL' && d !== '0000-00-00 00:00:00';

const realEnd = active.filter(r => isReal(r.enddate));
const nullEnd = active.filter(r => isNull(r.enddate));
const zeroEnd = active.filter(r => isZeroDate(r.enddate));

console.log('=== BY ENDDATE TYPE ===');
console.log('Real enddate:     ' + realEnd.length);
console.log('NULL enddate:     ' + nullEnd.length);
console.log('0000-00-00:       ' + zeroEnd.length);
console.log('');

console.log('=== AUTO-RENEW (cycle_number>0 AND billing_amount>0) ===');
console.log('Auto-renew + real enddate: ' + realEnd.filter(isAutoRenew).length);
console.log('Auto-renew + NULL enddate: ' + nullEnd.filter(isAutoRenew).length);
console.log('Auto-renew + 0000-00-00:   ' + zeroEnd.filter(isAutoRenew).length);
console.log('Total auto-renew:          ' + active.filter(isAutoRenew).length);
console.log('');

console.log('=== NON-AUTO-RENEW (cycle_number=0 OR billing_amount=0) ===');
console.log('Manual + real enddate: ' + realEnd.filter(r => !isAutoRenew(r)).length);
console.log('Manual + NULL enddate: ' + nullEnd.filter(r => !isAutoRenew(r)).length);
console.log('Manual + 0000-00-00:   ' + zeroEnd.filter(r => !isAutoRenew(r)).length);
console.log('');

// Auto-renew with 0000-00-00 - calculate expected renewal
console.log('=== AUTO-RENEW WITH 0000-00-00 (calculated renewal dates) ===');
const autoZero = zeroEnd.filter(isAutoRenew);
for (const r of autoZero.slice(0, 15)) {
  const start = new Date(r.startdate);
  const now = new Date();
  const yearsElapsed = Math.floor((now.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const nextRenewal = new Date(start);
  nextRenewal.setFullYear(nextRenewal.getFullYear() + yearsElapsed + 1);
  console.log('  user_id: ' + r.user_id + ' | start: ' + r.startdate + ' | $' + r.billing_amount + '/' + r.cycle_period + ' | next renewal: ' + nextRenewal.toISOString().split('T')[0]);
}
if (autoZero.length > 15) console.log('  ... and ' + (autoZero.length - 15) + ' more');
console.log('');

// Auto-renew with NULL enddate
console.log('=== AUTO-RENEW WITH NULL ENDDATE (calculated renewal dates) ===');
const autoNull = nullEnd.filter(isAutoRenew);
for (const r of autoNull.slice(0, 15)) {
  const start = new Date(r.startdate);
  const now = new Date();
  const yearsElapsed = Math.floor((now.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const nextRenewal = new Date(start);
  nextRenewal.setFullYear(nextRenewal.getFullYear() + yearsElapsed + 1);
  console.log('  user_id: ' + r.user_id + ' | start: ' + r.startdate + ' | $' + r.billing_amount + '/' + r.cycle_period + ' | next renewal: ' + nextRenewal.toISOString().split('T')[0]);
}
if (autoNull.length > 15) console.log('  ... and ' + (autoNull.length - 15) + ' more');
console.log('');

// Manual with NULL - who are these?
console.log('=== MANUAL WITH NULL ENDDATE - by membership type ===');
const manualNull = nullEnd.filter(r => !isAutoRenew(r));
const byType: Record<number, number> = {};
for (const r of manualNull) { byType[r.membership_id] = (byType[r.membership_id] || 0) + 1; }
for (const [id, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
  console.log('  Level ' + id + ' (' + (LEVEL_NAMES[parseInt(id)] || 'Unknown') + '): ' + count);
}
console.log('');

// Auto-renew with REAL enddate - PMPro set explicit expiration despite auto-renew
console.log('=== AUTO-RENEW WITH REAL ENDDATE (explicit expiration set) ===');
const autoReal = realEnd.filter(isAutoRenew);
for (const r of autoReal) {
  console.log('  user_id: ' + r.user_id + ' | start: ' + r.startdate + ' | end: ' + r.enddate + ' | $' + r.billing_amount + '/' + r.cycle_period);
}
console.log('');

// Manual with 0000-00-00 - odd case
console.log('=== MANUAL WITH 0000-00-00 ENDDATE (unexpected) ===');
const manualZero = zeroEnd.filter(r => !isAutoRenew(r));
for (const r of manualZero.slice(0, 10)) {
  console.log('  user_id: ' + r.user_id + ' | start: ' + r.startdate + ' | membership_id: ' + r.membership_id + ' (' + (LEVEL_NAMES[r.membership_id] || 'Unknown') + ') | billing: $' + r.billing_amount + ' cycle: ' + r.cycle_number);
}
if (manualZero.length > 10) console.log('  ... and ' + (manualZero.length - 10) + ' more');
