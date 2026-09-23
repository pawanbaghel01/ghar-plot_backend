import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import WorkStatus from '../models/workStatusSchema.js';
import Project from '../models/projectSchema.js';
import Client from '../models/clientSchema.js';
import Employee from '../models/employeeSchema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

function parseCSV(text) {
  const lines = [];
  let row = [''];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') lines.push(row);
  return lines;
}

function parseDateDDMMYYYY(dateStr) {
  if (!dateStr) return new Date();
  const parts = dateStr.trim().split(/[-/]/);
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
    const month = parseInt(m, 10) - 1;
    const day = parseInt(d, 10);
    return new Date(Date.UTC(year, month, day, 0, 0, 0));
  }
  return new Date(dateStr);
}

export async function syncWorkStatusFromCSV(filePath = null) {
  const targetPath =
    filePath ||
    path.join(__dirname, '../data/work-status.csv');

  console.log(`[SYNC] Reading CSV from: ${targetPath}`);
  if (!fs.existsSync(targetPath)) {
    throw new Error(`CSV file not found at: ${targetPath}`);
  }

  const content = fs.readFileSync(targetPath, 'utf8');
  const rows = parseCSV(content);
  console.log(`[SYNC] Parsed ${rows.length} rows (including header)`);

  if (rows.length <= 1) {
    console.log('[SYNC] No data found in CSV.');
    return { success: true, count: 0 };
  }

  // Load Reference Data from MongoDB
  const [dbProjects, dbClients, dbEmployees] = await Promise.all([
    Project.find({}).lean(),
    Client.find({}).lean(),
    Employee.find({}).lean(),
  ]);

  const projectMap = new Map();
  dbProjects.forEach((p) => {
    projectMap.set(p.projectName.trim().toLowerCase(), p._id);
  });

  const clientMap = new Map();
  dbClients.forEach((c) => {
    clientMap.set(c.name.trim().toLowerCase(), c._id);
  });

  const employeeMap = new Map();
  dbEmployees.forEach((e) => {
    employeeMap.set(e.name.trim().toLowerCase(), e._id);
    const firstName = e.name.trim().split(' ')[0].toLowerCase();
    if (!employeeMap.has(firstName)) employeeMap.set(firstName, e._id);
  });

  // Deduplicate and prepare records
  const recordMap = new Map();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[1] && !r[2]) continue;

    const sNo = parseInt(r[0], 10) || i;
    const projectName = (r[1] || '').trim();
    const clientName = (r[2] || '').trim();
    const dateStr = (r[3] || '').trim();
    const today = (r[4] || '').trim();
    const tomorrow = (r[5] || '').trim();
    const dayAfterTomorrow = (r[6] || '').trim();
    let createdBy = (r[7] || '').trim();
    if (createdBy === '-' || !createdBy) createdBy = 'Admin';

    if (!projectName || !dateStr) continue;

    const key = `${projectName.toLowerCase()}___${dateStr}`;
    const dateObj = parseDateDDMMYYYY(dateStr);

    const projectId = projectMap.get(projectName.toLowerCase()) || null;
    const clientId = clientMap.get(clientName.toLowerCase()) || null;

    let createdByUser = null;
    const creatorClean = createdBy.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
    createdByUser = employeeMap.get(createdBy.toLowerCase()) || employeeMap.get(creatorClean) || null;

    const record = {
      sNo,
      projectName,
      project: projectId,
      clientName,
      client: clientId,
      date: dateObj,
      dateStr,
      today,
      tomorrow,
      dayAfterTomorrow,
      createdBy,
      createdByUser,
    };

    if (recordMap.has(key)) {
      const existing = recordMap.get(key);
      const hasNewContent = today || tomorrow || dayAfterTomorrow;
      const hasOldContent = existing.today || existing.tomorrow || existing.dayAfterTomorrow;
      if (hasNewContent || !hasOldContent) {
        recordMap.set(key, record);
      }
    } else {
      recordMap.set(key, record);
    }
  }

  const uniqueRecords = Array.from(recordMap.values());
  console.log(`[SYNC] Total unique (Project + Date) records to sync: ${uniqueRecords.length}`);

  // Batch bulkWrite upserts
  const BATCH_SIZE = 1000;
  let processed = 0;
  let upsertedCount = 0;
  let modifiedCount = 0;

  for (let i = 0; i < uniqueRecords.length; i += BATCH_SIZE) {
    const batch = uniqueRecords.slice(i, i + BATCH_SIZE);
    const ops = batch.map((item) => ({
      updateOne: {
        filter: { projectName: item.projectName, dateStr: item.dateStr },
        update: { $set: item },
        upsert: true,
      },
    }));

    const result = await WorkStatus.bulkWrite(ops, { ordered: false });
    processed += batch.length;
    upsertedCount += result.upsertedCount || 0;
    modifiedCount += result.modifiedCount || 0;

    console.log(
      `[SYNC] Processed ${processed}/${uniqueRecords.length} records... (Upserted: ${upsertedCount}, Modified: ${modifiedCount})`
    );
  }

  console.log(`[SYNC] ✅ Synchronization complete!`);
  console.log(`[SYNC] Total: ${uniqueRecords.length}, New Upserted: ${upsertedCount}, Modified/Matched: ${modifiedCount}`);

  return {
    success: true,
    totalRecords: uniqueRecords.length,
    upsertedCount,
    modifiedCount,
  };
}

// Allow running directly as CLI script
if (process.argv[1] && process.argv[1].endsWith('sync_work_status.js')) {
  mongoose
    .connect(process.env.MONGO_CONN)
    .then(async () => {
      console.log('[SYNC] Connected to MongoDB');
      const argPath = process.argv[2] || null;
      await syncWorkStatusFromCSV(argPath);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[SYNC] Error during sync:', err);
      process.exit(1);
    });
}
