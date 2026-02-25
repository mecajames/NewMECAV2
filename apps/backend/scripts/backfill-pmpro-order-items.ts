/**
 * Backfill PMPro Order Items & Invoice Items
 *
 * Fixes legacy PMPro-imported orders/invoices that are missing line items.
 * Reads the metadata JSONB field on existing orders to reconstruct the items.
 *
 * Usage:
 *   npx tsx scripts/backfill-pmpro-order-items.ts [options]
 *
 * Options:
 *   --dry-run       Preview changes without writing to the database
 *   --limit=N       Process only N records (for testing)
 *   --port=PORT     Database port (default: 54322 for local Supabase)
 *   --host=HOST     Database host (default: 127.0.0.1)
 *   --password=PWD  Database password (default: postgres)
 *
 * What it does:
 *   1. Finds PMPRO-* orders with zero order items → creates order_items
 *   2. Finds INV-PMPRO-* invoices with zero invoice items → creates invoice_items
 *   3. Fixes broken order↔invoice linkage
 */

import { Client } from 'pg';

// ============================================
// CONFIGURATION
// ============================================

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
const portArg = args.find((a) => a.startsWith('--port='));
const port = portArg ? parseInt(portArg.split('=')[1]) : 54322;
const hostArg = args.find((a) => a.startsWith('--host='));
const host = hostArg ? hostArg.split('=')[1] : '127.0.0.1';
const passwordArg = args.find((a) => a.startsWith('--password='));
const password = passwordArg ? passwordArg.split('=')[1] : 'postgres';

const DB_CONFIG = {
  host,
  port,
  database: 'postgres',
  user: 'postgres',
  password,
};

// Fallback level names (same as migrate-pmpro-orders.ts)
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

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================
// STEP 1: Backfill Order Items
// ============================================

async function backfillOrderItems(db: Client): Promise<number> {
  console.log('\n📦 Step 1: Backfilling missing order items...');

  const query = `
    SELECT o.id, o.order_number, o.total, o.metadata, o.created_at
    FROM orders o
    WHERE o.order_number LIKE 'PMPRO-%'
      AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id)
    ORDER BY o.created_at ASC
    ${limit ? `LIMIT ${limit}` : ''}
  `;

  const { rows: ordersWithoutItems } = await db.query(query);
  console.log(`   Found ${ordersWithoutItems.length} PMPRO orders missing order items`);

  if (ordersWithoutItems.length === 0) {
    console.log('   ✅ Nothing to backfill — all PMPRO orders have items');
    return 0;
  }

  let created = 0;
  let errors = 0;

  for (const order of ordersWithoutItems) {
    const metadata = order.metadata || {};
    const levelId = metadata.level_id;
    const levelName = metadata.level_name
      || LEVEL_NAMES[levelId]
      || `Membership Level ${levelId || 'Unknown'}`;

    const description = `MECA ${levelName}`;
    const total = order.total || '0.00';

    if (dryRun) {
      console.log(`   [DRY RUN] Would create order item for ${order.order_number}: "${description}" — $${total}`);
      created++;
      continue;
    }

    try {
      await db.query(`
        INSERT INTO order_items (id, order_id, item_type, description, quantity, unit_price, total, metadata, created_at)
        VALUES ($1, $2, 'membership', $3, 1, $4, $4, $5, $6)
      `, [
        generateUUID(),
        order.id,
        description,
        total,
        JSON.stringify({ pmpro_level_id: levelId, level_name: levelName, backfilled: true }),
        order.created_at,
      ]);
      created++;
    } catch (err: any) {
      console.log(`   ⚠️  Error creating order item for ${order.order_number}: ${err.message}`);
      errors++;
    }
  }

  console.log(`   ✅ Created ${created} order items (${errors} errors)`);
  return created;
}

// ============================================
// STEP 2: Backfill Invoice Items
// ============================================

