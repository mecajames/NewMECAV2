/**
 * PMPro Orders/Billing Migration Script (SQL File Parser)
 *
 * Migrates order/billing data from WordPress PMPro SQL export to NewMECA V2.
 *
 * Usage:
 *   npx tsx scripts/migrate-pmpro-orders.ts [options]
 *
 * Options:
 *   --dry-run     Preview what will be migrated without making changes
 *   --limit=N     Limit number of records (for testing)
 *   --file=PATH   Path to SQL file (default: C:\Users\mmakh\Downloads\mecacaraudio_wp.sql)
 *
 * Data source: SQL dump from phpMyAdmin containing:
 *   - wp_pmpro_membership_levels
 *   - wp_pmpro_membership_orders
 *   - wp_pmpro_memberships_users
 */

import { Client } from 'pg';
import * as fs from 'fs';

// ============================================
// CONFIGURATION
// ============================================

// V2 Supabase PostgreSQL
const V2_CONFIG = {
  host: '127.0.0.1',
  port: 54622,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
};

// Default SQL file path
const DEFAULT_SQL_FILE = 'C:\\Users\\mmakh\\Downloads\\mecacaraudio_wp.sql';

// PMPro Level ID to V2 membership_type_config mapping
// Based on PMPro levels from SQL:
// 1: Silver Manufacturer Sponsor ($1000)
// 2: Competitor Member ($40)
// 3: Independent Team Membership ($60)
// 4: Retail Member ($100)
// 6: Event Director ($0)
// 7: Site Administrator ($0)
// 8: Member Support ($20)
// 9: Gold Manufacturer Sponsor ($2500)
// 10: Platinum Manufacturer Sponsor ($5000)
const LEVEL_NAMES: Record<number, string> = {
  1: 'Silver Manufacturer Sponsor',
  2: 'Competitor Member',
  3: 'Independent Team Membership',
  4: 'Retail Member',
  6: 'Event Director',
  7: 'Site Administrator',
  8: 'Member Support',
  9: 'Gold Manufacturer Sponsor',
  10: 'Platinum Manufacturer Sponsor',
};

// ============================================
// SQL PARSING TYPES
// ============================================

interface PMProOrder {
  id: number;
  code: string;
  session_id: string;
  user_id: number;
  membership_id: number;
  paypal_token: string;
  billing_name: string;
  billing_street: string;
  billing_city: string;
  billing_state: string;
  billing_zip: string;
  billing_country: string;
  billing_phone: string;
  subtotal: string;
  tax: string;
  couponamount: string;
  checkout_id: number;
  certificate_id: number;
  certificateamount: string;
  total: string;
  payment_type: string;
  cardtype: string;
  accountnumber: string;
  expirationmonth: string;
  expirationyear: string;
  status: string;
  gateway: string;
  gateway_environment: string;
  payment_transaction_id: string;
  subscription_transaction_id: string;
  timestamp: string;
  affiliate_id: string;
  affiliate_subid: string;
  notes: string;
  billing_street2: string;
}

