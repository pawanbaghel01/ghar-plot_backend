import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Employee from "../models/employeeSchema.js";
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
  if (
    t.includes("online") ||
    t.includes("transfer") ||
    t.includes("neft") ||
    t.includes("rtgs") ||
    t.includes("imps") ||
    t.includes("transfter") ||
    t.includes("cheque")
  )
    return "Online Transfer";
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

    // 1. Locate Aslam in Employee collection
    const aslam = await Employee.findOne({
      $or: [
        { name: /^Aslam/i },
        { email: "aslam6209khan@gmail.com" },
      ],
    });

    if (!aslam) {
      throw new Error("Employee Aslam not found in database!");
    }
    console.log(`Found Employee Aslam: ${aslam.name} with ID: ${aslam._id} (${aslam.email})`);

    // 2. Locate source CSV (from user upload or backend/data)
    const uploadedPath = "C:/Users/Asus/.gemini/antigravity-ide/brain/83feac47-ad04-4bf2-b6c2-62f82eca7891/.user_uploaded/media_1789982039479.csv";
    const destPath = path.resolve(__dirname, "../data/aslam_khan_cashflow.csv");

    if (fs.existsSync(uploadedPath)) {
      fs.copyFileSync(uploadedPath, destPath);
      console.log(`Copied uploaded CSV to: ${destPath}`);
    } else if (!fs.existsSync(destPath)) {
      throw new Error(`CSV file not found at ${uploadedPath} or ${destPath}`);
    }

    // 3. Read and parse CSV
    const fileContent = fs.readFileSync(destPath, "utf-8");
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
              // Include genuine received entries
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
        businessAssociate: aslam._id,
        date: dateObj,
        openingBalance,
        totalReceived,
        totalExpense,
        closingBalance,
        entries,
      });
    }

    console.log(`Parsed ${parsedRecords.length} records from CSV for Aslam.`);

    // Sort ascending by date (oldest to newest)
    parsedRecords.sort((a, b) => a.date - b.date);

    console.log(
      `Date range: from ${parsedRecords[0].date.toISOString().split("T")[0]} to ${
        parsedRecords[parsedRecords.length - 1].date.toISOString().split("T")[0]
      }`
    );

    // 4. Remove old cash flow data for Aslam as requested
    const deleteResult = await CashFlow.deleteMany({ businessAssociate: aslam._id });
    console.log(`Deleted ${deleteResult.deletedCount} old cashflow records for Aslam.`);

    // 5. Insert all parsed records in batches
    console.log("Inserting new records into CashFlow collection...");
    const docsToInsert = parsedRecords.map((rec) => ({
      businessAssociate: rec.businessAssociate,
      date: rec.date,
      openingBalance: rec.openingBalance,
      totalReceived: rec.totalReceived,
      totalExpense: rec.totalExpense,
      closingBalance: rec.closingBalance,
      entries: rec.entries,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const batchSize = 200;
    for (let i = 0; i < docsToInsert.length; i += batchSize) {
      const batch = docsToInsert.slice(i, i + batchSize);
      await CashFlow.insertMany(batch);
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1} / ${Math.ceil(docsToInsert.length / batchSize)}`);
    }

    // 6. Verify count in DB for Aslam
    const finalCount = await CashFlow.countDocuments({ businessAssociate: aslam._id });
    console.log(`Total CashFlow records now in DB for Aslam: ${finalCount}`);

    const latest = await CashFlow.find({ businessAssociate: aslam._id }).sort({ date: -1 }).limit(3);
    console.log("Top 3 latest records for Aslam in DB:", JSON.stringify(latest, null, 2));

    const oldest = await CashFlow.find({ businessAssociate: aslam._id }).sort({ date: 1 }).limit(2);
    console.log("Oldest records for Aslam in DB:", JSON.stringify(oldest, null, 2));

    process.exit(0);
  } catch (err) {
    console.error("Error importing Aslam cash flow:", err);
    process.exit(1);
  }
}

run();