async function backfillInvoiceItems(db: Client): Promise<number> {
  console.log('\n📄 Step 2: Backfilling missing invoice items...');

  const query = `
    SELECT i.id, i.invoice_number, i.total, i.metadata, i.order_id, i.created_at,
           o.metadata as order_metadata
    FROM invoices i
    LEFT JOIN orders o ON o.id = i.order_id
    WHERE i.invoice_number LIKE 'INV-PMPRO-%'
      AND NOT EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = i.id)
    ORDER BY i.created_at ASC
    ${limit ? `LIMIT ${limit}` : ''}
  `;

  const { rows: invoicesWithoutItems } = await db.query(query);
  console.log(`   Found ${invoicesWithoutItems.length} PMPRO invoices missing invoice items`);

  if (invoicesWithoutItems.length === 0) {
    console.log('   ✅ Nothing to backfill — all PMPRO invoices have items');
    return 0;
  }

  let created = 0;
  let errors = 0;

  for (const invoice of invoicesWithoutItems) {
    // Try order metadata first, fall back to invoice metadata
    const metadata = invoice.order_metadata || invoice.metadata || {};
    const levelId = metadata.level_id;
    const levelName = metadata.level_name
      || LEVEL_NAMES[levelId]
      || `Membership Level ${levelId || 'Unknown'}`;
    const pmproCode = metadata.pmpro_code || '';

    const description = `MECA ${levelName}`;
    const total = invoice.total || '0.00';

    if (dryRun) {
      console.log(`   [DRY RUN] Would create invoice item for ${invoice.invoice_number}: "${description}" — $${total}`);
      created++;
      continue;
    }

    try {
      await db.query(`
        INSERT INTO invoice_items (id, invoice_id, item_type, description, quantity, unit_price, total, metadata, created_at)
        VALUES ($1, $2, 'membership', $3, 1, $4, $4, $5, $6)
      `, [
        generateUUID(),
        invoice.id,
        description,
        total,
        JSON.stringify({ pmpro_order_code: pmproCode, level_name: levelName, backfilled: true }),
        invoice.created_at,
      ]);
      created++;
    } catch (err: any) {
      console.log(`   ⚠️  Error creating invoice item for ${invoice.invoice_number}: ${err.message}`);
      errors++;
    }
  }

  console.log(`   ✅ Created ${created} invoice items (${errors} errors)`);
  return created;
}

// ============================================
// STEP 3: Fix Order ↔ Invoice Linkage
// ============================================

async function fixOrderInvoiceLinkage(db: Client): Promise<number> {
  console.log('\n🔗 Step 3: Checking order ↔ invoice linkage...');

  // Find orders without invoice_id that have a matching INV-PMPRO invoice
  const { rows: brokenLinks } = await db.query(`
    SELECT o.id as order_id, o.order_number, i.id as invoice_id, i.invoice_number
    FROM orders o
    JOIN invoices i ON i.invoice_number = 'INV-' || o.order_number
    WHERE o.order_number LIKE 'PMPRO-%'
      AND o.invoice_id IS NULL
  `);

  console.log(`   Found ${brokenLinks.length} orders missing invoice linkage`);

  if (brokenLinks.length === 0) {
    console.log('   ✅ All PMPRO orders are properly linked to invoices');

    // Also check for invoices missing order linkage
    const { rows: orphanedInvoices } = await db.query(`
      SELECT i.id, i.invoice_number, i.order_id
      FROM invoices i
      WHERE i.invoice_number LIKE 'INV-PMPRO-%'
        AND i.order_id IS NULL
    `);

    if (orphanedInvoices.length > 0) {
      console.log(`   ⚠️  Found ${orphanedInvoices.length} invoices without order linkage — attempting to fix`);

      let fixed = 0;
      for (const inv of orphanedInvoices) {
        // Extract PMPRO code from invoice number: INV-PMPRO-XXXX → PMPRO-XXXX
        const orderNumber = inv.invoice_number.replace('INV-', '');
        const { rows: matchingOrders } = await db.query(
          `SELECT id FROM orders WHERE order_number = $1`,
          [orderNumber]
        );

        if (matchingOrders.length === 1) {
          if (dryRun) {
            console.log(`   [DRY RUN] Would link ${inv.invoice_number} → ${orderNumber}`);
            fixed++;
          } else {
            await db.query(`UPDATE invoices SET order_id = $1 WHERE id = $2`, [matchingOrders[0].id, inv.id]);
            await db.query(`UPDATE orders SET invoice_id = $1 WHERE id = $2`, [inv.id, matchingOrders[0].id]);
            fixed++;
          }
        }
      }
      console.log(`   ✅ Fixed ${fixed} invoice→order links`);
      return fixed;
    }

    return 0;
  }

  let fixed = 0;
  for (const link of brokenLinks) {
    if (dryRun) {
      console.log(`   [DRY RUN] Would link ${link.order_number} ↔ ${link.invoice_number}`);
      fixed++;
      continue;
    }

    try {
      await db.query(`UPDATE orders SET invoice_id = $1 WHERE id = $2`, [link.invoice_id, link.order_id]);
      // Also ensure invoice points back to order
      await db.query(`UPDATE invoices SET order_id = $1 WHERE id = $2`, [link.order_id, link.invoice_id]);
      fixed++;
    } catch (err: any) {
      console.log(`   ⚠️  Error linking ${link.order_number}: ${err.message}`);
    }
  }

  console.log(`   ✅ Fixed ${fixed} order ↔ invoice links`);
  return fixed;
}