interface PMProMembershipUser {
  id: number;
  user_id: number;
  membership_id: number;
  code_id: number;
  initial_payment: string;
  billing_amount: string;
  cycle_number: number;
  cycle_period: string;
  billing_limit: number;
  trial_amount: string;
  trial_limit: number;
  status: string;
  startdate: string;
  enddate: string;
  modified: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function mapPaymentStatus(pmproStatus: string): string {
  const statusMap: Record<string, string> = {
    'success': 'paid',
    'pending': 'pending',
    'cancelled': 'refunded',
    'refunded': 'refunded',
    'failed': 'failed',
    'review': 'pending',
    'token': 'pending',
    'abandoned': 'failed',
  };
  return statusMap[pmproStatus?.toLowerCase()] || 'pending';
}

function mapOrderStatus(pmproStatus: string): string {
  const statusMap: Record<string, string> = {
    'success': 'completed',
    'pending': 'pending',
    'cancelled': 'cancelled',
    'refunded': 'cancelled',
    'failed': 'failed',
    'review': 'processing',
    'token': 'pending',
    'abandoned': 'cancelled',
  };
  return statusMap[pmproStatus?.toLowerCase()] || 'pending';
}

function mapInvoiceStatus(pmproStatus: string): string {
  const statusMap: Record<string, string> = {
    'success': 'paid',
    'pending': 'sent',
    'cancelled': 'cancelled',
    'refunded': 'cancelled',
    'failed': 'overdue',
    'abandoned': 'cancelled',
  };
  return statusMap[pmproStatus?.toLowerCase()] || 'draft';
}

/**
 * Parse INSERT INTO ... VALUES statements from SQL
 */
function parseInsertStatements(sql: string, tableName: string): string[][] {
  const results: string[][] = [];

  // Find all INSERT statements for this table
  const regex = new RegExp(
    `INSERT INTO \`${tableName}\`[^;]+VALUES\\s*([^;]+);`,
    'gi'
  );

  let match;
  while ((match = regex.exec(sql)) !== null) {
    const valuesSection = match[1];
    // Parse individual row value sets
    const rowMatches = valuesSection.matchAll(/\(([^)]+)\)/g);

    for (const rowMatch of rowMatches) {
      const rowData = rowMatch[1];
      const values = parseRowValues(rowData);
      results.push(values);
    }
  }

  return results;
}

/**
 * Parse a single row of comma-separated values, handling quoted strings
 */
function parseRowValues(row: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';
  let i = 0;

  while (i < row.length) {
    const char = row[i];

    if (!inQuote) {
      if (char === "'" || char === '"') {
        inQuote = true;
        quoteChar = char;
      } else if (char === ',') {
        values.push(current.trim());
        current = '';
        i++;
        continue;
      } else {
        current += char;
      }
    } else {
      if (char === quoteChar) {
        // Check for escaped quote
        if (i + 1 < row.length && row[i + 1] === quoteChar) {
          current += char;
          i++; // Skip the escaped quote
        } else if (char === "'" && i + 1 < row.length && row[i + 1] === "'") {
          current += "'";
          i++;
        } else {
          inQuote = false;
        }
      } else if (char === '\\' && i + 1 < row.length) {
        // Handle escape sequences
        const next = row[i + 1];
        if (next === 'r') {
          current += '\r';
          i++;
        } else if (next === 'n') {
          current += '\n';
          i++;
        } else if (next === "'" || next === '"' || next === '\\') {
          current += next;
          i++;
        } else {
          current += char;
        }
      } else {
        current += char;
      }
    }
    i++;
  }

  values.push(current.trim());
  return values;
}

/**
 * Parse PMPro orders from SQL
 */
function parsePMProOrders(sql: string): PMProOrder[] {
  const rows = parseInsertStatements(sql, 'wp_pmpro_membership_orders');

  return rows.map(row => ({
    id: parseInt(row[0]) || 0,
    code: row[1] || '',
    session_id: row[2] || '',
    user_id: parseInt(row[3]) || 0,
    membership_id: parseInt(row[4]) || 0,
    paypal_token: row[5] || '',
    billing_name: row[6] || '',
    billing_street: row[7] || '',
    billing_city: row[8] || '',
    billing_state: row[9] || '',
    billing_zip: row[10] || '',
    billing_country: row[11] || '',
    billing_phone: row[12] || '',
    subtotal: row[13] || '0',
    tax: row[14] || '0',
    couponamount: row[15] || '0',
    checkout_id: parseInt(row[16]) || 0,
    certificate_id: parseInt(row[17]) || 0,
    certificateamount: row[18] || '0',
    total: row[19] || '0',
    payment_type: row[20] || '',
    cardtype: row[21] || '',
    accountnumber: row[22] || '',
    expirationmonth: row[23] || '',
    expirationyear: row[24] || '',
    status: row[25] || '',
    gateway: row[26] || '',
    gateway_environment: row[27] || '',
    payment_transaction_id: row[28] || '',
    subscription_transaction_id: row[29] || '',
    timestamp: row[30] || '',
    affiliate_id: row[31] || '',
    affiliate_subid: row[32] || '',
    notes: row[33] || '',
    billing_street2: row[34] || '',
  }));
}

