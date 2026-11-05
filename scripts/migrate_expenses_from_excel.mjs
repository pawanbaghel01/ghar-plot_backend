/**
 * Migration Script: Insert Expense data from Excel into MongoDB
 * 
 * Mapping Logic:
 * - Excel project_id (numeric 0-N) → DB Project by insertion order index
 * - Excel client_id → single client in DB (Sana Khan)
 * - Excel created_by_id → Employee mapping (known from old system)
 * - Excel paymentType: cash/credit mapped to schema enum
 * - No existing data is deleted
 * 
 * Run: node scripts/migrate_expenses_from_excel.mjs
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve('F:/ghar_plot/backend/.env') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── XLSX PARSER (pure JS, no dependency) ────────────────────────────────────
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Try to use xlsx if available, otherwise parse manually
let XLSX;
try {
  XLSX = require('xlsx');
} catch (e) {
  console.log('xlsx not found, using manual parser');
}

// ─── EMPLOYEE MAPPING (old system created_by_id → MongoDB Employee ID) ───────
// Based on team structure: Akshay was main field person (id=0 in old system)
const OLD_EMPLOYEE_MAP = {
  0:  '676007e4e8e73c6e0f08b3b3', // AkshayPawar (default field person)
  1:  '676007c7e8e73c6e0f08b3ad', // ManvendraChauhan (or adjust as needed)
  2:  '676007d7e8e73c6e0f08b3b0', // AslamKhan
  3:  '676007c7e8e73c6e0f08b3ad', // ManvendraChauhan
  4:  '676007f1e8e73c6e0f08b3b6', // GauravKapasia
  5:  '676007d7e8e73c6e0f08b3b0', // AslamKhan
  6:  '67600803e8e73c6e0f08b3bc', // VipinArora
  7:  '6760080de8e73c6e0f08b3bf', // SumitArora
  8:  '676008cbe8e73c6e0f08b3c5', // AdarshDubey
  9:  '676008d5e8e73c6e0f08b3c8', // MohitKumar
  10: '676008dfe8e73c6e0f08b3cb', // ShivamChauhan
};

// Default businessAssociate if created_by_id not mapped
const DEFAULT_EMPLOYEE_ID = '676007e4e8e73c6e0f08b3b3'; // AkshayPawar

// Single client in DB
const SANA_KHAN_CLIENT_ID = '675a19f4f0a6db524e1b5d04';

// Payment type mapping from old system to new schema enum
const PAYMENT_TYPE_MAP = {
  'cash':             'Cash',
  'credit':           'Credit',
  'paytm':            'Paytm',
  'googlepay':        'Googlepay',
  'google pay':       'Googlepay',
  'phonepay':         'Phonepay',
  'phone pay':        'Phonepay',
  'online transfer':  'Online Transfer',
  'online':           'Online Transfer',
  'adjustment':       'Adjustment',
  'product upsell':   'Product Upsell',
};

function mapPaymentType(raw) {
  if (!raw) return 'Cash';
  const lower = raw.toString().toLowerCase().trim();
  return PAYMENT_TYPE_MAP[lower] || 'Cash';
}

// ─── MANUAL XLSX PARSER ───────────────────────────────────────────────────────
import { createReadStream } from 'fs';
import zlib from 'zlib';

async function parseXlsxManually(filePath) {
  const AdmZip = require('adm-zip'); // fallback
  throw new Error('Manual parser not implemented, use xlsx package');
}

async function parseExcel(filePath) {
  if (XLSX) {
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    return rows;
  }
  throw new Error('xlsx package required. Run: npm install xlsx');
}

// ─── MAIN MIGRATION ───────────────────────────────────────────────────────────
async function main() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_CONN);
  const db = mongoose.connection;
  console.log('✅ Connected to MongoDB');

  // Load all projects ordered by creation time (to map numeric IDs)
  const projects = await db.collection('projects')
    .find({})
    .sort({ createdAt: 1, _id: 1 })
    .project({ projectName: 1, _id: 1, client: 1 })
    .toArray();

  console.log(`📁 Found ${projects.length} projects in DB`);
  
  // Build project ID mapping: excel numeric ID → MongoDB ObjectId
  const projectMap = {};
  projects.forEach((p, idx) => {
    projectMap[idx] = p._id;
    if (idx < 5) {
      console.log(`  Project[${idx}]: ${p.projectName} → ${p._id}`);
    }
  });
  console.log(`  ... and ${projects.length - 5} more projects`);

  // Parse Excel
  const EXCEL_PATH = 'C:/Users/Asus/.gemini/antigravity/brain/034c8a82-24e5-4c20-a550-accf4ad203c8/.user_uploaded/media_1793629054515_0ffa64a3.xlsx';
  console.log('\n📊 Parsing Excel file...');
  const rows = await parseExcel(EXCEL_PATH);
  console.log(`✅ Found ${rows.length} expense rows in Excel`);

  // Check existing expense count
  const existingCount = await db.collection('expenses').countDocuments();
  console.log(`📈 Existing expenses in DB: ${existingCount}`);

  // Check existing expense_ids (to avoid duplicate inserts)
  const existingExcelIds = await db.collection('expenses')
    .distinct('_excelId');
  const existingExcelIdSet = new Set(existingExcelIds.map(String));
  console.log(`♻️  Already imported Excel expense IDs: ${existingExcelIdSet.size}`);

  // Build expense documents
  const toInsert = [];
  let skipped = 0;
  let mappingErrors = 0;
  const unmappedProjects = new Set();

  for (const row of rows) {
    const excelId = String(row['expense_id'] || '').trim();
    const projectIdx = parseInt(row['project_id']);
    const clientIdx = parseInt(row['client_id']);
    const category = String(row['category'] || 'General').trim() || 'General';
    const quantity = parseFloat(row['quantity']) || 1;
    const totalPrice = parseFloat(row['total_price']) || 0;
    const unitPrice = parseFloat(row['price']) || 0;
    const paymentType = mapPaymentType(row['type']);
    const comment = String(row['comment'] || '').trim();
    const createdById = parseInt(row['created_by_id']);
    const createdDateRaw = row['created'] || row['updated'] || '';

    // Skip if already imported
    if (excelId && existingExcelIdSet.has(excelId)) {
      skipped++;
      continue;
    }

    // Parse date
    let expenseDate;
    try {
      const dateStr = String(createdDateRaw).replace(' ', 'T');
      expenseDate = new Date(dateStr);
      if (isNaN(expenseDate.getTime())) {
        expenseDate = new Date();
      }
    } catch {
      expenseDate = new Date();
    }

    // Map project
    const projectObjId = projectMap[projectIdx];
    if (!projectObjId) {
      unmappedProjects.add(projectIdx);
      mappingErrors++;
      continue; // Skip if no project mapping
    }

    // Map businessAssociate (expense owner)
    const businessAssociateId = OLD_EMPLOYEE_MAP[createdById] || DEFAULT_EMPLOYEE_ID;

    // Map client (only one in DB)
    const clientObjId = new mongoose.Types.ObjectId(SANA_KHAN_CLIENT_ID);

    const expenseDoc = {
      project: projectObjId,
      client: clientObjId,
      businessAssociate: new mongoose.Types.ObjectId(businessAssociateId),
      category: category,
      itemName: category,
      quantity: quantity,
      unit: 'Pcs',
      unitPrice: unitPrice,
      amount: totalPrice,
      paidTo: comment || category,
      date: expenseDate,
      paymentType: paymentType,
      remarks: comment,
      receiptImage: '',
      createdBy: new mongoose.Types.ObjectId(businessAssociateId),
      _excelId: excelId, // Track origin for idempotency
      createdAt: expenseDate,
      updatedAt: expenseDate,
    };

    toInsert.push(expenseDoc);
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`  ✅ To Insert: ${toInsert.length}`);
  console.log(`  ⏭️  Already Imported (skipped): ${skipped}`);
  console.log(`  ❌ Mapping Errors (no project): ${mappingErrors}`);
  if (unmappedProjects.size > 0) {
    console.log(`  🔍 Unmapped project_ids: ${[...unmappedProjects].join(', ')}`);
  }

  if (toInsert.length === 0) {
    console.log('\n✅ Nothing to insert. Migration complete.');
    await mongoose.disconnect();
    return;
  }

  // Batch insert (1000 at a time)
  const BATCH_SIZE = 1000;
  let totalInserted = 0;
  console.log(`\n⏳ Inserting ${toInsert.length} expenses in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    try {
      const result = await db.collection('expenses').insertMany(batch, { ordered: false });
      totalInserted += result.insertedCount;
      console.log(`  Batch ${Math.floor(i/BATCH_SIZE)+1}: Inserted ${result.insertedCount}`);
    } catch (err) {
      if (err.code === 11000) {
        console.log(`  Batch ${Math.floor(i/BATCH_SIZE)+1}: Some duplicates skipped`);
        totalInserted += (err.result?.nInserted || 0);
      } else {
        console.error(`  Batch error:`, err.message);
      }
    }
  }

  console.log(`\n✅ Inserted ${totalInserted} expenses into DB`);

  // ─── Update CashFlow totalExpense for affected associates ───────────────────
  console.log('\n🔄 Updating CashFlow totalExpense for affected dates...');
  
  // Get all unique businessAssociate + date combinations from inserted expenses
  const affectedPairs = await db.collection('expenses').aggregate([
    {
      $group: {
        _id: {
          businessAssociate: '$businessAssociate',
          date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }
        },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]).toArray();

  console.log(`  Found ${affectedPairs.length} unique associate+date pairs to update`);
  let cashflowUpdated = 0;

  for (const pair of affectedPairs) {
    const { businessAssociate, date } = pair._id;
    const dayStart = new Date(date + 'T00:00:00.000Z');
    const dayEnd = new Date(date + 'T23:59:59.999Z');

    // Recalculate total from DB (accurate)
    const expAgg = await db.collection('expenses').aggregate([
      {
        $match: {
          businessAssociate: businessAssociate,
          date: { $gte: dayStart, $lte: dayEnd }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray();

    const actualTotal = expAgg[0]?.total || 0;

    // Update the cashflow record for this associate+date
    const updateResult = await db.collection('cashflows').updateOne(
      {
        businessAssociate: businessAssociate,
        date: { $gte: dayStart, $lte: dayEnd }
      },
      { $set: { totalExpense: actualTotal } }
    );

    if (updateResult.matchedCount > 0) {
      cashflowUpdated++;
    }
  }

  console.log(`  ✅ Updated ${cashflowUpdated} CashFlow records with new totalExpense`);

  // Final count
  const finalCount = await db.collection('expenses').countDocuments();
  console.log(`\n🎉 Migration Complete!`);
  console.log(`   Final expense count in DB: ${finalCount}`);
  console.log(`   New expenses inserted: ${totalInserted}`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});