// ============================================
// VERIFICATION
// ============================================

async function verify(db: Client): Promise<void> {
  console.log('\n🔍 Verification...');

  const { rows: [orderStats] } = await db.query(`
    SELECT
      count(*) FILTER (WHERE order_number LIKE 'PMPRO-%') as total_pmpro_orders,
      count(*) FILTER (WHERE order_number LIKE 'PMPRO-%' AND EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = orders.id)) as with_items,
      count(*) FILTER (WHERE order_number LIKE 'PMPRO-%' AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = orders.id)) as without_items
    FROM orders
  `);

  const { rows: [invoiceStats] } = await db.query(`
    SELECT
      count(*) FILTER (WHERE invoice_number LIKE 'INV-PMPRO-%') as total_pmpro_invoices,
      count(*) FILTER (WHERE invoice_number LIKE 'INV-PMPRO-%' AND EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = invoices.id)) as with_items,
      count(*) FILTER (WHERE invoice_number LIKE 'INV-PMPRO-%' AND NOT EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = invoices.id)) as without_items
    FROM invoices
  `);

  const { rows: [linkStats] } = await db.query(`
    SELECT
      count(*) FILTER (WHERE order_number LIKE 'PMPRO-%' AND invoice_id IS NOT NULL) as linked,
      count(*) FILTER (WHERE order_number LIKE 'PMPRO-%' AND invoice_id IS NULL) as unlinked
    FROM orders
  `);

  console.log('');
  console.log('   ┌─────────────────────────────────────────────┐');
  console.log('   │  PMPro Orders                               │');
  console.log(`   │  Total: ${String(orderStats.total_pmpro_orders).padEnd(6)} With items: ${String(orderStats.with_items).padEnd(6)} Missing: ${String(orderStats.without_items).padEnd(4)}│`);
  console.log('   ├─────────────────────────────────────────────┤');
  console.log('   │  PMPro Invoices                             │');
  console.log(`   │  Total: ${String(invoiceStats.total_pmpro_invoices).padEnd(6)} With items: ${String(invoiceStats.with_items).padEnd(6)} Missing: ${String(invoiceStats.without_items).padEnd(4)}│`);
  console.log('   ├─────────────────────────────────────────────┤');
  console.log('   │  Order ↔ Invoice Links                      │');
  console.log(`   │  Linked: ${String(linkStats.linked).padEnd(6)} Unlinked: ${String(linkStats.unlinked).padEnd(18)}│`);
  console.log('   └─────────────────────────────────────────────┘');

  if (parseInt(orderStats.without_items) === 0 && parseInt(invoiceStats.without_items) === 0 && parseInt(linkStats.unlinked) === 0) {
    console.log('\n   🎉 All clear! Every PMPro order and invoice has items and proper linkage.');
  } else {
    console.log('\n   ⚠️  Some items still need attention. Run without --dry-run to fix.');
  }
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  console.log('🚀 PMPro Order/Invoice Items Backfill');
  console.log('======================================');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '⚡ LIVE'}`);
  console.log(`Database: ${host}:${port}`);
  if (limit) console.log(`Limit: ${limit} records per step`);

  const db = new Client(DB_CONFIG);

  try {
    await db.connect();
    console.log('   ✅ Connected to database');

    await backfillOrderItems(db);
    await backfillInvoiceItems(db);
    await fixOrderInvoiceLinkage(db);
    await verify(db);

    console.log('\n✅ Backfill complete!');
  } catch (err: any) {
    console.error('\n❌ Backfill failed:', err.message);
    throw err;
  } finally {
    await db.end();
  }
}

main().catch(console.error);