/**
 * Parse PMPro membership users from SQL
 */
function parsePMProMembershipUsers(sql: string): PMProMembershipUser[] {
  const rows = parseInsertStatements(sql, 'wp_pmpro_memberships_users');

  return rows.map(row => ({
    id: parseInt(row[0]) || 0,
    user_id: parseInt(row[1]) || 0,
    membership_id: parseInt(row[2]) || 0,
    code_id: parseInt(row[3]) || 0,
    initial_payment: row[4] || '0',
    billing_amount: row[5] || '0',
    cycle_number: parseInt(row[6]) || 0,
    cycle_period: row[7] || '',
    billing_limit: parseInt(row[8]) || 0,
    trial_amount: row[9] || '0',
    trial_limit: parseInt(row[10]) || 0,
    status: row[11] || '',
    startdate: row[12] || '',
    enddate: row[13] || '',
    modified: row[14] || '',
  }));
}

/**
 * Normalize name for matching (lowercase, trim, remove extra spaces)
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '');
}

// ============================================
// MIGRATION FUNCTIONS
// ============================================

async function getProfileNameMapping(v2: Client): Promise<Map<string, { id: string; userId: string; mecaId: number | null }>> {
  console.log('📋 Loading profile mappings by name...');

  const { rows } = await v2.query(`
    SELECT p.id, p.full_name, p.first_name, p.last_name, p.meca_id,
           m.user_id as membership_user_id
    FROM profiles p
    LEFT JOIN memberships m ON m.user_id = p.id
  `);

  const mapping = new Map<string, { id: string; userId: string; mecaId: number | null }>();

  for (const row of rows) {
    // Add full name mapping
    if (row.full_name) {
      const normalized = normalizeName(row.full_name);
      if (!mapping.has(normalized)) {
        mapping.set(normalized, { id: row.id, userId: row.id, mecaId: row.meca_id });
      }
    }

    // Also add first+last name mapping
    if (row.first_name && row.last_name) {
      const normalized = normalizeName(`${row.first_name} ${row.last_name}`);
      if (!mapping.has(normalized)) {
        mapping.set(normalized, { id: row.id, userId: row.id, mecaId: row.meca_id });
      }
    }
  }

  console.log(`   Found ${mapping.size} unique name mappings from ${rows.length} profiles`);
  return mapping;
}

async function migrateOrders(
  orders: PMProOrder[],
  v2: Client,
  profileMapping: Map<string, { id: string; userId: string; mecaId: number | null }>,
  dryRun: boolean,
  limit?: number
): Promise<{ orderMapping: Map<number, string>; userIdToProfile: Map<number, string> }> {
  console.log('\n💳 Migrating PMPro orders...');

  const orderMapping = new Map<number, string>();
  const userIdToProfile = new Map<number, string>();

  let migrated = 0;
  let skipped = 0;
  let notMatched = 0;
  const unmatchedNames = new Set<string>();

  // Filter to successful orders only, sort by date
  const validOrders = orders
    .filter(o => o.status === 'success' && o.billing_name && parseFloat(o.total) > 0)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const ordersToProcess = limit ? validOrders.slice(0, limit) : validOrders;
  console.log(`   Processing ${ordersToProcess.length} successful orders (of ${orders.length} total)`);

  for (const order of ordersToProcess) {
    const normalizedName = normalizeName(order.billing_name);
    const profile = profileMapping.get(normalizedName);

    if (!profile) {
      notMatched++;
      unmatchedNames.add(order.billing_name);
      continue;
    }

    // Track WP user_id to profile mapping
    userIdToProfile.set(order.user_id, profile.id);

    // Check if order already exists
    const { rows: existing } = await v2.query(
      `SELECT id FROM orders WHERE order_number = $1`,
      [`PMPRO-${order.code}`]
    );

    if (existing.length > 0) {
      orderMapping.set(order.id, existing[0].id);
      continue;
    }

    if (dryRun) {
      console.log(`   [DRY RUN] Would create order PMPRO-${order.code} for "${order.billing_name}" -> profile ${profile.id}`);
      migrated++;
      continue;
    }

    const orderId = generateUUID();
    const orderDate = new Date(order.timestamp);

    try {
      await v2.query(`
        INSERT INTO orders (
          id, order_number, user_id, status, order_type,
          subtotal, tax, discount, total, currency, notes,
          billing_address, metadata, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, 'membership',
                $5, $6, '0.00', $7, 'USD', $8,
                $9, $10, $11, $11)
      `, [
        orderId,
        `PMPRO-${order.code}`,
        profile.id,
        mapOrderStatus(order.status),
        order.subtotal || '0.00',
        order.tax || '0.00',
        order.total || '0.00',
        order.notes,
        JSON.stringify({
          name: order.billing_name,
          address1: order.billing_street,
          address2: order.billing_street2,
          city: order.billing_city,
          state: order.billing_state,
          postalCode: order.billing_zip,
          country: order.billing_country || 'US',
          phone: order.billing_phone,
        }),
        JSON.stringify({
          pmpro_order_id: order.id,
          pmpro_code: order.code,
          pmpro_user_id: order.user_id,
          payment_type: order.payment_type,
          cardtype: order.cardtype,
          gateway: order.gateway,
          transaction_id: order.payment_transaction_id,
          subscription_id: order.subscription_transaction_id,
          level_id: order.membership_id,
          level_name: LEVEL_NAMES[order.membership_id] || `Level ${order.membership_id}`,
        }),
        orderDate,
      ]);

      // Create order item for the membership
      const levelName = LEVEL_NAMES[order.membership_id] || `Membership Level ${order.membership_id}`;
      await v2.query(`
        INSERT INTO order_items (
          id, order_id, item_type, quantity, unit_price, total,
          description, metadata, created_at
        )
        VALUES ($1, $2, 'membership', 1, $3, $3, $4, $5, NOW())
      `, [
        generateUUID(),
        orderId,
        order.total || '0.00',
        `MECA ${levelName}`,
        JSON.stringify({ pmpro_level_id: order.membership_id, level_name: levelName }),
      ]);

      orderMapping.set(order.id, orderId);
      migrated++;

      if (migrated % 100 === 0) {
        console.log(`   ... migrated ${migrated} orders`);
      }
    } catch (err: any) {
      console.log(`   ⚠️  Error creating order ${order.code}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`   ✅ Migrated ${migrated} orders (${skipped} errors, ${notMatched} not matched)`);

  if (unmatchedNames.size > 0 && unmatchedNames.size <= 20) {
    console.log(`   ⚠️  Unmatched names: ${Array.from(unmatchedNames).join(', ')}`);
  } else if (unmatchedNames.size > 20) {
    console.log(`   ⚠️  ${unmatchedNames.size} unmatched names (first 20): ${Array.from(unmatchedNames).slice(0, 20).join(', ')}`);
  }

  return { orderMapping, userIdToProfile };
}

async function migrateInvoices(
  orders: PMProOrder[],
  v2: Client,
  profileMapping: Map<string, { id: string; userId: string; mecaId: number | null }>,
  orderMapping: Map<number, string>,
  dryRun: boolean,
  limit?: number
): Promise<void> {
  console.log('\n📄 Creating invoices from PMPro orders...');

  // Filter to successful orders
  const successfulOrders = orders
    .filter(o => o.status === 'success' && o.billing_name && parseFloat(o.total) > 0)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const ordersToProcess = limit ? successfulOrders.slice(0, limit) : successfulOrders;
  console.log(`   Processing ${ordersToProcess.length} successful orders for invoicing`);

  let migrated = 0;
  let skipped = 0;

  for (const order of ordersToProcess) {
    const normalizedName = normalizeName(order.billing_name);
    const profile = profileMapping.get(normalizedName);
    const v2OrderId = orderMapping.get(order.id);

    if (!profile) {
      skipped++;
      continue;
    }

    // Check if invoice already exists
    const { rows: existing } = await v2.query(
      `SELECT id FROM invoices WHERE invoice_number = $1`,
      [`INV-PMPRO-${order.code}`]
    );

    if (existing.length > 0) {
      continue;
    }

    if (dryRun) {
      console.log(`   [DRY RUN] Would create invoice INV-PMPRO-${order.code}`);
      migrated++;
      continue;
    }

    const invoiceId = generateUUID();
    const orderDate = new Date(order.timestamp);

    try {
      // Format date for due_date (date type) and paid_at (timestamptz)
      const dueDateStr = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD for date type

      await v2.query(`
        INSERT INTO invoices (
          id, invoice_number, user_id, order_id, status,
          subtotal, tax, discount, total, currency,
          due_date, paid_at, billing_address,
          company_info, metadata, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, 'paid',
                $5, $6, '0.00', $7, 'USD',
                $8::date, $9::timestamptz, $10,
                $11, $12, $9::timestamptz, $9::timestamptz)
      `, [
        invoiceId,
        `INV-PMPRO-${order.code}`,
        profile.id,
        v2OrderId || null,
        order.subtotal || '0.00',
        order.tax || '0.00',
        order.total || '0.00',
        dueDateStr,
        orderDate.toISOString(),
        JSON.stringify({
          name: order.billing_name,
          address1: order.billing_street,
          address2: order.billing_street2,
          city: order.billing_city,
          state: order.billing_state,
          postalCode: order.billing_zip,
          country: order.billing_country || 'US',
          phone: order.billing_phone,
        }),
        JSON.stringify({
          name: 'MECA - Mobile Electronics Competition Association',
          address: {
            street: '123 MECA Way',
            city: 'Competition City',
            state: 'TX',
            postalCode: '75001',
            country: 'US',
          },
          email: 'billing@mecacaraudio.com',
          website: 'https://mecacaraudio.com',
        }),
        JSON.stringify({
          pmpro_order_id: order.id,
          pmpro_code: order.code,
          pmpro_user_id: order.user_id,
          migrated_from: 'pmpro',
        }),
      ]);

      // Create invoice item
      const levelName = LEVEL_NAMES[order.membership_id] || `Membership Level ${order.membership_id}`;
      await v2.query(`
        INSERT INTO invoice_items (
          id, invoice_id, item_type, description, quantity, unit_price, total,
          metadata, created_at
        )
        VALUES ($1, $2, 'membership', $3, 1, $4, $4, $5, NOW())
      `, [
        generateUUID(),
        invoiceId,
        `MECA ${levelName}`,
        order.total || '0.00',
        JSON.stringify({ pmpro_order_code: order.code, level_name: levelName }),
      ]);

      // Link invoice to order
      if (v2OrderId) {
        await v2.query(
          `UPDATE orders SET invoice_id = $1 WHERE id = $2`,
          [invoiceId, v2OrderId]
        );
      }

      migrated++;

      if (migrated % 100 === 0) {
        console.log(`   ... created ${migrated} invoices`);
      }
    } catch (err: any) {
      console.log(`   ⚠️  Error creating invoice for ${order.code}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`   ✅ Created ${migrated} invoices (${skipped} skipped)`);
}

async function updateMembershipBilling(
  orders: PMProOrder[],
  v2: Client,
  profileMapping: Map<string, { id: string; userId: string; mecaId: number | null }>,
  dryRun: boolean
): Promise<void> {
  console.log('\n📝 Updating membership billing details...');

  // Get the most recent successful order per user_id
  const userLatestOrder = new Map<number, PMProOrder>();

  for (const order of orders) {
    if (order.status !== 'success' || !order.billing_name) continue;

    const existing = userLatestOrder.get(order.user_id);
    if (!existing || new Date(order.timestamp) > new Date(existing.timestamp)) {
      userLatestOrder.set(order.user_id, order);
    }
  }

  console.log(`   Found ${userLatestOrder.size} users with billing info to potentially update`);

  let updated = 0;
  let skipped = 0;

  for (const order of userLatestOrder.values()) {
    const normalizedName = normalizeName(order.billing_name);
    const profile = profileMapping.get(normalizedName);

    if (!profile) {
      skipped++;
      continue;
    }

    // Check if user has a membership to update
    const { rows: memberships } = await v2.query(
      `SELECT id FROM memberships WHERE user_id = $1`,
      [profile.id]
    );

    if (memberships.length === 0) {
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`   [DRY RUN] Would update billing for "${order.billing_name}"`);
      updated++;
      continue;
    }

    // Parse billing name
    const nameParts = (order.billing_name || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    try {
      await v2.query(`
        UPDATE memberships
        SET
          billing_first_name = COALESCE(NULLIF($2, ''), billing_first_name),
          billing_last_name = COALESCE(NULLIF($3, ''), billing_last_name),
          billing_phone = COALESCE(NULLIF($4, ''), billing_phone),
          billing_address = COALESCE(NULLIF($5, ''), billing_address),
          billing_city = COALESCE(NULLIF($6, ''), billing_city),
          billing_state = COALESCE(NULLIF($7, ''), billing_state),
          billing_postal_code = COALESCE(NULLIF($8, ''), billing_postal_code),
          billing_country = COALESCE(NULLIF($9, ''), billing_country),
          amount_paid = COALESCE($10, amount_paid),
          payment_status = 'paid',
          updated_at = NOW()
        WHERE user_id = $1
      `, [
        profile.id,
        firstName,
        lastName,
        order.billing_phone,
        order.billing_street,
        order.billing_city,
        order.billing_state,
        order.billing_zip,
        order.billing_country || 'US',
        parseFloat(order.total) || 0,
      ]);

      updated++;

      if (updated % 100 === 0) {
        console.log(`   ... updated ${updated} memberships`);
      }
    } catch (err: any) {
      console.log(`   ⚠️  Error updating membership for "${order.billing_name}": ${err.message}`);
      skipped++;
    }
  }

  console.log(`   ✅ Updated ${updated} memberships (${skipped} skipped)`);
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  const fileArg = args.find((a) => a.startsWith('--file='));
  const sqlFile = fileArg ? fileArg.split('=')[1] : DEFAULT_SQL_FILE;

  console.log('🚀 PMPro Orders/Billing Migration (SQL File Parser)');
  console.log('====================================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`SQL File: ${sqlFile}`);
  if (limit) console.log(`Limit: ${limit} records`);
  console.log('');

  // Read SQL file
  console.log('📁 Reading SQL file...');
  if (!fs.existsSync(sqlFile)) {
    console.error(`❌ SQL file not found: ${sqlFile}`);
    console.log('\nMake sure to export the following tables from phpMyAdmin:');
    console.log('  - wp_pmpro_membership_levels');
    console.log('  - wp_pmpro_membership_orders');
    console.log('  - wp_pmpro_memberships_users');
    return;
  }

  const sql = fs.readFileSync(sqlFile, 'utf-8');
  console.log(`   Read ${(sql.length / 1024 / 1024).toFixed(2)} MB`);

  // Parse PMPro data
  console.log('\n📊 Parsing PMPro data from SQL...');
  const orders = parsePMProOrders(sql);
  console.log(`   Found ${orders.length} orders`);

  const membershipUsers = parsePMProMembershipUsers(sql);
  console.log(`   Found ${membershipUsers.length} membership-user records`);

  // Show order status breakdown
  const statusCounts: Record<string, number> = {};
  for (const order of orders) {
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
  }
  console.log(`   Order statuses: ${JSON.stringify(statusCounts)}`);

  let v2: Client | null = null;

  try {
    // Connect to V2 PostgreSQL
    console.log('\n📡 Connecting to V2 database...');
    v2 = new Client(V2_CONFIG);
    await v2.connect();
    console.log('   ✅ Connected to V2 PostgreSQL');

    // Load profile mappings
    const profileMapping = await getProfileNameMapping(v2);

    // Run migrations
    const { orderMapping } = await migrateOrders(orders, v2, profileMapping, dryRun, limit);
    await migrateInvoices(orders, v2, profileMapping, orderMapping, dryRun, limit);
    await updateMembershipBilling(orders, v2, profileMapping, dryRun);

    console.log('\n✅ Migration complete!');

  } catch (err: any) {
    console.error('\n❌ Migration failed:', err.message);
    throw err;
  } finally {
    if (v2) await v2.end();
  }
}

main().catch(console.error);
