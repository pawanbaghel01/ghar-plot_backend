import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import Employee from "../models/employeeSchema.js";
import Role from "../models/roleSchema.js";
import CashFlow from "../models/cashFlowSchema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Parse CSV line properly handling quotes
function parseCsvLine(text) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

// Normalize entry type to enum values in cashFlowSchema
function normalizeType(rawType) {
  if (!rawType) return "Cash";
  const t = rawType.trim().toLowerCase();
  if (t.includes("google") || t.includes("gpay")) return "Googlepay";
  if (t.includes("paytm")) return "Paytm";
  if (t.includes("phone")) return "Phonepay";
  if (t.includes("online") || t.includes("transfer") || t.includes("neft") || t.includes("rtgs") || t.includes("imps") || t.includes("transfter")) return "Online Transfer";
  if (t.includes("credit")) return "Credit";
  if (t.includes("upsell")) return "Product Upsell";
  if (t.includes("adjust")) return "Adjustment";
  return "Cash";
}

// Parse DD-MM-YYYY to UTC Date at 00:00:00.000
function parseDateDMY(dStr) {
  if (!dStr) return null;
  const parts = dStr.trim().split("-");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

async function run() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_CONN);
    console.log("Connected to MongoDB successfully.");

    // 1. Find or create Aman Khan
    let aman = await Employee.findOne({
      $or: [
        { name: /^Aman\s*Khan$/i },
        { email: "amankhan@gharplot.com" },
      ],
    });

    if (!aman) {
      console.log("AmanKhan employee not found. Creating employee...");
      let salesRole = await Role.findOne({ name: "Sales Executive" });
      if (!salesRole) {
        salesRole = await Role.findOne();
      }

      const hashedPassword = await bcrypt.hash("Aman@123", 10);
      aman = await Employee.create({
        name: "AmanKhan",
        email: "amankhan@gharplot.com",
        phone: "9876543219",
        role: salesRole._id,
        password: hashedPassword,
        isActive: true,
        department: "Sales",
      });
      console.log(`Created employee: ${aman.name} with ID: ${aman._id}`);
    } else {
      console.log(`Found existing employee: ${aman.name} (${aman._id})`);
    }

    // 2. Read and parse CSV
    const csvPath = path.resolve(__dirname, "../data/aman_khan_cashflow.csv");
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at: ${csvPath}`);
    }

    const fileContent = fs.readFileSync(csvPath, "utf-8");
    const rawLines = fileContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    console.log(`Total CSV lines (including header): ${rawLines.length}`);

    const header = parseCsvLine(rawLines[0]);
    console.log("Header columns:", header);

    const parsedRecords = [];

    for (let i = 1; i < rawLines.length; i++) {
      const cols = parseCsvLine(rawLines[i]);
      if (cols.length < 8) {
        console.warn(`Line ${i} has fewer than 8 columns, skipping:`, rawLines[i]);
        continue;
      }

      const [sNo, associate, receivedFromRaw, dateStr, opBalStr, totRecStr, totExpStr, clBalStr] = cols;

      const dateObj = parseDateDMY(dateStr);
      if (!dateObj) {
        console.warn(`Invalid date at line ${i}: ${dateStr}`);
        continue;
      }

      const openingBalance = parseFloat(opBalStr) || 0;
      const totalReceived = parseFloat(totRecStr) || 0;
      const totalExpense = parseFloat(totExpStr) || 0;
      const closingBalance = parseFloat(clBalStr) || 0;

      // Parse receivedFrom entries
      const entries = [];
      if (receivedFromRaw && receivedFromRaw.trim().length > 0) {
        try {
          const parsed = JSON.parse(receivedFromRaw.trim());
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              const amt = parseFloat(item.amount);
              // Include entries with valid amount > 0 or genuine from
              if (amt > 0 || (item.from && item.from !== "0")) {
                entries.push({
                  receivedFrom: String(item.from || "Sumit Sir").trim(),
                  receivedAmount: isNaN(amt) ? 0 : Math.max(0, amt),
                  type: normalizeType(item.type),
                });
              }
            }
          }
        } catch (e) {
          console.warn(`JSON parse error on line ${i}:`, receivedFromRaw, e.message);
        }
      }

      parsedRecords.push({
        sNo: parseInt(sNo, 10) || i,
        businessAssociate: aman._id,
        date: dateObj,
        openingBalance,
        totalReceived,
        totalExpense,
        closingBalance,
        entries,
      });
    }

    console.log(`Parsed ${parsedRecords.length} records from CSV.`);

    // Sort ascending by date
    parsedRecords.sort((a, b) => a.date - b.date);

    console.log(
      `Date range: from ${parsedRecords[0].date.toISOString().split("T")[0]} to ${
        parsedRecords[parsedRecords.length - 1].date.toISOString().split("T")[0]
      }`
    );

    // 3. Upsert into database in batches
    console.log("Upserting records into CashFlow collection...");
    let upsertedCount = 0;
    const bulkOps = parsedRecords.map((rec) => ({
      updateOne: {
        filter: {
          businessAssociate: rec.businessAssociate,
          date: rec.date,
        },
        update: {
          $set: {
            businessAssociate: rec.businessAssociate,
            date: rec.date,
            openingBalance: rec.openingBalance,
            totalReceived: rec.totalReceived,
            totalExpense: rec.totalExpense,
            closingBalance: rec.closingBalance,
            entries: rec.entries,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    const batchSize = 200;
    for (let i = 0; i < bulkOps.length; i += batchSize) {
      const batch = bulkOps.slice(i, i + batchSize);
      const res = await CashFlow.bulkWrite(batch);
      upsertedCount += (res.upsertedCount || 0) + (res.modifiedCount || 0);
      console.log(`Processed batch ${Math.floor(i / batchSize) + 1} / ${Math.ceil(bulkOps.length / batchSize)}`);
    }

    console.log(`Successfully upserted ${bulkOps.length} cash flow records into DB!`);

    // Verify record count in DB for AmanKhan
    const countInDb = await CashFlow.countDocuments({ businessAssociate: aman._id });
    console.log(`Total CashFlow records in DB for AmanKhan: ${countInDb}`);

    const latest = await CashFlow.find({ businessAssociate: aman._id }).sort({ date: -1 }).limit(3);
    console.log("Top 3 latest records in DB:", JSON.stringify(latest, null, 2));

    process.exit(0);
  } catch (err) {
    console.error("Error in import script:", err);
    process.exit(1);
  }
}

run();
