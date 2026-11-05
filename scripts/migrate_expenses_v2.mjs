/**
 * Migration Script v2: Insert Excel expenses into MongoDB with correct mappings
 * 
 * Fixes from v1:
 * - Uses correct current employee IDs
 * - Removes wrong previously inserted data and re-inserts correctly
 * - Handles unmapped project_ids by using "General Expenses" / fallback
 * - Idempotent: checks _excelId to avoid duplicate inserts
 * 
 * Run: node scripts/migrate_expenses_v2.mjs
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createRequire } from 'module';
dotenv.config({ path: 'F:/ghar_plot/backend/.env' });

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

// ─── CURRENT EMPLOYEE IDs (from DB) ─────────────────────────────────────────
// Mapping: old system created_by_id → current MongoDB Employee ObjectId
// Old system IDs observed: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
const OLD_EMPLOYEE_MAP = {
  0:  '699324272025e0b005386bb9', // AkshayPawar (main field person)
  1:  '6ae838df3031460201862b86', // ManvendraChauhan
  2:  '69806714479a35d1cf59b017', // AslamKhan
  3:  '6ae838df3031460201862b86', // ManvendraChauhan
  4:  '6ae838df3031460201862b83', // GauravKapasia
  5:  '69806714479a35d1cf59b017', // AslamKhan
  6:  '6ae838e03031460201862b8a', // VipinArora
  7:  '6ae838e03031460201862b8d', // SumitArora
  8:  '6ae838e03031460201862b93', // AdarshDubey
  9:  '6ae838e03031460201862b96', // MohitKumar
  10: '6ae838e03031460201862b99', // DeepakKumar
};

const DEFAULT_EMPLOYEE_ID = '699324272025e0b005386bb9'; // AkshayPawar

// Payment type mapping
const PAYMENT_TYPE_MAP = {
  'cash':            'Cash',
  'credit':          'Credit',
  'paytm':           'Paytm',
  'googlepay':       'Googlepay',
  'google pay':      'Googlepay',
  'phonepay':        'Phonepay',
  'phone pay':       'Phonepay',
  'online transfer': 'Online Transfer',
  'online':          'Online Transfer',
  'adjustment':      'Adjustment',
  'product upsell':  'Product Upsell',
};

function mapPaymentType(raw) {
  if (!raw) return 'Cash';
  return PAYMENT_TYPE_MAP[raw.toString().toLowerCase().trim()] || 'Cash';
}

async function main() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_CONN);
  const db = mongoose.connection;
  console.log('✅ Connected');

  // ── Step 1: Remove previously mis-inserted expenses (wrong employee IDs) ──
  console.log('\n🧹 Removing previously mis-inserted expenses (wrong employee IDs)...');
  const deleteResult = await db.collection('expenses').deleteMany({
    _excelId: { $exists: true }
  });
  console.log(`   Removed ${deleteResult.deletedCount} old migrated records`);

  // ── Step 2: Load all projects sorted by creation order ───────────────────
  const projects = await db.collection('projects')
    .find({})
    .sort({ createdAt: 1, _id: 1 })
    .project({ projectName: 1, client: 1 })
    .toArray();

  console.log(`\n📁 ${projects.length} projects loaded`);

  // Build project index map: excel_project_id (0-N) → MongoDB project
  const projectMap = {};
  projects.forEach((p, idx) => {
    projectMap[idx] = { id: p._id, clientId: p.client };
  });

  // Find a fallback project for unmapped IDs — "Unnamed Project" or first project
  const fallbackProject = projects.find(p => 
    p.projectName?.toLowerCase().includes('unnamed') ||
    p.projectName?.toLowerCase().includes('general')
  ) || projects[0];
  console.log(`   Fallback project for unmapped IDs: ${fallbackProject?.projectName}`);

  // ── Step 3: Parse Excel ───────────────────────────────────────────────────
  const EXCEL_PATH = 'D:/movie/Untitled spreadsheet (1).xlsx';
  console.log(`\n📊 Parsing Excel: ${EXCEL_PATH}`);
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  console.log(`✅ ${rows.length} expense rows found`);

  // ── Step 4: Check already-imported IDs (idempotency) ─────────────────────
  const existingIds = await db.collection('expenses').distinct('_excelId');
  const existingIdSet = new Set(existingIds.map(String));
  console.log(`♻️  Already imported: ${existingIdSet.size}`);

  // ── Step 5: Build expense documents ──────────────────────────────────────
  const toInsert = [];
  let skipped = 0;
  let fallbackUsed = 0;
  const unmappedProjectIds = new Set();

  for (const row of rows) {
    const excelId = String(row['expense_id'] || '').trim();

    // Skip already imported
    if (excelId && existingIdSet.has(excelId)) {
      skipped++;
      continue;
    }

    const projectIdx = parseInt(row['project_id']);
    const category   = String(row['category'] || 'General').trim() || 'General';
    const quantity   = parseFloat(row['quantity']) || 1;
    const amount     = parseFloat(row['total_price']) || 0;
    const unitPrice  = parseFloat(row['price']) || 0;
    const paymentType = mapPaymentType(row['type']);
    const comment    = String(row['comment'] || '').trim();
    const createdById = parseInt(row['created_by_id']);
    const createdRaw = row['created'] || row['updated'] || '';

    // Parse date
    let expenseDate;
    try {
      expenseDate = new Date(String(createdRaw).replace(' ', 'T'));
      if (isNaN(expenseDate.getTime())) expenseDate = new Date('2023-01-01');
    } catch {
      expenseDate = new Date('2023-01-01');
    }

    // Map project
    let projectObjId, clientObjId;
    if (projectMap[projectIdx]) {
      projectObjId = projectMap[projectIdx].id;
      clientObjId  = projectMap[projectIdx].clientId;
    } else {
      // Use fallback project for unmapped IDs
      unmappedProjectIds.add(projectIdx);
      projectObjId = fallbackProject._id;
      clientObjId  = fallbackProject.client;
      fallbackUsed++;
    }

    // Map businessAssociate
    const businessAssociateId = OLD_EMPLOYEE_MAP[createdById] || DEFAULT_EMPLOYEE_ID;

    toInsert.push({
      project:            projectObjId,
      client:             clientObjId || null,
      businessAssociate:  new mongoose.Types.ObjectId(businessAssociateId),
      category:           category,
      itemName:           comment || category,
      quantity:           quantity,
      unit:               'Pcs',
      unitPrice:          unitPrice,
      amount:             amount,
      paidTo:             comment || category,
      date:               expenseDate,
      paymentType:        paymentType,
      remarks:            comment,
      receiptImage:       '',
      createdBy:          new mongoose.Types.ObjectId(businessAssociateId),
      _excelId:           excelId,
      createdAt:          expenseDate,
      updatedAt:          expenseDate,
    });
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✅ To Insert:          ${toInsert.length}`);
  console.log(`   ⏭️  Already Imported:  ${skipped}`);
  console.log(`   🔀 Fallback Project:   ${fallbackUsed} rows (project_ids: ${[...unmappedProjectIds].join(', ')})`);

  if (toInsert.length === 0) {
    console.log('\n✅ Nothing new to insert.');
    await mongoose.disconnect();
    return;
  }

  // ── Step 6: Batch insert ──────────────────────────────────────────────────
  const BATCH = 1000;
  let totalInserted = 0;
  console.log(`\n⏳ Inserting ${toInsert.length} expenses in batches of ${BATCH}...`);

  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    try {
      const r = await db.collection('expenses').insertMany(batch, { ordered: false });
      totalInserted += r.insertedCount;
      process.stdout.write(`\r   Progress: ${totalInserted}/${toInsert.length}`);
    } catch (err) {
      if (err.code === 11000) {
        totalInserted += err.result?.nInserted || 0;
      } else {
        console.error(`\n   Batch error:`, err.message);
      }
    }
  }
  console.log(`\n✅ Inserted ${totalInserted} expenses`);

  // ── Step 7: Update CashFlow totalExpense for affected associates ──────────
  console.log('\n🔄 Updating CashFlow totalExpense...');

  const affectedPairs = await db.collection('expenses').aggregate([
    { $match: { _excelId: { $exists: true } } },
    {
      $group: {
        _id: {
          businessAssociate: '$businessAssociate',
          date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }
        }
      }
    }
  ]).toArray();

  console.log(`   ${affectedPairs.length} associate+date pairs to update`);
  let cfUpdated = 0;

  for (const pair of affectedPairs) {
    const { businessAssociate, date } = pair._id;
    const dayStart = new Date(date + 'T00:00:00.000Z');
    const dayEnd   = new Date(date + 'T23:59:59.999Z');

    const agg = await db.collection('expenses').aggregate([
      { $match: { businessAssociate, date: { $gte: dayStart, $lte: dayEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray();

    const total = agg[0]?.total || 0;

    const res = await db.collection('cashflows').updateOne(
      { businessAssociate, date: { $gte: dayStart, $lte: dayEnd } },
      { $set: { totalExpense: total } }
    );
    if (res.matchedCount > 0) cfUpdated++;
  }

  console.log(`   ✅ Updated ${cfUpdated} CashFlow records`);

  // ── Final stats ───────────────────────────────────────────────────────────
  const finalCount = await db.collection('expenses').countDocuments();
  console.log(`\n🎉 Migration Complete!`);
  console.log(`   Total expenses in DB: ${finalCount}`);
  console.log(`   New inserted this run: ${totalInserted}`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected');
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

